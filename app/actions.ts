'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { addDays, todayTZ } from '@/lib/format';
import { runMonthlyBilling, runReminders } from '@/lib/billing';
import { notifyClient } from '@/lib/notify';
import type { Client, Invoice, Settings } from '@/lib/types';

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const num = (f: FormData, k: string) => {
  const v = Number(String(f.get(k) ?? '').replace(/,/g, ''));
  return Number.isFinite(v) ? v : 0;
};

async function db() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return supabase;
}

// ---------- Auth ----------
export async function signIn(_: unknown, form: FormData) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: str(form, 'email'), password: str(form, 'password') });
  if (error) return { error: 'Email or password is wrong. Check them and try again.' };
  redirect('/');
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

// ---------- Clients ----------
export async function saveClient(form: FormData) {
  const supabase = await db();
  const id = str(form, 'id');
  const row = {
    name: str(form, 'name'),
    contact_person: str(form, 'contact_person'),
    phone: str(form, 'phone'),
    email: str(form, 'email'),
    tin: str(form, 'tin'),
    address: str(form, 'address'),
    notes: str(form, 'notes'),
  };
  if (!row.name) throw new Error('Client name is required');
  if (id) {
    const { error } = await supabase.from('clients').update(row).eq('id', id);
    if (error) throw new Error(error.message);
    revalidatePath(`/clients/${id}`);
  } else {
    const { data, error } = await supabase.from('clients').insert(row).select('id').single();
    if (error) throw new Error(error.message);
    redirect(`/clients/${data.id}`);
  }
  revalidatePath('/clients');
}

// ---------- Subscriptions ----------
export async function addSubscription(form: FormData) {
  const supabase = await db();
  const client_id = str(form, 'client_id');
  const row = {
    client_id,
    product_id: str(form, 'product_id'),
    setup_fee: num(form, 'setup_fee'),
    training_fee: num(form, 'training_fee'),
    monthly_fee: num(form, 'monthly_fee'),
    billing_day: Math.min(28, Math.max(1, num(form, 'billing_day') || 1)),
    start_date: str(form, 'start_date') || todayTZ(),
    notes: str(form, 'notes'),
  };
  const { error } = await supabase.from('subscriptions').insert(row);
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${client_id}`);
}

export async function setSubscriptionStatus(form: FormData) {
  const supabase = await db();
  const { error } = await supabase.from('subscriptions').update({ status: str(form, 'status') }).eq('id', str(form, 'id'));
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${str(form, 'client_id')}`);
}

export async function updateSubscriptionFee(form: FormData) {
  const supabase = await db();
  const { error } = await supabase
    .from('subscriptions')
    .update({ monthly_fee: num(form, 'monthly_fee'), billing_day: Math.min(28, Math.max(1, num(form, 'billing_day') || 1)) })
    .eq('id', str(form, 'id'));
  if (error) throw new Error(error.message);
  revalidatePath(`/clients/${str(form, 'client_id')}`);
}

// Bills setup + training for one subscription right away.
export async function invoiceSetupNow(form: FormData) {
  const supabase = await db();
  const subId = str(form, 'id');
  const { data: sub, error } = await supabase.from('subscriptions').select('*, products(*)').eq('id', subId).single();
  if (error || !sub) throw new Error(error?.message ?? 'Subscription not found');
  const { data: s } = await supabase.from('settings').select('*').eq('id', 1).single();
  const today = todayTZ();
  const { data: number, error: ne } = await supabase.rpc('next_invoice_number');
  if (ne) throw new Error(ne.message);
  const { data: inv, error: ie } = await supabase
    .from('invoices')
    .insert({ number, client_id: sub.client_id, issue_date: today, due_date: addDays(today, s?.default_due_days ?? 7), status: 'sent', vat_rate: s?.vat_rate ?? 0 })
    .select('id')
    .single();
  if (ie || !inv) throw new Error(ie?.message);
  const name = sub.products?.name ?? 'Product';
  const items = [];
  if (Number(sub.setup_fee) > 0) items.push({ invoice_id: inv.id, subscription_id: sub.id, kind: 'setup', description: `${name} · setup fee`, quantity: 1, unit_price: sub.setup_fee, sort: 0 });
  if (Number(sub.training_fee) > 0) items.push({ invoice_id: inv.id, subscription_id: sub.id, kind: 'training', description: `${name} · training`, quantity: 1, unit_price: sub.training_fee, sort: 1 });
  if (items.length) await supabase.from('invoice_items').insert(items);
  await supabase.from('subscriptions').update({ setup_invoiced: true }).eq('id', sub.id);
  redirect(`/invoices/${inv.id}`);
}

// ---------- Invoices ----------
type ItemInput = { description: string; quantity: number; unit_price: number; kind?: string };

export async function createInvoice(form: FormData) {
  const supabase = await db();
  const items = JSON.parse(str(form, 'items') || '[]') as ItemInput[];
  const clean = items.filter((i) => i.description.trim() && Number(i.quantity) > 0);
  if (!str(form, 'client_id')) throw new Error('Choose a client');
  if (!clean.length) throw new Error('Add at least one line');
  const { data: number, error: ne } = await supabase.rpc('next_invoice_number');
  if (ne) throw new Error(ne.message);
  const today = todayTZ();
  const { data: inv, error } = await supabase
    .from('invoices')
    .insert({
      number,
      client_id: str(form, 'client_id'),
      issue_date: str(form, 'issue_date') || today,
      due_date: str(form, 'due_date') || addDays(today, 7),
      vat_rate: num(form, 'vat_rate'),
      notes: str(form, 'notes'),
      status: str(form, 'intent') === 'draft' ? 'draft' : 'sent',
    })
    .select('id')
    .single();
  if (error || !inv) throw new Error(error?.message);
  const { error: itemErr } = await supabase.from('invoice_items').insert(
    clean.map((i, idx) => ({
      invoice_id: inv.id,
      description: i.description.trim(),
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
      kind: ['setup', 'training', 'monthly'].includes(i.kind ?? '') ? i.kind : 'other',
      sort: idx,
    }))
  );
  if (itemErr) throw new Error(itemErr.message);
  redirect(`/invoices/${inv.id}`);
}

/** Change an invoice that is not fully paid yet: dates, VAT, notes and lines. */
export async function updateInvoice(form: FormData) {
  const supabase = await db();
  const id = str(form, 'id');
  const items = JSON.parse(str(form, 'items') || '[]') as (ItemInput & { subscription_id?: string | null })[];
  const clean = items.filter((i) => i.description.trim() && Number(i.quantity) > 0);
  if (!clean.length) throw new Error('Add at least one line');
  const { data: inv } = await supabase.from('invoices').select('status').eq('id', id).single();
  if (!inv) throw new Error('Invoice not found');
  if (!['draft', 'sent', 'partially_paid'].includes(inv.status)) throw new Error('Paid or void invoices cannot be edited');

  const today = todayTZ();
  const status = inv.status === 'draft' && str(form, 'intent') === 'send' ? 'sent' : inv.status;
  const { error } = await supabase.from('invoices').update({
    issue_date: str(form, 'issue_date') || today,
    due_date: str(form, 'due_date') || addDays(today, 7),
    vat_rate: num(form, 'vat_rate'),
    notes: str(form, 'notes'),
    status,
  }).eq('id', id);
  if (error) throw new Error(error.message);

  const { error: delErr } = await supabase.from('invoice_items').delete().eq('invoice_id', id);
  if (delErr) throw new Error(delErr.message);
  const { error: itemErr } = await supabase.from('invoice_items').insert(
    clean.map((i, idx) => ({
      invoice_id: id,
      subscription_id: i.subscription_id || null,
      description: i.description.trim(),
      quantity: Number(i.quantity),
      unit_price: Number(i.unit_price),
      kind: ['setup', 'training', 'monthly'].includes(i.kind ?? '') ? i.kind : 'other',
      sort: idx,
    }))
  );
  if (itemErr) throw new Error(itemErr.message);
  await supabase.rpc('recalc_invoice', { p_invoice: id });
  revalidatePath(`/invoices/${id}`);
  revalidatePath('/invoices');
  revalidatePath('/');
  redirect(`/invoices/${id}`);
}

export async function setInvoiceStatus(form: FormData) {
  const supabase = await db();
  const id = str(form, 'id');
  const status = str(form, 'status');
  if (!['sent', 'void'].includes(status)) throw new Error('Unsupported status');
  const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
  if (status === 'sent') await supabase.rpc('recalc_invoice', { p_invoice: id });
  revalidatePath(`/invoices/${id}`);
  revalidatePath('/invoices');
}

export async function deleteDraft(form: FormData) {
  const supabase = await db();
  const id = str(form, 'id');
  const { error } = await supabase.from('invoices').delete().eq('id', id).eq('status', 'draft');
  if (error) throw new Error(error.message);
  redirect('/invoices');
}

export async function recordPayment(form: FormData) {
  const supabase = await db();
  const invoice_id = str(form, 'invoice_id');
  const amount = num(form, 'amount');
  if (amount <= 0) throw new Error('Enter an amount above zero');
  const { error } = await supabase.from('payments').insert({
    invoice_id,
    amount,
    method: str(form, 'method') || 'mobile_money',
    reference: str(form, 'reference'),
    paid_at: str(form, 'paid_at') || todayTZ(),
    notes: str(form, 'notes'),
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/invoices/${invoice_id}`);
  revalidatePath('/');
}

export async function deletePayment(form: FormData) {
  const supabase = await db();
  const { error } = await supabase.from('payments').delete().eq('id', str(form, 'id'));
  if (error) throw new Error(error.message);
  revalidatePath(`/invoices/${str(form, 'invoice_id')}`);
}

export async function sendInvoiceReminder(form: FormData) {
  const supabase = await db();
  const id = str(form, 'id');
  const { data: inv } = await supabase.from('invoices').select('*, clients(*)').eq('id', id).single();
  const { data: s } = await supabase.from('settings').select('*').eq('id', 1).single();
  if (!inv || !s) throw new Error('Invoice not found');
  const kind = inv.amount_paid > 0 || inv.last_reminder_at ? 'reminder' : 'new';
  const sent = await notifyClient(supabase, kind, inv as Invoice, inv.clients as Client, s as Settings);
  revalidatePath(`/invoices/${id}`);
  redirect(`/invoices/${id}?sent=${encodeURIComponent(sent.join(',') || 'none')}`);
}

// ---------- Products ----------
export async function saveProduct(form: FormData) {
  const supabase = await db();
  const id = str(form, 'id');
  const row = {
    name: str(form, 'name'),
    code: str(form, 'code').toUpperCase(),
    description: str(form, 'description'),
    setup_fee: num(form, 'setup_fee'),
    training_fee: num(form, 'training_fee'),
    monthly_fee: num(form, 'monthly_fee'),
    active: form.get('active') === 'on',
  };
  const { error } = id
    ? await supabase.from('products').update(row).eq('id', id)
    : await supabase.from('products').insert({ ...row, active: true });
  if (error) throw new Error(error.message);
  revalidatePath('/products');
}

// ---------- Settings ----------
export async function saveSettings(form: FormData) {
  const supabase = await db();
  const fields = ['company_name', 'brand_name', 'address', 'phone', 'email', 'tin', 'vrn', 'bank_name', 'bank_account_name', 'bank_account_number', 'bank_branch', 'bank_swift', 'mobile_money', 'invoice_prefix', 'invoice_footer'];
  const row: Record<string, unknown> = Object.fromEntries(fields.map((f) => [f, str(form, f)]));
  row.default_due_days = Math.max(0, num(form, 'default_due_days'));
  row.vat_rate = Math.max(0, num(form, 'vat_rate'));
  row.updated_at = new Date().toISOString();
  const { error } = await supabase.from('settings').update(row).eq('id', 1);
  if (error) throw new Error(error.message);
  revalidatePath('/settings');
  redirect('/settings?saved=1');
}

// ---------- Run billing manually ----------
export async function runBillingNow() {
  const supabase = await db();
  const r = await runMonthlyBilling(supabase, { notify: true });
  const reminded = await runReminders(supabase);
  revalidatePath('/');
  redirect(`/?billed=${r.invoicesCreated.length}&reminded=${reminded}`);
}

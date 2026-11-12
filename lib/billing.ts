import type { SupabaseClient } from '@supabase/supabase-js';
import type { Client, Invoice, Settings, Subscription } from './types';
import { addDays, daysBetween, todayTZ } from './format';
import { notifyClient } from './notify';

type DB = SupabaseClient;

function periodFor(today: string, billingDay: number) {
  const [y, m, d] = today.split('-').map(Number);
  // Most recent billing date on or before today
  let py = y, pm = m;
  if (d < billingDay) { pm -= 1; if (pm === 0) { pm = 12; py -= 1; } }
  const start = `${py}-${String(pm).padStart(2, '0')}-${String(billingDay).padStart(2, '0')}`;
  let ny = py, nm = pm + 1; if (nm === 13) { nm = 1; ny += 1; }
  const nextStart = `${ny}-${String(nm).padStart(2, '0')}-${String(billingDay).padStart(2, '0')}`;
  return { start, end: addDays(nextStart, -1) };
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function label(start: string, end: string) {
  const f = (s: string) => { const [y, m, d] = s.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
  return `${f(start)} – ${f(end)}`;
}

export type BillingResult = { invoicesCreated: string[]; remindersSent: number; notes: string[] };

// Creates monthly invoices for subscriptions whose billing date has arrived (one invoice per client),
// adding setup and training fees the first time. Safe to run more than once a day.
export async function runMonthlyBilling(db: DB, opts: { notify: boolean; today?: string }): Promise<BillingResult> {
  const today = opts.today ?? todayTZ();
  const result: BillingResult = { invoicesCreated: [], remindersSent: 0, notes: [] };

  const { data: settings, error: se } = await db.from('settings').select('*').eq('id', 1).single();
  if (se || !settings) throw new Error('Settings missing: ' + se?.message);
  const s = settings as Settings;

  const { data: subs, error } = await db
    .from('subscriptions')
    .select('*, products(*)')
    .eq('status', 'active')
    .lte('start_date', today);
  if (error) throw new Error(error.message);

  const byClient = new Map<string, { sub: Subscription; period: { start: string; end: string } }[]>();
  for (const sub of (subs ?? []) as Subscription[]) {
    if (Number(sub.monthly_fee) <= 0 && (sub.setup_invoiced || (Number(sub.setup_fee) <= 0 && Number(sub.training_fee) <= 0))) continue;
    const period = periodFor(today, sub.billing_day);
    if (period.start < sub.start_date) {
      // First period hasn't started yet; still bill one-off fees right away if not done.
      if (!sub.setup_invoiced && (Number(sub.setup_fee) > 0 || Number(sub.training_fee) > 0)) {
        const list = byClient.get(sub.client_id) ?? [];
        list.push({ sub: { ...sub, monthly_fee: 0 }, period });
        byClient.set(sub.client_id, list);
      }
      continue;
    }
    if (Number(sub.monthly_fee) > 0) {
      const { data: existing } = await db
        .from('invoice_items')
        .select('id, invoices!inner(period_start, status)')
        .eq('subscription_id', sub.id)
        .eq('kind', 'monthly')
        .eq('invoices.period_start', period.start)
        .neq('invoices.status', 'void')
        .limit(1);
      if (existing && existing.length) {
        if (sub.setup_invoiced) continue;
        sub.monthly_fee = 0;
      }
    }
    if (Number(sub.monthly_fee) <= 0 && sub.setup_invoiced) continue;
    const list = byClient.get(sub.client_id) ?? [];
    list.push({ sub, period });
    byClient.set(sub.client_id, list);
  }

  for (const [clientId, entries] of byClient) {
    const { data: number, error: ne } = await db.rpc('next_invoice_number');
    if (ne) { result.notes.push(`Numbering failed: ${ne.message}`); continue; }
    const periodStart = entries.map((e) => e.period.start).sort()[0];
    const periodEnd = entries.map((e) => e.period.end).sort().reverse()[0];
    const { data: inv, error: ie } = await db
      .from('invoices')
      .insert({
        number, client_id: clientId, issue_date: today, due_date: addDays(today, s.default_due_days),
        period_start: periodStart, period_end: periodEnd, status: 'sent', vat_rate: s.vat_rate, auto_generated: true,
      })
      .select('*')
      .single();
    if (ie || !inv) { result.notes.push(`Invoice failed for client ${clientId}: ${ie?.message}`); continue; }

    const items: Record<string, unknown>[] = [];
    let sort = 0;
    for (const { sub, period } of entries) {
      const name = sub.products?.name ?? 'Subscription';
      if (!sub.setup_invoiced && Number(sub.setup_fee) > 0)
        items.push({ invoice_id: inv.id, subscription_id: sub.id, kind: 'setup', description: `${name} · setup fee`, quantity: 1, unit_price: sub.setup_fee, sort: sort++ });
      if (!sub.setup_invoiced && Number(sub.training_fee) > 0)
        items.push({ invoice_id: inv.id, subscription_id: sub.id, kind: 'training', description: `${name} · training`, quantity: 1, unit_price: sub.training_fee, sort: sort++ });
      if (Number(sub.monthly_fee) > 0)
        items.push({ invoice_id: inv.id, subscription_id: sub.id, kind: 'monthly', description: `${name} · monthly subscription (${label(period.start, period.end)})`, quantity: 1, unit_price: sub.monthly_fee, sort: sort++ });
    }
    const { error: itemErr } = await db.from('invoice_items').insert(items);
    if (itemErr) { result.notes.push(`Items failed on ${number}: ${itemErr.message}`); continue; }
    const setupIds = entries.filter((e) => !e.sub.setup_invoiced).map((e) => e.sub.id);
    if (setupIds.length) await db.from('subscriptions').update({ setup_invoiced: true }).in('id', setupIds);
    result.invoicesCreated.push(number as string);

    if (opts.notify) {
      const { data: fresh } = await db.from('invoices').select('*, clients(*)').eq('id', inv.id).single();
      if (fresh) await notifyClient(db, 'new', fresh as Invoice, (fresh as Invoice).clients as Client, s);
    }
  }
  return result;
}

const REMIND_BEFORE = [3, 0];
const REMIND_AFTER = [3, 7, 14, 30];

// Sends reminders for unpaid invoices: 3 days before, on the due date, then 3, 7, 14 and 30 days late.
export async function runReminders(db: DB, today = todayTZ()): Promise<number> {
  const { data: settings } = await db.from('settings').select('*').eq('id', 1).single();
  if (!settings) return 0;
  const { data: invs } = await db.from('invoices').select('*, clients(*)').in('status', ['sent', 'partially_paid']);
  let count = 0;
  for (const inv of (invs ?? []) as Invoice[]) {
    if (Number(inv.total) - Number(inv.amount_paid) <= 0) continue;
    if (inv.last_reminder_at && inv.last_reminder_at.slice(0, 10) === today) continue;
    const until = daysBetween(today, inv.due_date);
    const late = -until;
    const due = (until >= 0 && REMIND_BEFORE.includes(until)) || (late > 0 && REMIND_AFTER.includes(late));
    if (!due || inv.issue_date === today) continue;
    const sent = await notifyClient(db, 'reminder', inv, inv.clients as Client, settings as Settings);
    if (sent.length) count++;
  }
  return count;
}

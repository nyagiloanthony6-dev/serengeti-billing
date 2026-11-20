'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin, requireStaff } from '@/lib/auth';
import { todayTZ } from '@/lib/format';

const str = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const optDate = (f: FormData, k: string) => str(f, k) || null;
const optNum = (f: FormData, k: string) => {
  const v = str(f, k);
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const routeHint = (m: string) =>
  /route_(origin|destinations)/.test(m) ? 'Run supabase/migrations/0003_prospect_routes.sql in Supabase first (adds the Shehena route fields).' : m;

// ---------- Prospects ----------
export async function saveProspect(form: FormData) {
  const s = await requireStaff();
  const supabase = createClient();
  const id = str(form, 'id');
  const row: Record<string, unknown> = {
    business_name: str(form, 'business_name'),
    contact_person: str(form, 'contact_person'),
    phone: str(form, 'phone'),
    location: str(form, 'location'),
    latitude: optNum(form, 'latitude'),
    longitude: optNum(form, 'longitude'),
    products: form.getAll('products').map(String).filter(Boolean),
    visited_on: str(form, 'visited_on') || todayTZ(),
    status: str(form, 'status') || 'new',
    next_followup: optDate(form, 'next_followup'),
    notes: str(form, 'notes'),
    updated_at: new Date().toISOString(),
  };
  // Route only applies when Shehena was pitched.
  const shehena = (row.products as string[]).some((n) => /shehena/i.test(n));
  row.route_origin = shehena ? str(form, 'route_origin') : '';
  row.route_destinations = shehena ? form.getAll('route_destinations').map((v) => String(v).trim()).filter(Boolean) : [];
  if (!row.business_name) throw new Error('Business name is required');
  // Admins record a prospect on behalf of a sales officer; sales staff always own what they add.
  if (s.role === 'admin' && str(form, 'sales_user_id')) row.sales_user_id = str(form, 'sales_user_id');

  if (id) {
    const { error } = await supabase.from('prospects').update(row).eq('id', id);
    if (error) throw new Error(routeHint(error.message));
    revalidatePath(`/prospects/${id}`);
    revalidatePath('/prospects');
    redirect(`/prospects/${id}`);
  }
  if (s.role === 'admin' && !row.sales_user_id) throw new Error('Choose the sales officer for this prospect');
  const { data, error } = await supabase.from('prospects').insert(row).select('id').single();
  if (error) throw new Error(routeHint(error.message));
  revalidatePath('/prospects');
  redirect(`/prospects/${data.id}?added=1`);
}

export async function addFollowup(form: FormData) {
  await requireStaff();
  const supabase = createClient();
  const prospect_id = str(form, 'prospect_id');
  const { data: { user } } = await supabase.auth.getUser();
  const { data: p } = await supabase.from('prospects').select('sales_user_id').eq('id', prospect_id).single();
  if (!p) throw new Error('Prospect not found');
  const { error } = await supabase.from('prospect_followups').insert({
    prospect_id,
    sales_user_id: user!.id,
    done_on: str(form, 'done_on') || todayTZ(),
    method: str(form, 'method') || 'visit',
    outcome: str(form, 'outcome'),
    next_followup: optDate(form, 'next_followup'),
  });
  if (error) throw new Error(error.message);
  const status = str(form, 'status');
  if (status) await supabase.from('prospects').update({ status, updated_at: new Date().toISOString() }).eq('id', prospect_id);
  revalidatePath(`/prospects/${prospect_id}`);
  revalidatePath('/prospects');
}

export async function deleteProspect(form: FormData) {
  await requireAdmin();
  const supabase = createClient();
  const { error } = await supabase.from('prospects').delete().eq('id', str(form, 'id'));
  if (error) throw new Error(error.message);
  revalidatePath('/prospects');
  if (str(form, 'back') !== 'list') redirect('/prospects');
}

/** Admin: a won prospect becomes a billing client. */
export async function convertToClient(form: FormData) {
  await requireAdmin();
  const supabase = createClient();
  const id = str(form, 'id');
  const { data: p } = await supabase.from('prospects').select('*').eq('id', id).single();
  if (!p) throw new Error('Prospect not found');
  if (p.client_id) redirect(`/clients/${p.client_id}`);
  const { data: c, error } = await supabase.from('clients').insert({
    name: p.business_name,
    contact_person: p.contact_person,
    phone: p.phone,
    address: p.location,
    notes: `From prospect. Pitched: ${(p.products ?? []).join(', ') || '—'}.`,
  }).select('id').single();
  if (error) throw new Error(error.message);
  await supabase.from('prospects').update({ status: 'won', client_id: c.id, updated_at: new Date().toISOString() }).eq('id', id);
  revalidatePath('/prospects');
  redirect(`/clients/${c.id}`);
}

// ---------- Sales team (admin) ----------
export async function addSalesStaff(_: unknown, form: FormData) {
  await requireAdmin();
  const full_name = str(form, 'full_name');
  const email = str(form, 'email').toLowerCase();
  const phone = str(form, 'phone');
  const password = str(form, 'password');
  if (!full_name || !email) return { error: 'Name and email are required.' };
  if (password.length < 8) return { error: 'The password needs at least 8 characters.' };

  let admin;
  try { admin = createAdminClient(); } catch { return { error: 'SUPABASE_SECRET_KEY is not set in Vercel, so accounts cannot be created yet.' }; }

  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } });
  if (error || !data.user) {
    const msg = /already/i.test(error?.message ?? '') ? 'An account with this email already exists.' : error?.message ?? 'Could not create the account.';
    return { error: msg };
  }
  const { error: e2 } = await admin.from('sales_staff').insert({ user_id: data.user.id, full_name, phone, email });
  if (e2) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { error: e2.message };
  }
  revalidatePath('/sales-team');
  return { ok: `${full_name} can now sign in with ${email} and the password you set.` };
}

export async function setStaffActive(form: FormData) {
  await requireAdmin();
  const supabase = createClient();
  const { error } = await supabase.from('sales_staff').update({ active: str(form, 'active') === 'true' }).eq('user_id', str(form, 'user_id'));
  if (error) throw new Error(error.message);
  revalidatePath('/sales-team');
}

export async function resetStaffPassword(_: unknown, form: FormData) {
  await requireAdmin();
  const password = str(form, 'password');
  if (password.length < 8) return { error: 'At least 8 characters.' };
  try {
    const admin = createAdminClient();
    const { error } = await admin.auth.admin.updateUserById(str(form, 'user_id'), { password });
    if (error) return { error: error.message };
  } catch {
    return { error: 'SUPABASE_SECRET_KEY is not set.' };
  }
  return { ok: 'Password changed.' };
}

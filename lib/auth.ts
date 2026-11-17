import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type Role = 'admin' | 'sales' | 'none';

/** Who is signed in and what they may see. Cached for one request. */
export const getSession = cache(async () => {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, role: 'none' as Role, name: '' };
  const [{ data: admin }, { data: staff }] = await Promise.all([
    supabase.from('admins').select('user_id').eq('user_id', user.id).maybeSingle(),
    supabase.from('sales_staff').select('full_name, active').eq('user_id', user.id).maybeSingle(),
  ]);
  const role: Role = admin ? 'admin' : staff?.active ? 'sales' : 'none';
  return { user, role, name: staff?.full_name || user.email || '' };
});

/** Billing pages: admins only. Sales staff are sent to their prospects. */
export async function requireAdmin() {
  const s = await getSession();
  if (!s.user) redirect('/login');
  if (s.role === 'sales') redirect('/prospects');
  if (s.role !== 'admin') redirect('/no-access');
  return s;
}

/** Prospect pages: admins and sales staff. */
export async function requireStaff() {
  const s = await getSession();
  if (!s.user) redirect('/login');
  if (s.role === 'none') redirect('/no-access');
  return s;
}

import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { todayTZ } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { SubmitButton } from '@/components/SubmitButton';
import { setStaffActive } from '../../sales-actions';
import { AddStaffForm, ResetPasswordForm } from './StaffForms';

export const dynamic = 'force-dynamic';

export default async function SalesTeamPage() {
  await requireAdmin();
  const supabase = createClient();
  const today = todayTZ();
  const monthStart = today.slice(0, 8) + '01';
  const [{ data: staff }, { data: prospects }, { data: fups }] = await Promise.all([
    supabase.from('sales_staff').select('*').order('active', { ascending: false }).order('full_name'),
    supabase.from('prospects').select('sales_user_id, status, visited_on, next_followup'),
    supabase.from('prospect_followups').select('sales_user_id, done_on').gte('done_on', monthStart),
  ]);

  const row = (uid: string) => {
    const mine = (prospects ?? []).filter((p) => p.sales_user_id === uid);
    const open = mine.filter((p) => p.status !== 'won' && p.status !== 'lost');
    return {
      total: mine.length,
      month: mine.filter((p) => p.visited_on >= monthStart).length,
      fups: (fups ?? []).filter((f) => f.sales_user_id === uid).length,
      overdue: open.filter((p) => p.next_followup && p.next_followup < today).length,
      won: mine.filter((p) => p.status === 'won').length,
    };
  };

  return (
    <>
      <PageHeader kicker="Sales" title="Sales team" />

      <div className="card mb-6 overflow-x-auto">
        <table className="w-full min-w-[820px]">
          <thead>
            <tr>
              <th className="th">Sales officer</th>
              <th className="th text-right">Prospects</th>
              <th className="th text-right">New this month</th>
              <th className="th text-right">Follow-ups this month</th>
              <th className="th text-right">Overdue</th>
              <th className="th text-right">Won</th>
              <th className="th text-right">Account</th>
            </tr>
          </thead>
          <tbody>
            {(staff ?? []).map((m: any) => {
              const r = row(m.user_id);
              return (
                <tr key={m.user_id} className={m.active ? '' : 'opacity-60'}>
                  <td className="td">
                    <Link href={`/prospects?staff=${m.user_id}`} className="font-medium text-indigo hover:underline">{m.full_name}</Link>
                    <p className="text-xs text-muted">{[m.phone, m.email].filter(Boolean).join(' · ')}</p>
                  </td>
                  <td className="td num text-right">{r.total}</td>
                  <td className="td num text-right">{r.month}</td>
                  <td className="td num text-right">{r.fups}</td>
                  <td className={`td num text-right ${r.overdue ? 'font-semibold text-coral-ink' : 'text-muted'}`}>{r.overdue}</td>
                  <td className="td num text-right font-semibold text-teal-ink">{r.won}</td>
                  <td className="td text-right">
                    <form action={setStaffActive}>
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <input type="hidden" name="active" value={String(!m.active)} />
                      <SubmitButton className="btn-secondary min-h-[32px] px-3 py-1 text-xs" pendingText="…">{m.active ? 'Turn off access' : 'Turn on access'}</SubmitButton>
                    </form>
                  </td>
                </tr>
              );
            })}
            {!staff?.length && <tr><td colSpan={7} className="td py-12 text-center text-muted">No sales officers yet. Add one below.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="card p-5 sm:p-6">
          <h2 className="mb-4 font-semibold">Add a sales officer</h2>
          <AddStaffForm />
        </section>
        {!!staff?.length && (
          <section className="card p-5">
            <h2 className="font-semibold">Reset a password</h2>
            <div className="mt-4 grid gap-4">
              {(staff ?? []).filter((m: any) => m.active).map((m: any) => (
                <div key={m.user_id} className="grid gap-1.5">
                  <p className="text-sm font-medium">{m.full_name}</p>
                  <ResetPasswordForm userId={m.user_id} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

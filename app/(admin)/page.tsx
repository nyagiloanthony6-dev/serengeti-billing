import { requireAdmin } from '@/lib/auth';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { fmtDate, tzs, todayTZ, METHOD_LABEL } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { StatTile } from '@/components/StatTile';
import { Icon } from '@/components/Icon';
import { SubmitButton } from '@/components/SubmitButton';
import { runBillingNow } from '../actions';

export const dynamic = 'force-dynamic';

export default async function Dashboard({ searchParams }: { searchParams: { billed?: string; reminded?: string } }) {
  await requireAdmin();
  const supabase = createClient();
  const today = todayTZ();
  const monthStart = today.slice(0, 8) + '01';

  const [{ data: open }, { data: monthInvoices }, { data: monthPayments }, { data: subs }, { data: recent }] = await Promise.all([
    supabase.from('invoices').select('id, number, total, amount_paid, due_date, status, clients(name)').in('status', ['sent', 'partially_paid']).order('due_date'),
    supabase.from('invoices').select('total').gte('issue_date', monthStart).not('status', 'in', '(void,draft)'),
    supabase.from('payments').select('amount').gte('paid_at', monthStart),
    supabase.from('subscriptions').select('monthly_fee, client_id').eq('status', 'active'),
    supabase.from('payments').select('id, amount, method, paid_at, reference, invoices(id, number, clients(name))').order('paid_at', { ascending: false }).order('created_at', { ascending: false }).limit(6),
  ]);

  const outstanding = (open ?? []).reduce((a, i) => a + Number(i.total) - Number(i.amount_paid), 0);
  const overdueList = (open ?? []).filter((i) => i.due_date < today);
  const overdue = overdueList.reduce((a, i) => a + Number(i.total) - Number(i.amount_paid), 0);
  const billed = (monthInvoices ?? []).reduce((a, i) => a + Number(i.total), 0);
  const collected = (monthPayments ?? []).reduce((a, p) => a + Number(p.amount), 0);
  const mrr = (subs ?? []).reduce((a, s) => a + Number(s.monthly_fee), 0);
  const activeClients = new Set((subs ?? []).map((s) => s.client_id)).size;

  const pct = billed > 0 ? Math.round((collected / billed) * 100) : 0;

  return (
    <>
      <PageHeader kicker={fmtDate(today)} title="Habari, Tonny">
        <form action={runBillingNow}>
          <SubmitButton className="btn-secondary" pendingText="Running…">Run billing now</SubmitButton>
        </form>
        <Link href="/invoices/new" className="btn-primary"><Icon name="plus" className="h-4 w-4" />New invoice</Link>
      </PageHeader>

      {searchParams.billed !== undefined && (
        <p role="status" className="mb-6 rounded-xl bg-teal-soft px-4 py-3 text-sm font-medium text-teal-ink">
          Billing run finished: {searchParams.billed} new invoice{searchParams.billed === '1' ? '' : 's'}, {searchParams.reminded} reminder{searchParams.reminded === '1' ? '' : 's'} sent.
        </p>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Outstanding" icon="wallet" tone="indigo" value={tzs(outstanding)} sub={`${open?.length ?? 0} unpaid invoices`} href="/invoices?filter=unpaid" />
        <StatTile label="Overdue" icon="alert" tone="coral" value={tzs(overdue)} sub={`${overdueList.length} past due date`} alert={overdue > 0} />
        <StatTile label="Collected this month" icon="trending" tone="teal" value={tzs(collected)} progress={pct} sub={`${pct}% of ${tzs(billed)} billed`} />
        <StatTile label="Monthly recurring" icon="repeat" tone="saffron" value={tzs(mrr)} sub={`${activeClients} paying clients`} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4">
            <h2 className="font-semibold">Unpaid invoices</h2>
            <Link href="/invoices?filter=unpaid" className="text-sm font-medium text-indigo hover:underline">See all</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead><tr><th className="th">Invoice</th><th className="th">Client</th><th className="th">Due</th><th className="th text-right">Balance</th></tr></thead>
              <tbody>
                {(open ?? []).slice(0, 8).map((i: any) => (
                  <tr key={i.id} className="hover:bg-canvas">
                    <td className="td"><Link href={`/invoices/${i.id}`} className="whitespace-nowrap font-semibold text-indigo hover:underline">{i.number}</Link></td>
                    <td className="td">{i.clients?.name}</td>
                    <td className="td"><span className="flex flex-wrap items-center gap-2 whitespace-nowrap">{fmtDate(i.due_date)}<StatusBadge status={i.status} due={i.due_date} /></span></td>
                    <td className="td num text-right font-medium">{tzs(Number(i.total) - Number(i.amount_paid))}</td>
                  </tr>
                ))}
                {!open?.length && <tr><td colSpan={4} className="td py-10 text-center text-muted">Nothing outstanding. Every invoice is paid.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card overflow-hidden">
          <h2 className="px-5 py-4 font-semibold">Latest payments</h2>
          <ul>
            {(recent ?? []).map((p: any) => (
              <li key={p.id} className="flex items-center justify-between gap-3 border-t border-line/70 px-5 py-3.5 text-sm">
                <span className="chip-icon bg-teal-soft text-teal-ink"><Icon name="check" className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.invoices?.clients?.name}</p>
                  <p className="truncate text-xs text-muted">{fmtDate(p.paid_at)} · {METHOD_LABEL[p.method] ?? p.method}</p>
                </div>
                <span className="num font-semibold text-teal-ink">{tzs(p.amount)}</span>
              </li>
            ))}
            {!recent?.length && <li className="border-t border-line px-5 py-10 text-center text-sm text-muted">No payments recorded yet. Open an invoice to record one.</li>}
          </ul>
        </section>
      </div>
    </>
  );
}

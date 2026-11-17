import { requireAdmin } from '@/lib/auth';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { fmtDate, tzs, todayTZ } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';

export const dynamic = 'force-dynamic';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'paid', label: 'Paid' },
  { key: 'draft', label: 'Drafts' },
  { key: 'void', label: 'Void' },
];

export default async function InvoicesPage({ searchParams }: { searchParams: { filter?: string } }) {
  await requireAdmin();
  const filter = searchParams.filter ?? 'all';
  const supabase = createClient();
  let q = supabase.from('invoices').select('*, clients(name)').order('issue_date', { ascending: false }).order('number', { ascending: false }).limit(300);
  if (filter === 'unpaid') q = q.in('status', ['sent', 'partially_paid']);
  if (filter === 'overdue') q = q.in('status', ['sent', 'partially_paid']).lt('due_date', todayTZ());
  if (filter === 'paid') q = q.eq('status', 'paid');
  if (filter === 'draft') q = q.eq('status', 'draft');
  if (filter === 'void') q = q.eq('status', 'void');
  const { data: invoices } = await q;

  return (
    <>
      <PageHeader kicker="Invoices" title="Invoices">
        <Link href="/invoices/new" className="btn-primary">New invoice</Link>
      </PageHeader>
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter invoices">
        {FILTERS.map((f) => (
          <Link key={f.key} href={`/invoices?filter=${f.key}`} role="tab" aria-selected={filter === f.key}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${filter === f.key ? 'border-ink bg-ink text-white' : 'border-line bg-white text-muted hover:border-ink hover:text-ink'}`}>
            {f.label}
          </Link>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead><tr><th className="th">Invoice</th><th className="th">Client</th><th className="th">Issued</th><th className="th">Due</th><th className="th">Status</th><th className="th text-right">Total</th><th className="th text-right">Balance</th></tr></thead>
          <tbody>
            {(invoices ?? []).map((i: any) => (
              <tr key={i.id} className="hover:bg-canvas">
                <td className="td"><Link href={`/invoices/${i.id}`} className="font-medium text-indigo hover:underline">{i.number}</Link>{i.auto_generated && <span className="ml-2 font-mono text-[10px] uppercase text-muted">auto</span>}</td>
                <td className="td">{i.clients?.name}</td>
                <td className="td">{fmtDate(i.issue_date)}</td>
                <td className="td">{fmtDate(i.due_date)}</td>
                <td className="td"><StatusBadge status={i.status} due={i.due_date} /></td>
                <td className="td num text-right">{tzs(i.total)}</td>
                <td className="td num text-right font-medium">{i.status === 'void' ? '—' : tzs(Number(i.total) - Number(i.amount_paid))}</td>
              </tr>
            ))}
            {!invoices?.length && <tr><td colSpan={7} className="td py-12 text-center text-muted">No invoices here.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

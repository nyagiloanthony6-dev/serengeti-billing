import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fmtDate, tzs, todayTZ } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { SubmitButton } from '@/components/SubmitButton';
import { ClientForm } from '../ClientForm';
import { SubscriptionForm } from './SubscriptionForm';
import { invoiceSetupNow, setSubscriptionStatus, updateSubscriptionFee } from '../../../actions';

export const dynamic = 'force-dynamic';

const SUB_BADGE: Record<string, string> = {
  active: 'bg-teal-soft text-teal-ink',
  paused: 'bg-saffron-soft text-saffron-ink',
  cancelled: 'bg-sunk text-muted',
};

export default async function ClientPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: client }, { data: subs }, { data: invoices }, { data: products }, { data: bal }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', params.id).single(),
    supabase.from('subscriptions').select('*, products(*)').eq('client_id', params.id).order('created_at'),
    supabase.from('invoices').select('*').eq('client_id', params.id).order('issue_date', { ascending: false }),
    supabase.from('products').select('*').eq('active', true).order('name'),
    supabase.from('client_balances').select('*').eq('client_id', params.id).single(),
  ]);
  if (!client) notFound();
  const mrr = (subs ?? []).filter((s: any) => s.status === 'active').reduce((a: number, s: any) => a + Number(s.monthly_fee), 0);

  return (
    <>
      <PageHeader kicker="Client" title={client.name}>
        <Link href={`/invoices/new?client=${client.id}`} className="btn-primary">New invoice</Link>
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          ['Monthly', tzs(mrr)],
          ['Billed to date', tzs(bal?.billed)],
          ['Paid to date', tzs(bal?.paid)],
          ['Outstanding', tzs(bal?.outstanding)],
        ].map(([k, v]) => (
          <div key={k} className="card p-4"><p className="text-xs text-muted">{k}</p><p className="num mt-1 text-lg font-bold">{v}</p></div>
        ))}
      </div>

      <section className="card mb-6 overflow-hidden">
        <h2 className="px-5 py-4 font-semibold">Subscriptions</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead><tr><th className="th">Product</th><th className="th">Status</th><th className="th">Since</th><th className="th">Monthly fee · bill day</th><th className="th">Setup & training</th><th className="th text-right">Actions</th></tr></thead>
            <tbody>
              {(subs ?? []).map((s: any) => (
                <tr key={s.id}>
                  <td className="td font-medium">{s.products?.name}</td>
                  <td className="td"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${SUB_BADGE[s.status]}`}>{s.status}</span></td>
                  <td className="td">{fmtDate(s.start_date)}</td>
                  <td className="td">
                    <form action={updateSubscriptionFee} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={s.id} /><input type="hidden" name="client_id" value={client.id} />
                      <label className="sr-only" htmlFor={`fee-${s.id}`}>Monthly fee</label>
                      <input id={`fee-${s.id}`} name="monthly_fee" defaultValue={s.monthly_fee} className="input num w-28" />
                      <label className="sr-only" htmlFor={`day-${s.id}`}>Billing day</label>
                      <input id={`day-${s.id}`} name="billing_day" type="number" min={1} max={28} defaultValue={s.billing_day} className="input w-16" />
                      <SubmitButton className="btn-secondary px-3" pendingText="…">Save</SubmitButton>
                    </form>
                  </td>
                  <td className="td text-sm">
                    {tzs(Number(s.setup_fee) + Number(s.training_fee))}
                    <p className="text-xs text-muted">{s.setup_invoiced ? 'Invoiced' : Number(s.setup_fee) + Number(s.training_fee) > 0 ? 'Not invoiced yet' : '—'}</p>
                  </td>
                  <td className="td">
                    <div className="flex flex-wrap justify-end gap-2">
                      {!s.setup_invoiced && Number(s.setup_fee) + Number(s.training_fee) > 0 && (
                        <form action={invoiceSetupNow}><input type="hidden" name="id" value={s.id} /><SubmitButton className="btn-secondary px-3" pendingText="…">Invoice setup now</SubmitButton></form>
                      )}
                      {s.status !== 'active' && (
                        <form action={setSubscriptionStatus}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="client_id" value={client.id} /><input type="hidden" name="status" value="active" /><SubmitButton className="btn-secondary px-3" pendingText="…">Resume</SubmitButton></form>
                      )}
                      {s.status === 'active' && (
                        <form action={setSubscriptionStatus}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="client_id" value={client.id} /><input type="hidden" name="status" value="paused" /><SubmitButton className="btn-secondary px-3" pendingText="…">Pause</SubmitButton></form>
                      )}
                      {s.status !== 'cancelled' && (
                        <form action={setSubscriptionStatus}><input type="hidden" name="id" value={s.id} /><input type="hidden" name="client_id" value={client.id} /><input type="hidden" name="status" value="cancelled" /><SubmitButton className="btn-danger px-3" pendingText="…">Cancel</SubmitButton></form>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!subs?.length && <tr><td colSpan={6} className="td py-8 text-center text-muted">No subscriptions yet. Add the products this client uses below.</td></tr>}
            </tbody>
          </table>
        </div>
        <details className="border-t border-line px-5 py-4">
          <summary className="cursor-pointer text-sm font-semibold text-indigo">Add a subscription</summary>
          <div className="mt-4">
            {products?.length ? <SubscriptionForm clientId={client.id} products={products as any} today={todayTZ()} /> : <p className="text-sm text-muted">Add products first on the Products page.</p>}
          </div>
        </details>
      </section>

      <section className="card mb-6 overflow-hidden">
        <h2 className="px-5 py-4 font-semibold">Invoices</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead><tr><th className="th">Invoice</th><th className="th">Issued</th><th className="th">Status</th><th className="th text-right">Total</th><th className="th text-right">Balance</th></tr></thead>
            <tbody>
              {(invoices ?? []).map((i: any) => (
                <tr key={i.id} className="hover:bg-canvas">
                  <td className="td"><Link href={`/invoices/${i.id}`} className="font-medium text-indigo hover:underline">{i.number}</Link></td>
                  <td className="td">{fmtDate(i.issue_date)}</td>
                  <td className="td"><StatusBadge status={i.status} due={i.due_date} /></td>
                  <td className="td num text-right">{tzs(i.total)}</td>
                  <td className="td num text-right font-medium">{i.status === 'void' ? '—' : tzs(Number(i.total) - Number(i.amount_paid))}</td>
                </tr>
              ))}
              {!invoices?.length && <tr><td colSpan={5} className="td py-8 text-center text-muted">No invoices yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <details className="card p-5">
        <summary className="cursor-pointer font-semibold">Client details</summary>
        <div className="mt-4"><ClientForm client={client as any} /></div>
      </details>
    </>
  );
}

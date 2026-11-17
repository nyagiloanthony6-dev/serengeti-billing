import { requireAdmin } from '@/lib/auth';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fmtDate, tzs, todayTZ, METHOD_LABEL } from '@/lib/format';
import { invoiceMessage, whatsappLink, smsConfigured, emailConfigured } from '@/lib/notify';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { SubmitButton } from '@/components/SubmitButton';
import { deleteDraft, deletePayment, recordPayment, sendInvoiceReminder, setInvoiceStatus } from '../../../actions';
import type { Client, Invoice, Settings } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function InvoicePage({ params, searchParams }: { params: { id: string }; searchParams: { sent?: string } }) {
  await requireAdmin();
  const supabase = createClient();
  const [{ data: inv }, { data: items }, { data: payments }, { data: settings }, { data: reminders }] = await Promise.all([
    supabase.from('invoices').select('*, clients(*)').eq('id', params.id).single(),
    supabase.from('invoice_items').select('*').eq('invoice_id', params.id).order('sort'),
    supabase.from('payments').select('*').eq('invoice_id', params.id).order('paid_at'),
    supabase.from('settings').select('*').eq('id', 1).single(),
    supabase.from('reminders').select('*').eq('invoice_id', params.id).order('created_at', { ascending: false }).limit(5),
  ]);
  if (!inv || !settings) notFound();
  const client = inv.clients as Client;
  const balance = Number(inv.total) - Number(inv.amount_paid);
  const open = inv.status === 'sent' || inv.status === 'partially_paid';
  const wa = whatsappLink(client.phone, invoiceMessage(inv.amount_paid > 0 ? 'reminder' : 'new', inv as Invoice, client, settings as Settings));
  const canAutoSend = smsConfigured() || emailConfigured();

  return (
    <>
      <PageHeader kicker={<span className="inline-flex items-center gap-2">Invoice · <StatusBadge status={inv.status} due={inv.due_date} /></span>} title={inv.number}>
        {(inv.status === 'draft' || open) && <Link href={`/invoices/${inv.id}/edit`} className="btn-secondary">Edit invoice</Link>}
        <a href={`/api/invoices/${inv.id}/pdf`} className="btn-secondary" target="_blank" rel="noopener">Download PDF</a>
        {inv.status !== 'void' && <a href={wa} className="btn-secondary" target="_blank" rel="noopener">Send on WhatsApp</a>}
        {inv.status === 'draft' && (
          <form action={setInvoiceStatus}><input type="hidden" name="id" value={inv.id} /><input type="hidden" name="status" value="sent" /><SubmitButton pendingText="…">Mark as sent</SubmitButton></form>
        )}
      </PageHeader>

      {searchParams.sent && (
        <p role="status" className={`mb-6 rounded-xl px-4 py-3 text-sm font-medium ${searchParams.sent === 'none' ? 'bg-saffron-soft text-saffron-ink' : 'bg-teal-soft text-teal-ink'}`}>
          {searchParams.sent === 'none'
            ? 'Nothing was sent. Add a phone number or email to the client, and set up SMS or email in the app settings on Vercel.'
            : `Sent by ${searchParams.sent.replace(',', ' and ')}.`}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <section className="card overflow-hidden">
          <div className="grid gap-4 border-b border-line p-5 sm:grid-cols-3">
            <div><p className="text-xs text-muted">Bill to</p><Link href={`/clients/${client.id}`} className="font-semibold text-indigo hover:underline">{client.name}</Link><p className="text-sm text-muted">{client.phone}</p></div>
            <div><p className="text-xs text-muted">Issued</p><p className="font-medium">{fmtDate(inv.issue_date)}</p></div>
            <div><p className="text-xs text-muted">Due</p><p className={`font-medium ${open && inv.due_date < todayTZ() ? 'text-coral-ink' : ''}`}>{fmtDate(inv.due_date)}</p></div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead><tr><th className="th">Description</th><th className="th text-right">Qty</th><th className="th text-right">Unit price</th><th className="th text-right">Amount</th></tr></thead>
              <tbody>
                {(items ?? []).map((it: any) => (
                  <tr key={it.id}><td className="td">{it.description}</td><td className="td num text-right">{Number(it.quantity)}</td><td className="td num text-right">{tzs(it.unit_price)}</td><td className="td num text-right">{tzs(it.amount)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <dl className="ml-auto grid max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-2 border-t border-line p-5 text-sm">
            <dt className="text-muted">Subtotal</dt><dd className="num text-right">{tzs(inv.subtotal)}</dd>
            {Number(inv.vat_rate) > 0 && <><dt className="text-muted">VAT {Number(inv.vat_rate)}%</dt><dd className="num text-right">{tzs(inv.vat_amount)}</dd></>}
            <dt className="font-semibold">Total</dt><dd className="num text-right font-bold">{tzs(inv.total)}</dd>
            <dt className="text-muted">Paid</dt><dd className="num text-right text-teal-ink">{tzs(inv.amount_paid)}</dd>
            <dt className="font-semibold">Balance</dt><dd className={`num text-right text-lg font-bold ${balance > 0 && inv.status !== 'void' ? 'text-coral-ink' : ''}`}>{inv.status === 'void' ? '—' : tzs(balance)}</dd>
          </dl>
          {inv.notes && <p className="border-t border-line px-5 py-4 text-sm text-muted">{inv.notes}</p>}
        </section>

        <div className="grid content-start gap-6">
          {open && (
            <section className="card p-5">
              <h2 className="mb-4 font-semibold">Record a payment</h2>
              <form action={recordPayment} className="grid gap-3">
                <input type="hidden" name="invoice_id" value={inv.id} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="label" htmlFor="pay-amount">Amount (TSh)<input id="pay-amount" name="amount" inputMode="decimal" required defaultValue={balance} className="input num" /></label>
                  <label className="label" htmlFor="pay-date">Date paid<input id="pay-date" name="paid_at" type="date" defaultValue={todayTZ()} className="input" /></label>
                  <label className="label" htmlFor="pay-method">Method
                    <select id="pay-method" name="method" className="input" defaultValue="mobile_money">
                      <option value="mobile_money">Mobile money</option><option value="bank">Bank transfer</option><option value="cash">Cash</option><option value="online">Online</option><option value="other">Other</option>
                    </select>
                  </label>
                  <label className="label" htmlFor="pay-ref">Reference<input id="pay-ref" name="reference" className="input" placeholder="Transaction ID" /></label>
                </div>
                <div><SubmitButton>Record payment</SubmitButton></div>
              </form>
            </section>
          )}

          <section className="card overflow-hidden">
            <h2 className="px-5 py-4 font-semibold">Payments</h2>
            <ul>
              {(payments ?? []).map((p: any) => (
                <li key={p.id} className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-sm">
                  <div><p className="num font-semibold">{tzs(p.amount)}</p><p className="text-xs text-muted">{fmtDate(p.paid_at)} · {METHOD_LABEL[p.method] ?? p.method}{p.reference ? ` · ${p.reference}` : ''}</p></div>
                  <form action={deletePayment}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="invoice_id" value={inv.id} /><SubmitButton className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-coral-soft hover:text-coral-ink" pendingText="…">Remove</SubmitButton></form>
                </li>
              ))}
              {!payments?.length && <li className="border-t border-line px-5 py-6 text-center text-sm text-muted">No payments yet.</li>}
            </ul>
          </section>

          <section className="card grid gap-3 p-5">
            <h2 className="font-semibold">Send to client</h2>
            <p className="text-sm text-muted">
              {canAutoSend ? 'Sends the invoice details and how to pay by ' + [smsConfigured() && 'SMS', emailConfigured() && 'email'].filter(Boolean).join(' and ') + '.' : 'Use WhatsApp above, or set up SMS or email in the Vercel settings to send automatically.'}
            </p>
            {canAutoSend && open && (
              <form action={sendInvoiceReminder}><input type="hidden" name="id" value={inv.id} /><SubmitButton className="btn-secondary" pendingText="Sending…">Send invoice / reminder</SubmitButton></form>
            )}
            {!!reminders?.length && (
              <ul className="text-xs text-muted">
                {reminders.map((r: any) => <li key={r.id}>{new Date(r.created_at).toLocaleString('en-GB', { timeZone: 'Africa/Dar_es_Salaam' })} · {r.channel.toUpperCase()} · {r.status}</li>)}
              </ul>
            )}
          </section>

          {inv.status !== 'void' && inv.status !== 'paid' && (
            <div className="flex flex-wrap gap-2">
              {inv.status === 'draft' ? (
                <form action={deleteDraft}><input type="hidden" name="id" value={inv.id} /><SubmitButton className="btn-danger" pendingText="…">Delete draft</SubmitButton></form>
              ) : Number(inv.amount_paid) === 0 ? (
                <form action={setInvoiceStatus}><input type="hidden" name="id" value={inv.id} /><input type="hidden" name="status" value="void" /><SubmitButton className="btn-danger" pendingText="…">Void invoice</SubmitButton></form>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

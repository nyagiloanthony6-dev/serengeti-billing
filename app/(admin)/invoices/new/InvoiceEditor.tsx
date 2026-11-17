'use client';
import { useMemo, useState } from 'react';
import { createInvoice, updateInvoice } from '../../../actions';
import { tzs } from '@/lib/format';
import type { Product } from '@/lib/types';

type Line = { description: string; quantity: number; unit_price: number; kind: string; subscription_id?: string | null };

export type EditingInvoice = { id: string; number: string; status: string; client_id: string; client_name: string; amount_paid: number; notes: string; lines: Line[] };

export function InvoiceEditor(props: { clients: { id: string; name: string }[]; products: Product[]; defaultClient: string; issueDate: string; dueDate: string; vatRate: number; invoice?: EditingInvoice }) {
  const ed = props.invoice;
  const [lines, setLines] = useState<Line[]>(ed?.lines.length ? ed.lines : [{ description: '', quantity: 1, unit_price: 0, kind: 'other' }]);
  const [vat, setVat] = useState(props.vatRate);
  const subtotal = useMemo(() => lines.reduce((a, l) => a + Number(l.quantity || 0) * Number(l.unit_price || 0), 0), [lines]);
  const vatAmt = Math.round(subtotal * vat) / 100;

  const set = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const addProduct = (id: string, kind: 'setup' | 'training' | 'monthly') => {
    const p = props.products.find((x) => x.id === id);
    if (!p) return;
    const price = kind === 'setup' ? p.setup_fee : kind === 'training' ? p.training_fee : p.monthly_fee;
    const label = kind === 'setup' ? 'setup fee' : kind === 'training' ? 'training' : 'monthly subscription';
    setLines((ls) => [...ls.filter((l) => l.description || l.unit_price), { description: `${p.name} · ${label}`, quantity: 1, unit_price: Number(price), kind }]);
  };
  const [qp, setQp] = useState(props.products[0]?.id ?? '');

  return (
    <form action={ed ? updateInvoice : createInvoice} className="grid gap-6">
      <input type="hidden" name="items" value={JSON.stringify(lines)} />
      {ed && <input type="hidden" name="id" value={ed.id} />}
      <section className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
        {ed ? (
          <div className="label sm:col-span-2">Client
            <p className="input bg-sunk">{ed.client_name}</p>
          </div>
        ) : (
          <label className="label sm:col-span-2" htmlFor="inv-client">Client
            <select id="inv-client" name="client_id" required defaultValue={props.defaultClient} className="input">
              <option value="" disabled>Choose a client</option>
              {props.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        )}
        <label className="label" htmlFor="inv-issue">Issue date<input id="inv-issue" name="issue_date" type="date" defaultValue={props.issueDate} className="input" /></label>
        <label className="label" htmlFor="inv-due">Due date<input id="inv-due" name="due_date" type="date" defaultValue={props.dueDate} className="input" /></label>
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 border-b border-line p-5">
          <label className="label" htmlFor="qp">Quick add from a product
            <select id="qp" className="input" value={qp} onChange={(e) => setQp(e.target.value)}>
              {props.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <button type="button" className="btn-secondary" onClick={() => addProduct(qp, 'setup')}>+ Setup fee</button>
          <button type="button" className="btn-secondary" onClick={() => addProduct(qp, 'training')}>+ Training</button>
          <button type="button" className="btn-secondary" onClick={() => addProduct(qp, 'monthly')}>+ Monthly fee</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead><tr><th className="th">Description</th><th className="th w-24">Qty</th><th className="th w-40">Unit price (TSh)</th><th className="th w-36 text-right">Amount</th><th className="th w-12"><span className="sr-only">Remove</span></th></tr></thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td className="td"><label className="sr-only" htmlFor={`d${i}`}>Description</label><input id={`d${i}`} className="input" value={l.description} onChange={(e) => set(i, { description: e.target.value })} placeholder="e.g. TheDashboard · monthly subscription" /></td>
                  <td className="td"><label className="sr-only" htmlFor={`q${i}`}>Quantity</label><input id={`q${i}`} className="input num" type="number" min={0} step="any" value={l.quantity} onChange={(e) => set(i, { quantity: Number(e.target.value) })} /></td>
                  <td className="td"><label className="sr-only" htmlFor={`p${i}`}>Unit price</label><input id={`p${i}`} className="input num" type="number" min={0} step="any" value={l.unit_price} onChange={(e) => set(i, { unit_price: Number(e.target.value) })} /></td>
                  <td className="td num text-right font-medium">{tzs(Number(l.quantity || 0) * Number(l.unit_price || 0))}</td>
                  <td className="td"><button type="button" aria-label="Remove line" className="rounded-lg px-2 py-1 text-muted hover:bg-coral-soft hover:text-coral-ink" onClick={() => setLines((ls) => (ls.length > 1 ? ls.filter((_, j) => j !== i) : ls))}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-6 border-t border-line p-5">
          <button type="button" className="btn-secondary" onClick={() => setLines((ls) => [...ls, { description: '', quantity: 1, unit_price: 0, kind: 'other' }])}>+ Add line</button>
          <dl className="grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-sm">
            <dt className="text-muted">Subtotal</dt><dd className="num text-right">{tzs(subtotal)}</dd>
            <dt className="flex items-center gap-2 text-muted"><label htmlFor="vat">VAT %</label><input id="vat" name="vat_rate" type="number" min={0} step="any" value={vat} onChange={(e) => setVat(Number(e.target.value))} className="input num w-20 py-1" /></dt><dd className="num text-right">{tzs(vatAmt)}</dd>
            <dt className="font-semibold">Total</dt><dd className="num text-right text-lg font-bold">{tzs(subtotal + vatAmt)}</dd>
          </dl>
        </div>
      </section>

      <label className="label" htmlFor="inv-notes">Notes on the invoice (optional)<textarea id="inv-notes" name="notes" rows={2} defaultValue={ed?.notes ?? ''} className="input" /></label>
      {ed && Number(ed.amount_paid) > 0 && (
        <p className="rounded-xl bg-saffron-soft px-4 py-3 text-sm text-saffron-ink">This invoice already has {tzs(ed.amount_paid)} paid. The balance will be worked out again from the new total.</p>
      )}
      {ed ? (
        <div className="flex flex-wrap gap-3">
          <button type="submit" name="intent" value="save" className="btn-primary">Save changes</button>
          {ed.status === 'draft' && <button type="submit" name="intent" value="send" className="btn-secondary">Save and mark as sent</button>}
          <a href={`/invoices/${ed.id}`} className="btn-secondary">Cancel</a>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button type="submit" name="intent" value="send" className="btn-primary">Create invoice</button>
          <button type="submit" name="intent" value="draft" className="btn-secondary">Save as draft</button>
        </div>
      )}
    </form>
  );
}

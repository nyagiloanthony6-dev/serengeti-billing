'use client';
import { useState } from 'react';
import { addSubscription } from '../../../actions';
import { SubmitButton } from '@/components/SubmitButton';
import type { Product } from '@/lib/types';

export function SubscriptionForm({ clientId, products, today }: { clientId: string; products: Product[]; today: string }) {
  const [pid, setPid] = useState(products[0]?.id ?? '');
  const p = products.find((x) => x.id === pid);
  return (
    <form action={addSubscription} className="grid gap-4" key={pid}>
      <input type="hidden" name="client_id" value={clientId} />
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="label" htmlFor="sub-product">Product
          <select id="sub-product" name="product_id" className="input" value={pid} onChange={(e) => setPid(e.target.value)}>
            {products.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
        <label className="label" htmlFor="sub-start">Start date<input id="sub-start" name="start_date" type="date" defaultValue={today} className="input" /></label>
        <label className="label" htmlFor="sub-day">Bill on day of month<input id="sub-day" name="billing_day" type="number" min={1} max={28} defaultValue={Number(today.slice(8, 10)) > 28 ? 1 : Number(today.slice(8, 10))} className="input" /></label>
        <label className="label" htmlFor="sub-setup">Setup fee (TSh)<input id="sub-setup" name="setup_fee" inputMode="decimal" defaultValue={p?.setup_fee ?? 0} className="input num" /></label>
        <label className="label" htmlFor="sub-training">Training fee (TSh)<input id="sub-training" name="training_fee" inputMode="decimal" defaultValue={p?.training_fee ?? 0} className="input num" /></label>
        <label className="label" htmlFor="sub-monthly">Monthly fee (TSh)<input id="sub-monthly" name="monthly_fee" inputMode="decimal" defaultValue={p?.monthly_fee ?? 0} className="input num" /></label>
      </div>
      <p className="text-xs text-muted">Prices start from the product's list price; change them here for this client. Setup and training are billed once, on the first invoice.</p>
      <div><SubmitButton>Add subscription</SubmitButton></div>
    </form>
  );
}

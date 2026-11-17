import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { SubmitButton } from '@/components/SubmitButton';
import { saveProduct } from '../../actions';

export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  await requireAdmin();
  const supabase = createClient();
  const { data: products } = await supabase.from('products').select('*').order('name');
  return (
    <>
      <PageHeader kicker="Products & prices" title="Products" />
      <p className="mb-6 max-w-2xl text-sm text-muted">These are your list prices. When you add a product to a client, these fill in automatically and you can change them for that client.</p>
      <div className="grid gap-4">
        {(products ?? []).map((p: any) => (
          <form key={p.id} action={saveProduct} className="card grid gap-4 p-5 lg:grid-cols-[1.3fr_0.6fr_repeat(3,minmax(0,0.8fr))_auto] lg:items-end">
            <input type="hidden" name="id" value={p.id} />
            <label className="label" htmlFor={`n-${p.id}`}>Name<input id={`n-${p.id}`} name="name" defaultValue={p.name} className="input font-semibold" /></label>
            <label className="label" htmlFor={`c-${p.id}`}>Code<input id={`c-${p.id}`} name="code" defaultValue={p.code} className="input font-mono" /></label>
            <label className="label" htmlFor={`s-${p.id}`}>Setup fee<input id={`s-${p.id}`} name="setup_fee" inputMode="decimal" defaultValue={p.setup_fee} className="input num" /></label>
            <label className="label" htmlFor={`t-${p.id}`}>Training fee<input id={`t-${p.id}`} name="training_fee" inputMode="decimal" defaultValue={p.training_fee} className="input num" /></label>
            <label className="label" htmlFor={`m-${p.id}`}>Monthly fee<input id={`m-${p.id}`} name="monthly_fee" inputMode="decimal" defaultValue={p.monthly_fee} className="input num" /></label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm" htmlFor={`a-${p.id}`}><input id={`a-${p.id}`} type="checkbox" name="active" defaultChecked={p.active} className="h-4 w-4 accent-indigo" />Active</label>
              <SubmitButton className="btn-secondary" pendingText="…">Save</SubmitButton>
            </div>
            <input type="hidden" name="description" value={p.description ?? ''} />
          </form>
        ))}
      </div>
      <details className="card mt-6 p-5">
        <summary className="cursor-pointer font-semibold">Add a product</summary>
        <form action={saveProduct} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
          <label className="label" htmlFor="np-name">Name<input id="np-name" name="name" required className="input" /></label>
          <label className="label" htmlFor="np-code">Code<input id="np-code" name="code" required className="input font-mono" /></label>
          <label className="label" htmlFor="np-setup">Setup fee<input id="np-setup" name="setup_fee" inputMode="decimal" defaultValue={0} className="input num" /></label>
          <label className="label" htmlFor="np-training">Training fee<input id="np-training" name="training_fee" inputMode="decimal" defaultValue={0} className="input num" /></label>
          <label className="label" htmlFor="np-monthly">Monthly fee<input id="np-monthly" name="monthly_fee" inputMode="decimal" defaultValue={0} className="input num" /></label>
          <div><SubmitButton>Add product</SubmitButton></div>
        </form>
      </details>
    </>
  );
}

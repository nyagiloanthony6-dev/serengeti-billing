import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { tzs } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { ClientForm } from './ClientForm';

export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
  const supabase = createClient();
  const [{ data: clients }, { data: balances }, { data: subs }] = await Promise.all([
    supabase.from('clients').select('*').order('name'),
    supabase.from('client_balances').select('*'),
    supabase.from('subscriptions').select('client_id, status, products(name)').eq('status', 'active'),
  ]);
  const bal = new Map((balances ?? []).map((b: any) => [b.client_id, b]));
  const prods = new Map<string, string[]>();
  (subs ?? []).forEach((s: any) => prods.set(s.client_id, [...(prods.get(s.client_id) ?? []), s.products?.name]));

  return (
    <>
      <PageHeader kicker="Clients" title={`${clients?.length ?? 0} clients`} />
      <details className="card mb-6 p-5 open:pb-6">
        <summary className="cursor-pointer font-semibold">Add a client</summary>
        <div className="mt-4"><ClientForm /></div>
      </details>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[720px]">
          <thead><tr><th className="th">Client</th><th className="th">Products</th><th className="th">Phone</th><th className="th text-right">Outstanding</th><th className="th text-right">Overdue</th></tr></thead>
          <tbody>
            {(clients ?? []).map((c: any) => {
              const b: any = bal.get(c.id);
              return (
                <tr key={c.id} className="hover:bg-canvas">
                  <td className="td"><Link href={`/clients/${c.id}`} className="font-medium text-indigo hover:underline">{c.name}</Link>{c.contact_person && <p className="text-xs text-muted">{c.contact_person}</p>}</td>
                  <td className="td text-muted">{(prods.get(c.id) ?? []).join(', ') || '—'}</td>
                  <td className="td num">{c.phone || '—'}</td>
                  <td className="td num text-right">{tzs(b?.outstanding)}</td>
                  <td className={`td num text-right ${Number(b?.overdue) > 0 ? 'font-semibold text-coral-ink' : 'text-muted'}`}>{tzs(b?.overdue)}</td>
                </tr>
              );
            })}
            {!clients?.length && <tr><td colSpan={5} className="td py-12 text-center text-muted">No clients yet. Add your first client above.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

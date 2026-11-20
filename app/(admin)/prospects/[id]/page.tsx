import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import { fmtDate, todayTZ } from '@/lib/format';
import { FOLLOWUP_METHOD, PROSPECT_STATUS, STATUS_ORDER, intlPhone } from '@/lib/prospects';
import { PageHeader } from '@/components/PageHeader';
import { ProspectBadge, FollowupDate } from '@/components/ProspectBadge';
import { SubmitButton } from '@/components/SubmitButton';
import { ProspectForm } from '../ProspectForm';
import { addFollowup, convertToClient, deleteProspect } from '../../../sales-actions';

export const dynamic = 'force-dynamic';

export default async function ProspectPage({ params, searchParams }: { params: { id: string }; searchParams: { added?: string } }) {
  const s = await requireStaff();
  const isAdmin = s.role === 'admin';
  const supabase = createClient();
  const today = todayTZ();
  const [{ data: p }, { data: fups }, { data: products }, { data: staff }] = await Promise.all([
    supabase.from('prospects').select('*, sales_staff(full_name, phone)').eq('id', params.id).single(),
    supabase.from('prospect_followups').select('*').eq('prospect_id', params.id).order('done_on', { ascending: false }).order('created_at', { ascending: false }),
    supabase.from('products').select('name').eq('active', true).order('name'),
    isAdmin ? supabase.from('sales_staff').select('user_id, full_name').order('full_name') : Promise.resolve({ data: null }),
  ]);
  if (!p) notFound();
  const tel = intlPhone(p.phone);
  const closed = p.status === 'won' || p.status === 'lost';
  const productNames = Array.from(new Set([...(products ?? []).map((x: any) => x.name), ...(p.products ?? [])]));

  return (
    <>
      <p className="mb-2 text-sm"><Link href="/prospects" className="text-muted hover:text-ink">← {isAdmin ? 'Prospects' : 'My prospects'}</Link></p>
      <PageHeader kicker={<ProspectBadge status={p.status} />} title={p.business_name}>
        {tel && <a href={`tel:+${tel}`} className="btn-secondary">Call</a>}
        {tel && <a href={`https://wa.me/${tel}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">WhatsApp</a>}
        {p.latitude != null && <a href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`} target="_blank" rel="noopener noreferrer" className="btn-secondary">Map</a>}
      </PageHeader>

      {searchParams.added && (
        <p role="status" className="mb-4 rounded-xl bg-teal-soft px-4 py-3 text-sm font-medium text-teal-ink">Prospect saved. Log each call or visit below as you follow up.</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid content-start gap-6">
          <section className="card p-5">
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-muted">Contact person</dt><dd className="mt-0.5 font-medium">{p.contact_person || '—'}</dd></div>
              <div><dt className="text-xs text-muted">Phone</dt><dd className="num mt-0.5 font-medium">{p.phone || '—'}</dd></div>
              <div><dt className="text-xs text-muted">Location</dt><dd className="mt-0.5 font-medium">{p.location || '—'}{p.latitude != null && <span className="ml-2 text-xs font-normal text-teal-ink">GPS pinned</span>}</dd></div>
              <div><dt className="text-xs text-muted">Product pitched</dt><dd className="mt-1 flex flex-wrap gap-1">{(p.products ?? []).length ? p.products.map((n: string) => <span key={n} className="rounded-full bg-sunk px-2 py-0.5 text-xs font-medium">{n}</span>) : '—'}</dd></div>
              {(p.route_origin || (p.route_destinations ?? []).length > 0) && (
                <div className="sm:col-span-2"><dt className="text-xs text-muted">Shehena route</dt>
                  <dd className="mt-1 flex flex-wrap items-center gap-1.5 text-sm">
                    <span className="rounded-full bg-indigo-soft px-2.5 py-0.5 font-semibold text-indigo">{p.route_origin || 'Origin not set'}</span>
                    <span aria-hidden="true" className="text-muted">→</span>
                    {(p.route_destinations ?? []).length
                      ? p.route_destinations.map((d: string) => <span key={d} className="rounded-full bg-sunk px-2.5 py-0.5 font-medium">{d}</span>)
                      : <span className="text-muted">No destinations yet</span>}
                  </dd>
                </div>
              )}
              <div><dt className="text-xs text-muted">Day visited</dt><dd className="mt-0.5 font-medium">{fmtDate(p.visited_on)}</dd></div>
              <div><dt className="text-xs text-muted">Next follow-up</dt><dd className="mt-0.5"><FollowupDate date={p.next_followup} today={today} closed={closed} /></dd></div>
              {isAdmin && <div><dt className="text-xs text-muted">Sales officer</dt><dd className="mt-0.5 font-medium">{p.sales_staff?.full_name ?? '—'}</dd></div>}
              {p.client_id && <div><dt className="text-xs text-muted">Client</dt><dd className="mt-0.5"><Link href={`/clients/${p.client_id}`} className="font-medium text-indigo underline">Open client</Link></dd></div>}
            </dl>
            {p.notes && <p className="mt-4 whitespace-pre-line border-t border-line pt-4 text-sm">{p.notes}</p>}
          </section>

          <section className="card p-5">
            <h2 className="font-semibold">Follow-ups</h2>
            <ol className="mt-4 grid gap-0">
              {(fups ?? []).map((f: any) => (
                <li key={f.id} className="relative border-l-2 border-line pb-5 pl-5 last:pb-0">
                  <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-indigo bg-white" />
                  <p className="text-sm"><span className="font-semibold">{FOLLOWUP_METHOD[f.method] ?? f.method}</span> <span className="text-muted">· {fmtDate(f.done_on)}</span></p>
                  {f.outcome && <p className="mt-1 whitespace-pre-line text-sm">{f.outcome}</p>}
                  {f.next_followup && <p className="mt-1 text-xs text-muted">Next follow-up set for {fmtDate(f.next_followup)}</p>}
                </li>
              ))}
              <li className="relative border-l-2 border-transparent pl-5">
                <span className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-indigo" />
                <p className="text-sm"><span className="font-semibold">First visit</span> <span className="text-muted">· {fmtDate(p.visited_on)}</span></p>
                <p className="mt-1 text-xs text-muted">Pitched {(p.products ?? []).join(', ') || 'no product recorded'}</p>
              </li>
            </ol>
          </section>

          <details className="card p-5">
            <summary className="cursor-pointer font-semibold">Edit prospect details</summary>
            <div className="mt-4">
              <ProspectForm prospect={p} products={productNames} staff={isAdmin ? (staff as any[]) : undefined} today={today} />
            </div>
          </details>
        </div>

        <aside className="grid content-start gap-6">
          <section className="card p-5">
            <h2 className="font-semibold">Log a follow-up</h2>
            <form action={addFollowup} className="mt-4 grid gap-3">
              <input type="hidden" name="prospect_id" value={p.id} />
              <div className="grid grid-cols-2 gap-3">
                <label className="label" htmlFor="f-method">How
                  <select id="f-method" name="method" className="input">
                    {Object.entries(FOLLOWUP_METHOD).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </label>
                <label className="label" htmlFor="f-date">Date
                  <input id="f-date" name="done_on" type="date" defaultValue={today} max={today} className="input" />
                </label>
              </div>
              <label className="label" htmlFor="f-outcome">What happened
                <textarea id="f-outcome" name="outcome" rows={3} required className="input" placeholder="e.g. Asked for a demo on Friday with the owner" />
              </label>
              <label className="label" htmlFor="f-status">Status now
                <select id="f-status" name="status" defaultValue={p.status} className="input">
                  {STATUS_ORDER.map((k) => <option key={k} value={k}>{PROSPECT_STATUS[k].label}</option>)}
                </select>
              </label>
              <label className="label" htmlFor="f-next">Next follow-up
                <input id="f-next" name="next_followup" type="date" min={today} className="input" />
              </label>
              <SubmitButton>Save follow-up</SubmitButton>
            </form>
          </section>

          {isAdmin && !p.client_id && (
            <section className="card p-5">
              <h2 className="font-semibold">Ready to bill?</h2>
              <p className="mt-1 text-sm text-muted">Creates a client with these details and marks the prospect as won. Then add their subscription.</p>
              <form action={convertToClient} className="mt-3">
                <input type="hidden" name="id" value={p.id} />
                <SubmitButton pendingText="Creating…">Make this a client</SubmitButton>
              </form>
            </section>
          )}

          {isAdmin && (
            <details className="text-right">
              <summary className="cursor-pointer text-sm font-medium text-coral-ink">Delete prospect</summary>
              <form action={deleteProspect} className="mt-2">
                <input type="hidden" name="id" value={p.id} />
                <p className="mb-2 text-xs text-muted">This removes the prospect and all its follow-ups.</p>
                <SubmitButton className="btn-danger" pendingText="Deleting…">Yes, delete</SubmitButton>
              </form>
            </details>
          )}
        </aside>
      </div>
    </>
  );
}

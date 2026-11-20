import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import { fmtDate, todayTZ } from '@/lib/format';
import { PROSPECT_STATUS, STATUS_ORDER, intlPhone } from '@/lib/prospects';
import { PageHeader } from '@/components/PageHeader';
import { ProspectBadge, FollowupDate } from '@/components/ProspectBadge';
import { SubmitButton } from '@/components/SubmitButton';
import { deleteProspect } from '../../sales-actions';

export const dynamic = 'force-dynamic';

type SP = { status?: string; staff?: string; q?: string; view?: string; product?: string };

export default async function ProspectsPage({ searchParams }: { searchParams: SP }) {
  const s = await requireStaff();
  const isAdmin = s.role === 'admin';
  const supabase = createClient();
  const today = todayTZ();
  const monthStart = today.slice(0, 8) + '01';

  let q = supabase.from('prospects').select('*, sales_staff(full_name)').order('updated_at', { ascending: false }).limit(500);
  if (searchParams.status) q = q.eq('status', searchParams.status);
  if (searchParams.product) q = q.contains('products', [searchParams.product]);
  if (isAdmin && searchParams.staff) q = q.eq('sales_user_id', searchParams.staff);
  if (searchParams.q) {
    const t = searchParams.q.replace(/[%,()]/g, ' ');
    q = q.or(`business_name.ilike.%${t}%,contact_person.ilike.%${t}%,phone.ilike.%${t}%,location.ilike.%${t}%`);
  }
  if (searchParams.view === 'due') q = q.lte('next_followup', today).not('status', 'in', '(won,lost)');

  const [{ data: rows }, { data: all }, { data: staff }, { data: products }] = await Promise.all([
    q,
    (() => {
      let a = supabase.from('prospects').select('status, visited_on, next_followup, sales_user_id');
      if (isAdmin && searchParams.staff) a = a.eq('sales_user_id', searchParams.staff);
      if (searchParams.product) a = a.contains('products', [searchParams.product]);
      return a;
    })(),
    isAdmin ? supabase.from('sales_staff').select('user_id, full_name').order('full_name') : Promise.resolve({ data: null }),
    supabase.from('products').select('name').order('name'),
  ]);

  const list = all ?? [];
  const open = (p: any) => p.status !== 'won' && p.status !== 'lost';
  const stats = [
    { label: 'Prospects', value: list.length, sub: `${list.filter(open).length} still open` },
    { label: 'Visited this month', value: list.filter((p) => p.visited_on >= monthStart).length, sub: 'New contacts' },
    { label: 'Follow-ups due', value: list.filter((p) => open(p) && p.next_followup && p.next_followup <= today).length, sub: 'Today or overdue', alert: true, href: '?view=due' },
    { label: 'Won', value: list.filter((p) => p.status === 'won').length, sub: 'Became clients' },
  ];

  const qs = (patch: Partial<SP>) => {
    const u = new URLSearchParams();
    const m = { ...searchParams, ...patch };
    Object.entries(m).forEach(([k, v]) => v && u.set(k, v));
    const str = u.toString();
    return str ? `?${str}` : '/prospects';
  };

  return (
    <>
      <PageHeader kicker={isAdmin ? 'Sales' : `Hi ${s.name.split(' ')[0]}`} title={isAdmin ? 'Prospects' : 'My prospects'}>
        <Link href="/prospects/new" className="btn-primary">Add prospect</Link>
      </PageHeader>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((t) => {
          const inner = (
            <>
              <p className="text-xs text-muted">{t.label}</p>
              <p className={`num mt-1 text-2xl font-bold ${t.alert && t.value > 0 ? 'text-coral-ink' : ''}`}>{t.value}</p>
              <p className="text-xs text-muted">{t.sub}</p>
            </>
          );
          return t.href
            ? <Link key={t.label} href={t.href} className="card p-4 hover:border-ink">{inner}</Link>
            : <div key={t.label} className="card p-4">{inner}</div>;
        })}
      </div>

      <form className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto] sm:items-end">
        <label className="label" htmlFor="pq">Search
          <input id="pq" name="q" defaultValue={searchParams.q ?? ''} placeholder="Name, phone or location" className="input" />
        </label>
        <label className="label" htmlFor="pstatus">Status
          <select id="pstatus" name="status" defaultValue={searchParams.status ?? ''} className="input">
            <option value="">All</option>
            {STATUS_ORDER.map((k) => <option key={k} value={k}>{PROSPECT_STATUS[k].label}</option>)}
          </select>
        </label>
        <label className="label" htmlFor="pproduct">Product
          <select id="pproduct" name="product" defaultValue={searchParams.product ?? ''} className="input">
            <option value="">All products</option>
            {(products ?? []).map((x: any) => <option key={x.name} value={x.name}>{x.name}</option>)}
          </select>
        </label>
        {isAdmin && (
          <label className="label" htmlFor="pstaff">Sales officer
            <select id="pstaff" name="staff" defaultValue={searchParams.staff ?? ''} className="input">
              <option value="">Everyone</option>
              {(staff ?? []).map((m: any) => <option key={m.user_id} value={m.user_id}>{m.full_name}</option>)}
            </select>
          </label>
        )}
        {searchParams.view && <input type="hidden" name="view" value={searchParams.view} />}
        <div className="flex gap-2">
          <button className="btn-secondary">Filter</button>
          {(searchParams.q || searchParams.status || searchParams.staff || searchParams.view || searchParams.product) && <Link href="/prospects" className="btn-secondary">Clear</Link>}
        </div>
      </form>

      {searchParams.view === 'due' && (
        <p className="mb-3 text-sm"><span className="font-semibold">Showing follow-ups due today or overdue.</span> <Link href={qs({ view: undefined })} className="text-indigo underline">Show all</Link></p>
      )}

      <ul className="grid gap-3">
        {(rows ?? []).map((p: any) => {
          const tel = intlPhone(p.phone);
          return (
            <li key={p.id} className="card p-4 hover:border-ink sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/prospects/${p.id}`} className="text-base font-semibold text-indigo hover:underline">{p.business_name}</Link>
                  <p className="mt-0.5 text-sm text-muted">
                    {[p.contact_person, p.phone].filter(Boolean).join(' · ') || 'No contact saved'}
                  </p>
                  <p className="mt-0.5 text-sm text-muted">{p.location || 'No location'}</p>
                  {(p.route_origin || (p.route_destinations ?? []).length > 0) && (
                    <p className="mt-0.5 text-sm"><span className="text-muted">Route:</span> <span className="font-medium">{p.route_origin || '?'} → {(p.route_destinations ?? []).join(', ') || '?'}</span></p>
                  )}
                </div>
                <ProspectBadge status={p.status} />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
                {(p.products ?? []).length > 0 && (
                  <span className="flex flex-wrap gap-1">{p.products.map((n: string) => <Link key={n} href={qs({ product: n })} className={`rounded-full px-2 py-0.5 font-medium ${searchParams.product === n ? 'bg-indigo text-white' : 'bg-sunk hover:bg-indigo-soft hover:text-indigo'}`}>{n}</Link>)}</span>
                )}
                <span className="text-muted">Visited <span className="font-medium text-ink">{fmtDate(p.visited_on)}</span></span>
                <span className="text-muted">Follow-up <FollowupDate date={p.next_followup} today={today} closed={!open(p)} /></span>
                {isAdmin && <span className="text-muted">By <span className="font-medium text-ink">{p.sales_staff?.full_name ?? '—'}</span></span>}
                <span className="ml-auto flex flex-wrap items-center justify-end gap-2">
                  {tel && <a href={`tel:+${tel}`} className="btn-secondary min-h-[32px] px-3 py-1 text-xs">Call</a>}
                  {tel && <a href={`https://wa.me/${tel}`} target="_blank" rel="noopener noreferrer" className="btn-secondary min-h-[32px] px-3 py-1 text-xs">WhatsApp</a>}
                  {isAdmin && (
                    <details className="relative">
                      <summary className="btn-secondary min-h-[32px] cursor-pointer list-none px-3 py-1 text-xs text-coral-ink [&::-webkit-details-marker]:hidden">Delete</summary>
                      <form action={deleteProspect} className="absolute right-0 z-10 mt-2 grid w-60 gap-2 rounded-xl border border-line bg-white p-3 text-left shadow-lg">
                        <input type="hidden" name="id" value={p.id} />
                        <input type="hidden" name="back" value="list" />
                        <p className="text-xs">Delete <span className="font-semibold">{p.business_name}</span> and all its follow-ups? This can&apos;t be undone.</p>
                        <SubmitButton className="btn-danger min-h-[32px] px-3 py-1 text-xs" pendingText="Deleting…">Yes, delete</SubmitButton>
                      </form>
                    </details>
                  )}
                </span>
              </div>
            </li>
          );
        })}
        {!rows?.length && (
          <li className="card px-4 py-12 text-center text-sm text-muted">
            {searchParams.q || searchParams.status || searchParams.view || searchParams.product ? 'No prospects match these filters.' : 'No prospects yet. Add the first business you visited.'}
          </li>
        )}
      </ul>
    </>
  );
}

'use client';
import { useState } from 'react';
import { saveProspect } from '../../sales-actions';
import { SubmitButton } from '@/components/SubmitButton';
import { PROSPECT_STATUS, STATUS_ORDER } from '@/lib/prospects';

type Staff = { user_id: string; full_name: string };
type P = {
  id?: string; business_name?: string; contact_person?: string | null; phone?: string | null; location?: string | null;
  latitude?: number | null; longitude?: number | null; products?: string[]; visited_on?: string; status?: string;
  next_followup?: string | null; notes?: string | null; sales_user_id?: string;
  route_origin?: string | null; route_destinations?: string[] | null;
};

export const isShehena = (name: string) => /shehena/i.test(name);

export function ProspectForm({ prospect, products, staff, today }: { prospect?: P; products: string[]; staff?: Staff[]; today: string }) {
  const p = prospect ?? {};
  const [lat, setLat] = useState(p.latitude?.toString() ?? '');
  const [lng, setLng] = useState(p.longitude?.toString() ?? '');
  const [gps, setGps] = useState<'idle' | 'busy' | 'err'>('idle');
  const [picked, setPicked] = useState<string[]>(p.products ?? []);
  const [dests, setDests] = useState<string[]>(p.route_destinations?.length ? p.route_destinations : ['']);
  const showRoute = picked.some(isShehena);
  const toggle = (name: string, on: boolean) => setPicked((xs) => (on ? [...xs, name] : xs.filter((x) => x !== name)));
  const id = (k: string) => `pf-${p.id?.slice(0, 6) ?? 'new'}-${k}`;

  function locate() {
    if (!navigator.geolocation) return setGps('err');
    setGps('busy');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude.toFixed(6)); setLng(pos.coords.longitude.toFixed(6)); setGps('idle'); },
      () => setGps('err'),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  return (
    <form action={saveProspect} className="grid gap-4">
      {p.id && <input type="hidden" name="id" value={p.id} />}
      <input type="hidden" name="latitude" value={lat} />
      <input type="hidden" name="longitude" value={lng} />

      {staff && (
        <label className="label" htmlFor={id('staff')}>Sales officer
          <select id={id('staff')} name="sales_user_id" required={!p.id} defaultValue={p.sales_user_id ?? ''} className="input">
            <option value="" disabled>Choose…</option>
            {staff.map((s) => <option key={s.user_id} value={s.user_id}>{s.full_name}</option>)}
          </select>
        </label>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="label" htmlFor={id('name')}>Business name
          <input id={id('name')} name="business_name" required defaultValue={p.business_name} className="input" placeholder="e.g. Neema Hardware" />
        </label>
        <label className="label" htmlFor={id('contact')}>Contact person
          <input id={id('contact')} name="contact_person" defaultValue={p.contact_person ?? ''} className="input" placeholder="Who you spoke to" />
        </label>
        <label className="label" htmlFor={id('phone')}>Phone number
          <input id={id('phone')} name="phone" type="tel" inputMode="tel" defaultValue={p.phone ?? ''} className="input" placeholder="0754 000 000" />
        </label>
        <div className="label">
          <label htmlFor={id('loc')}>Location</label>
          <input id={id('loc')} name="location" defaultValue={p.location ?? ''} className="input" placeholder="e.g. Kariakoo, Msimbazi St" />
          <div className="flex flex-wrap items-center gap-2 text-xs font-normal">
            <button type="button" onClick={locate} className="btn-secondary min-h-[32px] px-3 py-1 text-xs">
              {gps === 'busy' ? 'Getting location…' : lat ? 'Update GPS pin' : 'Add GPS pin'}
            </button>
            {lat && <span className="text-teal-ink">Pinned {lat}, {lng}</span>}
            {gps === 'err' && <span className="text-coral-ink">Couldn&apos;t get location. Allow location access and try again.</span>}
          </div>
        </div>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-medium">Product pitched</legend>
        <div className="flex flex-wrap gap-2">
          {products.map((name) => (
            <label key={name} className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5 text-sm has-[:checked]:border-indigo has-[:checked]:bg-indigo-soft has-[:checked]:text-indigo">
              <input type="checkbox" name="products" value={name} checked={picked.includes(name)} onChange={(e) => toggle(name, e.target.checked)} className="accent-indigo" />
              {name}
            </label>
          ))}
        </div>
      </fieldset>

      {showRoute && (
        <fieldset className="grid gap-3 rounded-2xl border border-line bg-sunk/60 p-4">
          <legend className="px-1 text-sm font-medium">Shehena route</legend>
          <p className="-mt-1 text-xs text-muted">Where they load goods, and every place they deliver to.</p>
          <label className="label" htmlFor={id('origin')}>From (origin)
            <input id={id('origin')} name="route_origin" defaultValue={p.route_origin ?? ''} className="input" placeholder="e.g. Kariakoo, Dar es Salaam" />
          </label>
          <div className="grid gap-2">
            <span className="text-sm font-medium">To (destinations)</span>
            {dests.map((d, i) => (
              <div key={i} className="flex gap-2">
                <label className="sr-only" htmlFor={id(`dest${i}`)}>Destination {i + 1}</label>
                <input
                  id={id(`dest${i}`)}
                  name="route_destinations"
                  value={d}
                  onChange={(e) => setDests((xs) => xs.map((x, j) => (j === i ? e.target.value : x)))}
                  className="input"
                  placeholder={['e.g. Dodoma', 'e.g. Mwanza', 'e.g. Mbeya', 'e.g. Arusha'][i % 4]}
                />
                {dests.length > 1 && (
                  <button type="button" aria-label={`Remove destination ${i + 1}`} onClick={() => setDests((xs) => xs.filter((_, j) => j !== i))} className="rounded-lg px-3 text-muted hover:bg-coral-soft hover:text-coral-ink">✕</button>
                )}
              </div>
            ))}
            <div><button type="button" onClick={() => setDests((xs) => [...xs, ''])} className="btn-secondary min-h-[32px] px-3 py-1 text-xs">+ Add destination</button></div>
          </div>
        </fieldset>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <label className="label" htmlFor={id('visited')}>Day visited
          <input id={id('visited')} name="visited_on" type="date" required defaultValue={p.visited_on ?? today} max={today} className="input" />
        </label>
        <label className="label" htmlFor={id('status')}>Status
          <select id={id('status')} name="status" defaultValue={p.status ?? 'new'} className="input">
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{PROSPECT_STATUS[s].label}</option>)}
          </select>
        </label>
        <label className="label" htmlFor={id('next')}>Next follow-up
          <input id={id('next')} name="next_followup" type="date" defaultValue={p.next_followup ?? ''} min={today} className="input" />
        </label>
      </div>

      <label className="label" htmlFor={id('notes')}>Notes
        <textarea id={id('notes')} name="notes" rows={3} defaultValue={p.notes ?? ''} className="input" placeholder="What they said, what they use now, number of shops or trucks…" />
      </label>

      <div><SubmitButton>{p.id ? 'Save changes' : 'Save prospect'}</SubmitButton></div>
    </form>
  );
}

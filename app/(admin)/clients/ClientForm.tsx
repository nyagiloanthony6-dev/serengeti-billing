import { saveClient } from '../../actions';
import { SubmitButton } from '@/components/SubmitButton';
import type { Client } from '@/lib/types';

export function ClientForm({ client }: { client?: Client }) {
  const p = client?.id ? `c-${client.id.slice(0, 6)}-` : 'new-';
  return (
    <form action={saveClient} className="grid gap-4">
      {client && <input type="hidden" name="id" value={client.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="label" htmlFor={p + 'name'}>Business name<input id={p + 'name'} name="name" required defaultValue={client?.name} className="input" placeholder="e.g. Mama Neema Hardware" /></label>
        <label className="label" htmlFor={p + 'contact'}>Contact person<input id={p + 'contact'} name="contact_person" defaultValue={client?.contact_person ?? ''} className="input" /></label>
        <label className="label" htmlFor={p + 'phone'}>Phone (for SMS & WhatsApp)<input id={p + 'phone'} name="phone" defaultValue={client?.phone ?? ''} className="input" placeholder="0754 000 000" /></label>
        <label className="label" htmlFor={p + 'email'}>Email<input id={p + 'email'} name="email" type="email" defaultValue={client?.email ?? ''} className="input" /></label>
        <label className="label" htmlFor={p + 'tin'}>TIN<input id={p + 'tin'} name="tin" defaultValue={client?.tin ?? ''} className="input" /></label>
        <label className="label" htmlFor={p + 'address'}>Address<input id={p + 'address'} name="address" defaultValue={client?.address ?? ''} className="input" /></label>
      </div>
      <label className="label" htmlFor={p + 'notes'}>Notes<textarea id={p + 'notes'} name="notes" rows={2} defaultValue={client?.notes ?? ''} className="input" /></label>
      <div><SubmitButton>{client ? 'Save changes' : 'Add client'}</SubmitButton></div>
    </form>
  );
}

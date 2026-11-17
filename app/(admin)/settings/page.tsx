import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { SubmitButton } from '@/components/SubmitButton';
import { saveSettings } from '../../actions';
import { smsConfigured, emailConfigured } from '@/lib/notify';

export const dynamic = 'force-dynamic';

function Field({ name, label, value, hint, type = 'text' }: { name: string; label: string; value: unknown; hint?: string; type?: string }) {
  return (
    <label className="label" htmlFor={`set-${name}`}>
      {label}
      <input id={`set-${name}`} name={name} type={type} step={type === 'number' ? 'any' : undefined} defaultValue={String(value ?? '')} className="input" />
      {hint && <span className="text-xs font-normal text-muted">{hint}</span>}
    </label>
  );
}

export default async function SettingsPage({ searchParams }: { searchParams: { saved?: string } }) {
  await requireAdmin();
  const supabase = createClient();
  const { data: s } = await supabase.from('settings').select('*').eq('id', 1).single();
  const v = (k: string) => (s as any)?.[k];
  return (
    <>
      <PageHeader kicker="Settings" title="Company & invoices" />
      {searchParams.saved && <p role="status" className="mb-6 rounded-xl bg-teal-soft px-4 py-3 text-sm font-medium text-teal-ink">Settings saved.</p>}
      <form action={saveSettings} className="grid gap-6">
        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Company</h2>
          <Field name="company_name" label="Registered name" value={v('company_name')} />
          <Field name="brand_name" label="Brand name" value={v('brand_name')} />
          <Field name="address" label="Address" value={v('address')} />
          <Field name="phone" label="Phone" value={v('phone')} />
          <Field name="email" label="Email" value={v('email')} type="email" />
          <Field name="tin" label="TIN" value={v('tin')} />
          <Field name="vrn" label="VRN" value={v('vrn')} hint="Only if VAT registered" />
        </section>
        <section className="card grid gap-4 p-5 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">How clients pay you</h2>
          <Field name="mobile_money" label="Mobile money details" value={v('mobile_money')} hint="e.g. M-Pesa Lipa Namba 123456 · G2K GROUP" />
          <Field name="bank_name" label="Bank" value={v('bank_name')} />
          <Field name="bank_account_name" label="Account name" value={v('bank_account_name')} />
          <Field name="bank_account_number" label="Account number" value={v('bank_account_number')} />
          <Field name="bank_branch" label="Branch" value={v('bank_branch')} />
          <Field name="bank_swift" label="SWIFT code" value={v('bank_swift')} />
        </section>
        <section className="card grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <h2 className="font-semibold sm:col-span-2 lg:col-span-4">Invoices</h2>
          <Field name="invoice_prefix" label="Number prefix" value={v('invoice_prefix')} hint={`Next: ${v('invoice_prefix')}-${new Date().getFullYear()}-${String(v('next_invoice_no')).padStart(4, '0')}`} />
          <Field name="default_due_days" label="Days to pay" value={v('default_due_days')} type="number" />
          <Field name="vat_rate" label="VAT %" value={v('vat_rate')} type="number" hint="Use 0 if not VAT registered; 18 if you are" />
          <Field name="invoice_footer" label="Footer note" value={v('invoice_footer')} />
        </section>
        <section className="card grid gap-2 p-5 text-sm">
          <h2 className="font-semibold">Automatic messages</h2>
          <p className="text-muted">SMS: <b className={smsConfigured() ? 'text-teal-ink' : 'text-muted'}>{smsConfigured() ? 'connected (Africa\'s Talking)' : 'not set up'}</b> · Email: <b className={emailConfigured() ? 'text-teal-ink' : 'text-muted'}>{emailConfigured() ? 'connected (Resend)' : 'not set up'}</b></p>
          <p className="text-muted">These are switched on with keys in Vercel › Settings › Environment Variables. WhatsApp sending works from each invoice without any setup.</p>
        </section>
        <div><SubmitButton>Save settings</SubmitButton></div>
      </form>
    </>
  );
}

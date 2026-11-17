import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { addDays, todayTZ } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { InvoiceEditor } from './InvoiceEditor';

export const dynamic = 'force-dynamic';

export default async function NewInvoicePage({ searchParams }: { searchParams: { client?: string } }) {
  await requireAdmin();
  const supabase = createClient();
  const [{ data: clients }, { data: products }, { data: settings }] = await Promise.all([
    supabase.from('clients').select('id, name').eq('active', true).order('name'),
    supabase.from('products').select('*').eq('active', true).order('name'),
    supabase.from('settings').select('default_due_days, vat_rate').eq('id', 1).single(),
  ]);
  const today = todayTZ();
  return (
    <>
      <PageHeader kicker="Invoices" title="New invoice" />
      <InvoiceEditor
        clients={(clients ?? []) as any}
        products={(products ?? []) as any}
        defaultClient={searchParams.client ?? ''}
        issueDate={today}
        dueDate={addDays(today, settings?.default_due_days ?? 7)}
        vatRate={Number(settings?.vat_rate ?? 0)}
      />
    </>
  );
}

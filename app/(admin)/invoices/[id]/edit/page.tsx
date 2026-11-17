import { notFound, redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/PageHeader';
import { InvoiceEditor } from '../../new/InvoiceEditor';

export const dynamic = 'force-dynamic';

export default async function EditInvoicePage({ params }: { params: { id: string } }) {
  await requireAdmin();
  const supabase = createClient();
  const [{ data: inv }, { data: items }, { data: products }] = await Promise.all([
    supabase.from('invoices').select('*, clients(name)').eq('id', params.id).single(),
    supabase.from('invoice_items').select('*').eq('invoice_id', params.id).order('sort'),
    supabase.from('products').select('*').eq('active', true).order('name'),
  ]);
  if (!inv) notFound();
  if (!['draft', 'sent', 'partially_paid'].includes(inv.status)) redirect(`/invoices/${inv.id}`);
  return (
    <>
      <PageHeader kicker="Edit invoice" title={inv.number} />
      <InvoiceEditor
        clients={[]}
        products={(products ?? []) as any}
        defaultClient={inv.client_id}
        issueDate={inv.issue_date}
        dueDate={inv.due_date}
        vatRate={Number(inv.vat_rate)}
        invoice={{
          id: inv.id,
          number: inv.number,
          status: inv.status,
          client_id: inv.client_id,
          client_name: (inv.clients as any)?.name ?? '',
          amount_paid: Number(inv.amount_paid),
          notes: inv.notes ?? '',
          lines: (items ?? []).map((i: any) => ({ description: i.description, quantity: Number(i.quantity), unit_price: Number(i.unit_price), kind: i.kind, subscription_id: i.subscription_id })),
        }}
      />
    </>
  );
}

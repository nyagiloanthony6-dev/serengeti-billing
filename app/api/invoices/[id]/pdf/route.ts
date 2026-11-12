import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createClient } from '@/lib/supabase/server';
import { InvoicePdf } from '@/lib/pdf/InvoicePdf';
import type { Client, Invoice, InvoiceItem, Payment, Settings } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 });
  const [{ data: inv }, { data: items }, { data: payments }, { data: settings }] = await Promise.all([
    supabase.from('invoices').select('*, clients(*)').eq('id', params.id).single(),
    supabase.from('invoice_items').select('*').eq('invoice_id', params.id).order('sort'),
    supabase.from('payments').select('*').eq('invoice_id', params.id).order('paid_at'),
    supabase.from('settings').select('*').eq('id', 1).single(),
  ]);
  if (!inv || !settings) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  const buf = await renderToBuffer(
    InvoicePdf({ inv: inv as Invoice, client: inv.clients as Client, items: (items ?? []) as InvoiceItem[], payments: (payments ?? []) as Payment[], settings: settings as Settings })
  );
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${inv.number}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}

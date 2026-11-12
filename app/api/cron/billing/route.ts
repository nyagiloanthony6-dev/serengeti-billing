import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { runMonthlyBilling, runReminders } from '@/lib/billing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Called daily by Vercel Cron (see vercel.json). Vercel sends "Authorization: Bearer $CRON_SECRET".
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const db = createAdminClient();
    const billing = await runMonthlyBilling(db, { notify: true });
    const reminders = await runReminders(db);
    return NextResponse.json({ ok: true, invoicesCreated: billing.invoicesCreated, remindersSent: reminders, notes: billing.notes });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}

import type { Client, Invoice, Settings } from './types';
import { fmtDate, tzs } from './format';

export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let p = raw.replace(/[^\d+]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  if (p.startsWith('0') && p.length === 10) p = '+255' + p.slice(1);
  if (p.startsWith('255')) p = '+' + p;
  return /^\+\d{9,15}$/.test(p) ? p : null;
}

export function paymentLines(s: Settings): string[] {
  const lines: string[] = [];
  if (s.mobile_money) lines.push(`Mobile money: ${s.mobile_money}`);
  if (s.bank_account_number)
    lines.push(`Bank: ${s.bank_name ?? ''} · ${s.bank_account_name ?? ''} · A/C ${s.bank_account_number}`.replace(/\s·\s·/g, ' ·'));
  return lines;
}

export function invoiceMessage(kind: 'new' | 'reminder', inv: Invoice, client: Client, s: Settings): string {
  const balance = Number(inv.total) - Number(inv.amount_paid);
  const head =
    kind === 'new'
      ? `${s.brand_name}: Invoice ${inv.number} for ${tzs(balance)} is ready, due ${fmtDate(inv.due_date)}.`
      : `${s.brand_name}: Reminder, invoice ${inv.number} has ${tzs(balance)} outstanding, due ${fmtDate(inv.due_date)}.`;
  const pay = paymentLines(s);
  return [`Habari ${client.contact_person || client.name},`, head, ...(pay.length ? ['Pay via:', ...pay] : []), `Ref: ${inv.number}. Asante.`].join('\n');
}

export function whatsappLink(phone: string | null | undefined, text: string): string {
  const p = normalizePhone(phone)?.replace('+', '') ?? '';
  return `https://wa.me/${p}?text=${encodeURIComponent(text)}`;
}

export function smsConfigured() {
  return Boolean(process.env.AT_USERNAME && process.env.AT_API_KEY);
}
export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendSms(to: string, message: string): Promise<{ ok: boolean; detail: string }> {
  const username = process.env.AT_USERNAME!;
  const apiKey = process.env.AT_API_KEY!;
  const host = username === 'sandbox' ? 'https://api.sandbox.africastalking.com' : 'https://api.africastalking.com';
  const body = new URLSearchParams({ username, to, message });
  if (process.env.AT_SENDER_ID) body.set('from', process.env.AT_SENDER_ID);
  try {
    const res = await fetch(`${host}/version1/messaging`, {
      method: 'POST',
      headers: { apiKey, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const text = await res.text();
    return { ok: res.ok, detail: text.slice(0, 300) };
  } catch (e) {
    return { ok: false, detail: String(e) };
  }
}

export async function sendEmail(to: string, subject: string, text: string): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text }),
    });
    const t = await res.text();
    return { ok: res.ok, detail: t.slice(0, 300) };
  } catch (e) {
    return { ok: false, detail: String(e) };
  }
}

// Sends the message on every configured channel the client can receive. Returns a short summary.
export async function notifyClient(
  db: { from: (t: string) => any },
  kind: 'new' | 'reminder',
  inv: Invoice,
  client: Client,
  s: Settings
): Promise<string[]> {
  const sent: string[] = [];
  const msg = invoiceMessage(kind, inv, client, s);
  const phone = normalizePhone(client.phone);
  if (smsConfigured() && phone) {
    const r = await sendSms(phone, msg);
    await db.from('reminders').insert({ invoice_id: inv.id, channel: 'sms', status: r.ok ? 'sent' : 'failed', detail: r.detail });
    if (r.ok) sent.push('SMS');
  }
  if (emailConfigured() && client.email) {
    const subject = kind === 'new' ? `Invoice ${inv.number} from ${s.brand_name}` : `Reminder: invoice ${inv.number}`;
    const r = await sendEmail(client.email, subject, msg);
    await db.from('reminders').insert({ invoice_id: inv.id, channel: 'email', status: r.ok ? 'sent' : 'failed', detail: r.detail });
    if (r.ok) sent.push('email');
  }
  if (sent.length) await db.from('invoices').update({ last_reminder_at: new Date().toISOString() }).eq('id', inv.id);
  return sent;
}

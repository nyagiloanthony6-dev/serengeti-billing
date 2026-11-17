export const PROSPECT_STATUS: Record<string, { label: string; cls: string }> = {
  new: { label: 'Contacted', cls: 'bg-sunk text-ink' },
  interested: { label: 'Interested', cls: 'bg-indigo-soft text-indigo' },
  demo: { label: 'Demo done', cls: 'bg-teal-soft text-teal-ink' },
  negotiating: { label: 'Negotiating', cls: 'bg-saffron-soft text-saffron-ink' },
  won: { label: 'Won', cls: 'bg-teal text-white' },
  lost: { label: 'Not interested', cls: 'bg-coral-soft text-coral-ink' },
};
export const STATUS_ORDER = ['new', 'interested', 'demo', 'negotiating', 'won', 'lost'];

export const FOLLOWUP_METHOD: Record<string, string> = {
  visit: 'Visit',
  call: 'Phone call',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
  demo: 'Demo',
};

/** 0754 123 456 -> 255754123456 for tel/wa.me links */
export function intlPhone(p: string | null | undefined) {
  const d = String(p ?? '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('255')) return d;
  if (d.startsWith('0')) return '255' + d.slice(1);
  return d.length === 9 ? '255' + d : d;
}

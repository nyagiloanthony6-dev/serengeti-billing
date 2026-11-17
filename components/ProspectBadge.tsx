import { PROSPECT_STATUS } from '@/lib/prospects';

export function ProspectBadge({ status }: { status: string }) {
  const m = PROSPECT_STATUS[status] ?? PROSPECT_STATUS.new;
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.cls}`}>{m.label}</span>;
}

export function FollowupDate({ date, today, closed }: { date: string | null; today: string; closed?: boolean }) {
  if (!date || closed) return <span className="text-muted">—</span>;
  const cls = date < today ? 'bg-coral-soft text-coral-ink' : date === today ? 'bg-saffron-soft text-saffron-ink' : 'text-ink';
  const label = date < today ? 'Overdue · ' : date === today ? 'Today · ' : '';
  const [y, m, d] = date.split('-').map(Number);
  const mon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1];
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>{label}{d} {mon}{y !== Number(today.slice(0, 4)) ? ` ${y}` : ''}</span>;
}

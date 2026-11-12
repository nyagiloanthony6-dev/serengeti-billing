import { todayTZ } from '@/lib/format';

const MAP: Record<string, { label: string; cls: string }> = {
  draft: { label: 'Draft', cls: 'bg-sunk text-muted' },
  sent: { label: 'Unpaid', cls: 'bg-saffron-soft text-saffron-ink' },
  partially_paid: { label: 'Part paid', cls: 'bg-indigo-soft text-indigo' },
  paid: { label: 'Paid', cls: 'bg-teal-soft text-teal-ink' },
  void: { label: 'Void', cls: 'bg-sunk text-muted line-through' },
};

export function StatusBadge({ status, due }: { status: string; due?: string }) {
  const overdue = due && (status === 'sent' || status === 'partially_paid') && due < todayTZ();
  const m = overdue ? { label: 'Overdue', cls: 'bg-coral-soft text-coral-ink' } : MAP[status] ?? MAP.draft;
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${m.cls}`}>{m.label}</span>;
}

import Link from 'next/link';
import { Icon } from './Icon';

const TONE = {
  indigo: 'bg-indigo-soft text-indigo',
  coral: 'bg-coral-soft text-coral-ink',
  teal: 'bg-teal-soft text-teal-ink',
  saffron: 'bg-saffron-soft text-saffron-ink',
} as const;

export function StatTile({ label, value, sub, icon, tone = 'indigo', alert, href, progress }: {
  label: string; value: React.ReactNode; sub?: React.ReactNode; icon: string; tone?: keyof typeof TONE; alert?: boolean; href?: string; progress?: number;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-muted">{label}</p>
        <span className={`chip-icon ${TONE[tone]}`}><Icon name={icon} /></span>
      </div>
      <p className={`num -mt-1 text-[22px] font-bold tracking-[-0.02em] sm:text-2xl ${alert ? 'text-coral-ink' : ''}`}>{value}</p>
      {progress !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-sunk" role="presentation">
          <div className="h-full rounded-full bg-gradient-to-r from-teal to-[#3CC6C8]" style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      )}
      {sub && <p className="mt-1.5 text-xs text-muted">{sub}</p>}
    </>
  );
  const cls = `card relative block overflow-hidden p-4 sm:p-5 ${alert ? 'ring-1 ring-coral/30' : ''}`;
  return href ? <Link href={href} className={`${cls} transition hover:-translate-y-0.5 hover:shadow-lg`}>{body}</Link> : <div className={cls}>{body}</div>;
}

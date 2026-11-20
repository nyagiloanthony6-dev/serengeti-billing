'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from './Icon';

type L = { href: string; label: string; icon: string };
const ADMIN: { section: string; links: L[] }[] = [
  { section: 'Billing', links: [
    { href: '/', label: 'Dashboard', icon: 'home' },
    { href: '/invoices', label: 'Invoices', icon: 'invoice' },
    { href: '/clients', label: 'Clients', icon: 'clients' },
  ] },
  { section: 'Sales', links: [
    { href: '/prospects', label: 'Prospects', icon: 'target' },
    { href: '/sales-team', label: 'Sales team', icon: 'team' },
  ] },
  { section: 'Setup', links: [
    { href: '/products', label: 'Products & prices', icon: 'box' },
    { href: '/settings', label: 'Settings', icon: 'settings' },
  ] },
];
const SALES = [{ section: 'Sales', links: [
  { href: '/prospects', label: 'My prospects', icon: 'target' },
  { href: '/prospects/new', label: 'Add prospect', icon: 'plus' },
] }];

export function Nav({ role }: { role: string }) {
  const path = usePathname();
  const groups = role === 'admin' ? ADMIN : role === 'sales' ? SALES : [];
  const isActive = (href: string) =>
    href === '/' ? path === '/'
      : href === '/prospects' ? path.startsWith('/prospects') && path !== '/prospects/new'
      : path.startsWith(href);
  return (
    <nav aria-label="Main" className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:gap-6 lg:overflow-visible lg:px-0 lg:pb-0">
      {groups.map((g) => (
        <div key={g.section} className="flex gap-1 lg:grid">
          <p className="mb-1 hidden px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40 lg:block">{g.section}</p>
          {g.links.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  active ? 'bg-white/[0.12] text-white' : 'text-white/65 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                {active && <span className="absolute -left-[10px] top-1/2 hidden h-5 w-1 -translate-y-1/2 rounded-full bg-[#FFC043] lg:block" />}
                <Icon name={l.icon} className={`h-[18px] w-[18px] ${active ? 'text-[#FFC043]' : 'text-white/50 group-hover:text-white/80'}`} />
                {l.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ADMIN = [
  { href: '/', label: 'Dashboard' },
  { href: '/invoices', label: 'Invoices' },
  { href: '/clients', label: 'Clients' },
  { href: '/prospects', label: 'Prospects' },
  { href: '/sales-team', label: 'Sales team' },
  { href: '/products', label: 'Products & prices' },
  { href: '/settings', label: 'Settings' },
];
const SALES = [
  { href: '/prospects', label: 'My prospects' },
  { href: '/prospects/new', label: 'Add prospect' },
];

export function Nav({ role }: { role: string }) {
  const path = usePathname();
  const links = role === 'admin' ? ADMIN : role === 'sales' ? SALES : [];
  return (
    <nav aria-label="Main" className="flex flex-wrap gap-1 lg:flex-col">
      {links.map((l) => {
        const active = l.href === '/' ? path === '/'
          : l.href === '/prospects' ? path.startsWith('/prospects') && path !== '/prospects/new'
          : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-xl px-3 py-2 text-sm font-medium ${active ? 'bg-ink text-white' : 'text-muted hover:bg-sunk hover:text-ink'}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

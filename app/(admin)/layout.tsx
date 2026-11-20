import { Logo } from '@/components/Logo';
import { Nav } from '@/components/Nav';
import { Icon } from '@/components/Icon';
import { signOut } from '../actions';
import { getSession } from '@/lib/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, role, name } = await getSession();
  const display: string = role === 'sales' ? name : 'Tonny';
  const initials = (display || user?.email || '?').split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w: string) => w[0]!.toUpperCase()).join('');
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="relative overflow-hidden bg-[#15183A] px-4 pb-3 pt-4 text-white lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:px-5 lg:py-6">
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#3B3FC4]/40 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-20 hidden h-72 w-72 rounded-full bg-[#F2A007]/10 blur-3xl lg:block" />
        <div className="relative flex items-center justify-between gap-3">
          <Logo small onDark />
          <form action={signOut} className="lg:hidden">
            <button className="grid h-9 w-9 place-items-center rounded-xl text-white/70 hover:bg-white/10 hover:text-white" aria-label="Sign out"><Icon name="logout" /></button>
          </form>
        </div>
        <p className="relative mt-1 hidden pl-[42px] text-[11px] font-medium uppercase tracking-[0.14em] text-white/40 lg:block">{role === 'sales' ? 'Sales' : 'Admin'}</p>
        <div className="relative mt-4 lg:mt-9 lg:flex-1">
          <Nav role={role} />
        </div>
        <div className="relative mt-auto hidden items-center gap-3 rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10 lg:flex">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#FFC043] to-[#FF7A55] text-sm font-bold text-[#15183A]">{initials}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{display}</p>
            <p className="truncate text-xs text-white/50">{user?.email}</p>
          </div>
          <form action={signOut}>
            <button className="grid h-8 w-8 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white" aria-label="Sign out" title="Sign out"><Icon name="logout" className="h-4 w-4" /></button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-9">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

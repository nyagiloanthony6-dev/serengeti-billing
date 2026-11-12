import { Logo } from '@/components/Logo';
import { Nav } from '@/components/Nav';
import { signOut } from '../actions';
import { createClient } from '@/lib/supabase/server';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="border-b border-line bg-white px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
        <div className="flex flex-wrap items-center justify-between gap-4 lg:flex-col lg:items-stretch lg:gap-8">
          <Logo small />
          <Nav />
          <form action={signOut} className="lg:mt-auto">
            <p className="mb-2 hidden truncate text-xs text-muted lg:block">{user?.email}</p>
            <button className="btn-secondary w-full">Sign out</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

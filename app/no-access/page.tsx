import { Logo } from '@/components/Logo';
import { signOut } from '../actions';

export default function NoAccess() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="card grid max-w-sm gap-4 p-6 text-center">
        <div className="mx-auto"><Logo small /></div>
        <h1 className="text-xl font-bold">This account has no access yet</h1>
        <p className="text-sm text-muted">Ask the Serengeti Labs admin to add you as sales staff, or switch off an old account.</p>
        <form action={signOut}><button className="btn-secondary w-full">Sign out</button></form>
      </div>
    </main>
  );
}

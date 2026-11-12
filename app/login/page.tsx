import { Logo } from '@/components/Logo';
import { LoginForm } from './LoginForm';

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="grid w-full max-w-sm gap-8">
        <div className="grid justify-items-center gap-3 text-center">
          <Logo />
          <p className="text-sm text-muted">Billing admin</p>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}

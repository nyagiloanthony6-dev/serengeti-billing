import { Logo } from '@/components/Logo';
import { LoginForm } from './LoginForm';

export default function LoginPage() {
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <section className="relative hidden overflow-hidden bg-[#15183A] p-12 text-white lg:flex lg:flex-col">
        <div aria-hidden="true" className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#3B3FC4]/50 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-40 -left-24 h-[380px] w-[380px] rounded-full bg-[#F2A007]/15 blur-3xl" />
        <div aria-hidden="true" className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(white_1px,transparent_1px),linear-gradient(90deg,white_1px,transparent_1px)] [background-size:44px_44px]" />
        <div className="relative"><Logo onDark /></div>
        <div className="relative mt-auto max-w-md">
          <p className="text-[40px] font-extrabold leading-[1.05] tracking-[-0.04em]">Better systems<br />for better business.</p>
          <p className="mt-4 text-white/60">Billing, clients and sales follow-ups for every Serengeti Labs product, in one place.</p>
        </div>
      </section>
      <section className="grid place-items-center px-4 py-10">
        <div className="grid w-full max-w-sm gap-8">
          <div className="grid gap-2">
            <div className="lg:hidden"><Logo /></div>
            <h1 className="mt-4 text-2xl font-extrabold tracking-[-0.03em] lg:mt-0">Sign in</h1>
            <p className="text-sm text-muted">Admin and sales staff use the same sign-in.</p>
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}

'use client';
import { useFormState } from 'react-dom';
import { signIn } from '../actions';
import { SubmitButton } from '@/components/SubmitButton';

export function LoginForm() {
  const [state, action] = useFormState(signIn, null as null | { error: string });
  return (
    <form action={action} className="card grid gap-4 p-6">
      <label className="label" htmlFor="email">Email
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </label>
      <label className="label" htmlFor="password">Password
        <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
      </label>
      {state?.error && <p role="alert" className="text-sm font-medium text-coral-ink">{state.error}</p>}
      <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>
    </form>
  );
}

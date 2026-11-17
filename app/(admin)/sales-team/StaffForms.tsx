'use client';
import { useFormState } from 'react-dom';
import { addSalesStaff, resetStaffPassword } from '../../sales-actions';
import { SubmitButton } from '@/components/SubmitButton';

type State = null | { error?: string; ok?: string };

function Msg({ s }: { s: State }) {
  if (!s) return null;
  return s.error
    ? <p role="alert" className="text-sm font-medium text-coral-ink">{s.error}</p>
    : <p role="status" className="text-sm font-medium text-teal-ink">{s.ok}</p>;
}

export function AddStaffForm() {
  const [state, action] = useFormState(addSalesStaff, null as State);
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="label" htmlFor="st-name">Full name<input id="st-name" name="full_name" required className="input" placeholder="e.g. Rosemary Walter Mgaya" /></label>
        <label className="label" htmlFor="st-phone">Phone<input id="st-phone" name="phone" type="tel" className="input" placeholder="0795 000 000" /></label>
        <label className="label" htmlFor="st-email">Email (used to sign in)<input id="st-email" name="email" type="email" required autoComplete="off" className="input" /></label>
        <label className="label" htmlFor="st-pass">Password<input id="st-pass" name="password" type="text" required minLength={8} autoComplete="new-password" className="input" placeholder="At least 8 characters" /></label>
      </div>
      <p className="text-xs text-muted">Share the email and password with them. They sign in at this same address and only see their own prospects, never invoices or payments.</p>
      <Msg s={state} />
      <div><SubmitButton pendingText="Creating account…">Add sales officer</SubmitButton></div>
    </form>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action] = useFormState(resetStaffPassword, null as State);
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="user_id" value={userId} />
      <div className="flex gap-2">
        <input name="password" type="text" required minLength={8} aria-label="New password" placeholder="New password" className="input" autoComplete="new-password" />
        <SubmitButton className="btn-secondary" pendingText="…">Set</SubmitButton>
      </div>
      <Msg s={state} />
    </form>
  );
}

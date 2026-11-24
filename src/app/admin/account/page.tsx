'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/lib/api';

const fieldClass =
  'w-full px-3 py-2.5 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand';
const labelClass = 'block text-xs font-semibold text-muted mb-1';

export default function ConsoleAccount() {
  const [email, setEmail] = useState('');
  const [mustChange, setMustChange] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    auth.me()
      .then(user => {
        setEmail(user.email);
        setMustChange(user.must_change_password === true);
      })
      .catch(() => undefined);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (next.length < 8) { setError('Use at least 8 characters.'); return; }
    if (next !== confirm) { setError('The two new passwords do not match.'); return; }
    setSaving(true);
    try {
      await auth.changePassword(current, next);
      setCurrent(''); setNext(''); setConfirm(''); setMustChange(false);
      // Full load so the console reads the account again and drops the must-change gate.
      window.location.assign('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl">
      <header className="mb-5">
        <h1 className="text-[22px] font-semibold text-ink leading-tight">My account</h1>
        <p className="text-[13px] text-muted mt-1">
          {email || 'Signed in'} · Super admin
        </p>
      </header>

      {mustChange && (
        <div role="status" className="mb-4 text-sm text-warning bg-warning/10 border border-warning/30 rounded px-3 py-2">
          This account was created with a generated password. Set your own to continue.
        </div>
      )}

      <form onSubmit={submit} className="bg-surface border border-line rounded p-5 space-y-4">
        <h2 className="text-sm font-semibold text-ink">Change password</h2>

        {error && (
          <div role="alert" className="text-sm text-danger bg-danger-soft border border-danger/30 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="current-password" className={labelClass}>Current password</label>
          <input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={e => setCurrent(e.target.value)}
            required
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="new-password" className={labelClass}>New password</label>
          <input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={e => setNext(e.target.value)}
            required
            minLength={8}
            className={fieldClass}
          />
          <p className="text-xs text-muted mt-1">At least 8 characters, and not all numbers.</p>
        </div>
        <div>
          <label htmlFor="confirm-password" className={labelClass}>Confirm new password</label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            minLength={8}
            className={fieldClass}
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !current || !next || !confirm}
            className="text-sm px-6 py-2.5 rounded bg-brand text-brand-ink hover:opacity-90 disabled:opacity-50 cursor-pointer min-h-[44px]"
          >
            {saving ? 'Saving…' : 'Change password'}
          </button>
        </div>
      </form>
    </div>
  );
}

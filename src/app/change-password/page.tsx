'use client';

import { useState } from 'react';
import { ApiError, auth } from '@/lib/api';
import { AuthShell, FormError } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';

const HOME: Record<string, string> = {
  school_admin: '/dashboard', admin_officer: '/dashboard', principal: '/principal', teacher: '/teacher',
  bursary: '/bursary', student: '/student', parent: '/guardian/dashboard', super_admin: '/admin',
};

/** Where someone with a generated password chooses their own. The server blocks everything else until then. */
export default function ChangePasswordPage() {
  const [form, setForm] = useState({ current: '', next: '', again: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (form.next !== form.again) { setError('The two new passwords do not match.'); return; }
    setBusy(true);
    setError('');
    try {
      await auth.changePassword(form.current, form.next);
      window.location.assign(HOME[auth.getRole() || ''] || '/login');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not change your password. Check your connection.');
      setBusy(false);
    }
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <AuthShell>
      <h1 className="text-2xl font-semibold text-ink">Choose your own password</h1>
      <p className="mt-1 text-sm text-muted">You signed in with a password that was made for you. Replace it to continue.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <TextField id="pw-current" label="Password you were given" type="password" autoComplete="current-password"
          value={form.current} onChange={set('current')} required />
        <TextField id="pw-new" label="New password" type="password" autoComplete="new-password"
          hint="At least 8 characters, and not only numbers." value={form.next} onChange={set('next')} required minLength={8} />
        <TextField id="pw-again" label="New password again" type="password" autoComplete="new-password"
          value={form.again} onChange={set('again')} required />
        {error && <FormError>{error}</FormError>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Saving…' : 'Save and continue'}</Button>
        <Button variant="ghost" className="w-full" onClick={() => { auth.logout(); window.location.assign('/login'); }}>Sign out</Button>
      </form>
    </AuthShell>
  );
}

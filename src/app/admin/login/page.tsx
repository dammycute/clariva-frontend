'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/api';
import { AuthShell, FormError } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { TextField, PasswordField } from '@/components/ui/text-field';
import { safeRedirect } from '@/lib/safe-redirect';

/**
 * Sign-in for the platform console. Deliberately separate from /login: this door only
 * opens for platform administrators, and it is where the console sends people back to.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Already signed in as a platform admin? Skip the form.
  useEffect(() => {
    if (auth.getToken() && auth.getRole() === 'super_admin') router.replace('/admin');
  }, [router]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('reason') === 'session_replaced') {
      setNotice('You were signed out because your account was opened on another device. If that was not you, change your password.');
    }
  }, []);

  const submit = async () => {
    if (!email || !password || loading) return;
    setLoading(true); setError('');
    try {
      const data = await auth.login(email, password);
      if (data.role !== 'super_admin') {
        auth.logout();
        setError('That account is not a platform administrator.');
        return;
      }
      const wanted = safeRedirect(new URLSearchParams(window.location.search).get('redirect'));
      window.location.href = wanted && wanted.startsWith('/admin') && wanted !== '/admin/login' ? wanted : '/admin';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') submit();
  };

  return (
    <AuthShell
      aside={
        <div className="space-y-3">
          <p className="text-lg leading-relaxed text-white/85 max-w-[300px] text-pretty">
            Platform administration for every school on Clarriva.
          </p>
          <p className="text-sm text-white/60">Customers, billing and system health.</p>
        </div>
      }
      sideLink={{ href: '/login', label: 'School staff and student sign in' }}
    >
      <span className="inline-block text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-brand-soft text-brand mb-3">
        Console
      </span>
      <h1 className="text-2xl font-semibold text-ink tracking-tight">Platform console</h1>
      <p className="text-sm text-muted mt-1 mb-6">Sign in with your administrator account.</p>

      <div className="space-y-4">
        <TextField id="admin-email" label="Email" type="email" autoComplete="username"
          value={email} onChange={e => setEmail(e.target.value)} onKeyDown={onKeyDown}
          placeholder="you@clarriva.com" />
        <PasswordField id="admin-password" label="Password" autoComplete="current-password"
          value={password} onChange={e => setPassword(e.target.value)} onKeyDown={onKeyDown} />
        <Button onClick={submit} disabled={loading || !email || !password} className="w-full">
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
      </div>

      {notice && !error && <div className="mt-4"><FormError>{notice}</FormError></div>}
      {error && <div className="mt-4"><FormError>{error}</FormError></div>}

      <p className="text-[13px] text-muted mt-8">
        School staff, students and guardians{' '}
        <Link href="/login" className="text-ink underline underline-offset-2">sign in here</Link>.
      </p>
    </AuthShell>
  );
}

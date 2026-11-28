'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/api';
import { AuthShell, FormError } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { TextField, PasswordField } from '@/components/ui/text-field';

export default function GuardianLoginPage() {
  const router = useRouter();
  const [admissionNo, setAdmissionNo] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await auth.login(admissionNo.trim(), password);
      router.push('/guardian/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell sideLink={{ href: '/', label: 'School staff and students sign in here' }}>
      <h1 className="text-2xl font-semibold text-ink tracking-tight text-balance">Parent sign in</h1>
      <p className="text-sm text-muted mt-1 mb-6">Use your child&apos;s admission number and the parent password from the school.</p>

      <form onSubmit={handleLogin} className="space-y-4">
        <TextField id="guardian-adm" label="Child's admission number" autoComplete="username" value={admissionNo}
          onChange={e => setAdmissionNo(e.target.value)} placeholder="e.g. QC/2026/00201" required />
        <PasswordField id="guardian-password" label="Parent password" autoComplete="current-password"
          value={password} onChange={e => setPassword(e.target.value)} required />
        <FormError>{error}</FormError>
        <Button type="submit" disabled={loading || !admissionNo.trim() || !password} className="w-full">
          {loading ? 'Signing in…' : 'Sign in'}
        </Button>
        <p className="text-[13px] text-muted">No password, or lost it? Ask your child&apos;s school.</p>
      </form>

      <p className="text-[13px] text-muted mt-8 lg:hidden">
        <Link href="/login" className="underline underline-offset-2 hover:text-ink">School staff and students sign in here</Link>
      </p>
    </AuthShell>
  );
}

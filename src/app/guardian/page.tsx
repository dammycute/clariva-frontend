'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { portal, auth } from '@/lib/api';
import { AuthShell, FormError } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { TextField, PasswordField } from '@/components/ui/text-field';

type Mode = 'code' | 'login' | 'setup';

const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`;

export default function GuardianLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('code');

  // Code lookup state
  const [code, setCode] = useState('');
  const [lookupResult, setLookupResult] = useState<Record<string, unknown> | null>(null);

  // Login state
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Setup state
  const [setupPhone, setSetupPhone] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');
  const [setupStudentCode, setSetupStudentCode] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; confirm?: string }>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const switchMode = (m: Mode) => { setMode(m); setError(''); setFieldErrors({}); };

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setLookupResult(null);
    try {
      const result = await portal.lookup({ code: code.toUpperCase().trim() });
      setLookupResult(result as unknown as Record<string, unknown>);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const email = `parent.${loginPhone}@parent.clariva.ng`;
      await auth.login(email, loginPassword);
      router.push('/guardian/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const errors: { password?: string; confirm?: string } = {};
    if (setupPassword.length < 6) errors.password = 'Use at least 6 characters.';
    if (setupPassword !== setupConfirmPassword) errors.confirm = 'The two passwords do not match.';
    setFieldErrors(errors);
    if (errors.password || errors.confirm) return;
    setLoading(true);
    try {
      await portal.setup(setupPhone, setupPassword, setupStudentCode.toUpperCase().trim());
      const email = `parent.${setupPhone}@parent.clariva.ng`;
      await auth.login(email, setupPassword);
      router.push('/guardian/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const fee = lookupResult?.fee_summary as Record<string, number> | undefined;
  const report = lookupResult?.latest_report_card as Record<string, unknown> | null | undefined;

  const heading =
    mode === 'code' ? (lookupResult ? (lookupResult.full_name as string) : 'Check your child\'s records')
    : mode === 'login' ? 'Parent sign in'
    : 'Create a parent account';
  const subheading =
    mode === 'code' ? (lookupResult ? `${lookupResult.admission_no as string} · ${(lookupResult.class_name as string) || 'Class not set'}` : 'Enter the access code the school gave you.')
    : mode === 'login' ? 'Use the phone number you registered with.'
    : 'You will need your child\'s access code once.';

  return (
    <AuthShell sideLink={{ href: '/', label: 'School staff and students sign in here' }}>
      <h1 className="text-2xl font-semibold text-ink tracking-tight text-balance">{heading}</h1>
      <p className="text-sm text-muted mt-1 mb-6">{subheading}</p>

      {mode !== 'setup' && !lookupResult && (
        <div role="tablist" aria-label="Parent access" className="flex gap-5 border-b border-line mb-6">
          {([['code', 'Access code'], ['login', 'Parent account']] as const).map(([m, label]) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => { switchMode(m); setLookupResult(null); }}
              className={`pb-2.5 -mb-px text-sm border-b-2 cursor-pointer transition-colors ${
                mode === m ? 'border-brand text-ink font-semibold' : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {mode === 'code' && !lookupResult && (
        <form onSubmit={handleLookup} className="space-y-4">
          <TextField id="guardian-code" label="Access code" value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="CLR-XXXXXXXX" maxLength={12} required className="font-mono tracking-wider" />
          <FormError>{error}</FormError>
          <Button type="submit" disabled={loading || !code.trim()} className="w-full">
            {loading ? 'Looking up…' : 'View records'}
          </Button>
        </form>
      )}

      {mode === 'code' && lookupResult && fee && (
        <div className="space-y-6">
          <dl className="grid grid-cols-3 border-y border-line py-4">
            {([['Due', fee.total_due, ''], ['Paid', fee.total_paid, ''], ['Balance', fee.balance, fee.balance > 0 ? 'text-danger' : 'text-success']] as const).map(([label, value, tone]) => (
              <div key={label}>
                <dt className="text-[13px] text-muted">{label}</dt>
                <dd className={`text-base font-semibold tabular-nums mt-0.5 ${tone || 'text-ink'}`}>{naira(value)}</dd>
              </div>
            ))}
          </dl>

          {!!report && (
            <div>
              <p className="text-[13px] text-muted">Latest report card, {report.term as string} {report.academic_year as string}</p>
              <p className="text-2xl font-semibold text-ink tabular-nums mt-0.5">{report.average as number}%</p>
            </div>
          )}

          <div className="space-y-3">
            <Button onClick={() => { setSetupStudentCode(code); switchMode('setup'); }} className="w-full">
              Create a parent account
            </Button>
            <p className="text-[13px] text-muted">An account lets you check records any time, without the code.</p>
            <button onClick={() => { setLookupResult(null); setCode(''); }}
              className="text-[13px] text-ink underline underline-offset-2 cursor-pointer">
              Look up another code
            </button>
          </div>
        </div>
      )}

      {mode === 'login' && (
        <form onSubmit={handleLogin} className="space-y-4">
          <TextField id="guardian-phone" label="Phone number" type="tel" autoComplete="username" value={loginPhone}
            onChange={e => setLoginPhone(e.target.value)} placeholder="08012345678" required />
          <PasswordField id="guardian-password" label="Password" autoComplete="current-password" value={loginPassword}
            onChange={e => setLoginPassword(e.target.value)} required minLength={6} />
          <FormError>{error}</FormError>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
          <p className="text-[13px] text-muted">
            First time here?{' '}
            <button type="button" onClick={() => switchMode('setup')} className="text-ink underline underline-offset-2 cursor-pointer">
              Create an account
            </button>
          </p>
        </form>
      )}

      {mode === 'setup' && (
        <form onSubmit={handleSetup} className="space-y-4" noValidate>
          <TextField id="setup-phone" label="Phone number" type="tel" autoComplete="username" value={setupPhone}
            onChange={e => setSetupPhone(e.target.value)} placeholder="08012345678" required />
          <PasswordField id="setup-password" label="Password" autoComplete="new-password" value={setupPassword}
            onChange={e => setSetupPassword(e.target.value)} hint="At least 6 characters." error={fieldErrors.password} required />
          <PasswordField id="setup-confirm" label="Confirm password" autoComplete="new-password" value={setupConfirmPassword}
            onChange={e => setSetupConfirmPassword(e.target.value)} error={fieldErrors.confirm} required />
          <TextField id="setup-code" label="Student access code" value={setupStudentCode}
            onChange={e => setSetupStudentCode(e.target.value.toUpperCase())}
            placeholder="CLR-XXXXXXXX" maxLength={12} required className="font-mono tracking-wider" />
          <FormError>{error}</FormError>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
          <p className="text-[13px] text-muted">
            Already have an account?{' '}
            <button type="button" onClick={() => switchMode('login')} className="text-ink underline underline-offset-2 cursor-pointer">
              Sign in
            </button>
          </p>
        </form>
      )}

      <p className="text-[13px] text-muted mt-8 lg:hidden">
        <Link href="/" className="underline underline-offset-2 hover:text-ink">School staff and students sign in here</Link>
      </p>
    </AuthShell>
  );
}

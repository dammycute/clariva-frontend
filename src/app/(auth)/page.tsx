'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, portal } from '@/lib/api';
import { AuthShell, FormError } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { TextField, PasswordField } from '@/components/ui/text-field';

type Role = 'staff' | 'student' | 'parent';

const TABS: { role: Role; label: string }[] = [
  { role: 'staff', label: 'Staff' },
  { role: 'student', label: 'Student' },
  { role: 'parent', label: 'Parent or guardian' },
];

export default function LoginPage() {
  const router = useRouter();

  // auto-redirect if already logged in
  useEffect(() => {
    if (!auth.getToken()) return;
    const storedRole = auth.getRole();
    if (storedRole === 'teacher') { router.push('/teacher'); return; }
    if (storedRole === 'principal') { router.push('/principal'); return; }
    if (storedRole === 'bursary') { router.push('/bursary'); return; }
    if (storedRole === 'student') { router.push('/student'); return; }
    if (storedRole === 'parent' || storedRole === 'guardian') { router.push('/guardian/dashboard'); return; }
    if (storedRole === 'super_admin') { router.push('/super_admin'); return; }
    if (storedRole) { router.push('/dashboard'); return; }
    // fallback: verify via API
    auth.me().then(user => {
      if (user.role === 'teacher') router.push('/teacher');
      else if (user.role === 'principal') router.push('/principal');
      else if (user.role === 'bursary') router.push('/bursary');
      else if (user.role === 'student') router.push('/student');
      else if (user.role === 'parent' || user.role === 'guardian') router.push('/guardian/dashboard');
      else if (user.role === 'super_admin') router.push('/super_admin');
      else router.push('/dashboard');
    }).catch(() => {});
  }, [router]);

  const [selectedRole, setSelectedRole] = useState<Role>('staff');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // staff fields
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [showSubdomain, setShowSubdomain] = useState(false);
  const [subdomain, setSubdomain] = useState('');
  const staffEmailRef = useRef<HTMLInputElement>(null);
  const staffPassRef = useRef<HTMLInputElement>(null);

  // student fields
  const [studentId, setStudentId] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const studentIdRef = useRef<HTMLInputElement>(null);
  const studentPassRef = useRef<HTMLInputElement>(null);

  // parent fields
  const [parentAdm, setParentAdm] = useState('');
  const [parentCode, setParentCode] = useState('');
  const [lookupResult, setLookupResult] = useState<Record<string, unknown> | null>(null);
  const parentAdmRef = useRef<HTMLInputElement>(null);
  const parentCodeRef = useRef<HTMLInputElement>(null);

  // helpers
  const resetAll = () => {
    setError('');
    setLoading(false);
    setStaffEmail(''); setStaffPassword(''); setShowSubdomain(false); setSubdomain('');
    setStudentId(''); setStudentPassword('');
    setParentAdm(''); setParentCode(''); setLookupResult(null);
  };

  const selectRole = (r: Role) => {
    if (r === selectedRole) return;
    resetAll();
    setSelectedRole(r);
    setTimeout(() => {
      if (r === 'staff') staffEmailRef.current?.focus();
      else if (r === 'student') studentIdRef.current?.focus();
      else if (r === 'parent') parentAdmRef.current?.focus();
    }, 50);
  };

  // ---- auth handlers ----
  const handleStaffLogin = useCallback(async () => {
    const email = staffEmailRef.current?.value;
    const pass = staffPassRef.current?.value;
    if (!email || !pass) return;
    setLoading(true); setError('');
    try {
      const data = await auth.login(email, pass);
      const role = data.role;
      if (role === 'teacher') { window.location.href = '/teacher'; return; }
      if (role === 'principal') { window.location.href = '/principal'; return; }
      if (role === 'bursary') { window.location.href = '/bursary'; return; }
      if (role === 'parent' || role === 'guardian') { window.location.href = '/guardian/dashboard'; return; }
      if (role === 'super_admin') { window.location.href = '/super_admin'; return; }
      window.location.href = '/dashboard';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    }
    finally { setLoading(false); }
  }, []);

  const handleStudentLogin = useCallback(async () => {
    const sid = studentIdRef.current?.value;
    const pass = studentPassRef.current?.value;
    if (!sid || !pass) return;
    setLoading(true); setError('');
    try {
      await auth.studentLogin(sid, pass);
      window.location.href = '/student';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    }
    finally { setLoading(false); }
  }, []);

  const handleParentLookup = useCallback(async () => {
    const adm = parentAdmRef.current?.value;
    const code = parentCodeRef.current?.value;
    if (!adm?.trim() || !code?.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await portal.lookup({ admission_no: adm.trim(), code: code.trim().toUpperCase() }) as Record<string, unknown>;
      setLookupResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid admission number or access code');
    }
    finally { setLoading(false); }
  }, []);

  const handleKeyDown = (fn: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') fn();
  };

  // ---- form renderers ----
  const renderStaffForm = () => (
    <div className="space-y-4">
      <TextField ref={staffEmailRef} id="staff-email" label="Email" type="email" autoComplete="username"
        value={staffEmail} onChange={e => setStaffEmail(e.target.value)}
        onKeyDown={handleKeyDown(handleStaffLogin)} placeholder="admin@school.com" />
      <PasswordField ref={staffPassRef} id="staff-password" label="Password" autoComplete="current-password"
        value={staffPassword} onChange={e => setStaffPassword(e.target.value)}
        onKeyDown={handleKeyDown(handleStaffLogin)} />
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => setShowSubdomain(!showSubdomain)} aria-expanded={showSubdomain}
          className="text-[13px] text-muted hover:text-ink underline-offset-2 hover:underline cursor-pointer">
          Sign in to a different school
        </button>
        <button type="button" className="text-[13px] text-muted hover:text-ink underline-offset-2 hover:underline cursor-pointer">
          Forgot password?
        </button>
      </div>
      {showSubdomain && (
        <TextField id="staff-subdomain" label="School subdomain" value={subdomain}
          onChange={e => setSubdomain(e.target.value)} placeholder="yourschool" />
      )}
      <Button onClick={handleStaffLogin} disabled={loading || !staffEmail || !staffPassword} className="w-full">
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
    </div>
  );

  const renderStudentForm = () => (
    <div className="space-y-4">
      <TextField ref={studentIdRef} id="student-id" label="Admission number" autoComplete="username"
        value={studentId} onChange={e => setStudentId(e.target.value)}
        onKeyDown={handleKeyDown(handleStudentLogin)} placeholder="e.g. CLR/2026/00201" />
      <PasswordField ref={studentPassRef} id="student-password" label="Password" autoComplete="current-password"
        value={studentPassword} onChange={e => setStudentPassword(e.target.value)}
        onKeyDown={handleKeyDown(handleStudentLogin)} />
      <Button onClick={handleStudentLogin} disabled={loading || !studentId || !studentPassword} className="w-full">
        {loading ? 'Signing in…' : 'Sign in'}
      </Button>
      <p className="text-[13px] text-muted">No login details? Ask your school administrator.</p>
    </div>
  );

  const renderParentForm = () => {
    const r = lookupResult as Record<string, string> | null;
    const fee = lookupResult ? (lookupResult as Record<string, Record<string, unknown>>).fee_summary : null;
    const report = lookupResult ? (lookupResult as Record<string, Record<string, unknown>>).latest_report_card : null;
    return (
      <div className="space-y-4">
        <TextField ref={parentAdmRef} id="parent-adm" label="Student admission number"
          value={parentAdm} onChange={e => setParentAdm(e.target.value)}
          onKeyDown={handleKeyDown(handleParentLookup)} placeholder="e.g. CLR/2026/00201" />
        <TextField ref={parentCodeRef} id="parent-code" label="Access code"
          hint="You can find this code on your child's report card or fee receipt."
          value={parentCode} onChange={e => setParentCode(e.target.value)}
          onKeyDown={handleKeyDown(handleParentLookup)} placeholder="e.g. CLR-XXXXXXXX"
          className="font-mono tracking-wider" />
        <Button onClick={handleParentLookup} disabled={loading || !parentAdm.trim() || !parentCode.trim()} className="w-full">
          {loading ? 'Looking up…' : 'View records'}
        </Button>

        {r && (
          <div className="border border-line rounded bg-surface p-4 space-y-1.5">
            <p className="text-sm font-semibold text-ink">{r.full_name}</p>
            <p className="text-[13px] text-muted">{r.admission_no} · {r.class_name || 'Class not set'}</p>
            <p className="text-[13px] text-ink tabular-nums">
              Fees: ₦{((fee?.balance as number) || 0).toLocaleString()} due
              {report && <> · Latest average: {report.average as number}%</>}
            </p>
            <Link href={`/portal/${parentAdm.trim()}`} className="inline-block text-[13px] font-medium text-brand hover:underline pt-1">
              View full report
            </Link>
          </div>
        )}

        <p className="text-[13px] text-muted">
          Have a parent account?{' '}
          <Link href="/guardian" className="text-ink underline underline-offset-2">Sign in with your phone number</Link>
        </p>
      </div>
    );
  };

  return (
    <AuthShell sideLink={{ href: '/onboard', label: 'Set up your school' }}>
      <h1 className="text-2xl font-semibold text-ink tracking-tight">Sign in</h1>
      <p className="text-sm text-muted mt-1 mb-6">Choose how you sign in.</p>

      <div role="tablist" aria-label="Sign-in type" className="flex gap-5 border-b border-line mb-6">
        {TABS.map(({ role, label }) => {
          const active = selectedRole === role;
          return (
            <button
              key={role}
              role="tab"
              id={`tab-${role}`}
              aria-selected={active}
              aria-controls="login-panel"
              onClick={() => selectRole(role)}
              className={`pb-2.5 -mb-px text-sm border-b-2 cursor-pointer transition-colors ${
                active ? 'border-brand text-ink font-semibold' : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div id="login-panel" role="tabpanel" aria-labelledby={`tab-${selectedRole}`}>
        {selectedRole === 'staff' && renderStaffForm()}
        {selectedRole === 'student' && renderStudentForm()}
        {selectedRole === 'parent' && renderParentForm()}
        {error && <div className="mt-4"><FormError>{error}</FormError></div>}
      </div>

      <p className="text-[13px] text-muted mt-8">
        Need help? Ask your school administrator.{' '}
        <Link href="/onboard" className="lg:hidden underline underline-offset-2 hover:text-ink">Set up your school</Link>
      </p>
    </AuthShell>
  );
}

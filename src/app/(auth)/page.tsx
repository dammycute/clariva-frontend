'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, portal } from '@/lib/api';

type Role = 'staff' | 'student' | 'parent';

const FEATURES = [
  { icon: '📊', label: 'WAEC-compliant grading' },
  { icon: '💻', label: 'CBT examinations' },
  { icon: '💰', label: 'Fees & attendance tracking' },
];

const ROLE_CARDS: { role: Role; icon: string; title: string; desc: string }[] = [
  { role: 'staff', icon: '🏫', title: 'School Staff', desc: 'Admin, Principal, Teacher, Bursar' },
  { role: 'student', icon: '🎓', title: 'Student', desc: 'Check results & take exams' },
  { role: 'parent', icon: '👨‍👩‍👧', title: 'Parent / Guardian', desc: 'View fees & report cards' },
];

export default function LoginPage() {
  const router = useRouter();

  // auto-redirect if already logged in
  useEffect(() => {
    if (!auth.getToken()) return;
    const storedRole = localStorage.getItem('user_role');
    if (storedRole === 'teacher') { router.push('/teacher'); return; }
    if (storedRole === 'principal') { router.push('/principal'); return; }
    if (storedRole === 'bursary') { router.push('/bursary'); return; }
    if (storedRole === 'student') { router.push('/student'); return; }
    if (storedRole === 'parent' || storedRole === 'guardian') { router.push('/guardian/dashboard'); return; }
    if (storedRole) { router.push('/dashboard'); return; }
    // fallback: verify via API
    auth.me().then(user => {
      if (user.role === 'teacher') router.push('/teacher');
      else if (user.role === 'principal') router.push('/principal');
      else if (user.role === 'bursary') router.push('/bursary');
      else if (user.role === 'student') router.push('/student');
      else if (user.role === 'parent' || user.role === 'guardian') router.push('/guardian/dashboard');
      else router.push('/dashboard');
    }).catch(() => {});
  }, [router]);

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
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
    }, 400);
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
    <div className="space-y-3.5">
      <div>
        <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Email</label>
        <input ref={staffEmailRef} type="email" value={staffEmail} onChange={e => setStaffEmail(e.target.value)}
          onKeyDown={handleKeyDown(handleStaffLogin)}
          placeholder="admin@school.com"
          className="w-full h-12 px-3.5 rounded-xl border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] placeholder:text-[#94A3B8]" />
      </div>
      <div>
        <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Password</label>
        <input ref={staffPassRef} type="password" value={staffPassword} onChange={e => setStaffPassword(e.target.value)}
          onKeyDown={handleKeyDown(handleStaffLogin)}
          placeholder="••••••••"
          className="w-full h-12 px-3.5 rounded-xl border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] placeholder:text-[#94A3B8]" />
      </div>
      <div className="flex items-center justify-between">
        <button onClick={() => setShowSubdomain(!showSubdomain)} className="text-[11px] text-[#64748B] hover:text-[#0D2B55] cursor-pointer">
          {showSubdomain ? '−' : '+'} Different school?
        </button>
        <button className="text-[11px] text-[#1A7A4A] hover:underline cursor-pointer">Forgot password?</button>
      </div>
      {showSubdomain && (
        <div className="animate-fadeIn">
          <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">School subdomain</label>
          <input type="text" value={subdomain} onChange={e => setSubdomain(e.target.value)}
            placeholder="yourschool"
            className="w-full h-12 px-3.5 rounded-xl border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] placeholder:text-[#94A3B8]" />
        </div>
      )}
      <button onClick={handleStaffLogin} disabled={loading || !staffEmail || !staffPassword}
        className="w-full h-12 rounded-xl bg-[#1A7A4A] text-white text-sm font-bold hover:bg-[#14663D] disabled:opacity-40 transition-colors cursor-pointer">
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
    </div>
  );

  const renderStudentForm = () => (
    <div className="space-y-3.5">
      <div>
        <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Admission Number</label>
        <input ref={studentIdRef} type="text" value={studentId} onChange={e => setStudentId(e.target.value)}
          onKeyDown={handleKeyDown(handleStudentLogin)}
          placeholder="Enter admission number"
          className="w-full h-12 px-3.5 rounded-xl border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] placeholder:text-[#94A3B8]" />
      </div>
      <div>
        <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Password</label>
        <input ref={studentPassRef} type="password" value={studentPassword} onChange={e => setStudentPassword(e.target.value)}
          onKeyDown={handleKeyDown(handleStudentLogin)}
          placeholder="Enter your password"
          className="w-full h-12 px-3.5 rounded-xl border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] placeholder:text-[#94A3B8]" />
      </div>
      <button onClick={handleStudentLogin} disabled={loading || !studentId || !studentPassword}
        className="w-full h-12 rounded-xl bg-[#1A7A4A] text-white text-sm font-bold hover:bg-[#14663D] disabled:opacity-40 transition-colors cursor-pointer">
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
      <p className="text-[11px] text-[#64748B] text-center">Don&apos;t have login details? Ask your school admin</p>
    </div>
  );

  const renderParentForm = () => (
    <div className="space-y-3.5">
      <div>
        <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Student Admission Number</label>
        <input ref={parentAdmRef} type="text" value={parentAdm} onChange={e => setParentAdm(e.target.value)}
          onKeyDown={handleKeyDown(handleParentLookup)}
          placeholder="e.g. CLR/2026/00201"
          className="w-full h-12 px-3.5 rounded-xl border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] placeholder:text-[#94A3B8]" />
      </div>
      <div>
        <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Access Code</label>
        <input ref={parentCodeRef} type="text" value={parentCode} onChange={e => setParentCode(e.target.value)}
          onKeyDown={handleKeyDown(handleParentLookup)}
          placeholder="e.g. CLR-XXXXXXXX"
          className="w-full h-12 px-3.5 rounded-xl border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] placeholder:text-[#94A3B8] font-mono text-base tracking-widest" />
        <p className="text-[10px] text-[#94A3B8] mt-1">Find this code on your child&apos;s report card or fee receipt</p>
      </div>
      <button onClick={handleParentLookup} disabled={loading || !parentAdm.trim() || !parentCode.trim()}
        className="w-full h-12 rounded-xl bg-[#1A7A4A] text-white text-sm font-bold hover:bg-[#14663D] disabled:opacity-40 transition-colors cursor-pointer">
        {loading ? 'Looking up…' : 'View Records'}
      </button>

      {lookupResult && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-1.5 animate-fadeIn">
          <p className="text-sm font-bold text-[#0D2B55]">{(lookupResult as Record<string, string>).full_name}</p>
          <p className="text-[11px] text-[#64748B]">{(lookupResult as Record<string, string>).admission_no} · {(lookupResult as Record<string, string>).class_name || 'Class not set'}</p>
          <div className="flex gap-3 text-[11px]">
            <span>Fees: ₦{((lookupResult as Record<string, Record<string, unknown>>).fee_summary?.balance as number || 0).toLocaleString()} due</span>
            {(lookupResult as Record<string, Record<string, unknown>>).latest_report_card && (
              <span>Latest: {(lookupResult as Record<string, Record<string, unknown>>).latest_report_card?.average as number}%</span>
            )}
          </div>
          <Link href={`/portal/${parentAdm.trim()}`} className="block text-center text-xs font-bold text-[#1A7A4A] hover:underline pt-1">View Full Report →</Link>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen flex">
      {/* left panel — branding, hidden on mobile */}
      <div className="hidden lg:flex lg:w-[440px] xl:w-[480px] flex-col justify-between p-10 relative overflow-hidden"
        style={{
          background: '#0D2B55',
          backgroundImage: 'radial-gradient(ellipse at 20% 30%, #1A3F6E 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, #0F2D5A 0%, transparent 50%)',
        }}
      >
        <div>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#1A7A4A] rounded-lg flex items-center justify-center text-white font-bold text-lg">C</div>
            <span className="font-semibold text-xl text-white">Clariva</span>
          </div>
          <p className="text-white/60 text-sm mb-8">Nigeria&apos;s School Management Platform</p>
          <div className="space-y-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-lg">{f.icon}</span>
                <span className="text-sm text-white/80">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
        <Link href="/onboard" className="text-sm text-white/50 hover:text-white/80 transition-colors">
          Set up your school →
        </Link>
      </div>

      {/* right panel — login */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-[420px]">
          {/* mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-[#1A7A4A] rounded-lg flex items-center justify-center text-white font-bold text-lg">C</div>
            <span className="font-semibold text-xl text-[#0D2B55]">Clariva</span>
          </div>

          {/* role selector */}
          <div className="mb-6">
            <h2 className="text-base font-bold text-[#0D2B55] mb-3">Welcome</h2>
            <p className="text-xs text-[#64748B] mb-4">Select who you are to continue</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {ROLE_CARDS.map(({ role, icon, title, desc }) => {
                const active = selectedRole === role;
                return (
                  <button key={role} onClick={() => selectRole(role)}
                    className={`flex flex-col items-center text-center p-3 rounded-xl border-2 transition-all cursor-pointer ${
                      active ? 'border-[#1A7A4A] bg-green-50' : 'border-[#DDE5F0] bg-white hover:border-[#94A3B8]'
                    }`}
                    style={{ minHeight: '100px' }}
                  >
                    <span className="text-2xl mb-1">{icon}</span>
                    <span className="text-xs font-bold text-[#0D2B55]">{title}</span>
                    <span className="text-[9px] text-[#64748B] mt-0.5 leading-tight">{desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* login form */}
          <div
            style={{
              opacity: selectedRole ? 1 : 0,
              transform: selectedRole ? 'translateY(0)' : 'translateY(12px)',
              pointerEvents: selectedRole ? 'auto' : 'none',
              transition: 'opacity 0.3s ease, transform 0.3s ease',
            }}
          >
            {selectedRole === 'staff' && renderStaffForm()}
            {selectedRole === 'student' && renderStudentForm()}
            {selectedRole === 'parent' && renderParentForm()}

            {error && (
              <div className="mt-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
            )}

            {/* bottom link */}
            <div className="mt-6 pt-4 border-t border-[#DDE5F0]">
              <Link href="/onboard" className="block text-center text-xs text-[#64748B] hover:text-[#0D2B55]">
                School not on Clariva yet? Set up in 2 minutes →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

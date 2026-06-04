'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, portal } from '@/lib/api';

type Role = 'staff' | 'student' | 'parent';
type StudentMode = 'email' | 'id';
type ParentTab = 'code' | 'account';

const FEATURES = [
  { icon: '📊', label: 'WAEC-compliant grading' },
  { icon: '💻', label: 'CBT examinations' },
  { icon: '💰', label: 'Fees & attendance tracking' },
];

const ROLE_CARDS: { role: Role; icon: string; title: string; desc: string }[] = [
  { role: 'staff', icon: '🏫', title: 'School Staff', desc: 'Admin, Teacher, Principal' },
  { role: 'student', icon: '🎓', title: 'Student', desc: 'Check results & take exams' },
  { role: 'parent', icon: '👨‍👩‍👧', title: 'Parent', desc: 'View fees & report cards' },
];

export default function LoginPage() {
  const router = useRouter();

  // auto-redirect if already logged in
  useEffect(() => {
    if (!auth.getToken()) return;
    auth.me().then(user => {
      if (user.role === 'teacher') router.push('/teacher');
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
  const [studentMode, setStudentMode] = useState<StudentMode>('email');
  const [studentEmail, setStudentEmail] = useState('');
  const [studentId, setStudentId] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const studentEmailRef = useRef<HTMLInputElement>(null);
  const studentIdRef = useRef<HTMLInputElement>(null);
  const studentPassRef = useRef<HTMLInputElement>(null);

  // parent fields — code tab
  const [parentCode, setParentCode] = useState('');
  const [parentTab, setParentTab] = useState<ParentTab>('code');
  const [lookupResult, setLookupResult] = useState<{
    full_name: string; admission_no: string; class_name: string | null;
    fee_summary: { total_due: number; total_paid: number; balance: number };
    latest_report_card: { term: string; academic_year: string; average: number } | null;
  } | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  // parent fields — account tab
  const [parentPhone, setParentPhone] = useState('');
  const [parentPin, setParentPin] = useState('');
  const parentPhoneRef = useRef<HTMLInputElement>(null);
  const parentPinRef = useRef<HTMLInputElement>(null);

  // helpers
  const resetAll = () => {
    setError('');
    setLoading(false);
    setStaffEmail(''); setStaffPassword(''); setShowSubdomain(false); setSubdomain('');
    setStudentMode('email'); setStudentEmail(''); setStudentId(''); setStudentPassword('');
    setParentTab('code'); setParentCode(''); setLookupResult(null); setParentPhone(''); setParentPin('');
  };

  const selectRole = (r: Role) => {
    if (r === selectedRole) return;
    resetAll();
    setSelectedRole(r);
    setTimeout(() => {
      if (r === 'staff') staffEmailRef.current?.focus();
      else if (r === 'student' && studentMode === 'email') studentEmailRef.current?.focus();
      else if (r === 'student') studentIdRef.current?.focus();
      else if (r === 'parent' && parentTab === 'code') codeRef.current?.focus();
      else if (r === 'parent') parentPhoneRef.current?.focus();
    }, 400);
  };

  // ---- auth handlers ----
  const handleStaffLogin = useCallback(async () => {
    const email = staffEmailRef.current?.value;
    const pass = staffPassRef.current?.value;
    if (!email || !pass) return;
    setLoading(true); setError('');
    try {
      await auth.login(email, pass);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
      setLoading(false);
      return;
    }
    try {
      const user = await auth.me();
      if (user.role === 'teacher') { window.location.href = '/teacher'; return; }
      if (user.role === 'parent' || user.role === 'guardian') { window.location.href = '/guardian/dashboard'; return; }
      window.location.href = '/dashboard';
    } catch {
      setError('Login succeeded but failed to load profile. Try again.');
      setLoading(false);
    }
  }, []);

  const handleStudentLogin = useCallback(async () => {
    const pass = studentPassRef.current?.value;
    if (!pass) return;
    const email = studentEmailRef.current?.value;
    const sid = studentIdRef.current?.value;
    if (studentMode === 'email' && !email) return;
    if (studentMode === 'id' && !sid) return;
    setLoading(true); setError('');
    try {
      if (studentMode === 'email') {
        await auth.login(email!, pass);
      } else {
        await auth.studentLogin(sid!, pass);
      }
      window.location.href = '/student';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    }
    finally { setLoading(false); }
  }, [studentMode]);

  const handleParentCode = useCallback(async () => {
    const code = codeRef.current?.value;
    if (!code?.trim()) return;
    setLoading(true); setError(''); setLookupResult(null);
    try {
      const res = await portal.lookup(code.trim());
      setLookupResult(res as typeof lookupResult);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Code not found');
    }
    finally { setLoading(false); }
  }, []);

  const handleParentLogin = useCallback(async () => {
    const phone = parentPhoneRef.current?.value;
    const pin = parentPinRef.current?.value;
    if (!phone || !pin) return;
    setLoading(true); setError('');
    try {
      await portal.login(phone, pin);
      window.location.href = '/guardian/dashboard';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
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
      <div className="flex bg-[#F0F4FA] rounded-lg p-0.5">
        <button onClick={() => { setStudentMode('email'); setError(''); }} className={`flex-1 text-xs font-bold py-2 rounded-md transition-colors cursor-pointer ${studentMode === 'email' ? 'bg-white text-[#0D2B55] shadow-sm' : 'text-[#64748B]'}`}>
          Login with Email
        </button>
        <button onClick={() => { setStudentMode('id'); setError(''); }} className={`flex-1 text-xs font-bold py-2 rounded-md transition-colors cursor-pointer ${studentMode === 'id' ? 'bg-white text-[#0D2B55] shadow-sm' : 'text-[#64748B]'}`}>
          Login with Student ID
        </button>
      </div>
      {studentMode === 'email' ? (
        <div>
          <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Email</label>
          <input ref={studentEmailRef} type="email" value={studentEmail} onChange={e => setStudentEmail(e.target.value)}
            onKeyDown={handleKeyDown(handleStudentLogin)}
            placeholder="student@school.com"
            className="w-full h-12 px-3.5 rounded-xl border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] placeholder:text-[#94A3B8]" />
        </div>
      ) : (
        <div>
          <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Student ID</label>
          <input ref={studentIdRef} type="text" value={studentId} onChange={e => setStudentId(e.target.value)}
            onKeyDown={handleKeyDown(handleStudentLogin)}
            placeholder="STU-2024-001"
            className="w-full h-12 px-3.5 rounded-xl border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] placeholder:text-[#94A3B8]" />
        </div>
      )}
      <div>
        <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Password</label>
        <input ref={studentPassRef} type="password" value={studentPassword} onChange={e => setStudentPassword(e.target.value)}
          onKeyDown={handleKeyDown(handleStudentLogin)}
          placeholder="••••••••"
          className="w-full h-12 px-3.5 rounded-xl border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] placeholder:text-[#94A3B8]" />
      </div>
      <button onClick={handleStudentLogin} disabled={loading || !studentPassword || (studentMode === 'email' ? !studentEmail : !studentId)}
        className="w-full h-12 rounded-xl bg-[#1A7A4A] text-white text-sm font-bold hover:bg-[#14663D] disabled:opacity-40 transition-colors cursor-pointer">
        {loading ? 'Signing in…' : 'Sign In'}
      </button>
      <p className="text-[11px] text-[#64748B] text-center">Don&apos;t have login details? Ask your school admin</p>
    </div>
  );

  const renderParentForm = () => (
    <div className="space-y-3.5">
      <div className="flex bg-[#F0F4FA] rounded-lg p-0.5">
        <button onClick={() => { setParentTab('code'); setError(''); setLookupResult(null); }} className={`flex-1 text-xs font-bold py-2 rounded-md transition-colors cursor-pointer ${parentTab === 'code' ? 'bg-white text-[#0D2B55] shadow-sm' : 'text-[#64748B]'}`}>
          Enter Student Code
        </button>
        <button onClick={() => { setParentTab('account'); setError(''); }} className={`flex-1 text-xs font-bold py-2 rounded-md transition-colors cursor-pointer ${parentTab === 'account' ? 'bg-white text-[#0D2B55] shadow-sm' : 'text-[#64748B]'}`}>
          Parent Account
        </button>
      </div>

      {parentTab === 'code' ? (
        <>
          <div>
            <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Student Code</label>
            <input ref={codeRef} type="text" value={parentCode} onChange={e => setParentCode(e.target.value)}
              onKeyDown={handleKeyDown(handleParentCode)}
              placeholder="CLR-XXXXXXXX"
              className="w-full h-12 px-3.5 rounded-xl border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] placeholder:text-[#94A3B8] text-center font-mono text-base tracking-widest" />
            <p className="text-[10px] text-[#94A3B8] mt-1">Find this code on your child&apos;s report card or fee receipt</p>
          </div>
          <button onClick={handleParentCode} disabled={loading || !parentCode.trim()}
            className="w-full h-12 rounded-xl bg-[#1A7A4A] text-white text-sm font-bold hover:bg-[#14663D] disabled:opacity-40 transition-colors cursor-pointer">
            {loading ? 'Looking up…' : 'View Records'}
          </button>

          {lookupResult && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 space-y-1.5 animate-fadeIn">
              <p className="text-sm font-bold text-[#0D2B55]">{lookupResult.full_name}</p>
              <p className="text-[11px] text-[#64748B]">{lookupResult.admission_no} · {lookupResult.class_name || 'Class not set'}</p>
              <div className="flex gap-3 text-[11px]">
                <span>Fees: ₦{lookupResult.fee_summary?.balance?.toLocaleString() || '0'} due</span>
                {lookupResult.latest_report_card && (
                  <span>Latest: {lookupResult.latest_report_card.average}%</span>
                )}
              </div>
              <Link href={`/portal/${parentCode.trim()}`} className="block text-center text-xs font-bold text-[#1A7A4A] hover:underline pt-1">View Full Report →</Link>
            </div>
          )}
        </>
      ) : (
        <>
          <div>
            <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Phone number</label>
            <input ref={parentPhoneRef} type="tel" value={parentPhone} onChange={e => setParentPhone(e.target.value)}
              onKeyDown={handleKeyDown(handleParentLogin)}
              placeholder="08012345678"
              className="w-full h-12 px-3.5 rounded-xl border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] placeholder:text-[#94A3B8]" />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">PIN</label>
            <input ref={parentPinRef} type="password" inputMode="numeric" value={parentPin} onChange={e => setParentPin(e.target.value)}
              onKeyDown={handleKeyDown(handleParentLogin)}
              placeholder="••••"
              maxLength={4}
              className="w-full h-12 px-3.5 rounded-xl border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] placeholder:text-[#94A3B8]" />
          </div>
          <button onClick={handleParentLogin} disabled={loading || !parentPhone || !parentPin}
            className="w-full h-12 rounded-xl bg-[#1A7A4A] text-white text-sm font-bold hover:bg-[#14663D] disabled:opacity-40 transition-colors cursor-pointer">
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
          <p className="text-[11px] text-[#64748B] text-center">
            First time?{' '}
            <Link href="/onboard?type=parent" className="text-[#1A7A4A] hover:underline">Set up parent access →</Link>
          </p>
        </>
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

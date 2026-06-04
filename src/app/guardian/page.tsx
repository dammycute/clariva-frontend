'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { portal, setTokens } from '@/lib/api';

export default function GuardianLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'code' | 'login' | 'setup'>('code');

  // Code lookup state
  const [code, setCode] = useState('');
  const [lookupResult, setLookupResult] = useState<Record<string, unknown> | null>(null);

  // Login state
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPin, setLoginPin] = useState('');

  // Setup state
  const [setupPhone, setSetupPhone] = useState('');
  const [setupPin, setSetupPin] = useState('');
  const [setupConfirmPin, setSetupConfirmPin] = useState('');
  const [setupStudentCode, setSetupStudentCode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setLookupResult(null);
    try {
      const result = await portal.lookup(code.toUpperCase().trim());
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
      const result = await portal.login(loginPhone, loginPin);
      setTokens(result.access, result.refresh);
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
    if (setupPin !== setupConfirmPin) {
      setError('PINs do not match');
      return;
    }
    if (!/^\d{4,6}$/.test(setupPin)) {
      setError('PIN must be 4-6 digits');
      return;
    }
    setLoading(true);
    try {
      await portal.setup(setupPhone, setupPin, setupStudentCode.toUpperCase().trim());
      setMode('login');
      setLoginPhone(setupPhone);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{
        background: '#0D2B55',
        backgroundImage: 'radial-gradient(ellipse at 20% 50%, #1A3F6E 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, #0F2D5A 0%, transparent 50%)',
      }}
    >
      <div className="w-full max-w-[400px] mx-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-[#1A7A4A] rounded-lg flex items-center justify-center text-white font-bold text-lg">C</div>
            <span className="font-semibold text-xl text-white">Clariva</span>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-2 mb-6">
            <button onClick={() => { setMode('code'); setError(''); setLookupResult(null); }}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${mode === 'code' ? 'bg-[#1A7A4A] text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>
              Student Code
            </button>
            <button onClick={() => { setMode('login'); setError(''); }}
              className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${mode === 'login' ? 'bg-[#1A7A4A] text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}>
              Parent Login
            </button>
          </div>

          {mode === 'code' && !lookupResult && (
            <form onSubmit={handleLookup}>
              <p className="text-white/60 text-sm mb-4">Enter the student access code from the school</p>
              <div className="mb-3.5">
                <input type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="CLR-XXXXXXXX" maxLength={12} required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-[#1A7A4A] placeholder:text-white/30 font-mono" />
              </div>
              {error && <p className="text-red-300 text-xs mb-3">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-[#1A7A4A] text-white text-sm font-bold hover:bg-[#14663D] disabled:opacity-50">
                {loading ? 'Looking up…' : 'View Records →'}
              </button>
            </form>
          )}

          {mode === 'code' && lookupResult && (
            <div>
              <div className="text-center mb-5">
                <div className="text-3xl mb-2">📋</div>
                <h2 className="text-lg font-bold text-white">{lookupResult.full_name as string}</h2>
                <p className="text-xs text-white/50">{lookupResult.admission_no as string} · {lookupResult.class_name as string || '—'}</p>
              </div>

              <div className="bg-white/10 rounded-xl p-4 mb-4">
                <p className="text-[10px] text-white/50 font-bold uppercase mb-2">Fee Summary</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-white/50">Due</p>
                    <p className="text-sm font-bold text-white">₦{(lookupResult.fee_summary as Record<string, number>).total_due.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/50">Paid</p>
                    <p className="text-sm font-bold text-[#4ADE80]">₦{(lookupResult.fee_summary as Record<string, number>).total_paid.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/50">Balance</p>
                    <p className={`text-sm font-bold ${(lookupResult.fee_summary as Record<string, number>).balance > 0 ? 'text-[#FB7185]' : 'text-[#4ADE80]'}`}>
                      ₦{(lookupResult.fee_summary as Record<string, number>).balance.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              {!!lookupResult.latest_report_card && (
                <div className="bg-white/10 rounded-xl p-4 mb-5">
                  <p className="text-[10px] text-white/50 font-bold uppercase mb-2">Latest Report Card</p>
                  <p className="text-xs text-white/70">{(lookupResult.latest_report_card as Record<string, unknown>).term as string} {(lookupResult.latest_report_card as Record<string, unknown>).academic_year as string}</p>
                  <p className="text-lg font-bold text-white">{(lookupResult.latest_report_card as Record<string, number>).average}%</p>
                </div>
              )}

              <div className="bg-[#1A3F6E] border border-white/10 rounded-xl p-4 text-center mb-4">
                <p className="text-xs text-white/70 mb-2">Set up a parent account to check anytime without the code</p>
                <button onClick={() => { setMode('setup'); setSetupStudentCode(code); setError(''); }}
                  className="text-xs px-4 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D]">
                  Set Up Account
                </button>
              </div>

              <button onClick={() => { setLookupResult(null); setCode(''); }}
                className="text-xs text-white/50 hover:text-white/80 underline block mx-auto">
                Look up another code
              </button>
            </div>
          )}

          {mode === 'login' && (
            <form onSubmit={handleLogin}>
              <p className="text-white/60 text-sm mb-4">Sign in to your parent account</p>
              <div className="mb-3.5">
                <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase">Phone Number</label>
                <input type="tel" value={loginPhone} onChange={e => setLoginPhone(e.target.value)} required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-[#1A7A4A] placeholder:text-white/30" />
              </div>
              <div className="mb-3.5">
                <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase">PIN (4-6 digits)</label>
                <input type="password" value={loginPin} onChange={e => setLoginPin(e.target.value)} required maxLength={6}
                  inputMode="numeric" pattern="[0-9]*"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-[#1A7A4A] placeholder:text-white/30" />
              </div>
              {error && <p className="text-red-300 text-xs mb-3">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-[#1A7A4A] text-white text-sm font-bold hover:bg-[#14663D] disabled:opacity-50">
                {loading ? 'Signing in…' : 'Access Portal →'}
              </button>
              <p className="mt-3 text-center">
                <button type="button" onClick={() => { setMode('setup'); setError(''); }}
                  className="text-xs text-white/50 hover:text-white/70 underline">
                  First time? Set up access
                </button>
              </p>
            </form>
          )}

          {mode === 'setup' && (
            <form onSubmit={handleSetup}>
              <p className="text-white/60 text-sm mb-4">Create a parent account</p>
              <div className="mb-3.5">
                <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase">Phone Number</label>
                <input type="tel" value={setupPhone} onChange={e => setSetupPhone(e.target.value)} required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-[#1A7A4A] placeholder:text-white/30" />
              </div>
              <div className="mb-3.5">
                <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase">PIN (4-6 digits)</label>
                <input type="password" value={setupPin} onChange={e => setSetupPin(e.target.value)} required maxLength={6}
                  inputMode="numeric" pattern="[0-9]*"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-[#1A7A4A] placeholder:text-white/30" />
              </div>
              <div className="mb-3.5">
                <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase">Confirm PIN</label>
                <input type="password" value={setupConfirmPin} onChange={e => setSetupConfirmPin(e.target.value)} required maxLength={6}
                  inputMode="numeric" pattern="[0-9]*"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-[#1A7A4A] placeholder:text-white/30" />
              </div>
              <div className="mb-3.5">
                <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase">Student Code</label>
                <input type="text" value={setupStudentCode} onChange={e => setSetupStudentCode(e.target.value.toUpperCase())}
                  placeholder="CLR-XXXXXXXX" maxLength={12} required
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-[#1A7A4A] placeholder:text-white/30 font-mono" />
              </div>
              {error && <p className="text-red-300 text-xs mb-3">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-[#1A7A4A] text-white text-sm font-bold hover:bg-[#14663D] disabled:opacity-50">
                {loading ? 'Setting up…' : 'Create Account →'}
              </button>
              <p className="mt-3 text-center">
                <button type="button" onClick={() => { setMode('login'); setError(''); }}
                  className="text-xs text-white/50 hover:text-white/70 underline">
                  Already have an account? Log in
                </button>
              </p>
            </form>
          )}

          <p className="mt-4 text-center text-xs text-white/40">
            <Link href="/" className="text-white/70 underline">School staff login →</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

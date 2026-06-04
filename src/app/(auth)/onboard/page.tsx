'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, api, request } from '@/lib/api';

const SCHOOL_TYPES = ['Secondary (JSS & SSS)', 'Primary', 'Nursery', 'Mixed (Primary & Secondary)'] as const;

function calcStrength(pw: string): { label: string; color: string; pct: number } {
  if (!pw) return { label: '', color: '', pct: 0 };
  let score = 0;
  if (pw.length >= 6) score += 25;
  if (pw.length >= 10) score += 15;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 20;
  if (/\d/.test(pw)) score += 20;
  if (/[^a-zA-Z0-9]/.test(pw)) score += 20;
  if (score < 30) return { label: 'Weak', color: 'bg-red-500', pct: 25 };
  if (score < 60) return { label: 'Fair', color: 'bg-amber-400', pct: 55 };
  return { label: 'Strong', color: 'bg-green-500', pct: 100 };
}

export default function OnboardPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    schoolName: '', address: '', lga: '', state: '', schoolType: '',
    proprietorName: '', proprietorPhone: '', proprietorEmail: '',
    subdomain: '',
  });
  const [states, setStates] = useState<{ id: number; name: string }[]>([]);
  const [lgas, setLgas] = useState<{ id: number; name: string }[]>([]);

  // searchable dropdowns
  const [stateQuery, setStateQuery] = useState('');
  const [lgaQuery, setLgaQuery] = useState('');
  const [stateOpen, setStateOpen] = useState(false);
  const [lgaOpen, setLgaOpen] = useState(false);
  const stateRef = useRef<HTMLDivElement>(null);
  const lgaRef = useRef<HTMLDivElement>(null);

  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [subdomainEdit, setSubdomainEdit] = useState(false);
  const [subdomainManual, setSubdomainManual] = useState('');

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<{ portalUrl: string } | null>(null);

  // load states on mount
  useEffect(() => {
    api.locations.states.list().then(d => setStates(d as { id: number; name: string }[])).catch(() => {});
  }, []);

  // load LGAs when state changes
  useEffect(() => {
    if (!form.state) { setLgas([]); return; }
    const stateId = states.find(s => s.name === form.state)?.id;
    if (stateId) api.locations.lgas.list({ state: String(stateId) }).then(d => setLgas(d as { id: number; name: string }[])).catch(() => {});
  }, [form.state, states]);

  // close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (stateRef.current && !stateRef.current.contains(e.target as Node)) setStateOpen(false);
      if (lgaRef.current && !lgaRef.current.contains(e.target as Node)) setLgaOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const update = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    if (field === 'schoolName' && !subdomainManual) {
      const slug = value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30);
      setForm(prev => ({ ...prev, schoolName: value, subdomain: slug }));
    }
  };

  const setField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setFieldErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  // filtered lists
  const filteredStates = useMemo(() => {
    return states.filter(s => s.name.toLowerCase().includes(stateQuery.toLowerCase()));
  }, [states, stateQuery]);

  const filteredLgas = useMemo(() => {
    return lgas.filter(l => l.name.toLowerCase().includes(lgaQuery.toLowerCase()));
  }, [lgas, lgaQuery]);

  // validation
  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!form.schoolName.trim()) errs.schoolName = 'School name is required';
    if (!form.subdomain.trim()) errs.subdomain = 'Subdomain is required';
    if (!form.schoolType) errs.schoolType = 'Select a school type';
    if (!form.state) errs.state = 'Select a state';
    if (!form.lga) errs.lga = 'Select an LGA';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!form.proprietorName.trim()) errs.proprietorName = 'Full name is required';
    if (!form.proprietorPhone.trim()) errs.proprietorPhone = 'Phone number is required';
    else if (!/^0\d{10}$/.test(form.proprietorPhone.replace(/\s/g, ''))) errs.proprietorPhone = 'Enter a valid Nigerian phone number (e.g. 08012345678)';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = () => {
    const errs: Record<string, string> = {};
    if (!password) errs.password = 'Password is required';
    else if (password.length < 6) errs.password = 'Password must be at least 6 characters';
    if (password !== confirmPw) errs.confirmPw = 'Passwords do not match';
    if (!agreeTerms) errs.terms = 'You must agree to the terms';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleContinue1 = () => { if (validateStep1()) setStep(2); };
  const handleContinue2 = () => { if (validateStep2()) setStep(3); };

  const handleSubmit = async () => {
    if (!validateStep3()) return;
    setLoading(true);

    try {
      const email = form.proprietorEmail || `admin@${form.subdomain}.clariva.ng`;
      const slug = form.subdomain;

      await auth.register({
        username: slug,
        email,
        password,
        first_name: form.proprietorName.split(' ')[0] || 'Admin',
        last_name: form.proprietorName.split(' ').slice(1).join(' ') || '',
        phone: form.proprietorPhone,
        role: 'school_admin',
      });

      await auth.login(email, password);

      const school = await api.schools.create({
        name: form.schoolName,
        subdomain: form.subdomain,
        address: form.address || null,
        lga: form.lga || null,
        state: form.state || null,
        school_type: form.schoolType || null,
        proprietor_name: form.proprietorName || null,
        proprietor_phone: form.proprietorPhone || null,
        status: 'active',
        plan: 'trial',
        trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });

      await request('PATCH', '/auth/me/', { school: (school as { id: number }).id });

      setSuccess({ portalUrl: `https://${form.subdomain}.clariva.ng` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      if (msg.toLowerCase().includes('subdomain') || msg.toLowerCase().includes('taken')) {
        setFieldErrors(prev => ({ ...prev, subdomain: 'This name is taken, try another' }));
        setStep(1);
      } else if (msg.toLowerCase().includes('email') && msg.toLowerCase().includes('exists')) {
        setFieldErrors(prev => ({ ...prev, proprietorEmail: 'An account with this email exists. Sign in instead →' }));
      } else {
        setFieldErrors(prev => ({ ...prev, _general: msg }));
      }
    }
    finally { setLoading(false); }
  };

  const portalUrl = `https://${form.subdomain || 'your-school'}.clariva.ng`;

  // success screen
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0D2B55] to-[#0A1F3D] p-6">
        <div className="bg-white rounded-2xl p-10 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#0D2B55] mb-2">Your portal is ready!</h2>
          <p className="text-xs text-[#64748B] mb-4">Access your school management portal at:</p>
          <a href={success.portalUrl} target="_blank" rel="noopener noreferrer"
            className="block text-sm font-bold text-[#1A7A4A] hover:underline mb-6">{success.portalUrl}</a>
          <div className="flex flex-col gap-2">
            <button onClick={() => router.push('/dashboard')}
              className="w-full py-3 rounded-xl bg-[#1A7A4A] text-white text-sm font-bold hover:bg-[#14663D] cursor-pointer">
              Go to Dashboard →
            </button>
            <button onClick={() => { navigator.clipboard.writeText(success.portalUrl); alert('URL copied!'); }}
              className="w-full py-3 rounded-xl border border-[#DDE5F0] text-sm text-[#0D2B55] hover:bg-[#F0F4FA] cursor-pointer">
              Share your portal URL
            </button>
          </div>
        </div>
      </div>
    );
  }

  // progress
  const progressPct = (step / 3) * 100;

  // shared input styles
  const inputCls = 'w-full h-12 px-3.5 rounded-xl border text-sm outline-none transition-colors placeholder:text-[#94A3B8]';
  const inputNorm = 'border-[#DDE5F0] focus:border-[#1A7A4A]';
  const inputErr = 'border-red-300 focus:border-red-500 bg-red-50';

  return (
    <div className="min-h-screen flex bg-white">
      {/* left panel — preview */}
      <div className="hidden lg:flex lg:w-[420px] xl:w-[480px] flex-col justify-between p-10 sticky top-0 h-screen bg-[#0D2B55]"
        style={{
          backgroundImage: 'radial-gradient(ellipse at 20% 30%, #1A3F6E 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, #0F2D5A 0%, transparent 50%)',
        }}
      >
        <div>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#1A7A4A] rounded-lg flex items-center justify-center text-white font-bold text-lg">C</div>
            <span className="font-semibold text-xl text-white">Clariva</span>
          </div>

          <p className="text-white/50 text-xs mb-4">Your school portal will be at:</p>
          <div className="bg-white/10 rounded-xl p-3 mb-6 flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l2 2 5-5" />
            </svg>
            <span className="text-white/80 font-mono text-xs truncate">{portalUrl}</span>
          </div>

          <div className="space-y-3">
            <div className="text-xs">
              <span className="text-white/40">School name</span>
              <p className="text-white font-medium mt-0.5">{form.schoolName || <span className="text-white/30 italic">Not set yet</span>}</p>
            </div>
            <div className="text-xs">
              <span className="text-white/40">Location</span>
              <p className="text-white font-medium mt-0.5">{form.lga && form.state ? `${form.lga}, ${form.state}` : <span className="text-white/30 italic">Not set yet</span>}</p>
            </div>
            <div className="text-xs">
              <span className="text-white/40">School type</span>
              <p className="text-white font-medium mt-0.5">{form.schoolType || <span className="text-white/30 italic">Not set yet</span>}</p>
            </div>
            <div className="text-xs">
              <span className="text-white/40">Proprietor</span>
              <p className="text-white font-medium mt-0.5">{form.proprietorName || <span className="text-white/30 italic">Not set yet</span>}</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-white/50 text-xs flex items-center gap-1.5">✓ 30-day free trial, no card needed</p>
          <p className="text-white/50 text-xs flex items-center gap-1.5">✓ Set up in under 3 minutes</p>
          <p className="text-white/50 text-xs flex items-center gap-1.5">✓ WAEC-compliant from day one</p>
        </div>
      </div>

      {/* right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-[480px]">

          {/* mobile logo */}
          <div className="flex items-center gap-3 mb-6 lg:hidden">
            <div className="w-9 h-9 bg-[#1A7A4A] rounded-lg flex items-center justify-center text-white font-bold text-sm">C</div>
            <span className="font-semibold text-lg text-[#0D2B55]">Clariva</span>
          </div>

          <h1 className="text-xl font-bold text-[#0D2B55] mb-1">Set Up Your School</h1>
          <p className="text-xs text-[#64748B] mb-5">Your portal will be ready in 2 minutes.</p>

          {/* progress bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between text-[11px] text-[#64748B] mb-1.5">
              <span className="font-bold text-[#0D2B55]">Step {step} of 3</span>
              <span>{['School Information', 'Admin Information', 'Set Password'][step - 1]}</span>
            </div>
            <div className="h-1.5 bg-[#F0F4FA] rounded-full overflow-hidden">
              <div className="h-full bg-[#1A7A4A] rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          {/* ---- Step 1 ---- */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">School name</label>
                <input value={form.schoolName} onChange={e => update('schoolName', e.target.value)}
                  placeholder="e.g. Queens College"
                  className={`${inputCls} ${fieldErrors.schoolName ? inputErr : inputNorm}`} />
                {fieldErrors.schoolName && <p className="text-red-500 text-[10px] mt-1">{fieldErrors.schoolName}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Portal subdomain</label>
                <div className={`flex items-center h-12 px-3.5 rounded-xl border text-sm ${fieldErrors.subdomain ? inputErr : inputNorm}`}>
                  {subdomainEdit ? (
                    <input value={subdomainManual} onChange={e => { setSubdomainManual(e.target.value); setField('subdomain', e.target.value); }}
                      onBlur={() => { if (!subdomainManual) { setSubdomainManual(''); setSubdomainEdit(false); } }}
                      className="flex-1 outline-none text-sm font-mono" autoFocus />
                  ) : (
                    <span className="flex-1 font-mono text-sm">{form.subdomain || 'your-school'}</span>
                  )}
                  <span className="text-[#94A3B8] text-xs shrink-0">.clariva.ng</span>
                  <button onClick={() => { setSubdomainEdit(true); setSubdomainManual(form.subdomain); }} className="ml-2 text-[#94A3B8] hover:text-[#0D2B55] cursor-pointer text-xs">✎</button>
                </div>
                {fieldErrors.subdomain && <p className="text-red-500 text-[10px] mt-1">{fieldErrors.subdomain}</p>}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">School type</label>
                <div className="grid grid-cols-2 gap-2">
                  {SCHOOL_TYPES.map(t => {
                    const active = form.schoolType === t;
                    return (
                      <button key={t} onClick={() => setField('schoolType', t)}
                        className={`px-3 py-3 rounded-xl border-2 text-xs font-semibold text-left leading-tight transition-all cursor-pointer ${
                          active ? 'border-[#1A7A4A] bg-green-50 text-[#1A7A4A]' : 'border-[#DDE5F0] text-[#64748B] hover:border-[#94A3B8]'
                        }`}>{t}</button>
                    );
                  })}
                </div>
                {fieldErrors.schoolType && <p className="text-red-500 text-[10px] mt-1">{fieldErrors.schoolType}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div ref={stateRef} className="relative">
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">State</label>
                  <div onClick={() => setStateOpen(!stateOpen)}
                    className={`h-12 px-3.5 rounded-xl border text-sm flex items-center cursor-pointer ${fieldErrors.state ? inputErr : inputNorm}`}>
                    <span className={form.state ? 'text-[#0D2B55]' : 'text-[#94A3B8]'}>{form.state || 'Select state'}</span>
                  </div>
                  {stateOpen && (
                    <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white border border-[#DDE5F0] rounded-xl shadow-lg p-1.5 max-h-52 overflow-y-auto">
                      <input value={stateQuery} onChange={e => setStateQuery(e.target.value)}
                        placeholder="Search states…"
                        className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-xs outline-none mb-1" autoFocus />
                      {filteredStates.map(s => (
                        <button key={s.id} onClick={() => { setField('state', s.name); setStateOpen(false); setStateQuery(''); setLgaQuery(''); }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-[#F0F4FA] transition-colors cursor-pointer ${form.state === s.name ? 'bg-green-50 text-[#1A7A4A] font-bold' : 'text-[#0D2B55]'}`}>{s.name}</button>
                      ))}
                    </div>
                  )}
                  {fieldErrors.state && <p className="text-red-500 text-[10px] mt-1">{fieldErrors.state}</p>}
                </div>
                <div ref={lgaRef} className="relative">
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">LGA</label>
                  <div onClick={() => form.state && setLgaOpen(!lgaOpen)}
                    className={`h-12 px-3.5 rounded-xl border text-sm flex items-center cursor-pointer ${!form.state ? 'bg-[#F0F4FA]' : ''} ${fieldErrors.lga ? inputErr : inputNorm}`}>
                    <span className={form.lga ? 'text-[#0D2B55]' : 'text-[#94A3B8]'}>{form.lga || (form.state ? 'Select LGA' : 'Select state first')}</span>
                  </div>
                  {lgaOpen && (
                    <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white border border-[#DDE5F0] rounded-xl shadow-lg p-1.5 max-h-52 overflow-y-auto">
                      <input value={lgaQuery} onChange={e => setLgaQuery(e.target.value)}
                        placeholder="Search LGAs…"
                        className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-xs outline-none mb-1" autoFocus />
                      {filteredLgas.map(l => (
                        <button key={l.id} onClick={() => { setField('lga', l.name); setLgaOpen(false); setLgaQuery(''); }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-[#F0F4FA] transition-colors cursor-pointer ${form.lga === l.name ? 'bg-green-50 text-[#1A7A4A] font-bold' : 'text-[#0D2B55]'}`}>{l.name}</button>
                      ))}
                    </div>
                  )}
                  {fieldErrors.lga && <p className="text-red-500 text-[10px] mt-1">{fieldErrors.lga}</p>}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Address <span className="font-normal normal-case text-[#94A3B8]">Optional</span></label>
                <input value={form.address} onChange={e => setField('address', e.target.value)}
                  placeholder="e.g. 123 Broad Street"
                  className={`${inputCls} ${inputNorm}`} />
              </div>

              <div className="flex justify-end pt-2">
                <button onClick={handleContinue1}
                  className="px-6 py-2.5 rounded-xl bg-[#1A7A4A] text-white text-sm font-bold hover:bg-[#14663D] transition-colors cursor-pointer">Continue →</button>
              </div>
            </div>
          )}

          {/* ---- Step 2 ---- */}
          {step === 2 && (
            <div className="space-y-4">
              <button onClick={() => setStep(1)} className="text-xs text-[#64748B] hover:text-[#0D2B55] mb-1 cursor-pointer">← Back</button>
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Full name</label>
                <input value={form.proprietorName} onChange={e => setField('proprietorName', e.target.value)}
                  placeholder="e.g. Dr. Adebayo Ola"
                  className={`${inputCls} ${fieldErrors.proprietorName ? inputErr : inputNorm}`} />
                {fieldErrors.proprietorName && <p className="text-red-500 text-[10px] mt-1">{fieldErrors.proprietorName}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Phone number</label>
                <input value={form.proprietorPhone} onChange={e => setField('proprietorPhone', e.target.value)}
                  placeholder="08012345678"
                  className={`${inputCls} ${fieldErrors.proprietorPhone ? inputErr : inputNorm}`} />
                {fieldErrors.proprietorPhone && <p className="text-red-500 text-[10px] mt-1">{fieldErrors.proprietorPhone}</p>}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Email <span className="font-normal normal-case text-[#94A3B8]">Optional, for password recovery</span></label>
                <input type="email" value={form.proprietorEmail} onChange={e => setField('proprietorEmail', e.target.value)}
                  placeholder="admin@school.com"
                  className={`${inputCls} ${fieldErrors.proprietorEmail ? inputErr : inputNorm}`} />
                {fieldErrors.proprietorEmail && (
                  <p className="text-red-500 text-[10px] mt-1">
                    {fieldErrors.proprietorEmail.includes('→') ? (
                      <>{fieldErrors.proprietorEmail.replace('→', '')}<Link href="/" className="underline">Sign in instead →</Link></>
                    ) : fieldErrors.proprietorEmail}
                  </p>
                )}
              </div>
              <p className="text-[10px] text-[#94A3B8] -mt-1">This person will be the school administrator</p>
              <div className="flex justify-end pt-2">
                <button onClick={handleContinue2}
                  className="px-6 py-2.5 rounded-xl bg-[#1A7A4A] text-white text-sm font-bold hover:bg-[#14663D] transition-colors cursor-pointer">Continue →</button>
              </div>
            </div>
          )}

          {/* ---- Step 3 ---- */}
          {step === 3 && (
            <div className="space-y-4">
              <button onClick={() => setStep(2)} className="text-xs text-[#64748B] hover:text-[#0D2B55] mb-1 cursor-pointer">← Back</button>

              {/* summary card */}
              <div className="bg-[#F8FAFF] border border-[#DDE5F0] rounded-xl p-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
                <div><span className="text-[#64748B]">School</span><p className="font-semibold text-[#0D2B55] mt-0.5">{form.schoolName}</p></div>
                <div><span className="text-[#64748B]">Type</span><p className="font-semibold text-[#0D2B55] mt-0.5">{form.schoolType}</p></div>
                <div><span className="text-[#64748B]">Location</span><p className="font-semibold text-[#0D2B55] mt-0.5">{form.lga}, {form.state}</p></div>
                <div><span className="text-[#64748B]">Proprietor</span><p className="font-semibold text-[#0D2B55] mt-0.5">{form.proprietorName}</p></div>
                <div className="col-span-2"><span className="text-[#64748B]">Portal</span><p className="font-semibold text-[#0D2B55] mt-0.5 font-mono text-sm">{portalUrl}</p></div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Password</label>
                <div className={`flex items-center h-12 px-3.5 rounded-xl border text-sm ${fieldErrors.password ? inputErr : inputNorm}`}>
                  <input type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="flex-1 outline-none text-sm" />
                  <button onClick={() => setShowPw(!showPw)} className="text-[#94A3B8] hover:text-[#0D2B55] text-xs cursor-pointer shrink-0">{showPw ? 'Hide' : 'Show'}</button>
                </div>
                {fieldErrors.password && <p className="text-red-500 text-[10px] mt-1">{fieldErrors.password}</p>}
                {password && (
                  <div className="mt-1.5">
                    <div className="h-1 bg-[#F0F4FA] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${calcStrength(password).color}`} style={{ width: `${calcStrength(password).pct}%` }} />
                    </div>
                    <p className="text-[10px] text-[#64748B] mt-0.5">{calcStrength(password).label}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Confirm password</label>
                <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Re-enter password"
                  className={`${inputCls} ${fieldErrors.confirmPw ? inputErr : inputNorm}`} />
                {fieldErrors.confirmPw && <p className="text-red-500 text-[10px] mt-1">{fieldErrors.confirmPw}</p>}
              </div>

              <div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-[#DDE5F0] text-[#1A7A4A] focus:ring-[#1A7A4A]" />
                  <span className="text-xs text-[#64748B]">I agree to Clariva&apos;s <Link href="/terms" className="text-[#1A7A4A] hover:underline">terms of service</Link></span>
                </label>
                {fieldErrors.terms && <p className="text-red-500 text-[10px] mt-1">{fieldErrors.terms}</p>}
              </div>

              {fieldErrors._general && <p className="text-red-500 text-xs bg-red-50 border border-red-200 rounded-lg px-3 py-2">{fieldErrors._general}</p>}

              <div className="flex justify-end pt-2">
                <button onClick={handleSubmit} disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-[#1A7A4A] text-white text-sm font-bold hover:bg-[#14663D] disabled:opacity-50 transition-colors cursor-pointer flex items-center gap-2">
                  {loading ? <>⏳ Setting up your portal...</> : 'Create My School Portal →'}
                </button>
              </div>
            </div>
          )}

          {/* footer link */}
          <div className="mt-6 pt-4 border-t border-[#DDE5F0]">
            <p className="text-xs text-[#64748B] text-center">
              Already have an account? <Link href="/" className="text-[#1A7A4A] font-semibold hover:underline">Sign in →</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

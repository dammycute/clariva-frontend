'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, api, request } from '@/lib/api';

const STEPS = [
  { id: 1, label: 'School Info' },
  { id: 2, label: 'Proprietor' },
  { id: 3, label: 'Confirm' },
];

const SCHOOL_TYPES = ['Secondary (JSS & SSS)', 'Primary', 'Nursery', 'Mixed (Primary & Secondary)'];

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
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { api.locations.states.list().then(d => setStates(d as { id: number; name: string }[])).catch(() => {}); }, []);

  useEffect(() => {
    if (!form.state) { setLgas([]); return; }
    const stateId = states.find(s => s.name === form.state)?.id;
    if (stateId) api.locations.lgas.list({ state: String(stateId) }).then(d => setLgas(d as { id: number; name: string }[])).catch(() => {});
  }, [form.state, states]);

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === 'schoolName') {
      setForm((prev) => ({
        ...prev,
        schoolName: value,
        subdomain: value.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30),
      }));
    }
  };

  const canProceed = () => {
    if (step === 1) return form.schoolName && form.state && form.lga && form.schoolType;
    if (step === 2) return form.proprietorName && form.proprietorPhone;
    if (step === 3) return password.length >= 6;
    return true;
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const email = form.proprietorEmail || `admin@${form.subdomain}.clariva.ng`;

      // 1. Create auth user
      const slug = form.subdomain || form.schoolName?.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 30) || 'school';
      await auth.register({
        username: slug,
        email,
        password,
        first_name: form.proprietorName?.split(' ')[0] || 'Admin',
        last_name: form.proprietorName?.split(' ').slice(1).join(' ') || '',
        phone: form.proprietorPhone,
        role: 'school_admin',
      });

      // 2. Login to get JWT
      await auth.login(email, password);

      // 3. Create school
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

      // 4. Link user to school (PATCH /api/auth/me/)
      await request('PATCH', '/auth/me/', { school: (school as { id: number }).id });

      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{
        background: '#0D2B55',
        backgroundImage:
          'radial-gradient(ellipse at 20% 50%, #1A3F6E 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, #0F2D5A 0%, transparent 50%)',
      }}
    >
      <div className="w-full max-w-[500px] mx-4">
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-10">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-9 h-9 bg-[#1A7A4A] rounded-lg flex items-center justify-center text-white font-bold">C</div>
              <span className="font-semibold text-lg text-white">Clariva</span>
            </div>
            <h1 className="text-white text-xl font-bold">Set Up Your School</h1>
            <p className="text-white/50 text-sm mt-1">Your portal will be ready in 2 minutes.</p>
          </div>

          <div className="flex items-center justify-center gap-2 mb-8">
            {STEPS.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === s.id ? 'bg-[#1A7A4A] text-white' :
                  step > s.id ? 'bg-[#1A7A4A]/60 text-white' : 'bg-white/10 text-white/40'
                }`}>{step > s.id ? '✓' : s.id}</div>
                <span className={`text-xs ${step === s.id ? 'text-white' : 'text-white/40'}`}>{s.label}</span>
                {s.id < 3 && <div className="w-8 h-px bg-white/10" />}
              </div>
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase">School name</label>
                <input value={form.schoolName} onChange={(e) => update('schoolName', e.target.value)}
                  placeholder="e.g. Queens College"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-[#1A7A4A] placeholder:text-white/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase">State</label>
                  <select value={form.state} onChange={(e) => update('state', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-[#1A7A4A] appearance-none">
                    <option value="" className="bg-navy text-white/60">Select state</option>
                    {states.map((s) => (
                      <option key={s.id} value={s.name} className="bg-navy text-white">{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase">LGA</label>
                  <select value={form.lga} onChange={(e) => update('lga', e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-[#1A7A4A] appearance-none"
                    disabled={!form.state}>
                    <option value="" className="bg-navy text-white/60">Select LGA</option>
                    {lgas.map((l) => (
                      <option key={l.id} value={l.name} className="bg-navy text-white">{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase">School address</label>
                <input value={form.address} onChange={(e) => update('address', e.target.value)}
                  placeholder="e.g. 123 Broad Street"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-[#1A7A4A] placeholder:text-white/30" />
              </div>
              <div>
                <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase">School type</label>
                <select value={form.schoolType} onChange={(e) => update('schoolType', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-[#1A7A4A] appearance-none">
                  <option value="" className="bg-navy text-white/60">Select type</option>
                  {SCHOOL_TYPES.map((t) => (
                    <option key={t} value={t} className="bg-navy text-white">{t}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3.5">
              <div>
                <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase">Proprietor name</label>
                <input value={form.proprietorName} onChange={(e) => update('proprietorName', e.target.value)}
                  placeholder="Full name"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-[#1A7A4A] placeholder:text-white/30" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase">Phone</label>
                  <input value={form.proprietorPhone} onChange={(e) => update('proprietorPhone', e.target.value)}
                    placeholder="080XXXXXXXX"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-[#1A7A4A] placeholder:text-white/30" />
                </div>
                <div>
                  <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase">Email</label>
                  <input type="email" value={form.proprietorEmail} onChange={(e) => update('proprietorEmail', e.target.value)}
                    placeholder="admin@school.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-[#1A7A4A] placeholder:text-white/30" />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="bg-white/10 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-white/50">School</span><span className="text-white font-medium">{form.schoolName}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Type</span><span className="text-white font-medium">{form.schoolType}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Location</span><span className="text-white font-medium">{form.lga}, {form.state}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Proprietor</span><span className="text-white font-medium">{form.proprietorName}</span></div>
                <div className="flex justify-between"><span className="text-white/50">Portal</span><span className="text-white font-medium">{form.subdomain}.clariva.ng</span></div>
              </div>
              <div>
                <label className="block text-white/70 text-xs font-semibold mb-1.5 uppercase">Set a password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6}
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-sm outline-none focus:border-[#1A7A4A] placeholder:text-white/30" />
              </div>
              {error && <p className="text-red-300 text-xs">{error}</p>}
              <p className="text-white/40 text-xs text-center">We&apos;ll create your portal, admin account, and log you in.</p>
            </div>
          )}

          <div className="flex justify-between mt-8">
            {step > 1 ? (
              <button onClick={() => setStep(step - 1)}
                className="px-5 py-2.5 rounded-xl border border-white/20 text-white text-sm hover:bg-white/5">← Back</button>
            ) : <div />}
            {step < 3 ? (
              <button onClick={() => setStep(step + 1)} disabled={!canProceed()}
                className="px-6 py-2.5 rounded-xl bg-[#1A7A4A] text-white text-sm font-semibold hover:bg-[#14663D] disabled:opacity-40">Continue →</button>
            ) : (
              <button onClick={handleSubmit} disabled={loading || !canProceed()}
                className="px-6 py-2.5 rounded-xl bg-[#1A7A4A] text-white text-sm font-semibold hover:bg-[#14663D] disabled:opacity-40">
                {loading ? 'Creating portal…' : 'Create My School Portal →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

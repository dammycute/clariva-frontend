'use client';

import { useState, useEffect, useMemo, useRef, useId } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, api } from '@/lib/api';
import { Pencil } from 'lucide-react';
import { AuthShell, FormError } from '@/components/auth-shell';
import { Button } from '@/components/ui/button';
import { TextField, PasswordField } from '@/components/ui/text-field';
import { cn } from '@/lib/utils';

const SCHOOL_TYPES = ['Secondary (JSS & SSS)', 'Primary', 'Nursery', 'Mixed (Primary & Secondary)'] as const;
const STEP_TITLES = ['School details', 'Administrator', 'Password'];

function calcStrength(pw: string): { label: string; color: string; pct: number } {
  if (!pw) return { label: '', color: '', pct: 0 };
  let score = 0;
  if (pw.length >= 6) score += 25;
  if (pw.length >= 10) score += 15;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 20;
  if (/\d/.test(pw)) score += 20;
  if (/[^a-zA-Z0-9]/.test(pw)) score += 20;
  if (score < 30) return { label: 'Weak', color: 'bg-danger', pct: 25 };
  if (score < 60) return { label: 'Fair', color: 'bg-warning', pct: 55 };
  return { label: 'Strong', color: 'bg-success', pct: 100 };
}

/** Searchable single-select used for state and LGA. */
function SearchSelect({
  label, value, options, placeholder, disabled, error, onSelect,
}: {
  label: string;
  value: string;
  options: { id: number; name: string }[];
  placeholder: string;
  disabled?: boolean;
  error?: string;
  onSelect: (name: string) => void;
}) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(
    () => options.filter(o => o.name.toLowerCase().includes(query.toLowerCase())),
    [options, query],
  );

  return (
    <div ref={wrapRef} className="relative" onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}>
      <span id={`${uid}-label`} className="block text-sm font-medium text-ink mb-1.5">{label}</span>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${uid}-label`}
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-full h-11 px-3 rounded border bg-surface text-sm text-left cursor-pointer transition-colors',
          'focus:border-brand focus:ring-1 focus:ring-brand outline-none disabled:bg-surface-2 disabled:cursor-not-allowed',
          error ? 'border-danger' : 'border-line',
          value ? 'text-ink' : 'text-muted/70',
        )}
      >
        {value || placeholder}
      </button>
      {open && (
        <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-surface border border-line rounded shadow-md p-1.5">
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={`Search ${label.toLowerCase()}`}
            aria-label={`Search ${label.toLowerCase()}`}
            autoFocus
            className="w-full h-9 px-2.5 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand mb-1"
          />
          <ul role="listbox" aria-labelledby={`${uid}-label`} className="max-h-52 overflow-y-auto">
            {filtered.length === 0 && <li className="px-2.5 py-2 text-sm text-muted">No match.</li>}
            {filtered.map(o => (
              <li key={o.id} role="option" aria-selected={value === o.name}>
                <button
                  type="button"
                  onClick={() => { onSelect(o.name); setOpen(false); setQuery(''); }}
                  className={cn(
                    'w-full text-left px-2.5 py-2 rounded text-sm cursor-pointer hover:bg-surface-2',
                    value === o.name ? 'bg-brand-soft text-brand font-medium' : 'text-ink',
                  )}
                >
                  {o.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <p className="text-[13px] text-danger mt-1.5">{error}</p>}
    </div>
  );
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

  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
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

  // validation
  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!form.schoolName.trim()) errs.schoolName = 'Enter the school name.';
    if (!form.subdomain.trim()) errs.subdomain = 'Enter a portal address.';
    if (!form.schoolType) errs.schoolType = 'Choose a school type.';
    if (!form.state) errs.state = 'Choose a state.';
    if (!form.lga) errs.lga = 'Choose an LGA.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs: Record<string, string> = {};
    if (!form.proprietorName.trim()) errs.proprietorName = 'Enter your full name.';
    if (!form.proprietorPhone.trim()) errs.proprietorPhone = 'Enter a phone number.';
    else if (!/^0\d{10}$/.test(form.proprietorPhone.replace(/\s/g, ''))) errs.proprietorPhone = 'Use an 11-digit Nigerian number, for example 08012345678.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep3 = () => {
    const errs: Record<string, string> = {};
    if (!password) errs.password = 'Enter a password.';
    else if (password.length < 6) errs.password = 'Use at least 6 characters.';
    if (password !== confirmPw) errs.confirmPw = 'The two passwords do not match.';
    if (!agreeTerms) errs.terms = 'You need to accept the terms to continue.';
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

      await auth.onboard({
        email,
        password,
        first_name: form.proprietorName.split(' ')[0] || 'Admin',
        last_name: form.proprietorName.split(' ').slice(1).join(' ') || '',
        phone: form.proprietorPhone,
        school_name: form.schoolName,
        school_subdomain: form.subdomain,
        school_type: form.schoolType || '',
        school_address: form.address || '',
        school_state: form.state || '',
        school_lga: form.lga || '',
      });

      setSuccess({ portalUrl: `https://${form.subdomain}.clariva.ng` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      if (msg.toLowerCase().includes('subdomain') || msg.toLowerCase().includes('taken')) {
        setFieldErrors(prev => ({ ...prev, subdomain: 'That address is taken. Try another.' }));
        setStep(1);
      } else if (msg.toLowerCase().includes('email') && msg.toLowerCase().includes('exists')) {
        setFieldErrors(prev => ({ ...prev, proprietorEmail: 'An account with this email already exists.' }));
        setStep(2);
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
      <AuthShell sideLink={{ href: '/', label: 'Back to sign in' }}>
        <h1 className="text-2xl font-semibold text-ink tracking-tight text-balance">Your school portal is ready</h1>
        <p className="text-sm text-muted mt-1 mb-6">Your portal address is:</p>
        <p className="font-mono text-sm text-ink break-all border-y border-line py-3 mb-6">{success.portalUrl}</p>
        <div className="space-y-3">
          <Button onClick={() => router.push('/dashboard')} className="w-full">Go to dashboard</Button>
          <Button
            variant="secondary"
            onClick={() => { navigator.clipboard.writeText(success.portalUrl); toast.success('Address copied.'); }}
            className="w-full"
          >
            Copy portal address
          </Button>
        </div>
      </AuthShell>
    );
  }

  const preview: [string, string][] = [
    ['School', form.schoolName],
    ['Location', form.lga && form.state ? `${form.lga}, ${form.state}` : ''],
    ['Type', form.schoolType],
    ['Administrator', form.proprietorName],
  ];

  const aside = (
    <div>
      <p className="text-sm text-white/60">Your school portal will be at</p>
      <p className="font-mono text-sm text-white mt-1 break-all">{portalUrl}</p>
      <dl className="mt-8 space-y-4">
        {preview.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[13px] text-white/60">{label}</dt>
            <dd className="text-sm text-white mt-0.5">{value || <span className="text-white/40">Not set yet</span>}</dd>
          </div>
        ))}
      </dl>
    </div>
  );

  return (
    <AuthShell aside={aside} sideLink={{ href: '/', label: 'Already have an account? Sign in' }} width="max-w-[460px]">
      <h1 className="text-2xl font-semibold text-ink tracking-tight">Set up your school</h1>

      {/* progress: three segments, current step named */}
      <div className="mt-4 mb-6" role="group" aria-label={`Step ${step} of 3: ${STEP_TITLES[step - 1]}`}>
        <div className="flex gap-1.5" aria-hidden="true">
          {[1, 2, 3].map(n => (
            <div key={n} className={cn('h-1 flex-1 rounded-full transition-colors', n <= step ? 'bg-brand' : 'bg-line')} />
          ))}
        </div>
        <p className="text-[13px] text-muted mt-2">Step {step} of 3: {STEP_TITLES[step - 1]}</p>
      </div>

      {/* ---- Step 1 ---- */}
      {step === 1 && (
        <div className="space-y-4">
          <TextField id="school-name" label="School name" value={form.schoolName}
            onChange={e => update('schoolName', e.target.value)} placeholder="e.g. Queens College"
            error={fieldErrors.schoolName} />

          <div>
            <span className="block text-sm font-medium text-ink mb-1.5">Portal address</span>
            <div className={cn('flex items-center h-11 px-3 rounded border bg-surface text-sm', fieldErrors.subdomain ? 'border-danger' : 'border-line')}>
              {subdomainEdit ? (
                <input
                  aria-label="Portal address"
                  value={subdomainManual}
                  onChange={e => { setSubdomainManual(e.target.value); setField('subdomain', e.target.value); }}
                  onBlur={() => { if (!subdomainManual) { setSubdomainManual(''); setSubdomainEdit(false); } }}
                  className="flex-1 min-w-0 outline-none bg-transparent font-mono text-ink" autoFocus
                />
              ) : (
                <span className="flex-1 min-w-0 truncate font-mono text-ink">{form.subdomain || 'your-school'}</span>
              )}
              <span className="text-muted text-[13px] shrink-0">.clariva.ng</span>
              <button type="button" onClick={() => { setSubdomainEdit(true); setSubdomainManual(form.subdomain); }}
                className="ml-2 p-1 text-muted hover:text-ink cursor-pointer" aria-label="Edit portal address">
                <Pencil size={14} aria-hidden="true" />
              </button>
            </div>
            {fieldErrors.subdomain && <p className="text-[13px] text-danger mt-1.5">{fieldErrors.subdomain}</p>}
          </div>

          <fieldset>
            <legend className="block text-sm font-medium text-ink mb-1.5">School type</legend>
            <div className="grid grid-cols-2 gap-2">
              {SCHOOL_TYPES.map(t => (
                <label key={t} className={cn(
                  'flex items-center min-h-11 px-3 py-2 rounded border text-sm cursor-pointer transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand',
                  form.schoolType === t ? 'border-brand bg-brand-soft text-brand font-medium' : 'border-line text-ink hover:bg-surface-2',
                )}>
                  <input type="radio" name="school-type" value={t} checked={form.schoolType === t}
                    onChange={() => setField('schoolType', t)} className="sr-only" />
                  {t}
                </label>
              ))}
            </div>
            {fieldErrors.schoolType && <p className="text-[13px] text-danger mt-1.5">{fieldErrors.schoolType}</p>}
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <SearchSelect label="State" value={form.state} options={states} placeholder="Select state"
              error={fieldErrors.state}
              onSelect={name => { setField('state', name); setField('lga', ''); }} />
            <SearchSelect label="LGA" value={form.lga} options={lgas}
              placeholder={form.state ? 'Select LGA' : 'Choose a state first'}
              disabled={!form.state} error={fieldErrors.lga}
              onSelect={name => setField('lga', name)} />
          </div>

          <TextField id="school-address" label="Address (optional)" value={form.address}
            onChange={e => setField('address', e.target.value)} placeholder="e.g. 123 Broad Street" />

          <div className="flex justify-end pt-2">
            <Button onClick={handleContinue1} className="px-6">Continue</Button>
          </div>
        </div>
      )}

      {/* ---- Step 2 ---- */}
      {step === 2 && (
        <div className="space-y-4">
          <TextField id="admin-name" label="Full name" value={form.proprietorName}
            onChange={e => setField('proprietorName', e.target.value)} placeholder="e.g. Dr. Adebayo Ola"
            hint="This person will be the school administrator." error={fieldErrors.proprietorName} />
          <TextField id="admin-phone" label="Phone number" type="tel" value={form.proprietorPhone}
            onChange={e => setField('proprietorPhone', e.target.value)} placeholder="08012345678"
            error={fieldErrors.proprietorPhone} />
          <div>
            <TextField id="admin-email" label="Email (optional)" type="email" value={form.proprietorEmail}
              onChange={e => setField('proprietorEmail', e.target.value)} placeholder="admin@school.com"
              hint="Used for password recovery." error={fieldErrors.proprietorEmail} />
            {fieldErrors.proprietorEmail && (
              <p className="text-[13px] mt-1">
                <Link href="/" className="text-ink underline underline-offset-2">Sign in instead</Link>
              </p>
            )}
          </div>
          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(1)} className="px-0">Back</Button>
            <Button onClick={handleContinue2} className="px-6">Continue</Button>
          </div>
        </div>
      )}

      {/* ---- Step 3 ---- */}
      {step === 3 && (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-line py-4 text-sm">
            <div><dt className="text-[13px] text-muted">School</dt><dd className="text-ink mt-0.5">{form.schoolName}</dd></div>
            <div><dt className="text-[13px] text-muted">Type</dt><dd className="text-ink mt-0.5">{form.schoolType}</dd></div>
            <div><dt className="text-[13px] text-muted">Location</dt><dd className="text-ink mt-0.5">{form.lga}, {form.state}</dd></div>
            <div><dt className="text-[13px] text-muted">Administrator</dt><dd className="text-ink mt-0.5">{form.proprietorName}</dd></div>
            <div className="col-span-2"><dt className="text-[13px] text-muted">Portal</dt><dd className="text-ink mt-0.5 font-mono break-all">{portalUrl}</dd></div>
          </dl>

          <div>
            <PasswordField id="onboard-password" label="Password" autoComplete="new-password" value={password}
              onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" error={fieldErrors.password} />
            {password && (
              <div className="mt-2" aria-live="polite">
                <div className="h-1 bg-line rounded-full overflow-hidden">
                  <div className={cn('h-full rounded-full transition-[width]', calcStrength(password).color)} style={{ width: `${calcStrength(password).pct}%` }} />
                </div>
                <p className="text-[13px] text-muted mt-1">Strength: {calcStrength(password).label}</p>
              </div>
            )}
          </div>

          <PasswordField id="onboard-confirm" label="Confirm password" autoComplete="new-password" value={confirmPw}
            onChange={e => setConfirmPw(e.target.value)} error={fieldErrors.confirmPw} />

          <div>
            <label className="flex items-start gap-2.5 cursor-pointer min-h-6">
              <input type="checkbox" checked={agreeTerms} onChange={e => { setAgreeTerms(e.target.checked); setFieldErrors(p => { const n = { ...p }; delete n.terms; return n; }); }}
                className="mt-0.5 w-4 h-4 accent-brand" />
              <span className="text-sm text-ink">I accept Clariva&apos;s <Link href="/terms" className="underline underline-offset-2">terms of service</Link>.</span>
            </label>
            {fieldErrors.terms && <p className="text-[13px] text-danger mt-1.5">{fieldErrors.terms}</p>}
          </div>

          <FormError>{fieldErrors._general}</FormError>

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={() => setStep(2)} className="px-0">Back</Button>
            <Button onClick={handleSubmit} disabled={loading} className="px-6">
              {loading ? 'Creating your portal…' : 'Create school portal'}
            </Button>
          </div>
        </div>
      )}

      <p className="text-[13px] text-muted mt-8 lg:hidden">
        Already have an account? <Link href="/" className="text-ink underline underline-offset-2">Sign in</Link>
      </p>
    </AuthShell>
  );
}

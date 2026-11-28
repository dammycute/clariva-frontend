'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download } from 'lucide-react';
import { api, request } from '@/lib/api';
import { SummaryStrip, Stat, StatSkeleton, Panel } from '@/components/ui/summary';
import { Button } from '@/components/ui/button';
import {
  PLANS, TERMS, TONE_CLASS, dateTime, downloadBackup, naira, shortDate, trialState, type AdminSchool,
} from '@/lib/admin';
import type { Analytics } from '@/types/school';

type Person = {
  id: string; first_name: string; last_name: string; email: string;
  role: string; is_active: boolean; school_id: string | null;
};

type PortalAddress = {
  base_domain: string; current_host: string; subdomain: string;
  url: string; wildcard_record: string; ready: boolean;
};

type AuditEntry = {
  id: string; action: string; model_name: string; object_repr: string | null;
  user_name: string | null; created_at: string;
};

const PEOPLE_ROLES = ['school_admin', 'admin_officer', 'principal', 'teacher', 'bursary', 'student', 'parent'];

type Form = {
  name: string; subdomain: string; plan: string; status: string; trial_ends_at: string;
  current_term: string; current_academic_year: string; single_device_students: boolean;
  school_type: string; state: string; lga: string; address: string;
  proprietor_name: string; proprietor_phone: string;
};

const emptyForm: Form = {
  name: '', subdomain: '', plan: 'trial', status: 'active', trial_ends_at: '',
  current_term: '1st Term', current_academic_year: '', single_device_students: true,
  school_type: '', state: '', lga: '', address: '', proprietor_name: '', proprietor_phone: '',
};

const fieldClass = 'w-full px-3 py-2.5 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand';
const labelClass = 'block text-xs font-semibold text-muted mb-1';

export default function ConsoleSchoolDetail() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [school, setSchool] = useState<AdminSchool | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [activity, setActivity] = useState<AuditEntry[]>([]);
  const [portal, setPortal] = useState<PortalAddress | null>(null);
  const [form, setForm] = useState<Form>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'' | 'save' | 'status' | 'backup'>('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const load = useCallback(async () => {
    const [record, numbers, users, logs, address] = await Promise.all([
      api.schools.get(id) as Promise<AdminSchool>,
      api.analytics.get(id).catch(() => null),
      request<{ results: Person[] } | Person[]>('GET', '/auth/users/?page_size=500').catch(() => []),
      request<{ results: AuditEntry[] } | AuditEntry[]>('GET', `/audit/?school=${id}&page_size=50`).catch(() => []),
      request<PortalAddress>('GET', `/schools/portal-address/?school=${id}`).catch(() => null),
    ]);

    setSchool(record);
    setAnalytics(numbers);
    const allUsers = Array.isArray(users) ? users : users.results ?? [];
    setPeople(allUsers.filter(u => u.school_id === id));
    setActivity(Array.isArray(logs) ? logs : logs.results ?? []);
    setPortal(address);

    setForm({
      name: record.name || '',
      subdomain: record.subdomain || '',
      plan: record.plan || 'trial',
      status: record.status || 'active',
      trial_ends_at: record.trial_ends_at ? record.trial_ends_at.slice(0, 10) : '',
      current_term: record.current_term || '1st Term',
      current_academic_year: record.current_academic_year || '',
      single_device_students: record.single_device_students !== false,
      school_type: record.school_type || '',
      state: record.state || '',
      lga: record.lga || '',
      address: record.address || '',
      proprietor_name: record.proprietor_name || '',
      proprietor_phone: record.proprietor_phone || '',
    });
  }, [id]);

  useEffect(() => {
    load()
      .catch(err => { setIsError(true); setMessage(err instanceof Error ? err.message : 'Could not load this school.'); })
      .finally(() => setLoading(false));
  }, [load]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of people) counts[p.role] = (counts[p.role] || 0) + 1;
    return counts;
  }, [people]);

  function update<K extends keyof Form>(key: K, value: Form[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy('save');
    setMessage('');
    setIsError(false);
    try {
      const updated = await api.schools.update(id, {
        name: form.name,
        subdomain: form.subdomain.trim().toLowerCase(),
        plan: form.plan,
        status: form.status,
        trial_ends_at: form.trial_ends_at ? new Date(`${form.trial_ends_at}T23:59:59`).toISOString() : null,
        current_term: form.current_term,
        current_academic_year: form.current_academic_year,
        single_device_students: form.single_device_students,
        school_type: form.school_type || null,
        state: form.state || null,
        lga: form.lga || null,
        address: form.address || null,
        proprietor_name: form.proprietor_name || null,
        proprietor_phone: form.proprietor_phone || null,
      }) as AdminSchool;
      setSchool(updated);
      setMessage('Changes saved.');
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : 'Could not save these changes.');
    } finally {
      setBusy('');
    }
  }

  async function toggleStatus() {
    if (!school) return;
    const next = school.status === 'suspended' ? 'active' : 'suspended';
    if (next === 'suspended' && !window.confirm(`Suspend ${school.name}? Everyone at the school loses access immediately.`)) return;
    setBusy('status');
    setMessage('');
    setIsError(false);
    try {
      const updated = await api.schools.update(id, { status: next }) as AdminSchool;
      setSchool(updated);
      update('status', next);
      setMessage(next === 'suspended' ? 'School suspended.' : 'School reactivated.');
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : 'Could not change the status.');
    } finally {
      setBusy('');
    }
  }

  async function backup() {
    if (!school) return;
    setBusy('backup');
    setMessage('');
    setIsError(false);
    try {
      await downloadBackup(id, `clarriva-${school.subdomain}-${new Date().toISOString().slice(0, 10)}.json`);
      setMessage('Backup downloaded.');
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : 'Could not build the backup.');
    } finally {
      setBusy('');
    }
  }

  if (loading) {
    return (
      <div className="max-w-[1120px]">
        <div className="h-6 w-56 bg-line rounded animate-pulse mb-6" />
        <SummaryStrip className="mb-6">{Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)}</SummaryStrip>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="max-w-[1120px]">
        <Link href="/admin/schools" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink mb-4">
          <ArrowLeft size={14} /> Schools
        </Link>
        <div role="alert" className="text-sm text-danger bg-danger-soft border border-danger/30 rounded px-3 py-2">
          {message || 'This school could not be loaded.'}
        </div>
      </div>
    );
  }

  const trial = trialState(school);
  const attendanceRate = analytics && analytics.attendance.total > 0 ? Math.round(analytics.attendance.rate) : 0;
  const collectionRate = analytics && analytics.fees.total_due > 0
    ? Math.round((analytics.fees.total_paid / analytics.fees.total_due) * 100)
    : 0;

  return (
    <div className="max-w-[1120px]">
      <Link href="/admin/schools" className="inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink mb-4">
        <ArrowLeft size={14} /> Schools
      </Link>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-[22px] font-semibold text-ink leading-tight truncate">{school.name}</h1>
            <span className={`text-xs px-2 py-0.5 rounded capitalize ${
              school.status === 'active' ? 'bg-success/10 text-success' : 'bg-danger-soft text-danger'
            }`}>{school.status}</span>
            <span className={`text-xs px-2 py-0.5 rounded capitalize ${TONE_CLASS[trial.tone]}`}>{trial.label}</span>
          </div>
          <p className="text-[13px] text-muted mt-1">
            {school.subdomain} · {school.plan} plan · {school.current_term} {school.current_academic_year} · joined {shortDate(school.created_at)}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="secondary" onClick={backup} disabled={busy !== ''}>
            <Download size={15} /> {busy === 'backup' ? 'Building…' : 'Backup'}
          </Button>
          <Button variant={school.status === 'suspended' ? 'primary' : 'secondary'} onClick={toggleStatus} disabled={busy !== ''}>
            {busy === 'status' ? 'Working…' : school.status === 'suspended' ? 'Reactivate' : 'Suspend'}
          </Button>
        </div>
      </header>

      {message && (
        <div
          role={isError ? 'alert' : 'status'}
          className={`mb-4 px-3 py-2 rounded text-sm border ${
            isError ? 'bg-danger-soft text-danger border-danger/30' : 'bg-success/10 text-success border-success/30'
          }`}
        >
          {message}
        </div>
      )}

      <SummaryStrip className="mb-6">
        <Stat
          label="Students"
          value={analytics ? analytics.total_students.toLocaleString() : '—'}
          note={analytics ? `${analytics.students.toLocaleString()} active` : 'No analytics yet'}
        />
        <Stat label="Staff" value={analytics ? analytics.staff.toLocaleString() : '—'} note={analytics ? `${analytics.classes} classes` : ''} />
        <Stat
          label="Fees collected"
          value={analytics ? naira(analytics.fees.total_paid) : '—'}
          note={analytics ? `of ${naira(analytics.fees.total_due)} billed, ${collectionRate}%` : ''}
          progress={analytics ? collectionRate : undefined}
        />
        <Stat
          label="Attendance"
          value={analytics && analytics.attendance.total > 0 ? `${attendanceRate}%` : '—'}
          note={analytics && analytics.attendance.total > 0
            ? `${analytics.attendance.present.toLocaleString()} of ${analytics.attendance.total.toLocaleString()} records`
            : 'No records yet'}
        />
      </SummaryStrip>

      <div className="mb-6">
        <Panel title="School portal address">
          <div className="p-4 space-y-3">
            {portal ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <code className="text-sm text-ink bg-page border border-line rounded px-2.5 py-1.5">
                    {portal.url || 'No address yet'}
                  </code>
                  {portal.url && (
                    <>
                      <Button variant="secondary" onClick={() => navigator.clipboard.writeText(portal.url)}>Copy</Button>
                      <a href={portal.url} target="_blank" rel="noreferrer" className="text-sm text-brand underline underline-offset-2">Open</a>
                    </>
                  )}
                </div>
                <p className="text-[13px] text-muted">
                  Staff, students and parents sign in here instead of coming through the main site.
                  The address is this school&apos;s subdomain <strong className="text-ink">{portal.subdomain}</strong>
                  {' '}added to <strong className="text-ink">{portal.base_domain}</strong>, the domain this console runs on.
                </p>
                <p className="text-[13px] text-muted">
                  One DNS record covers every school: a wildcard <code className="text-ink">{portal.wildcard_record}</code>
                  {' '}pointing at the same host as the main site. Change the subdomain below to move a school.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted">Reading the address…</p>
            )}
          </div>
        </Panel>
      </div>

      <form onSubmit={save} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <section className="bg-surface border border-line rounded p-5">
          <h2 className="text-[15px] font-semibold text-ink mb-4">Account</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="plan" className={labelClass}>Plan</label>
              <select id="plan" value={form.plan} onChange={e => update('plan', e.target.value)} className={`${fieldClass} capitalize`}>
                {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="status" className={labelClass}>Status</label>
              <select id="status" value={form.status} onChange={e => update('status', e.target.value)} className={`${fieldClass} capitalize`}>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div>
              <label htmlFor="trial-ends" className={labelClass}>Trial ends</label>
              <input
                id="trial-ends" type="date" value={form.trial_ends_at}
                onChange={e => update('trial_ends_at', e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="academic-year" className={labelClass}>Academic year</label>
              <input
                id="academic-year" value={form.current_academic_year}
                onChange={e => update('current_academic_year', e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label htmlFor="current-term" className={labelClass}>Current term</label>
              <select id="current-term" value={form.current_term} onChange={e => update('current_term', e.target.value)} className={fieldClass}>
                {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox" checked={form.single_device_students}
                  onChange={e => update('single_device_students', e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-line text-brand focus:ring-brand"
                />
                <span className="text-xs text-ink">
                  One device per student
                  <span className="block text-muted mt-0.5">Signing in elsewhere signs the student out.</span>
                </span>
              </label>
            </div>
          </div>
        </section>

        <section className="bg-surface border border-line rounded p-5">
          <h2 className="text-[15px] font-semibold text-ink mb-4">Profile</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label htmlFor="name" className={labelClass}>School name</label>
              <input id="name" value={form.name} onChange={e => update('name', e.target.value)} className={fieldClass} />
            </div>
            <div className="col-span-2">
              <label htmlFor="subdomain" className={labelClass}>School address</label>
              <div className="flex items-center gap-2">
                <input id="subdomain" value={form.subdomain} onChange={e => update('subdomain', e.target.value)} className={fieldClass} placeholder="queens-college" />
                <span className="text-sm text-muted whitespace-nowrap">.{portal?.base_domain || 'clarriva.com'}</span>
              </div>
              <p className="text-xs text-muted mt-1">Letters, numbers and dashes. This is the school&apos;s own sign-in address.</p>
            </div>
            <div>
              <label htmlFor="school-type" className={labelClass}>School type</label>
              <input id="school-type" value={form.school_type} onChange={e => update('school_type', e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="state" className={labelClass}>State</label>
              <input id="state" value={form.state} onChange={e => update('state', e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="lga" className={labelClass}>LGA</label>
              <input id="lga" value={form.lga} onChange={e => update('lga', e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="proprietor-name" className={labelClass}>Proprietor</label>
              <input id="proprietor-name" value={form.proprietor_name} onChange={e => update('proprietor_name', e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label htmlFor="proprietor-phone" className={labelClass}>Proprietor phone</label>
              <input id="proprietor-phone" value={form.proprietor_phone} onChange={e => update('proprietor_phone', e.target.value)} className={fieldClass} />
            </div>
            <div className="col-span-2">
              <label htmlFor="address" className={labelClass}>Address</label>
              <textarea id="address" rows={2} value={form.address} onChange={e => update('address', e.target.value)} className={fieldClass} />
            </div>
          </div>
        </section>

        <div className="lg:col-span-2 flex justify-end">
          <Button type="submit" disabled={busy !== ''}>{busy === 'save' ? 'Saving…' : 'Save changes'}</Button>
        </div>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="People" aside={`${people.length} ${people.length === 1 ? 'account' : 'accounts'}`}>
          {people.length === 0 ? (
            <p className="px-4 py-5 text-sm text-muted">No accounts at this school yet.</p>
          ) : (
            <>
              <div className="px-4 py-3 flex flex-wrap gap-1.5 border-b border-line">
                {PEOPLE_ROLES.filter(r => roleCounts[r]).map(r => (
                  <span key={r} className="text-xs px-2 py-0.5 rounded bg-surface-2 text-muted capitalize">
                    {r.replace('_', ' ')} {roleCounts[r]}
                  </span>
                ))}
              </div>
              <ul className="divide-y divide-line">
                {people.slice(0, 10).map(p => (
                  <li key={p.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-sm text-ink truncate">
                        {`${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email}
                      </span>
                      <span className="block text-xs text-muted truncate">{p.email}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted capitalize">{p.role.replace('_', ' ')}</span>
                      <span className={`w-2 h-2 rounded-full ${p.is_active ? 'bg-success' : 'bg-danger'}`} aria-hidden="true" />
                    </span>
                  </li>
                ))}
              </ul>
              {people.length > 10 && (
                <p className="px-4 py-2.5 text-xs text-muted border-t border-line">
                  Showing 10 of {people.length}. Open Users for the full list.
                </p>
              )}
            </>
          )}
        </Panel>

        <Panel title="Recent activity" action={<Link href={`/admin/audit?school=${id}`} className="text-[13px] text-brand hover:underline">Full log</Link>}>
          {activity.length === 0 ? (
            <p className="px-4 py-5 text-sm text-muted">No activity recorded for this school yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {activity.slice(0, 10).map(a => (
                <li key={a.id} className="px-4 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-ink truncate">
                      <span className="font-medium capitalize">{a.action}</span> {a.model_name}
                      {a.object_repr ? ` · ${a.object_repr}` : ''}
                    </span>
                    <span className="text-xs text-muted shrink-0">{dateTime(a.created_at)}</span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">{a.user_name || 'System'}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

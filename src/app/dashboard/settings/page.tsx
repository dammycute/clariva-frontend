'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api, auth } from '@/lib/api';

const TERMS = ['1st Term', '2nd Term', '3rd Term'];

export default function SettingsPage() {
  const router = useRouter();
  const [school, setSchool] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  async function loadSchool() {
    const me = await auth.me();
    if (!me || (me.role !== 'school_admin' && me.role !== 'super_admin')) {
      router.push('/');
      return;
    }
    setLoading(true);
    if (me?.school_id) {
      const data = await api.schools.get(me.school_id);
      setSchool(data as Record<string, unknown>);
    }
    setLoading(false);
  }
  useEffect(() => { loadSchool(); }, []);

  function update(field: string, value: unknown) {
    setSchool(prev => prev ? { ...prev, [field]: value } : prev);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!school?.id) return;
    setSaving(true);
    setMessage('');
    setIsError(false);
    try {
      await api.schools.update(school.id as string, school as Record<string, unknown>);
      setMessage('Settings saved.');
      setIsError(false);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
      setIsError(true);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div role="status" className="text-sm text-muted p-8">Loading settings…</div>;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">School Settings</h1>
        <p className="text-xs text-muted mt-0.5">Manage your school profile and current academic session</p>
      </div>

      {message && (
        <div role={isError ? 'alert' : 'status'} className={`px-4 py-2.5 rounded text-xs mb-4 ${!isError ? 'bg-success/10 text-success' : 'bg-danger-soft text-danger'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <div className="bg-surface border border-line rounded p-5">
          <h2 className="text-sm font-semibold text-ink mb-4">School Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label htmlFor="school-name" className="block text-xs font-semibold text-muted mb-1">School Name</label>
              <input id="school-name" value={(school?.name as string) || ''} onChange={e => update('name', e.target.value)}
                className="w-full px-3 py-2.5 rounded border border-line text-sm outline-none focus:border-brand" />
            </div>
            <div>
              <label htmlFor="school-subdomain" className="block text-xs font-semibold text-muted mb-1">Subdomain</label>
              <input id="school-subdomain" value={(school?.subdomain as string) || ''} readOnly
                className="w-full px-3 py-2.5 rounded border border-line text-sm bg-page text-muted" />
            </div>
            <div>
              <label htmlFor="school-type" className="block text-xs font-semibold text-muted mb-1">School Type</label>
              <input id="school-type" value={(school?.school_type as string) || ''} onChange={e => update('school_type', e.target.value)}
                className="w-full px-3 py-2.5 rounded border border-line text-sm outline-none focus:border-brand" />
            </div>
            <div className="col-span-2">
              <label htmlFor="school-address" className="block text-xs font-semibold text-muted mb-1">Address</label>
              <textarea id="school-address" value={(school?.address as string) || ''} onChange={e => update('address', e.target.value)} rows={2}
                className="w-full px-3 py-2.5 rounded border border-line text-sm outline-none focus:border-brand" />
            </div>
            <div>
              <label htmlFor="school-state" className="block text-xs font-semibold text-muted mb-1">State</label>
              <input id="school-state" value={(school?.state as string) || ''} onChange={e => update('state', e.target.value)}
                className="w-full px-3 py-2.5 rounded border border-line text-sm outline-none focus:border-brand" />
            </div>
            <div>
              <label htmlFor="school-lga" className="block text-xs font-semibold text-muted mb-1">LGA</label>
              <input id="school-lga" value={(school?.lga as string) || ''} onChange={e => update('lga', e.target.value)}
                className="w-full px-3 py-2.5 rounded border border-line text-sm outline-none focus:border-brand" />
            </div>
          </div>
        </div>

        <div className="bg-surface border border-line rounded p-5">
          <h2 className="text-sm font-semibold text-ink mb-4">Current Session</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="current-term" className="block text-xs font-semibold text-muted mb-1">Current Term</label>
              <select id="current-term" value={(school?.current_term as string) || '1st Term'} onChange={e => update('current_term', e.target.value)}
                className="w-full px-3 py-2.5 rounded border border-line text-sm outline-none bg-surface focus:border-brand">
                {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="academic-year" className="block text-xs font-semibold text-muted mb-1">Academic Year</label>
              <input id="academic-year" value={(school?.current_academic_year as string) || ''} onChange={e => update('current_academic_year', e.target.value)}
                className="w-full px-3 py-2.5 rounded border border-line text-sm outline-none focus:border-brand" />
            </div>
          </div>
        </div>

        <div className="bg-surface border border-line rounded p-5">
          <h2 className="text-sm font-semibold text-ink mb-4">Proprietor / Contact</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="proprietor-name" className="block text-xs font-semibold text-muted mb-1">Proprietor Name</label>
              <input id="proprietor-name" value={(school?.proprietor_name as string) || ''} onChange={e => update('proprietor_name', e.target.value)}
                className="w-full px-3 py-2.5 rounded border border-line text-sm outline-none focus:border-brand" />
            </div>
            <div>
              <label htmlFor="proprietor-phone" className="block text-xs font-semibold text-muted mb-1">Proprietor Phone</label>
              <input id="proprietor-phone" value={(school?.proprietor_phone as string) || ''} onChange={e => update('proprietor_phone', e.target.value)}
                className="w-full px-3 py-2.5 rounded border border-line text-sm outline-none focus:border-brand" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="submit" disabled={saving}
            className="text-sm px-6 py-2.5 rounded bg-brand text-brand-ink hover:opacity-90 disabled:opacity-50 cursor-pointer min-h-[44px]">
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { api, auth } from '@/lib/api';

const TERMS = ['1st Term', '2nd Term', '3rd Term'];

export default function SettingsPage() {
  const [school, setSchool] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function loadSchool() {
    setLoading(true);
    const me = await auth.me();
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
    try {
      await api.schools.update(school.id as string, school as Record<string, unknown>);
      setMessage('Settings saved.');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-sm text-[#64748B] p-8">Loading settings…</div>;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0D2B55]">School Settings</h1>
        <p className="text-xs text-[#64748B] mt-0.5">Manage your school profile and current academic session</p>
      </div>

      {message && (
        <div className={`px-4 py-2 rounded-lg text-xs mb-4 ${message.includes('Saved') ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#B91C1C]'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5">
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-5">
          <h2 className="text-sm font-bold text-[#0D2B55] mb-4">School Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">School Name</label>
              <input value={(school?.name as string) || ''} onChange={e => update('name', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Subdomain</label>
              <input value={(school?.subdomain as string) || ''} readOnly
                className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm bg-[#F7F9FC] text-[#64748B]" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">School Type</label>
              <input value={(school?.school_type as string) || ''} onChange={e => update('school_type', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
            </div>
            <div className="col-span-2">
              <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Address</label>
              <textarea value={(school?.address as string) || ''} onChange={e => update('address', e.target.value)} rows={2}
                className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">State</label>
              <input value={(school?.state as string) || ''} onChange={e => update('state', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">LGA</label>
              <input value={(school?.lga as string) || ''} onChange={e => update('lga', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#DDE5F0] rounded-xl p-5">
          <h2 className="text-sm font-bold text-[#0D2B55] mb-4">Current Session</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Current Term</label>
              <select value={(school?.current_term as string) || '1st Term'} onChange={e => update('current_term', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none bg-white focus:border-[#1A7A4A]">
                {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Academic Year</label>
              <input value={(school?.current_academic_year as string) || ''} onChange={e => update('current_academic_year', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#DDE5F0] rounded-xl p-5">
          <h2 className="text-sm font-bold text-[#0D2B55] mb-4">Proprietor / Contact</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Proprietor Name</label>
              <input value={(school?.proprietor_name as string) || ''} onChange={e => update('proprietor_name', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Proprietor Phone</label>
              <input value={(school?.proprietor_phone as string) || ''} onChange={e => update('proprietor_phone', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="submit" disabled={saving}
            className="text-sm px-6 py-2.5 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D] disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}

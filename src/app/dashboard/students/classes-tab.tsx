'use client';

import { useState, useEffect } from 'react';
import { api, auth } from '@/lib/api';
import ConfirmDialog from '@/components/confirm-dialog';

interface Class { id: string; name: string; year_group: string | null; arm: string | null; form_teacher: string | null; form_teacher_name: string | null; academic_year: string | null; }
interface StaffMember { id: string; user_id: string; full_name: string; role: string; }

const YEAR_GROUPS = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];
const ARMS = ['A', 'B', 'C', 'D'];

export default function ClassesTab() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', year_group: '', arm: '', form_teacher: '', academic_year: '2025/2026' });
  const [submitError, setSubmitError] = useState('');
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null);
  const [creatingAccounts, setCreatingAccounts] = useState<string | null>(null);
  const [accountsResult, setAccountsResult] = useState<{ name: string; email: string; password: string }[] | null>(null);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  useEffect(() => { loadClasses(); loadStaff(); }, []);

  async function loadStaff() {
    try {
      const data = await api.staff.list();
      setStaffList((data as StaffMember[]).filter(s => s.role === 'Teacher'));
    } catch { /* */ }
  }

  async function loadClasses() {
    setLoading(true);
    const data = await api.classes.list();
    setClasses(data as Class[]);
    setLoading(false);
  }

  function openAdd() {
    setEditingId(null);
    setForm({ name: '', year_group: '', arm: '', form_teacher: '', academic_year: '2025/2026' });
    setShowModal(true);
  }
  function openEdit(c: Class) {
    setEditingId(c.id);
    setForm({ name: c.name, year_group: c.year_group || '', arm: c.arm || '', form_teacher: c.form_teacher || '', academic_year: c.academic_year || '2025/2026' });
    setShowModal(true);
  }

  function updateField(field: string, value: string) {
    const updated = { ...form, [field]: value };
    if (field === 'year_group') {
      updated.name = value ? (updated.arm ? `${value}${updated.arm}` : value) : '';
    } else if (field === 'arm') {
      const yg = updated.year_group;
      updated.name = yg ? (value ? `${yg}${value}` : yg) : '';
    }
    setForm(updated);
  }

  const duplicateName = form.name && classes.some(c => c.name === form.name && c.id !== editingId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');
    if (duplicateName) return;
    try {
      const payload = { ...form, arm: form.arm || null, form_teacher: form.form_teacher || null, academic_year: form.academic_year || null };
      if (editingId) {
        await api.classes.update(editingId, payload);
      } else {
        await api.classes.create(payload);
      }
      setShowModal(false);
      loadClasses();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save class');
    }
  }

  async function handleDelete(id: string) {
    await api.classes.delete(id);
    setConfirm(null);
    loadClasses();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-[#64748B]">{classes.length} classes configured</p>
        <button onClick={openAdd} className="text-sm px-3.5 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D]">+ Add Class</button>
      </div>

      <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-sm text-[#64748B]">Loading classes…</div>
        ) : classes.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#64748B]">No classes yet.</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[11px] font-bold tracking-wider text-[#64748B] uppercase bg-[#F7F9FC]">
                <th className="text-left px-4 py-3">Class</th>
                <th className="text-left px-4 py-3">Year Group</th>
                <th className="text-left px-4 py-3">Arm</th>
                <th className="text-left px-4 py-3">Form Teacher</th>
                <th className="text-left px-4 py-3">Academic Year</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.map(c => (
                  <tr key={c.id} className="hover:bg-[#F8FAFF] border-t border-[#DDE5F0]">
                    <td className="px-4 py-3 font-semibold truncate max-w-[160px]" title={c.name}>{c.name}</td>
                    <td className="px-4 py-3 text-[#64748B]">{c.year_group || '—'}</td>
                    <td className="px-4 py-3">{c.arm || '—'}</td>
                    <td className="px-4 py-3 truncate max-w-[160px]" title={c.form_teacher_name || ''}>{c.form_teacher_name || '—'}</td>
                    <td className="px-4 py-3 truncate max-w-[100px]" title={c.academic_year || ''}>{c.academic_year || '—'}</td>
                    <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={async () => {
                        setCreatingAccounts(c.id);
                        const token = auth.getToken();
                        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
                        const res = await fetch(`${base}/students/bulk_create_accounts/`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token ?? ''}` },
                          body: JSON.stringify({ class_id: c.id }),
                        });
                        const data = await res.json();
                        setCreatingAccounts(null);
                        if (data.created) setAccountsResult(data.created);
                      }} disabled={creatingAccounts === c.id}
                        className="text-[10px] px-2 py-1 rounded-lg bg-[#0D2B55] text-white hover:bg-[#0A1F3D] disabled:opacity-50">
                        {creatingAccounts === c.id ? '…' : '👤 Accounts'}
                      </button>
                      <button onClick={() => openEdit(c)} className="text-xs px-2 py-1 rounded-lg border border-[#DDE5F0] bg-white hover:bg-[#F0F4FA]">✏️</button>
                      <button onClick={() => setConfirm({ id: c.id, name: c.name })} className="text-xs px-2 py-1 rounded-lg border border-[#FEE2E2] bg-white text-[#B91C1C] hover:bg-[#FEE2E2]">🗑</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog open={!!confirm} title="Delete Class" message={`Delete ${confirm?.name}? This cannot be undone.`} onConfirm={() => confirm && handleDelete(confirm.id)} onCancel={() => setConfirm(null)} />

      {accountsResult && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setAccountsResult(null)}>
          <div className="bg-white rounded-2xl w-[500px] max-w-[95vw] max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-base font-bold text-[#0D2B55]">Student Accounts Created</h2>
              <button onClick={() => setAccountsResult(null)} className="text-[#64748B] hover:text-[#0D2B55] text-lg">✕</button>
            </div>
            <div className="p-5">
              <p className="text-xs text-[#64748B] mb-4">{accountsResult.length} accounts created. Share credentials with students.</p>
              <div className="divide-y divide-[#DDE5F0] max-h-[400px] overflow-y-auto border border-[#DDE5F0] rounded-xl">
                {accountsResult.map((a, i) => (
                  <div key={i} className="p-3 text-xs">
                    <p className="font-bold text-[#0D2B55]">{a.name}</p>
                    <p className="text-[#64748B]">Email: {a.email}</p>
                    <p className="text-[#1A7A4A] font-semibold">Password: {a.password}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setAccountsResult(null)} className="mt-4 w-full text-sm px-4 py-2.5 rounded-lg bg-[#0D2B55] text-white hover:bg-[#0A1F3D]">Done</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-[460px] max-w-[95vw]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-base font-bold text-[#0D2B55]">{editingId ? 'Edit Class' : 'Add New Class'}</h2>
              <button onClick={() => setShowModal(false)} className="text-[#64748B] hover:text-[#0D2B55] text-lg">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Year group</label>
                  <select value={form.year_group} onChange={e => updateField('year_group', e.target.value)} required
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] bg-white">
                    <option value="">Select</option>
                    {YEAR_GROUPS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Arm</label>
                  <select value={form.arm} onChange={e => updateField('arm', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] bg-white">
                    <option value="">Select</option>
                    {ARMS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Class name (auto-generated)</label>
                <input value={form.name} readOnly className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm bg-[#F7F9FC] text-[#64748B]" />
                {duplicateName && (
                  <p className="text-[11px] text-[#B91C1C] mt-1.5">⚠ The name &quot;{form.name}&quot; is already taken.</p>
                )}
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Form teacher</label>
                <select value={form.form_teacher || ''} onChange={e => setForm({ ...form, form_teacher: e.target.value || '' })}
                  className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] bg-white">
                  <option value="">Not assigned</option>
                  {staffList.map(s => <option key={s.id} value={s.user_id || s.id}>{s.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Academic year</label>
                <input value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
              </div>
              {submitError && <p className="text-[11px] text-[#B91C1C]">{submitError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="text-sm px-4 py-2 rounded-lg border border-[#DDE5F0] bg-white hover:bg-[#F0F4FA]">Cancel</button>
                <button type="submit" disabled={!!duplicateName} className="text-sm px-4 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D] disabled:opacity-50">{editingId ? 'Save Changes' : 'Add Class'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

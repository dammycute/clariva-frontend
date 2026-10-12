'use client';

import { useState, useEffect } from 'react';
import { api, auth } from '@/lib/api';
import ConfirmDialog from '@/components/confirm-dialog';
import { UserPlus, Pencil, Trash2, X, AlertTriangle } from 'lucide-react';

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
        <p className="text-xs text-muted">{classes.length} classes configured</p>
        <button onClick={openAdd} className="text-sm px-3.5 py-2 rounded bg-brand text-brand-ink hover:opacity-90">+ Add Class</button>
      </div>

      <div className="bg-surface border border-line rounded overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted">Loading classes…</div>
        ) : classes.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">No classes yet.</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-xs font-semibold text-muted bg-page">
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
                  <tr key={c.id} className="hover:bg-page border-t border-line">
                    <td className="px-4 py-3 font-semibold truncate max-w-[160px]" title={c.name}>{c.name}</td>
                    <td className="px-4 py-3 text-muted">{c.year_group || '-'}</td>
                    <td className="px-4 py-3">{c.arm || '-'}</td>
                    <td className="px-4 py-3 truncate max-w-[160px]" title={c.form_teacher_name || ''}>{c.form_teacher_name || '-'}</td>
                    <td className="px-4 py-3 truncate max-w-[100px]" title={c.academic_year || ''}>{c.academic_year || '-'}</td>
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
                        className="text-xs px-2 py-1 rounded bg-brand text-brand-ink hover:bg-brand disabled:opacity-50 inline-flex items-center gap-1">
                        {creatingAccounts === c.id ? '…' : <><UserPlus size={16} aria-hidden="true" /> Accounts</>}
                      </button>
                      <button onClick={() => openEdit(c)} aria-label="Edit" className="text-xs px-2 py-1 rounded border border-line bg-surface hover:bg-surface-2"><Pencil size={16} aria-hidden="true" /></button>
                      <button onClick={() => setConfirm({ id: c.id, name: c.name })} aria-label="Delete" className="text-xs px-2 py-1 rounded border border-danger-soft bg-surface text-danger hover:bg-danger-soft"><Trash2 size={16} aria-hidden="true" /></button>
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
          <div className="bg-surface rounded w-[500px] max-w-[95vw] max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-base font-semibold text-ink">Student Accounts Created</h2>
              <button onClick={() => setAccountsResult(null)} className="text-muted hover:text-ink text-lg" aria-label="Close"><X size={16} aria-hidden="true" /></button>
            </div>
            <div className="p-5">
              <p className="text-xs text-muted mb-4">{accountsResult.length} accounts created. Share credentials with students.</p>
              <div className="divide-y divide-line max-h-[400px] overflow-y-auto border border-line rounded">
                {accountsResult.map((a, i) => (
                  <div key={i} className="p-3 text-xs">
                    <p className="font-semibold text-ink">{a.name}</p>
                    <p className="text-muted">Email: {a.email}</p>
                    <p className="text-brand font-semibold">Password: {a.password}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => setAccountsResult(null)} className="mt-4 w-full text-sm px-4 py-2.5 rounded bg-brand text-brand-ink hover:bg-brand">Done</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowModal(false)}>
          <div className="bg-surface rounded w-[460px] max-w-[95vw]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-base font-semibold text-ink">{editingId ? 'Edit Class' : 'Add New Class'}</h2>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-ink text-lg" aria-label="Close"><X size={16} aria-hidden="true" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Year group</label>
                  <select value={form.year_group} onChange={e => updateField('year_group', e.target.value)} required
                    className="w-full px-3 py-2 rounded border border-line text-sm outline-none focus:border-brand bg-surface">
                    <option value="">Select</option>
                    {YEAR_GROUPS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Arm</label>
                  <select value={form.arm} onChange={e => updateField('arm', e.target.value)}
                    className="w-full px-3 py-2 rounded border border-line text-sm outline-none focus:border-brand bg-surface">
                    <option value="">Select</option>
                    {ARMS.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Class name (auto-generated)</label>
                <input value={form.name} readOnly className="w-full px-3 py-2 rounded border border-line text-sm bg-page text-muted" />
                {duplicateName && (
                  <p className="text-xs text-danger mt-1.5 inline-flex items-center gap-1"><AlertTriangle size={16} aria-hidden="true" /> The name &quot;{form.name}&quot; is already taken.</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Form teacher</label>
                <select value={form.form_teacher || ''} onChange={e => setForm({ ...form, form_teacher: e.target.value || '' })}
                  className="w-full px-3 py-2 rounded border border-line text-sm outline-none focus:border-brand bg-surface">
                  <option value="">Not assigned</option>
                  {staffList.map(s => <option key={s.id} value={s.user_id || s.id}>{s.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Academic year</label>
                <input value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-line text-sm outline-none focus:border-brand" />
              </div>
              {submitError && <p className="text-xs text-danger">{submitError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="text-sm px-4 py-2 rounded border border-line bg-surface hover:bg-surface-2">Cancel</button>
                <button type="submit" disabled={!!duplicateName} className="text-sm px-4 py-2 rounded bg-brand text-brand-ink hover:opacity-90 disabled:opacity-50">{editingId ? 'Save Changes' : 'Add Class'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import ConfirmDialog from '@/components/confirm-dialog';

interface Subject { id: string; name: string; code: string; year_group: string | null; teacher: string | null; teacher_name: string | null; is_core: boolean; grading_mode: string; grading_mode_label: string; }
interface Staff { id: string; full_name: string; }

const YEAR_GROUPS = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];
const GRADING_MODES = [
  { value: 'manual', label: 'Full Manual' },
  { value: 'cbt', label: 'Full CBT' },
  { value: 'hybrid', label: 'Hybrid' },
];

export default function PrincipalSubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterYg, setFilterYg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', year_group: '', teacher: '', is_core: true, grading_mode: 'manual' });
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function loadAll() {
    setLoading(true);
    const [subRes, stfRes] = await Promise.all([api.subjects.list(), api.staff.list()]);
    setSubjects(subRes as Subject[]);
    setStaffList(stfRes as Staff[]);
    setLoading(false);
  }
  useEffect(() => { loadAll(); }, []);

  const filtered = filterYg ? subjects.filter(s => s.year_group === filterYg) : subjects;

  function openAdd() { setEditId(null); setForm({ name: '', code: '', year_group: '', teacher: '', is_core: true, grading_mode: 'manual' }); setError(''); setShowForm(true); }
  function openEdit(sub: Subject) { setEditId(sub.id); setForm({ name: sub.name, code: sub.code || '', year_group: sub.year_group || '', teacher: sub.teacher || '', is_core: sub.is_core, grading_mode: sub.grading_mode }); setError(''); setShowForm(true); }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (!form.name.trim()) { setError('Subject name is required.'); return; }
    if (!form.year_group) { setError('Select a year group.'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), code: form.code.trim() || null, year_group: form.year_group, teacher: form.teacher || null, is_core: form.is_core, grading_mode: form.grading_mode };
      if (editId) await api.subjects.update(editId, payload as Partial<Subject>);
      else await api.subjects.create(payload as Partial<Subject>);
      setShowForm(false); loadAll();
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Save failed'); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) { try { await api.subjects.delete(id); setConfirmDelete(null); loadAll(); } catch { /* */ } }

  return (
    <div>
      <h1 className="text-xl font-bold text-[#1E1B4B] mb-4">Subjects</h1>
      <div className="flex items-center justify-between mb-4">
        <select value={filterYg} onChange={e => setFilterYg(e.target.value)} className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#64748B] outline-none">
          <option value="">All year groups</option>
          {YEAR_GROUPS.map(yg => <option key={yg} value={yg}>{yg}</option>)}
        </select>
        <button onClick={openAdd} className="text-sm px-4 py-2 rounded-lg bg-[#4C1D95] text-white hover:bg-[#3B1578]">+ Add Subject</button>
      </div>

      <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-x-auto">
        {loading ? <div className="p-8 text-center text-sm text-[#64748B]">Loading…</div>
        : filtered.length === 0 ? <div className="p-8 text-center text-sm text-[#64748B]">No subjects.</div>
        : <table className="w-full text-xs">
            <thead><tr className="text-[11px] font-bold text-[#64748B] uppercase bg-[#F7F9FC]">
              <th className="text-left px-4 py-3">Subject</th><th className="text-left px-4 py-3">Code</th>
              <th className="text-left px-4 py-3">Year Group</th><th className="text-left px-4 py-3">Teacher</th>
              <th className="text-left px-4 py-3">Mode</th><th className="text-left px-4 py-3">Core</th><th className="text-left px-4 py-3">Actions</th>
            </tr></thead>
            <tbody>{filtered.map(s => (
              <tr key={s.id} className="hover:bg-[#F8FAFF] border-t border-[#DDE5F0]">
                <td className="px-4 py-3 font-semibold">{s.name}</td><td className="px-4 py-3 text-[#64748B]">{s.code || '—'}</td>
                <td className="px-4 py-3">{s.year_group || 'All'}</td><td className="px-4 py-3">{s.teacher_name || '—'}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${s.grading_mode === 'cbt' ? 'bg-[#DCFCE7] text-[#1A7A4A]' : s.grading_mode === 'hybrid' ? 'bg-[#FEF3C7] text-[#D4930A]' : 'bg-[#E8F0FA] text-[#0D2B55]'}`}>{s.grading_mode_label || s.grading_mode}</span></td>
                <td className="px-4 py-3">{s.is_core ? <span className="text-[#1A7A4A]">✓</span> : '—'}</td>
                <td className="px-4 py-3"><button onClick={() => openEdit(s)} className="text-[11px] text-[#4C1D95] hover:underline mr-2">Edit</button><button onClick={() => setConfirmDelete(s.id)} className="text-[11px] text-[#B91C1C] hover:underline">Delete</button></td>
              </tr>
            ))}</tbody>
          </table>}
      </div>

      <ConfirmDialog open={!!confirmDelete} title="Delete Subject" message="Delete this subject? This may affect existing grades." onConfirm={() => confirmDelete && handleDelete(confirmDelete)} onCancel={() => setConfirmDelete(null)} />

      {showForm && <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
        <div className="bg-white rounded-2xl w-[520px] max-w-[95vw]" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-5 pb-0">
            <h2 className="text-base font-bold text-[#1E1B4B]">{editId ? 'Edit Subject' : 'Add Subject'}</h2>
            <button onClick={() => setShowForm(false)} className="text-[#64748B] hover:text-[#1E1B4B] text-lg">✕</button>
          </div>
          <form onSubmit={handleSave} className="p-5 space-y-3.5">
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Name</label><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#4C1D95]" /></div>
              <div><label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Code</label><input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#4C1D95]" /></div>
            </div>
            <div><label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Year Group</label>
              <select value={form.year_group} onChange={e => setForm({ ...form, year_group: e.target.value })} required className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#4C1D95] bg-white">
                <option value="">Select</option>{YEAR_GROUPS.map(yg => <option key={yg} value={yg}>{yg}</option>)}
              </select>
            </div>
            <div><label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Grading Mode</label>
              <select value={form.grading_mode} onChange={e => setForm({ ...form, grading_mode: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#4C1D95] bg-white">
                {GRADING_MODES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
            <div><label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Teacher</label>
              <select value={form.teacher} onChange={e => setForm({ ...form, teacher: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#4C1D95] bg-white">
                <option value="">Not assigned</option>{staffList.map(st => <option key={st.id} value={st.id}>{st.full_name}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.is_core} onChange={e => setForm({ ...form, is_core: e.target.checked })} className="w-4 h-4 rounded border-[#DDE5F0] text-[#4C1D95] focus:ring-[#4C1D95]" /><span className="text-sm text-[#1E1B4B]">Core subject</span></label>
            {error && <p className="text-[11px] text-[#B91C1C]">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="text-sm px-4 py-2 rounded-lg border border-[#DDE5F0] bg-white hover:bg-[#F0F4FA]">Cancel</button>
              <button type="submit" disabled={saving} className="text-sm px-4 py-2 rounded-lg bg-[#4C1D95] text-white hover:bg-[#3B1578] disabled:opacity-50">{saving ? 'Saving…' : editId ? 'Update Subject' : 'Add Subject'}</button>
            </div>
          </form>
        </div>
      </div>}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { api, auth } from '@/lib/api';
import { downloadCsv } from '@/lib/csv';
import Link from 'next/link';

interface Student { id: string; admission_no: string; full_name: string; gender: string | null; class_group: string | null; guardian_name: string | null; guardian_phone: string | null; status: string; class_name?: string; }
interface Class { id: string; name: string; }
interface State { id: number; name: string; }
interface LGA { id: number; name: string; }

const COLORS = [
  { bg: '#E8F0FA', text: '#0D2B55' }, { bg: '#DCFCE7', text: '#1A7A4A' },
  { bg: '#FEF3C7', text: '#D4930A' }, { bg: '#FEE2E2', text: '#B91C1C' },
  { bg: '#F3E8FF', text: '#7C3AED' }, { bg: '#FFE4E6', text: '#9F1234' },
];

function getInitials(name: string) { return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2); }
function getColor(name: string) { const i = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0); return COLORS[i % COLORS.length]; }

export default function StudentsTab() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [search, setSearch] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [loading, setLoading] = useState(true);
  const [states, setStates] = useState<State[]>([]);
  const [lgas, setLgas] = useState<LGA[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showPromote, setShowPromote] = useState(false);
  const [promoteSource, setPromoteSource] = useState('');
  const [promoteTarget, setPromoteTarget] = useState('');
  const [promoting, setPromoting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importClass, setImportClass] = useState('');
  const [importCsv, setImportCsv] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; errors: string[] } | null>(null);
  const [form, setForm] = useState({
    full_name: '', gender: '', dob: '', state_of_origin: '', lga_of_origin: '',
    class_group: '', guardian_name: '', guardian_phone: '', guardian_email: '',
  });

  useEffect(() => {
    loadData();
    api.locations.states.list().then(d => setStates(d as State[])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!form.state_of_origin) { setLgas([]); return; }
    const stateId = states.find(s => s.name === form.state_of_origin)?.id;
    if (stateId) api.locations.lgas.list({ state: String(stateId) }).then(d => setLgas(d as LGA[])).catch(() => {});
  }, [form.state_of_origin, states]);

  async function loadData() {
    setLoading(true);
    const [stuRes, clsRes] = await Promise.all([api.students.list({ page_size: '500' }), api.classes.list()]);
    setClasses(clsRes as Class[]);
    setStudents(stuRes as Student[]);
    setLoading(false);
  }

  const filtered = students.filter(s => {
    const q = !search || s.full_name.toLowerCase().includes(search.toLowerCase()) || s.admission_no?.includes(search);
    const c = !filterClass || s.class_group === filterClass;
    return q && c;
  });

  function openAdd() {
    setEditingId(null);
    setForm({ full_name: '', gender: '', dob: '', state_of_origin: '', lga_of_origin: '', class_group: '', guardian_name: '', guardian_phone: '', guardian_email: '' });
    setShowModal(true);
  }
  function openEdit(s: Student) {
    setEditingId(s.id);
    setForm({ full_name: s.full_name, gender: s.gender || '', dob: '', state_of_origin: '', lga_of_origin: '', class_group: s.class_group || '', guardian_name: s.guardian_name || '', guardian_phone: s.guardian_phone || '', guardian_email: '' });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      admission_no: editingId ? undefined : `CLR/${new Date().getFullYear()}/${String(students.length + 1).padStart(5, '0')}`,
    };
    if (editingId) {
      await api.students.update(editingId, payload);
    } else {
      await api.students.create(payload);
    }
    setSaving(false);
    setShowModal(false);
    loadData();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5 bg-white border border-[#DDE5F0] rounded-xl px-3.5 py-2.5 flex-1 max-w-lg">
          <span className="text-sm">🔍</span>
          <input type="text" placeholder="Search by name, admission number…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 border-none bg-transparent text-sm text-[#0D2B55] outline-none placeholder:text-[#64748B]" />
          <select value={filterClass} onChange={e => setFilterClass(e.target.value)}
            className="text-sm border border-[#DDE5F0] rounded-lg px-2.5 py-1.5 bg-white text-[#64748B] outline-none">
            <option value="">All classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={() => {
            const h = ['full_name', 'admission_no', 'gender', 'class', 'guardian_name', 'guardian_phone', 'status'];
            const r = filtered.map(s => [s.full_name, s.admission_no, s.gender || '', s.class_name || '', s.guardian_name || '', s.guardian_phone || '', s.status]);
            downloadCsv('students.csv', h, r);
          }} className="text-sm px-3.5 py-2 rounded-lg border border-[#DDE5F0] text-[#64748B] hover:bg-[#F0F4FA]">⬇ Export CSV</button>
          <button onClick={() => { setImportCsv(''); setImportResult(null); setShowImport(true); }} className="text-sm px-3.5 py-2 rounded-lg border border-[#DDE5F0] text-[#64748B] hover:bg-[#F0F4FA]">📄 Import CSV</button>
          <button onClick={() => setShowPromote(true)} className="text-sm px-3.5 py-2 rounded-lg border border-[#0D2B55] text-[#0D2B55] hover:bg-[#F0F4FA]">⬆ Promote</button>
          <button onClick={openAdd} className="text-sm px-3.5 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D]">+ Add Student</button>
        </div>
      </div>

      <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-[#64748B]">Loading students…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#64748B]">{students.length === 0 ? 'No students yet. Add your first student →' : 'No students match your search.'}</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[11px] font-bold tracking-wider text-[#64748B] uppercase bg-[#F7F9FC]">
                <th className="text-left px-4 py-3">Student</th>
                <th className="text-left px-4 py-3">Adm. No.</th>
                <th className="text-left px-4 py-3">Class</th>
                <th className="text-left px-4 py-3">Guardian</th>
                <th className="text-left px-4 py-3">Phone</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const c = getColor(s.full_name);
                return (
                  <tr key={s.id} className="hover:bg-[#F8FAFF] border-t border-[#DDE5F0]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: c.bg, color: c.text }}>{getInitials(s.full_name)}</div>
                        {s.full_name}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[#64748B]">{s.admission_no || '—'}</td>
                    <td className="px-4 py-3">{s.class_name || '—'}</td>
                    <td className="px-4 py-3">{s.guardian_name || '—'}</td>
                    <td className="px-4 py-3">{s.guardian_phone || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        s.status === 'active' ? 'bg-[#DCFCE7] text-[#1A7A4A]' : 'bg-[#FEE2E2] text-[#B91C1C]'
                      }`}>{s.status}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-1 justify-end">
                        <Link href={`/dashboard/students/${s.id}`} className="text-xs px-2.5 py-1 rounded-lg border border-[#DDE5F0] bg-white hover:bg-[#F0F4FA]">👁 View</Link>
                        <button onClick={() => openEdit(s)} className="text-xs px-2.5 py-1 rounded-lg border border-[#DDE5F0] bg-white hover:bg-[#F0F4FA]">✏️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showImport && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowImport(false)}>
          <div className="bg-white rounded-2xl w-[560px] max-w-[95vw]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-base font-bold text-[#0D2B55]">Import Students from CSV</h2>
              <button onClick={() => setShowImport(false)} className="text-[#64748B] hover:text-[#0D2B55] text-lg">✕</button>
            </div>
            <div className="p-5 space-y-3.5">
              {importResult ? (
                <div>
                  <p className="text-sm font-bold text-[#1A7A4A]">✓ {importResult.created} students imported.</p>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 bg-[#FEE2E2] rounded-lg p-3 max-h-[200px] overflow-y-auto">
                      {importResult.errors.map((e, i) => <p key={i} className="text-xs text-[#B91C1C]">{e}</p>)}
                    </div>
                  )}
                  <button onClick={() => setShowImport(false)} className="mt-4 w-full text-sm px-4 py-2.5 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D]">Done</button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Assign to class (optional)</label>
                    <select value={importClass} onChange={e => setImportClass(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] bg-white">
                      <option value="">No class</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">CSV data</label>
                    <textarea value={importCsv} onChange={e => setImportCsv(e.target.value)} rows={8} placeholder={'full_name,admission_no,gender,guardian_name,guardian_phone\nJohn Doe,JH123,Male,Jane Doe,08012345678'}
                      className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] font-mono" />
                    <p className="text-[10px] text-[#64748B] mt-1">Required: <strong>full_name</strong>. Optional: admission_no, gender, guardian_name, guardian_phone, guardian_email</p>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setShowImport(false)} className="text-sm px-4 py-2 rounded-lg border border-[#DDE5F0] bg-white hover:bg-[#F0F4FA]">Cancel</button>
                    <button onClick={async () => {
                      if (!importCsv.trim()) return;
                      setImporting(true);
                      try {
                        const token = auth.getToken();
                        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/students/import_csv/`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token ?? ''}` },
                          body: JSON.stringify({ csv: importCsv, class_id: importClass || null }),
                        });
                        const data = await res.json();
                        setImportResult(data);
                        loadData();
                      } catch { alert('Import failed'); }
                      finally { setImporting(false); }
                    }} disabled={!importCsv.trim() || importing}
                      className="text-sm px-4 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D] disabled:opacity-50">
                      {importing ? 'Importing…' : 'Import Students'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showPromote && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowPromote(false)}>
          <div className="bg-white rounded-2xl w-[460px] max-w-[95vw]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-base font-bold text-[#0D2B55]">Promote Students</h2>
              <button onClick={() => setShowPromote(false)} className="text-[#64748B] hover:text-[#0D2B55] text-lg">✕</button>
            </div>
            <div className="p-5 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">From class</label>
                <select value={promoteSource} onChange={e => setPromoteSource(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] bg-white">
                  <option value="">Select source class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">To class</label>
                <select value={promoteTarget} onChange={e => setPromoteTarget(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] bg-white">
                  <option value="">Select target class</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              {promoteSource && promoteTarget && (
                <p className="text-xs text-[#64748B]">
                  {students.filter(s => s.class_group === promoteSource && s.status === 'active').length} active students will be promoted.
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowPromote(false)} className="text-sm px-4 py-2 rounded-lg border border-[#DDE5F0] bg-white hover:bg-[#F0F4FA]">Cancel</button>
                <button onClick={async () => {
                  if (!promoteSource || !promoteTarget) return;
                  setPromoting(true);
                  try {
                    const ids = students.filter(s => s.class_group === promoteSource).map(s => s.id);
                    const token = auth.getToken();
                    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/students/promote/`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token ?? ''}` },
                      body: JSON.stringify({ student_ids: ids, target_class_id: promoteTarget }),
                    });
                    if (!res.ok) { const d = await res.json(); alert(d.error || 'Failed'); return; }
                    setShowPromote(false);
                    loadData();
                  } catch { alert('Promotion failed'); }
                  finally { setPromoting(false); }
                }} disabled={!promoteSource || !promoteTarget || promoting}
                  className="text-sm px-4 py-2 rounded-lg bg-[#0D2B55] text-white hover:bg-[#0A1F3D] disabled:opacity-50">
                  {promoting ? 'Promoting…' : `Promote to ${classes.find(c => c.id === promoteTarget)?.name || ''}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-[520px] max-w-[95vw] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-base font-bold text-[#0D2B55]">{editingId ? 'Edit Student' : 'Add New Student'}</h2>
              <button onClick={() => setShowModal(false)} className="text-[#64748B] hover:text-[#0D2B55] text-lg">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Full name</label>
                  <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Gender</label>
                  <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] bg-white">
                    <option value="">Select</option><option>Female</option><option>Male</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Date of birth</label>
                  <input type="date" value={form.dob} onChange={e => setForm({ ...form, dob: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Class</label>
                  <select value={form.class_group} onChange={e => setForm({ ...form, class_group: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] bg-white">
                    <option value="">Select class</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">State of origin</label>
                  <select value={form.state_of_origin} onChange={e => setForm({ ...form, state_of_origin: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] bg-white">
                    <option value="">Select state</option>
                    {states.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">LGA of origin</label>
                  <input value={form.lga_of_origin} onChange={e => setForm({ ...form, lga_of_origin: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
                </div>
              </div>
              <div className="border-t border-[#DDE5F0] pt-3.5">
                <p className="text-[11px] font-bold text-[#64748B] uppercase mb-3">Guardian Information</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Name</label>
                    <input value={form.guardian_name} onChange={e => setForm({ ...form, guardian_name: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Phone</label>
                    <input value={form.guardian_phone} onChange={e => setForm({ ...form, guardian_phone: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Guardian email</label>
                  <input type="email" value={form.guardian_email} onChange={e => setForm({ ...form, guardian_email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="text-sm px-4 py-2 rounded-lg border border-[#DDE5F0] bg-white hover:bg-[#F0F4FA]">Cancel</button>
                <button type="submit" disabled={saving} className="text-sm px-4 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D] disabled:opacity-50">
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { api, auth } from '@/lib/api';
import { downloadCsv } from '@/lib/csv';
import ConfirmDialog from '@/components/confirm-dialog';

interface Staff { id: string; full_name: string; role: string; qualification: string | null; subjects: string[] | null; phone: string | null; email: string | null; date_joined: string | null; status: string; has_account: boolean; form_classes: { id: string; name: string }[]; }

const STAFF_ROLES = ['Teacher', 'Principal', 'Vice Principal', 'Head of Department', 'Admin', 'Accountant', 'Nurse', 'Librarian', 'IT Support', 'Security', 'Driver', 'Cleaner'];
const QUALIFICATIONS = ['NCE', 'OND', 'HND', "Bachelor's", "Master's", 'PhD', 'Other'];

const COLORS = [
  { bg: '#E8F0FA', text: '#0D2B55' }, { bg: '#DCFCE7', text: '#1A7A4A' },
  { bg: '#FEF3C7', text: '#D4930A' }, { bg: '#FEE2E2', text: '#B91C1C' },
  { bg: '#F3E8FF', text: '#7C3AED' }, { bg: '#FFE4E6', text: '#9F1234' },
];

function getInitials(name: string) { return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2); }
function getColor(name: string) { const i = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0); return COLORS[i % COLORS.length]; }

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: '', role: 'Teacher', qualification: '', subjects: '', phone: '', email: '', date_joined: '' });

  const [creating, setCreating] = useState<string | null>(null);
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => { loadStaff(); }, []);

  async function loadStaff() {
    setLoading(true);
    const data = await api.staff.list();
    setStaff(data as Staff[]);
    setLoading(false);
  }

  const filtered = staff.filter(s => {
    const q = !search || s.full_name.toLowerCase().includes(search.toLowerCase()) || s.email?.toLowerCase().includes(search.toLowerCase());
    const r = !filterRole || s.role === filterRole;
    return q && r;
  });

  function openAdd() {
    setEditingId(null);
    setForm({ full_name: '', role: 'Teacher', qualification: '', subjects: '', phone: '', email: '', date_joined: '' });
    setShowModal(true);
  }
  function openEdit(s: Staff) {
    setEditingId(s.id);
    setForm({ full_name: s.full_name, role: s.role, qualification: s.qualification || '', subjects: s.subjects?.join(', ') || '', phone: s.phone || '', email: s.email || '', date_joined: s.date_joined || '' });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, date_joined: form.date_joined || null, subjects: form.subjects ? form.subjects.split(',').map(s => s.trim()) : [] };
    if (editingId) {
      await api.staff.update(editingId, payload);
    } else {
      await api.staff.create({ ...payload, status: 'active' });
    }
    setSaving(false);
    setShowModal(false);
    loadStaff();
  }

  async function toggleStatus(s: Staff) {
    const newStatus = s.status === 'active' ? 'inactive' : 'active';
    await api.staff.update(s.id, { status: newStatus } as Partial<Staff>);
    loadStaff();
  }

  async function createAccount(id: string) {
    setCreating(id);
    try {
      const token = auth.getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/staff/${id}/create_account/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token ?? ''}` },
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'Failed'); return; }
      setCreds(data);
      loadStaff();
    } catch { alert('Failed to create account'); }
    finally { setCreating(null); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0D2B55]">Teachers & Staff</h1>
          <p className="text-xs text-[#64748B] mt-0.5">{staff.filter(s => s.status === 'active').length} active · {staff.filter(s => s.status === 'inactive').length} inactive</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => {
            const h = ['full_name', 'role', 'qualification', 'subjects', 'phone', 'email', 'status'];
            const r = filtered.map(s => [s.full_name, s.role, s.qualification || '', s.subjects?.join('; ') || '', s.phone || '', s.email || '', s.status]);
            downloadCsv('staff.csv', h, r);
          }} className="text-sm px-3.5 py-2 rounded-lg border border-[#DDE5F0] text-[#64748B] hover:bg-[#F0F4FA]">⬇ Export CSV</button>
          <button onClick={openAdd} className="text-sm px-3.5 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D]">+ Add Staff</button>
        </div>
      </div>

      <div className="flex items-center gap-2.5 mb-4 bg-white border border-[#DDE5F0] rounded-xl px-3.5 py-2.5 max-w-lg">
        <span className="text-sm">🔍</span>
        <input type="text" placeholder="Search by name, email…" value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 border-none bg-transparent text-sm text-[#0D2B55] outline-none placeholder:text-[#64748B]" />
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          className="text-sm border border-[#DDE5F0] rounded-lg px-2.5 py-1.5 bg-white text-[#64748B] outline-none">
          <option value="">All roles</option>
          {STAFF_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-[#64748B]">Loading staff…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#64748B]">{staff.length === 0 ? 'No staff yet.' : 'No staff match your filters.'}</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[11px] font-bold tracking-wider text-[#64748B] uppercase bg-[#F7F9FC]">
                <th className="text-left px-4 py-3">Staff</th>
                <th className="text-left px-4 py-3">Role</th>
                <th className="text-left px-4 py-3">Assigned Classes</th>
                <th className="text-left px-4 py-3">Subjects</th>
                <th className="text-left px-4 py-3">Contact</th>
                <th className="text-left px-4 py-3">Joined</th>
                <th className="text-left px-4 py-3">Account</th>
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
                        <div><div>{s.full_name}</div>{s.email && <div className="text-[10px] text-[#64748B]">{s.email}</div>}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.role === 'Teacher' ? 'bg-[#E8F0FA] text-[#0D2B55]' : s.role === 'Principal' || s.role === 'Vice Principal' ? 'bg-[#FEF3C7] text-[#D4930A]' : 'bg-[#F7F9FC] text-[#64748B]'}`}>{s.role}</span></td>
                    <td className="px-4 py-3 max-w-[160px]">
                      <div className="flex flex-wrap gap-1">{s.form_classes?.length ? s.form_classes.map((cls, i) => <span key={i} className="text-[10px] bg-[#E8F0FA] text-[#0D2B55] px-1.5 py-0.5 rounded">{cls.name}</span>) : <span className="text-[#64748B]">—</span>}</div>
                    </td>
                    <td className="px-4 py-3 max-w-[160px]">
                      <div className="flex flex-wrap gap-1">{s.subjects?.length ? s.subjects.map((sub, i) => <span key={i} className="text-[10px] bg-[#F0F4FA] text-[#64748B] px-1.5 py-0.5 rounded">{sub}</span>) : <span className="text-[#64748B]">—</span>}</div>
                    </td>
                    <td className="px-4 py-3">{s.phone || '—'}</td>
                    <td className="px-4 py-3 text-[#64748B]">{s.date_joined || '—'}</td>
                    <td className="px-4 py-3">
                      {s.has_account ? (
                        <span className="text-[#1A7A4A] text-[10px] font-bold">✓ Active</span>
                      ) : (
                        <button onClick={() => createAccount(s.id)} disabled={creating === s.id}
                          className="text-[10px] px-2 py-1 rounded bg-[#0D2B55] text-white hover:bg-[#0A1F3D] disabled:opacity-50">
                          {creating === s.id ? 'Creating…' : 'Create Account'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleStatus(s)} className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer ${s.status === 'active' ? 'bg-[#DCFCE7] text-[#1A7A4A]' : 'bg-[#FEE2E2] text-[#B91C1C]'}`}>{s.status}</button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(s)} className="text-xs px-2 py-1 rounded-lg border border-[#DDE5F0] bg-white hover:bg-[#F0F4FA]">✏️</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {creds && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setCreds(null)}>
          <div className="bg-white rounded-2xl w-[400px] max-w-[95vw] p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[#0D2B55] mb-2">Account Created</h3>
            <p className="text-xs text-[#64748B] mb-4">Share these credentials with the staff member.</p>
            <div className="bg-[#F7F9FC] rounded-xl p-4 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-[#64748B] uppercase">Email</label>
                <p className="text-sm font-bold text-[#0D2B55]">{creds.email}</p>
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#64748B] uppercase">Password</label>
                <p className="text-sm font-bold text-[#1A7A4A]">{creds.password}</p>
              </div>
            </div>
            <button onClick={() => { setCreds(null); navigator.clipboard.writeText(`Email: ${creds.email}\nPassword: ${creds.password}`); }}
              className="mt-4 w-full text-sm px-4 py-2.5 rounded-lg bg-[#0D2B55] text-white hover:bg-[#0A1F3D]">Copy & Close</button>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-[520px] max-w-[95vw] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-base font-bold text-[#0D2B55]">{editingId ? 'Edit Staff' : 'Add New Staff'}</h2>
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
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Role</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] bg-white">
                    {STAFF_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Qualification</label>
                  <select value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] bg-white">
                    <option value="">Select</option>
                    {QUALIFICATIONS.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Date joined</label>
                  <input type="date" value={form.date_joined} onChange={e => setForm({ ...form, date_joined: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Subjects (comma-separated)</label>
                <input value={form.subjects} onChange={e => setForm({ ...form, subjects: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Phone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="text-sm px-4 py-2 rounded-lg border border-[#DDE5F0] bg-white hover:bg-[#F0F4FA]">Cancel</button>
                <button type="submit" disabled={saving} className="text-sm px-4 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D] disabled:opacity-50">
                  {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

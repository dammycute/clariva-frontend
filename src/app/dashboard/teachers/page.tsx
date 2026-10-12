'use client';

import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { api, auth, ApiError } from '@/lib/api';
import { downloadCsv } from '@/lib/csv';
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { Search, Download, Upload, Pencil, X, Check } from 'lucide-react';

interface Staff { id: string; full_name: string; role: string; qualification: string | null; subjects: string[] | null; phone: string | null; email: string | null; date_joined: string | null; status: string; has_account: boolean; form_classes: { id: string; name: string }[]; }

const STAFF_ROLES = ['Teacher', 'Principal', 'Vice Principal', 'Head of Department', 'Admin', 'Accountant', 'Bursar', 'Nurse', 'Librarian', 'IT Support', 'Security', 'Driver', 'Cleaner'];
const QUALIFICATIONS = ['NCE', 'OND', 'HND', "Bachelor's", "Master's", 'PhD', 'Other'];

const FIELD_TO_FORM: Record<string, string> = {
  first_name: 'first_name',
  last_name: 'last_name',
  user_email: 'email',
  user_phone: 'phone',
  staff_role: 'role',
  qualification: 'qualification',
  date_joined: 'date_joined',
  subjects: 'subjects',
};

function FieldError({ id, msg }: { id: string; msg?: string }) {
  if (!msg) return null;
  return <p id={id} role="alert" className="text-xs text-danger mt-1">{msg}</p>;
}

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
  const [form, setForm] = useState({ first_name: '', last_name: '', role: 'Teacher', qualification: '', subjects: '', phone: '', email: '', date_joined: '' });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [creating, setCreating] = useState<string | null>(null);
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

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
    setForm({ first_name: '', last_name: '', role: 'Teacher', qualification: '', subjects: '', phone: '', email: '', date_joined: '' });
    setFieldErrors({});
    setShowModal(true);
  }
  function openEdit(s: Staff) {
    setEditingId(s.id);
    const nameParts = (s.full_name || '').split(' ');
    setForm({ first_name: nameParts[0] || '', last_name: nameParts.slice(1).join(' ') || '', role: s.role, qualification: s.qualification || '', subjects: s.subjects?.join(', ') || '', phone: s.phone || '', email: s.email || '', date_joined: s.date_joined || '' });
    setFieldErrors({});
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});
    try {
      const payload: Record<string, unknown> = {
        first_name: form.first_name,
        last_name: form.last_name,
        user_email: form.email,
        user_phone: form.phone || '',
        staff_role: form.role,
        subjects: form.subjects,
        qualification: form.qualification || undefined,
        date_joined: form.date_joined || undefined,
      };
      if (editingId) {
        await api.staff.update(editingId, payload);
      } else {
        await api.staff.create(payload);
      }
      setShowModal(false);
      loadStaff();
    } catch (err) {
      if (err instanceof ApiError) {
        const mapped: Record<string, string> = {};
        let general = '';
        for (const [key, msgs] of Object.entries(err.fields)) {
          const formKey = FIELD_TO_FORM[key];
          if (formKey) mapped[formKey] = msgs.join(' ');
          else general = general || msgs.join(' ');
        }
        if (general) mapped._form = general;
        setFieldErrors(mapped);
      }
    } finally { setSaving(false); }
  }

  async function resetPassword(s: Staff) {
    setCreating(s.id);
    try {
      const token = auth.getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/staff/${s.id}/create_account/`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token ?? ''}` },
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Failed'); return; }
      setCreds(data);
    } catch { toast.error('Failed to reset password'); }
    finally { setCreating(null); }
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
      if (!res.ok) { toast.error(data.error || 'Failed to create account'); return; }
      setCreds(data);
      loadStaff();
    } catch { toast.error('Failed to create account'); }
    finally { setCreating(null); }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const token = auth.getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/staff/import_csv/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token ?? ''}` },
        body: JSON.stringify({ csv: text }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Import failed'); return; }
      setImportResult(data);
      loadStaff();
    } catch { toast.error('Failed to import CSV'); }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  function downloadSample() {
    const headers = ['first_name', 'last_name', 'email', 'role', 'qualification', 'subjects', 'phone', 'date_joined'];
    const sample = [
      'John,Doe,john@example.com,Teacher,Bachelor\'s,Mathematics; English,08012345678,2025-01-15',
      'Jane,Smith,jane@example.com,Principal,Master\'s,Physics; Chemistry,08098765432,2024-09-01',
    ];
    downloadCsv('staff_sample.csv', headers, sample.map(r => r.split(',')));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Teachers & Staff</h1>
          <p className="text-xs text-muted mt-0.5">{staff.filter(s => s.status === 'active').length} active · {staff.filter(s => s.status === 'inactive').length} inactive</p>
        </div>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} className="hidden" />
          <button onClick={downloadSample}
            className="text-sm px-3 py-2 rounded border border-line text-muted hover:bg-surface-2 inline-flex items-center gap-1.5"><Download size={16} aria-hidden="true" /> Sample CSV</button>
          <button onClick={() => fileRef.current?.click()} disabled={importing}
            className="text-sm px-3.5 py-2 rounded border border-line text-muted hover:bg-surface-2 disabled:opacity-50 inline-flex items-center gap-1.5">
            <Upload size={16} aria-hidden="true" /> {importing ? 'Importing…' : 'Import CSV'}
          </button>
          <button onClick={() => {
            const h = ['name', 'role', 'qualification', 'subjects', 'phone', 'email', 'status'];
            const r = filtered.map(s => [s.full_name, s.role, s.qualification || '', s.subjects?.join('; ') || '', s.phone || '', s.email || '', s.status]);
            downloadCsv('staff.csv', h, r);
          }} className="text-sm px-3.5 py-2 rounded border border-line text-muted hover:bg-surface-2 inline-flex items-center gap-1.5"><Download size={16} aria-hidden="true" /> Export CSV</button>
          <button onClick={openAdd} className="text-sm px-3.5 py-2 rounded bg-brand text-brand-ink hover:opacity-90">+ Add Staff</button>
        </div>
      </div>

      <div className="flex items-center gap-2.5 mb-4 bg-surface border border-line rounded px-3.5 py-2.5 max-w-lg">
        <span className="text-sm" aria-hidden="true"><Search size={16} /></span>
        <input type="text" placeholder="Search by name, email…" value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 border-none bg-transparent text-sm text-ink outline-none placeholder:text-muted" />
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)}
          className="text-sm border border-line rounded px-2.5 py-1.5 bg-surface text-muted outline-none">
          <option value="">All roles</option>
          {STAFF_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div className="bg-surface border border-line rounded">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted">Loading staff…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">{staff.length === 0 ? 'No staff yet.' : 'No staff match your filters.'}</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="text-xs font-semibold text-muted bg-page">
                <TableHead className="text-left px-4 py-3">Staff</TableHead>
                <TableHead className="text-left px-4 py-3">Role</TableHead>
                <TableHead className="text-left px-4 py-3">Assigned Classes</TableHead>
                <TableHead className="text-left px-4 py-3">Subjects</TableHead>
                <TableHead className="text-left px-4 py-3">Contact</TableHead>
                <TableHead className="text-left px-4 py-3">Joined</TableHead>
                <TableHead className="text-left px-4 py-3">Account</TableHead>
                <TableHead className="text-left px-4 py-3">Status</TableHead>
                <TableHead className="text-right px-4 py-3">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(s => {
                const c = getColor(s.full_name);
                return (
                  <TableRow key={s.id} className="hover:bg-page border-t border-line">
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0" style={{ background: c.bg, color: c.text }}>{getInitials(s.full_name)}</div>
                        <div><div>{s.full_name}</div>{s.email && <div className="text-xs text-muted">{s.email}</div>}</div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${s.role === 'Teacher' ? 'bg-brand-soft text-ink' : s.role === 'Principal' || s.role === 'Vice Principal' ? 'bg-warning/10 text-warning' : 'bg-page text-muted'}`}>{s.role}</span></TableCell>
                    <TableCell className="px-4 py-3 max-w-[160px]">
                      <div className="flex flex-wrap gap-1">{s.form_classes?.length ? s.form_classes.map((cls, i) => <span key={i} className="text-xs bg-brand-soft text-ink px-1.5 py-0.5 rounded">{cls.name}</span>) : <span className="text-muted">-</span>}</div>
                    </TableCell>
                    <TableCell className="px-4 py-3 max-w-[160px]">
                      <div className="flex flex-wrap gap-1">{s.subjects?.length ? s.subjects.map((sub, i) => <span key={i} className="text-xs bg-surface-2 text-muted px-1.5 py-0.5 rounded">{sub}</span>) : <span className="text-muted">-</span>}</div>
                    </TableCell>
                    <TableCell className="px-4 py-3">{s.phone || '-'}</TableCell>
                    <TableCell className="px-4 py-3 text-muted">{s.date_joined || '-'}</TableCell>
                    <TableCell className="px-4 py-3">
                      {s.has_account ? (
                        <div className="flex items-center gap-1">
                          <span className="text-brand text-xs font-semibold inline-flex items-center gap-0.5"><Check size={16} aria-hidden="true" /> Active</span>
                          <button onClick={() => resetPassword(s)} disabled={creating === s.id}
                            className="text-xs px-1.5 py-0.5 rounded border border-line text-muted hover:bg-surface-2 disabled:opacity-50">
                            {creating === s.id ? '…' : 'Reset'}
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => createAccount(s.id)} disabled={creating === s.id}
                          className="text-xs px-2 py-1 rounded bg-brand text-brand-ink hover:bg-brand disabled:opacity-50">
                          {creating === s.id ? 'Creating…' : 'Create Account'}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3">
                      <button onClick={() => toggleStatus(s)} className={`px-2.5 py-0.5 rounded text-xs font-semibold cursor-pointer ${s.status === 'active' ? 'bg-success/10 text-success' : 'bg-danger-soft text-danger'}`}>{s.status}</button>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right">
                      <button onClick={() => openEdit(s)} aria-label="Edit" className="text-xs px-2 py-1 rounded border border-line bg-surface hover:bg-surface-2"><Pencil size={16} aria-hidden="true" /></button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {creds && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setCreds(null)}>
          <div className="bg-surface rounded w-[400px] max-w-[95vw] p-5" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-ink mb-2">Account Created</h3>
            <p className="text-xs text-muted mb-4">Share these credentials with the staff member.</p>
            <div className="bg-page rounded p-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted">Email</label>
                <p className="text-sm font-semibold text-ink">{creds.email}</p>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted">Password</label>
                <p className="text-sm font-semibold text-brand">{creds.password}</p>
              </div>
            </div>
            <button onClick={() => { setCreds(null); navigator.clipboard.writeText(`Email: ${creds.email}\nPassword: ${creds.password}`); }}
              className="mt-4 w-full text-sm px-4 py-2.5 rounded bg-brand text-brand-ink hover:bg-brand">Copy & Close</button>
          </div>
        </div>
      )}

      {importResult && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setImportResult(null)}>
          <div className="bg-surface rounded w-[460px] max-w-[95vw]" onClick={e => e.stopPropagation()}>
            <div className="p-5">
              <h3 className="text-base font-semibold text-ink mb-2">Import Complete</h3>
              <p className="text-sm text-brand font-semibold mb-4">{importResult.created} staff created</p>
              {importResult.errors.length > 0 && (
                <div className="max-h-48 overflow-y-auto border border-danger-soft rounded divide-y divide-danger-soft">
                  {importResult.errors.map((err, i) => (
                    <div key={i} className="p-2.5 text-xs text-danger">{err}</div>
                  ))}
                </div>
              )}
              <button onClick={() => setImportResult(null)} className="mt-4 w-full text-sm px-4 py-2.5 rounded bg-brand text-brand-ink hover:bg-brand">Done</button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowModal(false)}>
          <div className="bg-surface rounded w-[520px] max-w-[95vw] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-base font-semibold text-ink">{editingId ? 'Edit Staff' : 'Add New Staff'}</h2>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-ink text-lg" aria-label="Close"><X size={16} aria-hidden="true" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
              {fieldErrors._form && (
                <p role="alert" className="text-xs text-danger bg-danger-soft border border-[#FECACA] rounded px-3 py-2">
                  {fieldErrors._form}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">First name</label>
                  <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required
                    aria-invalid={fieldErrors.first_name ? true : undefined}
                    aria-describedby={fieldErrors.first_name ? 'err-first_name' : undefined}
                    className="w-full px-3 py-2 rounded border border-line text-sm outline-none focus:border-brand" />
                  <FieldError id="err-first_name" msg={fieldErrors.first_name} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Last name</label>
                  <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} required
                    aria-invalid={fieldErrors.last_name ? true : undefined}
                    aria-describedby={fieldErrors.last_name ? 'err-last_name' : undefined}
                    className="w-full px-3 py-2 rounded border border-line text-sm outline-none focus:border-brand" />
                  <FieldError id="err-last_name" msg={fieldErrors.last_name} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Role</label>
                  <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                    aria-invalid={fieldErrors.role ? true : undefined}
                    aria-describedby={fieldErrors.role ? 'err-role' : undefined}
                    className="w-full px-3 py-2 rounded border border-line text-sm outline-none focus:border-brand bg-surface">
                    {STAFF_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <FieldError id="err-role" msg={fieldErrors.role} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Qualification</label>
                  <select value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })}
                    aria-invalid={fieldErrors.qualification ? true : undefined}
                    aria-describedby={fieldErrors.qualification ? 'err-qualification' : undefined}
                    className="w-full px-3 py-2 rounded border border-line text-sm outline-none focus:border-brand bg-surface">
                    <option value="">Select</option>
                    {QUALIFICATIONS.map(q => <option key={q} value={q}>{q}</option>)}
                  </select>
                  <FieldError id="err-qualification" msg={fieldErrors.qualification} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Date joined</label>
                  <input type="date" value={form.date_joined} onChange={e => setForm({ ...form, date_joined: e.target.value })}
                    aria-invalid={fieldErrors.date_joined ? true : undefined}
                    aria-describedby={fieldErrors.date_joined ? 'err-date_joined' : undefined}
                    className="w-full px-3 py-2 rounded border border-line text-sm outline-none focus:border-brand" />
                  <FieldError id="err-date_joined" msg={fieldErrors.date_joined} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Subjects (comma-separated)</label>
                <input value={form.subjects} onChange={e => setForm({ ...form, subjects: e.target.value })}
                  aria-invalid={fieldErrors.subjects ? true : undefined}
                  aria-describedby={fieldErrors.subjects ? 'err-subjects' : undefined}
                  className="w-full px-3 py-2 rounded border border-line text-sm outline-none focus:border-brand" />
                <FieldError id="err-subjects" msg={fieldErrors.subjects} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Phone</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    aria-invalid={fieldErrors.phone ? true : undefined}
                    aria-describedby={fieldErrors.phone ? 'err-phone' : undefined}
                    className="w-full px-3 py-2 rounded border border-line text-sm outline-none focus:border-brand" />
                  <FieldError id="err-phone" msg={fieldErrors.phone} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required
                    aria-invalid={fieldErrors.email ? true : undefined}
                    aria-describedby={fieldErrors.email ? 'err-email' : undefined}
                    className="w-full px-3 py-2 rounded border border-line text-sm outline-none focus:border-brand" />
                  <FieldError id="err-email" msg={fieldErrors.email} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="text-sm px-4 py-2 rounded border border-line bg-surface hover:bg-surface-2">Cancel</button>
                <button type="submit" disabled={saving} className="text-sm px-4 py-2 rounded bg-brand text-brand-ink hover:opacity-90 disabled:opacity-50">
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

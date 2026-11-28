'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api, request } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Check, KeyRound, Plus, Printer, Upload, X } from 'lucide-react';
import type { JSX } from 'react';

interface ClassRow {
  id: string; name: string; year_group: string | null; arm: string | null; academic_year: string | null;
}

interface StudentRow {
  id: string; first_name: string; last_name: string; admission_no: string | null;
  student_status: string | null; has_account: boolean; email: string | null;
  guardian_name: string | null; guardian_phone: string | null; gender: string | null;
}

/** A login that was just made: the only time the password can be shown. */
interface Issued { name: string; admission_no: string; password: string; parent_password?: string }

const statusTone: Record<string, string> = {
  active: 'bg-success/10 text-success',
  inactive: 'bg-surface-2 text-muted',
  graduated: 'bg-surface-2 text-muted',
  suspended: 'bg-warning/10 text-warning',
  withdrawn: 'bg-danger-soft text-danger',
  transferred: 'bg-danger-soft text-danger',
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export default function TeacherStudentsPage(): JSX.Element {
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [passwords, setPasswords] = useState<Record<string, string>>({});
  const [issued, setIssued] = useState<Issued[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'' | 'class' | 'one'>('');
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    first_name: '', last_name: '', gender: '',
    guardian_name: '', guardian_phone: '', guardian_email: '',
  });
  const [showImport, setShowImport] = useState(false);
  const [importCsv, setImportCsv] = useState('');
  const [importFileName, setImportFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    created: number; errors: string[];
    students?: { name: string; admission_no: string; password?: string; parent_password?: string }[];
  } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const rows = (await api.classes.list({ teacher_id: 'me' })) as ClassRow[];
        setClasses(rows);
        setSelected(rows[0]?.id ?? '');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Could not load your classes.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadStudents = useCallback(async (classId: string) => {
    if (!classId) { setStudents([]); return; }
    setBusy('class');
    try {
      const rows = (await api.students.list({ class_id: classId })) as StudentRow[];
      setStudents(rows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not load the students.');
    } finally {
      setBusy('');
    }
  }, []);

  useEffect(() => { void loadStudents(selected); }, [selected, loadStudents]);

  const currentClass = classes.find(c => c.id === selected);

  async function createLogins() {
    if (!selected) return;
    setBusy('one');
    try {
      const data = await request<{ created: Issued[] }>(
        'POST', '/students/bulk_create_accounts/', { class_id: selected });
      if (data.created.length === 0) {
        toast('Every student and parent in this class already has a login.');
        return;
      }
      // Keep each password against the student so the table can show it.
      const byAdmission: Record<string, string> = {};
      for (const row of data.created) if (row.password) byAdmission[row.admission_no] = row.password;
      setPasswords(prev => {
        const next = { ...prev };
        for (const s of students) {
          if (s.admission_no && byAdmission[s.admission_no]) next[s.id] = byAdmission[s.admission_no];
        }
        return next;
      });
      setIssued(data.created);
      toast.success(`Logins created for ${data.created.length} student${data.created.length === 1 ? '' : 's'} or their parents`);
      await loadStudents(selected);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create the logins.');
    } finally {
      setBusy('');
    }
  }

  async function resetOne(student: StudentRow) {
    setBusy('one');
    try {
      const data = await request<{ admission_no: string; password: string }>(
        'POST', `/students/${student.id}/reset_password/`);
      setPasswords(prev => ({ ...prev, [student.id]: data.password }));
      setIssued([{ name: `${student.first_name} ${student.last_name}`, admission_no: data.admission_no, password: data.password }]);
      toast.success(`New password for ${student.first_name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reset the password.');
    } finally {
      setBusy('');
    }
  }

  async function resetParent(student: StudentRow) {
    setBusy('one');
    try {
      const data = await request<{ admission_no: string; parent_password: string }>(
        'POST', `/students/${student.id}/reset_parent_password/`);
      setIssued([{ name: `${student.first_name} ${student.last_name}`, password: '', ...data }]);
      toast.success(`New parent password for ${student.first_name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not reset the parent password.');
    } finally {
      setBusy('');
    }
  }

  async function addStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    let student: { id: string };
    try {
      student = await request<{ id: string }>('POST', '/students/', {
        first_name: form.first_name,
        last_name: form.last_name,
        gender: form.gender || undefined,
        guardian_name: form.guardian_name || undefined,
        guardian_phone: form.guardian_phone || undefined,
        guardian_email: form.guardian_email || undefined,
        class_group: selected,
      });
    } catch {
      // The reason is already shown. Keep the form so nothing typed is lost.
      setSaving(false);
      return;
    }
    const name = `${form.first_name} ${form.last_name}`.trim();
    setShowAdd(false);
    setForm({ first_name: '', last_name: '', gender: '', guardian_name: '', guardian_phone: '', guardian_email: '' });
    try {
      // Give the new student a login at once, so the teacher can hand it out now.
      const login = await request<{ admission_no: string; password: string; parent_password: string }>(
        'POST', `/students/${student.id}/create_account/`);
      setPasswords(prev => ({ ...prev, [student.id]: login.password }));
      setIssued([{ name, ...login }]);
      toast.success(`${name} added with a login`);
    } catch {
      toast.success(`${name} added. Use Create logins to make their password.`);
    }
    setSaving(false);
    await loadStudents(selected);
  }

  async function runImport() {
    if (!importCsv.trim() || !selected) return;
    setImporting(true);
    try {
      const data = await request<{
        created: number; errors: string[];
        students?: { name: string; admission_no: string; password?: string; parent_password?: string }[];
      }>('POST', '/students/import_csv/', { csv: importCsv, class_id: selected });
      setImportResult(data);
      const rows = (data.students ?? []).filter(s => s.password) as Issued[];
      if (rows.length > 0) setIssued(rows);
      await loadStudents(selected);
    } catch {
      // The reason is already shown.
    } finally {
      setImporting(false);
    }
  }

  function printSlips(rows: Issued[], title: string) {
    if (rows.length === 0) { toast.error('Create the logins first.'); return; }
    const win = window.open('', '_blank', 'width=720,height=900');
    if (!win) { toast.error('Allow pop-ups to print the slips.'); return; }
    const sheet = (who: 'Student' | 'Parent', note: string, pick: (r: Issued) => string | undefined) => {
      const body = rows.filter(pick)
        .map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.admission_no)}</td><td><b>${esc(pick(r) ?? '')}</b></td></tr>`)
        .join('');
      return body && `<section><h1>${esc(title)} &mdash; ${who.toLowerCase()} logins</h1><p>${note}</p>
<table><thead><tr><th>Student</th><th>Admission number</th><th>${who} password</th></tr></thead><tbody>${body}</tbody></table></section>`;
    };
    const sheets = sheet('Student', 'Sign in at the school portal on the Student tab with the admission number and password below.', r => r.password)
      + sheet('Parent', 'For parents only. Sign in on the Parent tab with the child&#39;s admission number and the password below.', r => r.parent_password);
    win.document.write(`<!doctype html><title>${esc(title)} logins</title>
<style>
  body{font:13px/1.6 system-ui,sans-serif;padding:28px;color:#111}
  h1{font-size:18px;margin:0 0 4px}
  p{color:#555;margin:0 0 18px}
  table{width:100%;border-collapse:collapse}
  th,td{text-align:left;padding:7px 6px;border-bottom:1px solid #e3e3e3}
  th{font-size:12px;color:#666;text-transform:uppercase;letter-spacing:.04em}
  section+section{break-before:page;margin-top:32px}
</style>
${sheets}`);
    win.document.close();
    win.focus();
    win.print();
  }

  if (loading) return <div className="text-sm text-muted p-8">Loading your classes…</div>;

  if (classes.length === 0) {
    return (
      <div>
        <h1 className="text-xl font-semibold text-ink mb-1">My students</h1>
        <div className="bg-surface border border-line rounded p-8 text-center text-sm text-muted mt-4">
          No class is assigned to you yet. Ask the school admin to set you as the form teacher.
        </div>
      </div>
    );
  }

  const active = students.filter(s => s.student_status === 'active').length;
  const withoutLogin = students.filter(s => !s.has_account && !passwords[s.id]).length;

  return (
    <div>
      <header className="mb-5">
        <h1 className="text-xl font-semibold text-ink mb-1">My students</h1>
        <p className="text-xs text-muted">
          Students sign in at the portal with their <strong className="text-ink">admission number</strong> and the
          password you give them.
        </p>
      </header>

      {classes.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {classes.map(c => (
            <button
              key={c.id}
              onClick={() => setSelected(c.id)}
              aria-pressed={c.id === selected}
              className={`text-sm px-3 py-1.5 rounded border ${
                c.id === selected
                  ? 'bg-brand text-brand-ink border-brand'
                  : 'bg-surface border-line text-muted hover:bg-surface-2'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-xs text-muted">
          {currentClass?.name} · {students.length} student{students.length === 1 ? '' : 's'} · {active} active
          {withoutLogin > 0 && <> · <span className="text-warning">{withoutLogin} without a login</span></>}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setShowAdd(true)} disabled={!selected}>
            <Plus size={15} /> Add student
          </Button>
          <Button
            variant="secondary"
            onClick={() => { setImportCsv(''); setImportFileName(''); setImportResult(null); setShowImport(true); }}
            disabled={!selected}
          >
            <Upload size={15} /> Import CSV
          </Button>
          <Button variant="secondary" onClick={() => printSlips(issued, currentClass?.name ?? 'Class')} disabled={issued.length === 0}>
            <Printer size={15} /> Print slips
          </Button>
          <Button onClick={createLogins} disabled={busy !== '' || students.length === 0}>
            <KeyRound size={15} /> {busy === 'one' ? 'Working…' : 'Create logins'}
          </Button>
        </div>
      </div>

      {issued.length > 0 && (
        <div className="bg-warning/5 border border-warning/30 rounded p-4 mb-4">
          <p className="text-sm font-semibold text-ink mb-1">
            Login details to hand out
          </p>
          <p className="text-xs text-muted mb-3">
            Passwords are shown only once. Copy or print them now. Give the parent password to the parent, not the student.
          </p>
          <div className="divide-y divide-line border border-line rounded bg-surface max-h-56 overflow-y-auto">
            {issued.map(r => (
              <div key={`${r.admission_no}-${r.password}`} className="px-3 py-2 text-xs flex items-center justify-between gap-3">
                <span className="font-semibold text-ink truncate">{r.name}</span>
                <span className="text-muted whitespace-nowrap">{r.admission_no}</span>
                <span className="text-right font-semibold">
                  {r.password && <span className="block text-brand">Student: {r.password}</span>}
                  {r.parent_password && <span className="block text-ink">Parent: {r.parent_password}</span>}
                </span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => {
                const text = ['Student\tAdmission number\tStudent password\tParent password',
                  ...issued.map(r => `${r.name}\t${r.admission_no}\t${r.password}\t${r.parent_password ?? ''}`)].join('\n');
                navigator.clipboard.writeText(text);
                toast.success('Copied');
              }}
              className="text-xs px-2.5 py-1.5 rounded border border-line bg-surface hover:bg-surface-2"
            >
              Copy all
            </button>
            <button
              onClick={() => setIssued([])}
              className="text-xs px-2.5 py-1.5 rounded border border-line bg-surface hover:bg-surface-2"
            >
              Hide
            </button>
          </div>
        </div>
      )}

      <div className="bg-surface border border-line rounded overflow-x-auto">
        {busy === 'class' ? (
          <div className="p-8 text-center text-sm text-muted">Loading students…</div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">No students in this class yet.</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted bg-page">
                <th className="px-4 py-2.5 font-semibold">Student</th>
                <th className="px-4 py-2.5 font-semibold">Admission number</th>
                <th className="px-4 py-2.5 font-semibold">Login</th>
                <th className="px-4 py-2.5 font-semibold">Guardian</th>
                <th className="px-4 py-2.5 font-semibold">Phone</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold text-right">Password</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {students.map(s => (
                <tr key={s.id} className="hover:bg-page">
                  <td className="px-4 py-2.5">
                    <span className="font-semibold text-ink">{s.first_name} {s.last_name}</span>
                    {s.gender && <span className="text-muted"> · {s.gender}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-muted tabular-nums whitespace-nowrap">{s.admission_no || '—'}</td>
                  <td className="px-4 py-2.5">
                    {passwords[s.id] ? (
                      <span className="text-brand font-semibold">{passwords[s.id]}</span>
                    ) : s.has_account ? (
                      <span className="text-success">Has a login</span>
                    ) : (
                      <span className="text-warning">No login yet</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-muted truncate max-w-[160px]" title={s.guardian_name || ''}>
                    {s.guardian_name || '—'}
                  </td>
                  <td className="px-4 py-2.5 text-muted whitespace-nowrap">{s.guardian_phone || '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-1.5 py-0.5 rounded ${statusTone[s.student_status || ''] || 'bg-surface-2 text-muted'}`}>
                      {s.student_status || '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => resetOne(s)}
                      disabled={busy !== ''}
                      className="text-xs px-2 py-1 rounded border border-line bg-surface hover:bg-surface-2 disabled:opacity-50"
                    >
                      New password
                    </button>
                    <button
                      onClick={() => resetParent(s)}
                      disabled={busy !== ''}
                      className="ml-1 text-xs px-2 py-1 rounded border border-line bg-surface hover:bg-surface-2 disabled:opacity-50"
                    >
                      Parent password
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-surface rounded w-[520px] max-w-[95vw] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-base font-semibold text-ink">Add a student to {currentClass?.name}</h2>
              <button onClick={() => setShowAdd(false)} className="text-muted hover:text-ink" aria-label="Close"><X size={16} /></button>
            </div>
            <form onSubmit={addStudent} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">First name</label>
                  <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required
                    className="w-full px-3 py-2 rounded border border-line text-sm outline-none focus:border-brand" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Last name</label>
                  <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} required
                    className="w-full px-3 py-2 rounded border border-line text-sm outline-none focus:border-brand" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted mb-1">Gender</label>
                <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-line text-sm outline-none focus:border-brand bg-surface">
                  <option value="">Select</option><option>Female</option><option>Male</option>
                </select>
              </div>
              <div className="border-t border-line pt-3.5 space-y-3">
                <p className="text-xs font-semibold text-muted">Guardian</p>
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Name" value={form.guardian_name} onChange={e => setForm({ ...form, guardian_name: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-line text-sm outline-none focus:border-brand" />
                  <input placeholder="Phone" value={form.guardian_phone} onChange={e => setForm({ ...form, guardian_phone: e.target.value })}
                    className="w-full px-3 py-2 rounded border border-line text-sm outline-none focus:border-brand" />
                </div>
                <input type="email" placeholder="Guardian email (optional)" value={form.guardian_email} onChange={e => setForm({ ...form, guardian_email: e.target.value })}
                  className="w-full px-3 py-2 rounded border border-line text-sm outline-none focus:border-brand" />
              </div>
              <p className="text-xs text-muted">
                The admission number and password are made for you, and shown as soon as the student is saved.
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowAdd(false)} className="text-sm px-4 py-2 rounded border border-line bg-surface hover:bg-surface-2">Cancel</button>
                <button type="submit" disabled={saving} className="text-sm px-4 py-2 rounded bg-brand text-brand-ink hover:opacity-90 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Add student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showImport && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowImport(false)}>
          <div className="bg-surface rounded w-[560px] max-w-[95vw] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-base font-semibold text-ink">Import students into {currentClass?.name}</h2>
              <button onClick={() => setShowImport(false)} className="text-muted hover:text-ink" aria-label="Close"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3.5">
              {importResult ? (
                <div>
                  <p className="text-sm font-semibold text-brand inline-flex items-center gap-1">
                    <Check size={16} /> {importResult.created} student{importResult.created === 1 ? '' : 's'} imported, each with a login.
                  </p>
                  {importResult.students && importResult.students.length > 0 && (
                    <div className="mt-3 border border-line rounded divide-y divide-line max-h-[220px] overflow-y-auto">
                      <p className="px-3 py-2 text-xs text-muted bg-page">Passwords are shown once. Copy or print them now.</p>
                      {importResult.students.map((s, i) => (
                        <div key={i} className="px-3 py-2 text-xs">
                          <p className="font-semibold text-ink">{s.name} · {s.admission_no}</p>
                          {s.password && <p className="text-brand font-semibold">Student password: {s.password}</p>}
                          {s.parent_password && <p className="text-ink font-semibold">Parent password: {s.parent_password}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                  {importResult.errors.length > 0 && (
                    <div className="mt-2 bg-danger-soft rounded p-3 max-h-[200px] overflow-y-auto">
                      {importResult.errors.map((e, i) => <p key={i} className="text-xs text-danger">{e}</p>)}
                    </div>
                  )}
                  <button
                    onClick={() => { setShowImport(false); setImportResult(null); setImportCsv(''); setImportFileName(''); }}
                    className="mt-4 w-full text-sm px-4 py-2.5 rounded bg-brand text-brand-ink hover:opacity-90"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label htmlFor="teacher-import-file" className="block text-xs font-semibold text-muted mb-1">CSV file</label>
                    <input id="teacher-import-file" type="file" accept=".csv,text/csv"
                      onChange={async e => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setImportFileName(f.name);
                        setImportCsv(await f.text());
                      }}
                      className="block w-full text-sm text-ink file:mr-3 file:px-3 file:py-2 file:rounded file:border file:border-line file:bg-surface-2 file:text-sm file:cursor-pointer" />
                    {importFileName && <p className="text-xs text-muted mt-1">{importFileName}: {Math.max(importCsv.trim().split('\n').length - 1, 0)} rows</p>}
                    <p className="text-xs text-muted mt-2">
                      Columns: <strong>full_name</strong> (or first_name and last_name), gender, guardian_name,
                      guardian_phone, guardian_email. Every student joins <strong>{currentClass?.name}</strong> with a
                      login made for them.
                    </p>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => setShowImport(false)} className="text-sm px-4 py-2 rounded border border-line bg-surface hover:bg-surface-2">Cancel</button>
                    <button onClick={runImport} disabled={!importCsv.trim() || importing}
                      className="text-sm px-4 py-2 rounded bg-brand text-brand-ink hover:opacity-90 disabled:opacity-50">
                      {importing ? 'Importing…' : 'Import students'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

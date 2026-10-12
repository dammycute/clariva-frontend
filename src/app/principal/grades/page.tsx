'use client';
import { useState, useEffect } from 'react';
import { api, auth } from '@/lib/api';
import { Check, X } from 'lucide-react';

interface Grade { id: string; student: string; student_name: string; subject: string; subject_name: string; scores: Record<string, number>; total: number | null; grade: string | null; results_status: string; }
interface Subject { id: string; name: string; year_group: string | null; }
interface Cls { id: string; name: string; year_group: string | null; }

const STATUS_TABS = ['pending', 'submitted', 'approved', 'rejected'];

export default function PrincipalGradesPage() {
  const [clsList, setClsList] = useState<Cls[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [term, setTerm] = useState('1st Term');
  const [academicYear, setAcademicYear] = useState('2025/2026');
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [components, setComponents] = useState<{ key: string; label: string; max: number; enabled: boolean }[]>([]);

  useEffect(() => {
    Promise.all([api.classes.list(), api.subjects.list()]).then(([c, s]) => {
      setClsList(c as Cls[]);
      setSubjects(s as Subject[]);
    });
    auth.me().then(me => {
      if (me?.school_id) {
        api.gradingConfig.get(me.school_id).then((gc: unknown) => {
          const cfg = gc as { components?: { key: string; label: string; max: number }[] };
          setComponents((cfg.components || []) as { key: string; label: string; max: number; enabled: boolean }[]);
        }).catch(() => {});
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedClass || !selectedSubject) { setGrades([]); return; }
    setLoading(true);
    api.grades.list({ class_id: selectedClass, subject: selectedSubject }) .then((g: unknown) => setGrades(g as Grade[])) .catch(() => {}) .finally(() => setLoading(false));
  }, [selectedClass, selectedSubject]);

  const filtered = grades.filter(g => statusFilter === 'pending' ? g.results_status === 'draft' : g.results_status === statusFilter);

  async function handleApprove() {
    if (!selectedClass || !selectedSubject) return;
    setMessage('');
    try {
      const token = auth.getToken();
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const res = await fetch(`${base}/grades/approve_class/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token ?? ''}` },
        body: JSON.stringify({ class_id: selectedClass, term, academic_year: academicYear, subject_id: selectedSubject }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMessage(`Approved ${data.approved} grade(s).`);
      const g = await api.grades.list({ class_id: selectedClass, subject: selectedSubject });
      setGrades(g as Grade[]);
    } catch (err: unknown) { setMessage(err instanceof Error ? err.message : 'Approve failed'); }
  }

  async function handleReject() {
    if (!selectedClass || !selectedSubject) return;
    const note = prompt('Rejection note (optional):');
    if (note === null) return;
    setMessage('');
    try {
      const token = auth.getToken();
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const res = await fetch(`${base}/grades/reject_class/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token ?? ''}` },
        body: JSON.stringify({ class_id: selectedClass, term, academic_year: academicYear, subject_id: selectedSubject, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMessage(`Rejected ${data.rejected} grade(s).`);
      const g = await api.grades.list({ class_id: selectedClass, subject: selectedSubject });
      setGrades(g as Grade[]);
    } catch (err: unknown) { setMessage(err instanceof Error ? err.message : 'Reject failed'); }
  }

  const currentCls = clsList.find(c => String(c.id) === selectedClass);
  const ygSubjects = subjects.filter(s => s.year_group === currentCls?.year_group);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div><h1 className="text-xl font-semibold text-ink">Grade Approval</h1><p className="text-xs text-muted mt-0.5">Review and approve teacher-submitted grades</p></div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSubject(''); }} className="text-sm border border-line rounded px-3 py-2 bg-surface outline-none">
          <option value="">Select class</option>
          {clsList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {ygSubjects.length > 0 && <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="text-sm border border-line rounded px-3 py-2 bg-surface outline-none">
          <option value="">Select subject</option>
          {ygSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>}
        <select value={term} onChange={e => setTerm(e.target.value)} className="text-sm border border-line rounded px-3 py-2 bg-surface outline-none">
          <option>1st Term</option><option>2nd Term</option><option>3rd Term</option>
        </select>
        <input value={academicYear} onChange={e => setAcademicYear(e.target.value)} className="text-sm border border-line rounded px-3 py-2 bg-surface outline-none w-[120px]" />
      </div>

      {message && <div className={`px-4 py-2 rounded text-xs mb-3 ${message.includes('Approved') || message.includes('Rejected') ? 'bg-success/10 text-success' : 'bg-danger-soft text-danger'}`}>{message}</div>}

      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-1 bg-surface border border-line rounded p-1">
          {STATUS_TABS.map(st => (
            <button key={st} onClick={() => setStatusFilter(st)} className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${statusFilter === st ? 'bg-brand text-brand-ink' : 'text-muted hover:text-ink'}`}>
              {st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>
        {selectedSubject && statusFilter === 'submitted' && (
          <div className="flex gap-2 ml-auto">
            <button onClick={handleApprove} className="text-sm px-4 py-1.5 rounded bg-brand text-brand-ink hover:opacity-90 inline-flex items-center gap-1.5"><Check size={16} aria-hidden="true" /> Approve All</button>
            <button onClick={handleReject} className="text-sm px-4 py-1.5 rounded bg-danger text-white hover:bg-danger inline-flex items-center gap-1.5"><X size={16} aria-hidden="true" /> Reject All</button>
          </div>
        )}
      </div>

      <div className="bg-surface border border-line rounded overflow-x-auto">
        {loading ? <div className="p-8 text-center text-sm text-muted">Loading…</div>
        : !selectedSubject ? <div className="p-8 text-center text-sm text-muted">Select a class and subject.</div>
        : filtered.length === 0 ? <div className="p-8 text-center text-sm text-muted">No {statusFilter} grades.</div>
        : <table className="w-full text-xs">
            <thead><tr className="text-xs font-semibold text-muted bg-page">
              <th className="text-left px-4 py-3">Student</th>
              {components.map(c => <th key={c.key} className="text-center px-2 py-3">{c.label}</th>)}
              <th className="text-center px-2 py-3">Total</th><th className="text-center px-2 py-3">Grade</th>
              <th className="text-center px-2 py-3">Status</th>
            </tr></thead>
            <tbody>{filtered.map(g => (
              <tr key={g.id} className="hover:bg-page border-t border-line">
                <td className="px-4 py-2 font-semibold">{g.student_name}</td>
                {components.map(c => <td key={c.key} className="px-2 py-2 text-center">{g.scores?.[c.key] ?? '-'}</td>)}
                <td className="px-2 py-2 text-center font-semibold">{g.total ?? '-'}</td>
                <td className="px-2 py-2 text-center"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${g.grade === 'F9' ? 'bg-danger-soft text-danger' : g.grade === 'A1' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{g.grade || '-'}</span></td>
                <td className="px-2 py-2 text-center">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${g.results_status === 'approved' ? 'bg-success/10 text-success' : g.results_status === 'rejected' ? 'bg-danger-soft text-danger' : g.results_status === 'submitted' ? 'bg-warning/10 text-warning' : 'bg-brand-soft text-muted'}`}>{g.results_status}</span>
                </td>
              </tr>
            ))}</tbody>
          </table>}
      </div>
    </div>
  );
}
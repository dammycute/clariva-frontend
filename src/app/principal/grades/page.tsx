'use client';
import { useState, useEffect } from 'react';
import { api, auth } from '@/lib/api';

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
        <div><h1 className="text-xl font-bold text-[#1E1B4B]">Grade Approval</h1><p className="text-xs text-[#64748B] mt-0.5">Review and approve teacher-submitted grades</p></div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSubject(''); }} className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white outline-none">
          <option value="">Select class</option>
          {clsList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {ygSubjects.length > 0 && <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white outline-none">
          <option value="">Select subject</option>
          {ygSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>}
        <select value={term} onChange={e => setTerm(e.target.value)} className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white outline-none">
          <option>1st Term</option><option>2nd Term</option><option>3rd Term</option>
        </select>
        <input value={academicYear} onChange={e => setAcademicYear(e.target.value)} className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white outline-none w-[120px]" />
      </div>

      {message && <div className={`px-4 py-2 rounded-lg text-xs mb-3 ${message.includes('Approved') || message.includes('Rejected') ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#B91C1C]'}`}>{message}</div>}

      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-1 bg-white border border-[#DDE5F0] rounded-lg p-1">
          {STATUS_TABS.map(st => (
            <button key={st} onClick={() => setStatusFilter(st)} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${statusFilter === st ? 'bg-[#4C1D95] text-white' : 'text-[#64748B] hover:text-[#1E1B4B]'}`}>
              {st.charAt(0).toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>
        {selectedSubject && statusFilter === 'submitted' && (
          <div className="flex gap-2 ml-auto">
            <button onClick={handleApprove} className="text-sm px-4 py-1.5 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D]">✓ Approve All</button>
            <button onClick={handleReject} className="text-sm px-4 py-1.5 rounded-lg bg-[#B91C1C] text-white hover:bg-[#991B1B]">✗ Reject All</button>
          </div>
        )}
      </div>

      <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-x-auto">
        {loading ? <div className="p-8 text-center text-sm text-[#64748B]">Loading…</div>
        : !selectedSubject ? <div className="p-8 text-center text-sm text-[#64748B]">Select a class and subject.</div>
        : filtered.length === 0 ? <div className="p-8 text-center text-sm text-[#64748B]">No {statusFilter} grades.</div>
        : <table className="w-full text-xs">
            <thead><tr className="text-[11px] font-bold text-[#64748B] uppercase bg-[#F7F9FC]">
              <th className="text-left px-4 py-3">Student</th>
              {components.map(c => <th key={c.key} className="text-center px-2 py-3">{c.label}</th>)}
              <th className="text-center px-2 py-3">Total</th><th className="text-center px-2 py-3">Grade</th>
              <th className="text-center px-2 py-3">Status</th>
            </tr></thead>
            <tbody>{filtered.map(g => (
              <tr key={g.id} className="hover:bg-[#F8FAFF] border-t border-[#DDE5F0]">
                <td className="px-4 py-2 font-semibold">{g.student_name}</td>
                {components.map(c => <td key={c.key} className="px-2 py-2 text-center">{g.scores?.[c.key] ?? '—'}</td>)}
                <td className="px-2 py-2 text-center font-bold">{g.total ?? '—'}</td>
                <td className="px-2 py-2 text-center"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${g.grade === 'F9' ? 'bg-[#FEE2E2] text-[#B91C1C]' : g.grade === 'A1' ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEF3C7] text-[#D4930A]'}`}>{g.grade || '—'}</span></td>
                <td className="px-2 py-2 text-center">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${g.results_status === 'approved' ? 'bg-[#D1FAE5] text-[#065F46]' : g.results_status === 'rejected' ? 'bg-[#FEE2E2] text-[#B91C1C]' : g.results_status === 'submitted' ? 'bg-[#FEF3C7] text-[#D4930A]' : 'bg-[#E8F0FA] text-[#64748B]'}`}>{g.results_status}</span>
                </td>
              </tr>
            ))}</tbody>
          </table>}
      </div>
    </div>
  );
}
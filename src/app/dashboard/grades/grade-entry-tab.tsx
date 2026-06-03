'use client';

import { useState, useEffect } from 'react';
import { api, auth } from '@/lib/api';

interface Grade { id: string; student: string; student_name: string; subject: string; term: string; academic_year: string; ca1: number | null; ca2: number | null; assignment: number | null; exam: number | null; total: number | null; grade: string | null; }
interface Student { id: string; full_name: string; class_group: string | null; }
interface Subject { id: string; name: string; year_group: string | null; }
interface Cls { id: string; name: string; year_group: string | null; }
interface GradingConfig { max_ca1: number; max_ca2: number; max_assignment: number; max_exam: number; grade_boundaries: { name: string; min_pct: number }[]; }

const YEAR_GROUPS = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];
const TERMS = ['1st Term', '2nd Term', '3rd Term'];

function calcGrade(total: number, maxPossible: number, boundaries: { name: string; min_pct: number }[]): string {
  if (maxPossible === 0 || boundaries.length === 0) return '—';
  const pct = (total / maxPossible) * 100;
  for (const g of [...boundaries].sort((a, b) => b.min_pct - a.min_pct)) {
    if (pct >= g.min_pct) return g.name;
  }
  return boundaries[boundaries.length - 1]?.name || '—';
}

export default function GradeEntryTab({ onRefresh }: { onRefresh: () => void }) {
  const [clsList, setClsList] = useState<Cls[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [existingGrades, setExistingGrades] = useState<Grade[]>([]);
  const [grading, setGrading] = useState<GradingConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [term, setTerm] = useState('1st Term');
  const [academicYear, setAcademicYear] = useState('2025/2026');
  const [scores, setScores] = useState<Record<string, { ca1: string; ca2: string; assignment: string; exam: string }>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function loadAll() {
    setLoading(true);
    const me = await auth.me();
    const [clsRes, stuRes, subRes, gdRes] = await Promise.all([
      api.classes.list(),
      api.students.list({ status: 'active' }),
      api.subjects.list(),
      api.grades.list(),
    ]);
    setClsList(clsRes as Cls[]);
    setStudents(stuRes as Student[]);
    setSubjects(subRes as Subject[]);
    setExistingGrades(gdRes as Grade[]);

    // Fetch grading config
    if (me?.school_id) {
      const gc = await api.gradingConfig.get(me.school_id) as unknown as GradingConfig;
      setGrading(gc);
    }
    setLoading(false);
  }
  useEffect(() => { loadAll(); }, []);

  const cfg = grading || { max_ca1: 30, max_ca2: 30, max_assignment: 40, max_exam: 100, grade_boundaries: [] };
  const maxPossible = cfg.max_ca1 + cfg.max_ca2 + cfg.max_assignment + cfg.max_exam;

  const selectedCls = clsList.find(c => String(c.id) === selectedClass);
  const yg = selectedCls?.year_group || '';
  const classStudents = students.filter(s => String(s.class_group) === selectedClass);
  const ygSubjects = subjects.filter(s => s.year_group === yg);

  useEffect(() => {
    if (!selectedSubject || !term) return;
    const existing = existingGrades.filter(g => g.subject === selectedSubject && g.term === term);
    const map: Record<string, { ca1: string; ca2: string; assignment: string; exam: string }> = {};
    for (const g of existing) {
      map[g.student] = {
        ca1: g.ca1 != null ? String(g.ca1) : '',
        ca2: g.ca2 != null ? String(g.ca2) : '',
        assignment: g.assignment != null ? String(g.assignment) : '',
        exam: g.exam != null ? String(g.exam) : '',
      };
    }
    setScores(map);
  }, [selectedClass, selectedSubject, term, existingGrades]);

  function updateScore(studentId: string, field: keyof typeof scores[string], value: string) {
    setScores(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || { ca1: '', ca2: '', assignment: '', exam: '' }), [field]: value },
    }));
  }

  function getTotal(studentId: string): number {
    const s = scores[studentId];
    if (!s) return 0;
    return (parseFloat(s.ca1) || 0) + (parseFloat(s.ca2) || 0) + (parseFloat(s.assignment) || 0) + (parseFloat(s.exam) || 0);
  }

  function getGrade(studentId: string): string {
    return calcGrade(getTotal(studentId), maxPossible, cfg.grade_boundaries);
  }

  async function handleSave() {
    setMessage('');
    setSaving(true);
    let saved = 0;
    try {
      for (const student of classStudents) {
        const s = scores[student.id];
        if (!s) continue;
        const ca1 = s.ca1 ? parseFloat(s.ca1) : null;
        const ca2 = s.ca2 ? parseFloat(s.ca2) : null;
        const asgn = s.assignment ? parseFloat(s.assignment) : null;
        const exam = s.exam ? parseFloat(s.exam) : null;
        const total = (ca1 || 0) + (ca2 || 0) + (asgn || 0) + (exam || 0);
        if (total === 0 && !ca1 && !ca2 && !asgn && !exam) continue;
        const grade = calcGrade(total, maxPossible, cfg.grade_boundaries);

        const enrollments = await api.studentSubjects.list({ student_id: student.id, subject_id: selectedSubject });
        if (enrollments.length === 0) {
          await api.studentSubjects.create({
            student: student.id,
            subject: selectedSubject,
            academic_year: academicYear,
          } as Record<string, unknown>);
        }

        const existing = existingGrades.find(g => g.student === student.id && g.subject === selectedSubject && g.term === term);
        const payload = { student: student.id, subject: selectedSubject, term, academic_year: academicYear, ca1, ca2, assignment: asgn, exam, total, grade };
        if (existing) {
          await api.grades.update(existing.id, payload as Partial<Grade>);
        } else {
          await api.grades.create(payload as Partial<Grade>);
        }
        saved++;
      }
      setMessage(`Saved ${saved} grade${saved !== 1 ? 's' : ''}.`);
      const gdRes = await api.grades.list();
      setExistingGrades(gdRes as Grade[]);
      onRefresh();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSubject(''); }}
          className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#0D2B55] outline-none">
          <option value="">Select class</option>
          {YEAR_GROUPS.map(yg => (
            <optgroup key={yg} label={yg}>
              {clsList.filter(c => c.year_group === yg).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        {ygSubjects.length > 0 && (
          <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
            className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#0D2B55] outline-none">
            <option value="">Select subject</option>
            {ygSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <select value={term} onChange={e => setTerm(e.target.value)}
          className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#0D2B55] outline-none">
          {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input value={academicYear} onChange={e => setAcademicYear(e.target.value)}
          className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#0D2B55] outline-none w-[130px]" />
        {selectedSubject && (
          <button onClick={handleSave} disabled={saving || classStudents.length === 0}
            className="text-sm px-4 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D] disabled:opacity-50">
            {saving ? 'Saving…' : 'Save Grades'}
          </button>
        )}
      </div>

      {message && (
        <div className={`px-4 py-2 rounded-lg text-xs mb-3 ${message.includes('Saved') ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#B91C1C]'}`}>
          {message}
        </div>
      )}

      {grading && (
        <div className="flex flex-wrap gap-3 mb-3 text-[10px] text-[#64748B]">
          <span>CA1: <strong className="text-[#0D2B55]">/{cfg.max_ca1}</strong></span>
          <span>CA2: <strong className="text-[#0D2B55]">/{cfg.max_ca2}</strong></span>
          <span>Assignment: <strong className="text-[#0D2B55]">/{cfg.max_assignment}</strong></span>
          <span>Exam: <strong className="text-[#0D2B55]">/{cfg.max_exam}</strong></span>
          <span>Total: <strong className="text-[#0D2B55]">/{maxPossible}</strong></span>
        </div>
      )}

      <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-sm text-[#64748B]">Loading…</div>
        : !selectedClass ? (
          <div className="p-8 text-center text-sm text-[#64748B]">Select a class and subject to enter grades.</div>
        ) : !selectedSubject ? (
          <div className="p-8 text-center text-sm text-[#64748B]">{ygSubjects.length === 0 ? 'No subjects for this year group.' : 'Select a subject.'}</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[11px] font-bold tracking-wider text-[#64748B] uppercase bg-[#F7F9FC]">
                <th className="text-left px-4 py-3">#</th><th className="text-left px-4 py-3">Student</th>
                <th className="text-center px-2 py-3">CA1<br/><span className="text-[10px] font-normal">({cfg.max_ca1})</span></th>
                <th className="text-center px-2 py-3">CA2<br/><span className="text-[10px] font-normal">({cfg.max_ca2})</span></th>
                <th className="text-center px-2 py-3">Assignment<br/><span className="text-[10px] font-normal">({cfg.max_assignment})</span></th>
                <th className="text-center px-2 py-3">Exam<br/><span className="text-[10px] font-normal">({cfg.max_exam})</span></th>
                <th className="text-center px-2 py-3">Total<br/><span className="text-[10px] font-normal">({maxPossible})</span></th>
                <th className="text-center px-2 py-3">Grade</th>
              </tr>
            </thead>
            <tbody>
              {classStudents.map((student, idx) => {
                const total = getTotal(student.id);
                const grade = getGrade(student.id);
                const s = scores[student.id] || { ca1: '', ca2: '', assignment: '', exam: '' };
                return (
                  <tr key={student.id} className="hover:bg-[#F8FAFF] border-t border-[#DDE5F0]">
                    <td className="px-4 py-2 text-[#64748B]">{idx + 1}</td>
                    <td className="px-4 py-2 font-semibold">{student.full_name}</td>
                    <td className="px-2 py-2">
                      <input type="number" min="0" max={cfg.max_ca1} value={s.ca1} onChange={e => updateScore(student.id, 'ca1', e.target.value)}
                        className="w-full px-2 py-1.5 rounded border border-[#DDE5F0] text-center text-sm outline-none focus:border-[#1A7A4A]" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min="0" max={cfg.max_ca2} value={s.ca2} onChange={e => updateScore(student.id, 'ca2', e.target.value)}
                        className="w-full px-2 py-1.5 rounded border border-[#DDE5F0] text-center text-sm outline-none focus:border-[#1A7A4A]" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min="0" max={cfg.max_assignment} value={s.assignment} onChange={e => updateScore(student.id, 'assignment', e.target.value)}
                        className="w-full px-2 py-1.5 rounded border border-[#DDE5F0] text-center text-sm outline-none focus:border-[#1A7A4A]" />
                    </td>
                    <td className="px-2 py-2">
                      <input type="number" min="0" max={cfg.max_exam} value={s.exam} onChange={e => updateScore(student.id, 'exam', e.target.value)}
                        className="w-full px-2 py-1.5 rounded border border-[#DDE5F0] text-center text-sm outline-none focus:border-[#1A7A4A]" />
                    </td>
                    <td className="px-2 py-2 text-center font-bold">{total > 0 ? total : '—'}</td>
                    <td className="px-2 py-2 text-center">
                      {total > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          grade === 'F9' || grade === 'F' ? 'bg-[#FEE2E2] text-[#B91C1C]' :
                          grade === 'A1' || grade === 'A' ? 'bg-[#D1FAE5] text-[#065F46]' :
                          'bg-[#FEF3C7] text-[#D4930A]'
                        }`}>{grade}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

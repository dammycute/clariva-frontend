'use client';

import { useState, useEffect } from 'react';
import { api, auth } from '@/lib/api';

interface Grade { id: string; student: string; student_name: string; subject: string; term: string; academic_year: string; scores: Record<string, number>; total: number | null; grade: string | null; }
interface Student { id: string; first_name: string; last_name: string; class_group: string | null; }
interface Subject { id: string; name: string; year_group: string | null; }
interface Cls { id: string; name: string; year_group: string | null; }
interface GradingConfig { id?: string; school: number; components: { key: string; label: string; max: number; enabled: boolean }[]; grade_boundaries: { name: string; min_pct: number }[]; }

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

const fullName = (s: { first_name: string; last_name: string }) => `${s.first_name} ${s.last_name}`.trim();

export default function GradeEntryTab({ onRefresh }: { onRefresh: () => void }) {
  const [clsList, setClsList] = useState<Cls[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [existingGrades, setExistingGrades] = useState<Grade[]>([]);
  const [grading, setGrading] = useState<GradingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [term, setTerm] = useState('1st Term');
  const [academicYear, setAcademicYear] = useState('2025/2026');
  const [scores, setScores] = useState<Record<string, Record<string, string>>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
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

      if (me?.school_id) {
        const gc = await api.gradingConfig.get(me.school_id) as unknown as GradingConfig;
        setGrading(gc);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadAll(); }, []);

  const activeComponents = (grading?.components || []).filter(c => c.enabled !== false);
  const totalMaxPossible = activeComponents.reduce((sum, c) => sum + c.max, 0);

  const selectedCls = clsList.find(c => String(c.id) === selectedClass);
  const yg = selectedCls?.year_group || '';
  const classStudents = students.filter(s => String(s.class_group) === selectedClass);
  const ygSubjects = subjects.filter(s => s.year_group === yg);

  useEffect(() => {
    if (!selectedSubject || !term) return;
    const existing = existingGrades.filter(g => g.subject === selectedSubject && g.term === term);
    const map: Record<string, Record<string, string>> = {};
    for (const g of existing) {
      const entry: Record<string, string> = {};
      for (const comp of activeComponents) {
        entry[comp.key] = g.scores?.[comp.key] != null ? String(g.scores[comp.key]) : '';
      }
      map[g.student] = entry;
    }
    setScores(map);
  }, [selectedClass, selectedSubject, term, existingGrades, grading]);

  function updateScore(studentId: string, field: string, value: string) {
    setScores(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [field]: value },
    }));
  }

  function getTotal(studentId: string): number {
    const s = scores[studentId];
    if (!s) return 0;
    return activeComponents.reduce((sum, comp) => sum + (parseFloat(s[comp.key]) || 0), 0);
  }

  function getGradeValue(studentId: string): string {
    return calcGrade(getTotal(studentId), totalMaxPossible, grading?.grade_boundaries || []);
  }

  async function handleSave() {
    setMessage('');
    setSaving(true);
    let saved = 0;
    try {
      for (const student of classStudents) {
        const s = scores[student.id];
        if (!s) continue;
        const scoresObj: Record<string, number> = {};
        let total = 0;
        for (const comp of activeComponents) {
          const val = parseFloat(s[comp.key]) || 0;
          scoresObj[comp.key] = val;
          total += val;
        }
        if (total === 0 && activeComponents.every(comp => !s[comp.key])) continue;
        const gradeLetter = calcGrade(total, totalMaxPossible, grading?.grade_boundaries || []);

        const enrollments = await api.studentSubjects.list({ student_id: student.id, subject_id: selectedSubject });
        if (enrollments.length === 0) {
          await api.studentSubjects.create({
            student: student.id,
            subject: selectedSubject,
            academic_year: academicYear,
          } as Record<string, unknown>);
        }

        const existing = existingGrades.find(g => g.student === student.id && g.subject === selectedSubject && g.term === term);
        const payload = { student: student.id, subject: selectedSubject, term, academic_year: academicYear, scores: scoresObj, total, grade: gradeLetter };
        if (existing) {
          await api.grades.update(existing.id, payload as unknown as Partial<Grade>);
        } else {
          await api.grades.create(payload as unknown as Partial<Grade>);
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

      {grading && activeComponents.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-3 text-[10px] text-[#64748B]">
          {activeComponents.map(comp => (
            <span key={comp.key}>{comp.label}: <strong className="text-[#0D2B55]">/{comp.max}</strong></span>
          ))}
          <span>Total: <strong className="text-[#0D2B55]">/{totalMaxPossible}</strong></span>
        </div>
      )}

      {error && (
        <div className="bg-[#FEE2E2] border border-[#FCA5A5] text-[#B91C1C] rounded-xl p-6 text-center mb-4">
          <p className="text-sm mb-3">{error}</p>
          <button onClick={loadAll} className="text-sm px-4 py-2 rounded-lg bg-[#B91C1C] text-white hover:bg-[#991B1B]">Try Again</button>
        </div>
      )}

      <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-x-auto">
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
                {activeComponents.map(comp => (
                  <th key={comp.key} className="text-center px-2 py-3">{comp.label}<br/><span className="text-[10px] font-normal">({comp.max})</span></th>
                ))}
                <th className="text-center px-2 py-3">Total<br/><span className="text-[10px] font-normal">({totalMaxPossible})</span></th>
                <th className="text-center px-2 py-3">Grade</th>
              </tr>
            </thead>
            <tbody>
              {classStudents.map((student, idx) => {
                const total = getTotal(student.id);
                const gradeLetter = getGradeValue(student.id);
                const s = scores[student.id] || {};
                return (
                  <tr key={student.id} className="hover:bg-[#F8FAFF] border-t border-[#DDE5F0]">
                    <td className="px-4 py-2 text-[#64748B]">{idx + 1}</td>
                    <td className="px-4 py-2 font-semibold">{fullName(student)}</td>
                    {activeComponents.map(comp => (
                      <td key={comp.key} className="px-2 py-2">
                        <input type="number" min="0" max={comp.max} value={s[comp.key] || ''} onChange={e => updateScore(student.id, comp.key, e.target.value)}
                          className="w-full px-2 py-1.5 rounded border border-[#DDE5F0] text-center text-sm outline-none focus:border-[#1A7A4A]" />
                      </td>
                    ))}
                    <td className="px-2 py-2 text-center font-bold">{total > 0 ? total : '—'}</td>
                    <td className="px-2 py-2 text-center">
                      {total > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          gradeLetter === 'F9' || gradeLetter === 'F' ? 'bg-[#FEE2E2] text-[#B91C1C]' :
                          gradeLetter === 'A1' || gradeLetter === 'A' ? 'bg-[#D1FAE5] text-[#065F46]' :
                          'bg-[#FEF3C7] text-[#D4930A]'
                        }`}>{gradeLetter}</span>
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
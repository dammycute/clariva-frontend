'use client';

import { useState, useEffect } from 'react';
import { api, auth } from '@/lib/api';

interface Subject { id: string; name: string; year_group: string | null; }
interface Class { id: string; name: string; year_group: string | null; }
interface Student { id: string; full_name: string; admission_no: string; }
interface Grade { id?: string; student: string; subject: string; ca1: number; ca2: number; exam: number; assignment: number; total: number; }

export default function TeacherGradesPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Record<string, Grade>>({});
  const [saving, setSaving] = useState(false);
  const [term] = useState('1st Term');
  const [academicYear] = useState('2025/2026');

  useEffect(() => {
    Promise.all([
      api.subjects.list({ teacher_id: 'me' }),
      api.classes.list({ teacher_id: 'me' }),
    ]).then(([sub, cls]) => {
      setSubjects(sub as Subject[]);
      setClasses(cls as Class[]);
    });
  }, []);

  useEffect(() => {
    if (!selectedClass || !selectedSubject) { setStudents([]); return; }
    (async () => {
      const stu = await api.students.list({ class_id: selectedClass, status: 'active' }) as Student[];
      setStudents(stu);
      const gr = await api.grades.list({ subject: selectedSubject }) as Grade[];
      const map: Record<string, Grade> = {};
      gr.forEach(g => { map[g.student] = g; });
      stu.forEach(s => {
        if (!map[s.id]) map[s.id] = { student: s.id, subject: selectedSubject, ca1: 0, ca2: 0, exam: 0, assignment: 0, total: 0 };
      });
      setGrades(map);
    })();
  }, [selectedClass, selectedSubject]);

  async function saveAll() {
    setSaving(true);
    const token = auth.getToken();
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    for (const s of students) {
      const g = grades[s.id];
      if (!g) continue;
      const payload = { ...g, term, academic_year: academicYear, student: s.id, subject: selectedSubject };
      if (g.id) {
        await fetch(`${base}/grades/${g.id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token ?? ''}` }, body: JSON.stringify(payload) });
      } else {
        await fetch(`${base}/grades/`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token ?? ''}` }, body: JSON.stringify(payload) });
      }
    }
    setSaving(false);
  }

  function updateGrade(studentId: string, field: keyof Grade, value: string) {
    const g = { ...grades[studentId] };
    const num = Math.min(Number(value) || 0, field === 'exam' ? 100 : 30);
    (g as Record<string, unknown>)[field] = num;
    g.total = (g.ca1 || 0) + (g.ca2 || 0) + (g.exam || 0) + (g.assignment || 0);
    setGrades({ ...grades, [studentId]: g });
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-[#0D2B55] mb-1">Grade Entry</h1>
      <p className="text-xs text-[#64748B] mb-5">Enter grades for your subjects</p>

      <div className="flex items-center gap-3 mb-4">
        <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
          className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white outline-none">
          <option value="">Select subject</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
          className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white outline-none">
          <option value="">Select class</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={saveAll} disabled={!selectedClass || !selectedSubject || saving}
          className="text-sm px-4 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D] disabled:opacity-50">
          {saving ? 'Saving…' : 'Save All Grades'}
        </button>
      </div>

      {selectedClass && selectedSubject && (
        <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[11px] font-bold text-[#64748B] uppercase bg-[#F7F9FC]">
                <th className="text-left px-4 py-3">Student</th>
                <th className="text-center px-4 py-3">CA1 (30)</th>
                <th className="text-center px-4 py-3">CA2 (30)</th>
                <th className="text-center px-4 py-3">Assignment (30)</th>
                <th className="text-center px-4 py-3">Exam (100)</th>
                <th className="text-center px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => {
                const g = grades[s.id];
                return (
                  <tr key={s.id} className="hover:bg-[#F8FAFF] border-t border-[#DDE5F0]">
                    <td className="px-4 py-2 font-semibold">{s.full_name}</td>
                    {(['ca1', 'ca2', 'assignment', 'exam'] as const).map(f => (
                      <td key={f} className="px-4 py-2 text-center">
                        <input type="number" value={g?.[f] ?? 0} onChange={e => updateGrade(s.id, f, e.target.value)}
                          className="w-16 text-center px-2 py-1 rounded border border-[#DDE5F0] outline-none text-sm" />
                      </td>
                    ))}
                    <td className="px-4 py-2 text-center font-bold">{g?.total ?? 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

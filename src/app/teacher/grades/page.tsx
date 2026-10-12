'use client';
import { useState, useEffect } from 'react';
import { api, auth } from '@/lib/api';

interface Subject { id: string; name: string; year_group: string | null; }
interface Cls { id: string; name: string; year_group: string | null; form_teacher?: string | null; }
interface Student { id: string; first_name: string; last_name: string; admission_no: string; }
interface Grade { id?: string; student: string; subject: string; scores: Record<string, number>; total: number; results_status?: string; }
interface GradeConfig { components: { key: string; label: string; max: number; enabled: boolean }[]; }

const fullName = (s: { first_name: string; last_name: string }) => `${s.first_name} ${s.last_name}`.trim();

export default function TeacherGradesPage() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Cls[]>([]);
  const [formTeacherClasses, setFormTeacherClasses] = useState<Cls[]>([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<Record<string, Grade>>({});
  const [saving, setSaving] = useState(false);
  const [term] = useState('1st Term');
  const [academicYear] = useState('2025/2026');
  const [message, setMessage] = useState('');
  const [cfg, setCfg] = useState<GradeConfig>({ components: [] });

  const components = cfg.components?.filter(c => c.enabled !== false) || [];
  const clampMap = Object.fromEntries(components.map(c => [c.key, c.max]));

  useEffect(() => {
    (async () => {
      const me = await auth.me();
      const [mySubs, cls] = await Promise.all([
        api.subjects.list({ teacher_id: 'me' }) as Promise<Subject[]>,
        api.classes.list({ teacher_id: 'me' }) as unknown as Promise<Cls[]>,
      ]);
      setClasses(cls);
      setFormTeacherClasses(cls.filter(c => c.form_teacher));

      if (me?.school_id) {
        try {
          const gc = await api.gradingConfig.get(me.school_id) as unknown as GradeConfig;
          setCfg(gc);
        } catch { /* use defaults */ }
      }

      const seen = new Set(mySubs.map(s => s.id));
      const allSubs = [...mySubs];
      const ftYgs = [...new Set(cls.filter(c => c.form_teacher).map(c => c.year_group).filter(Boolean))] as string[];
      if (ftYgs.length > 0) {
        const ygSubs = (await Promise.all(ftYgs.map(yg => api.subjects.list({ year_group: yg }) as Promise<Subject[]>))).flat();
        for (const s of ygSubs) {
          if (!seen.has(s.id)) { seen.add(s.id); allSubs.push(s); }
        }
      }
      setSubjects(allSubs);
    })();
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
        if (!map[s.id]) map[s.id] = { student: s.id, subject: selectedSubject, scores: {}, total: 0, results_status: 'draft' };
      });
      setGrades(map);
    })();
  }, [selectedClass, selectedSubject]);

  async function saveAll() {
    setSaving(true); setMessage('');
    const token = auth.getToken();
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    let saved = 0;
    for (const s of students) {
      const g = grades[s.id];
      if (!g) continue;
      const payload = { ...g, term, academic_year: academicYear, student: s.id, subject: selectedSubject };
      if (g.id) {
        delete (payload as Record<string, unknown>).results_status;
        const res = await fetch(`${base}/grades/${g.id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token ?? ''}` }, body: JSON.stringify(payload) });
        if (res.ok) saved++;
      } else {
        const res = await fetch(`${base}/grades/`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token ?? ''}` }, body: JSON.stringify(payload) });
        if (res.ok) saved++;
      }
    }
    setMessage(`Saved ${saved} grade(s).`);
    setSaving(false);
  }

  async function submitToPrincipal() {
    if (!selectedClass || !selectedSubject) return;
    setMessage('');
    try {
      const token = auth.getToken();
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const res = await fetch(`${base}/grades/submit_class/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token ?? ''}` },
        body: JSON.stringify({ class_id: selectedClass, term, academic_year: academicYear, subject_id: selectedSubject }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setMessage(`Submitted ${data.submitted} grade(s) for principal review.`);
    } catch (err: unknown) { setMessage(err instanceof Error ? err.message : 'Submit failed'); }
  }

  function updateGrade(studentId: string, field: string, value: string) {
    const g = { ...grades[studentId] };
    const num = Math.min(Number(value) || 0, clampMap[field] ?? 100);
    const scores = { ...g.scores, [field]: num };
    const total = Object.entries(scores).reduce((sum, [k, v]) => sum + (k === field ? num : (g.scores[k] || 0)), 0);
    g.scores = scores;
    g.total = Object.values(scores).reduce((a, b) => a + b, 0);
    setGrades({ ...grades, [studentId]: g });
  }

  const selectedCls = classes.find(c => String(c.id) === selectedClass);
  const isFormTeacher = selectedCls && formTeacherClasses.find(c => String(c.id) === selectedClass);

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink mb-1">Grade Entry</h1>
      <p className="text-xs text-muted mb-5">Enter grades for your subjects</p>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="text-sm border border-line rounded px-3 py-2 bg-surface outline-none">
          <option value="">Select subject</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedSubject(''); }} className="text-sm border border-line rounded px-3 py-2 bg-surface outline-none">
          <option value="">Select class</option>
          {classes.map(c => <option key={c.id} value={c.id}>
            {c.name}{c.form_teacher ? ' (Form Teacher)' : ''}
          </option>)}
        </select>
        <button onClick={saveAll} disabled={!selectedClass || !selectedSubject || saving} className="text-sm px-4 py-2 rounded bg-brand text-brand-ink hover:opacity-90 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save All Grades'}
        </button>
        {selectedSubject && (
          <button onClick={submitToPrincipal} className="text-sm px-4 py-2 rounded bg-warning text-white hover:opacity-90">
            Submit to Principal
          </button>
        )}
      </div>

      {components.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-3 text-xs text-muted">
          {components.map(comp => (
            <span key={comp.key}>{comp.label}: <strong className="text-ink">/{comp.max}</strong></span>
          ))}
        </div>
      )}

      {isFormTeacher && (
        <div className="px-3 py-1.5 mb-3 bg-brand-soft border border-[#C4B5FD] rounded text-xs text-brand">
          You are the form teacher - all year-group subjects are available for grade entry.
        </div>
      )}

      {message && <div className={`px-4 py-2 rounded text-xs mb-3 ${message.includes('Saved') || message.includes('Submitted') ? 'bg-success/10 text-success' : 'bg-danger-soft text-danger'}`}>{message}</div>}

      {selectedClass && selectedSubject && (
        <div className="bg-surface border border-line rounded overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-xs font-semibold text-muted bg-page">
              <th className="text-left px-4 py-3">Student</th>
              {components.map(comp => (
                <th key={comp.key} className="text-center px-2 py-3">{comp.label}<br/><span className="text-xs font-normal">({comp.max})</span></th>
              ))}
              <th className="text-center px-2 py-3">Total</th><th className="text-center px-2 py-3">Status</th>
            </tr></thead>
            <tbody>{students.map(s => {
              const g = grades[s.id];
              return (<tr key={s.id} className="hover:bg-page border-t border-line">
                <td className="px-4 py-2 font-semibold">{fullName(s)}</td>
                {components.map(comp => (
                  <td key={comp.key} className="px-2 py-2"><input type="number" value={g?.scores[comp.key] ?? ''} onChange={e => updateGrade(s.id, comp.key, e.target.value)} className="w-full px-2 py-1.5 rounded border border-line text-center text-sm outline-none focus:border-brand" /></td>
                ))}
                <td className="px-2 py-2 text-center font-semibold">{g?.total ?? 0}</td>
                <td className="px-2 py-2 text-center">
                  {g?.results_status && g.results_status !== 'draft' ? (
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${g.results_status === 'approved' ? 'bg-success/10 text-success' : g.results_status === 'submitted' ? 'bg-warning/10 text-warning' : 'bg-danger-soft text-danger'}`}>{g.results_status}</span>
                  ) : <span className="text-muted">-</span>}
                </td>
              </tr>);
            })}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}
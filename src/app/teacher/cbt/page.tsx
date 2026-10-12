'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Pencil, BarChart3 } from 'lucide-react';

interface Exam { id: string; title: string; subject_name?: string; subject: string; class_name?: string; class_group: string | null; duration_mins: number; pass_mark: number; question_count: number; status: string; }
interface Subject { id: string; name: string; year_group: string | null; }

const statusColors: Record<string, string> = { draft: 'bg-gray-100 text-gray-600', published: 'bg-blue-100 text-blue-700', ongoing: 'bg-green-100 text-green-700', completed: 'bg-amber-100 text-amber-700', archived: 'bg-red-100 text-red-700' };

export default function TeacherCBTExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSubject, setFilterSubject] = useState('');

  useEffect(() => {
    Promise.all([api.exams.list(), api.subjects.list({ teacher_id: 'me' })]).then(([e, s]) => {
      setExams(e as Exam[]);
      setSubjects(s as Subject[]);
      setLoading(false);
    });
  }, []);

  const filtered = filterSubject ? exams.filter(e => e.subject === filterSubject) : exams;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div><h1 className="text-xl font-semibold text-ink">CBT Exams</h1><p className="text-xs text-muted mt-0.5">{filtered.length} exam(s) for your subjects</p></div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="text-sm border border-line rounded px-3 py-2 bg-surface outline-none">
          <option value="">All my subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="bg-surface border border-line rounded overflow-hidden">
        {loading ? <div className="p-8 text-center text-sm text-muted">Loading…</div>
        : filtered.length === 0 ? <div className="p-12 text-center text-sm text-muted">No CBT exams for your subjects yet.</div>
        : <div className="divide-y divide-line">{filtered.map(exam => (
            <div key={exam.id} className="px-4 py-3 hover:bg-page">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{exam.title}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-semibold ${statusColors[exam.status] || statusColors.draft}`}>{exam.status}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                    <span>{exam.subject_name || '-'}</span>
                    <span>{exam.class_name || 'All classes'}</span>
                    <span>{exam.duration_mins} min</span>
                    <span>Pass: {exam.pass_mark}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link href={`/dashboard/cbt/${exam.id}`} className="px-2 py-1 rounded border border-line hover:bg-surface-2" title="Questions" aria-label="Questions"><Pencil size={16} aria-hidden="true" /></Link>
                  <Link href={`/dashboard/cbt/results/${exam.id}`} className="px-2 py-1 rounded border border-line hover:bg-surface-2" title="Results" aria-label="Results"><BarChart3 size={16} aria-hidden="true" /></Link>
                </div>
              </div>
            </div>
          ))}</div>}
      </div>
    </div>
  );
}

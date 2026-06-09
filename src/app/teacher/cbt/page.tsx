'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

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
        <div><h1 className="text-xl font-bold text-[#0D2B55]">CBT Exams</h1><p className="text-xs text-[#64748B] mt-0.5">{filtered.length} exam(s) for your subjects</p></div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <select value={filterSubject} onChange={e => setFilterSubject(e.target.value)} className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white outline-none">
          <option value="">All my subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-sm text-[#64748B]">Loading…</div>
        : filtered.length === 0 ? <div className="p-12 text-center text-sm text-[#64748B]">No CBT exams for your subjects yet.</div>
        : <div className="divide-y divide-[#DDE5F0]">{filtered.map(exam => (
            <div key={exam.id} className="px-4 py-3 hover:bg-[#F8FAFF]">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#0D2B55]">{exam.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${statusColors[exam.status] || statusColors.draft}`}>{exam.status}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-[#64748B]">
                    <span>{exam.subject_name || '—'}</span>
                    <span>{exam.class_name || 'All classes'}</span>
                    <span>{exam.duration_mins} min</span>
                    <span>Pass: {exam.pass_mark}%</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link href={`/dashboard/cbt/${exam.id}`} className="text-[11px] px-2 py-1 rounded border border-[#DDE5F0] hover:bg-[#F0F4FA]" title="Questions">📝</Link>
                  <Link href={`/dashboard/cbt/results/${exam.id}`} className="text-[11px] px-2 py-1 rounded border border-[#DDE5F0] hover:bg-[#F0F4FA]" title="Results">📊</Link>
                </div>
              </div>
            </div>
          ))}</div>}
      </div>
    </div>
  );
}

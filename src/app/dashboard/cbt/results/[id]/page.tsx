'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface ExamSession {
  id: string; exam: string; student: string;
  score: number; total_marks: number; passed: boolean;
  started_at: string; submitted_at: string;
  tab_switches: number; status: string;
}

interface Exam { id: string; title: string; subject_name?: string; pass_mark: number; }

export default function ExamResultsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [ex, ss] = await Promise.all([
          api.exams.get(id),
          api.examSessions.list({ exam: id }),
        ]);
        setExam(ex as Exam);
        setSessions(Array.isArray(ss) ? ss as ExamSession[] : []);
      } catch { router.push('/dashboard/cbt'); }
      finally { setLoading(false); }
    })();
  }, [id, router]);

  if (loading) return <div className="text-sm text-[#64748B] p-8">Loading results…</div>;
  if (!exam) return null;

  const passed = sessions.filter(s => s.passed);
  const avgScore = sessions.length > 0 ? Math.round(sessions.reduce((a, s) => a + (s.total_marks > 0 ? (s.score / s.total_marks) * 100 : 0), 0) / sessions.length) : 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.push('/dashboard/cbt')} className="text-sm text-[#64748B] hover:text-[#0D2B55]">← Exams</button>
        <div className="h-4 w-px bg-[#DDE5F0]" />
        <h1 className="text-xl font-bold text-[#0D2B55]">{exam.title} — Results</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#0D2B55]">{sessions.length}</p>
          <p className="text-[10px] text-[#64748B]">Submissions</p>
        </div>
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#1A7A4A]">{passed.length}</p>
          <p className="text-[10px] text-[#64748B]">Passed</p>
        </div>
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4 text-center">
          <p className={`text-2xl font-bold ${avgScore >= exam.pass_mark ? 'text-[#1A7A4A]' : 'text-[#B91C1C]'}`}>{avgScore}%</p>
          <p className="text-[10px] text-[#64748B]">Avg Score</p>
        </div>
      </div>

      <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden">
        {sessions.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#64748B]">No submissions yet.</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[11px] font-bold tracking-wider text-[#64748B] uppercase bg-[#F7F9FC]">
                <th className="text-left px-4 py-3">Student</th>
                <th className="text-left px-4 py-3">Score</th>
                <th className="text-left px-4 py-3">Percentage</th>
                <th className="text-left px-4 py-3">Result</th>
                <th className="text-left px-4 py-3">Tab Switches</th>
                <th className="text-left px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => {
                const pct = s.total_marks > 0 ? Math.round((s.score / s.total_marks) * 100) : 0;
                return (
                  <tr key={s.id} className="hover:bg-[#F8FAFF] border-t border-[#DDE5F0]">
                    <td className="px-4 py-3 font-semibold">{s.student}</td>
                    <td className="px-4 py-3">{s.score}/{s.total_marks}</td>
                    <td className="px-4 py-3">
                      <span className={`font-bold ${pct >= exam.pass_mark ? 'text-[#1A7A4A]' : 'text-[#B91C1C]'}`}>{pct}%</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${s.passed ? 'bg-[#DCFCE7] text-[#1A7A4A]' : 'bg-[#FEE2E2] text-[#B91C1C]'}`}>{s.passed ? 'Pass' : 'Fail'}</span>
                    </td>
                    <td className="px-4 py-3">{s.tab_switches || 0}</td>
                    <td className="px-4 py-3 text-[#64748B]">{s.submitted_at ? new Date(s.submitted_at).toLocaleString('en-NG') : '—'}</td>
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

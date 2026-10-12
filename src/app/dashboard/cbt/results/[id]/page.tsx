'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ChevronLeft } from 'lucide-react';

interface ExamSession {
  id: string; exam: string; student: string; student_name: string | null;
  score: number; total_marks: number; passed: boolean;
  started_at: string; submitted_at: string;
  tab_switches: number; late_submission: boolean; status: string;
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

  if (loading) return <div className="text-sm text-muted p-8">Loading results…</div>;
  if (!exam) return null;

  const passed = sessions.filter(s => s.passed);
  const avgScore = sessions.length > 0 ? Math.round(sessions.reduce((a, s) => a + (s.total_marks > 0 ? (s.score / s.total_marks) * 100 : 0), 0) / sessions.length) : 0;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.push('/dashboard/cbt')} className="text-sm text-muted hover:text-ink inline-flex items-center gap-1"><ChevronLeft size={16} aria-hidden="true" /> Exams</button>
        <div className="h-4 w-px bg-line" />
        <h1 className="text-xl font-semibold text-ink">{exam.title} - Results</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div className="bg-surface border border-line rounded p-4 text-center">
          <p className="text-2xl font-semibold text-ink">{sessions.length}</p>
          <p className="text-xs text-muted">Submissions</p>
        </div>
        <div className="bg-surface border border-line rounded p-4 text-center">
          <p className="text-2xl font-semibold text-brand">{passed.length}</p>
          <p className="text-xs text-muted">Passed</p>
        </div>
        <div className="bg-surface border border-line rounded p-4 text-center">
          <p className={`text-2xl font-semibold ${avgScore >= exam.pass_mark ? 'text-brand' : 'text-danger'}`}>{avgScore}%</p>
          <p className="text-xs text-muted">Avg Score</p>
        </div>
      </div>

      <div className="bg-surface border border-line rounded overflow-x-auto">
        {sessions.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">No submissions yet.</div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-xs font-semibold text-muted bg-page">
                <th className="text-left px-4 py-3">Student</th>
                <th className="text-left px-4 py-3">Score</th>
                <th className="text-left px-4 py-3">Percentage</th>
                <th className="text-left px-4 py-3">Result</th>
                <th className="text-left px-4 py-3">Tab Switches</th>
                <th className="text-left px-4 py-3">Late</th>
                <th className="text-left px-4 py-3">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => {
                const pct = s.total_marks > 0 ? Math.round((s.score / s.total_marks) * 100) : 0;
                return (
                  <tr key={s.id} className="hover:bg-page border-t border-line">
                    <td className="px-4 py-3 font-semibold">{s.student_name || s.student}</td>
                    <td className="px-4 py-3">{s.score}/{s.total_marks}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${pct >= exam.pass_mark ? 'text-brand' : 'text-danger'}`}>{pct}%</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${s.passed ? 'bg-success/10 text-success' : 'bg-danger-soft text-danger'}`}>{s.passed ? 'Pass' : 'Fail'}</span>
                    </td>
                    <td className="px-4 py-3">{s.tab_switches || 0}</td>
                    <td className="px-4 py-3">
                      {s.late_submission
                        ? <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-700">Late</span>
                        : <span className="text-muted">-</span>}
                    </td>
                    <td className="px-4 py-3 text-muted">{s.submitted_at ? new Date(s.submitted_at).toLocaleString('en-NG') : '-'}</td>
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

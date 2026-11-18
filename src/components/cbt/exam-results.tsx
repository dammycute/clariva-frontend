'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { SummaryStrip, Stat } from '@/components/ui/summary';
import { statusLabel, type Exam } from '@/components/cbt/exam-list';

interface ExamSession {
  id: string; student: string; student_name: string | null;
  score: number | null; total_marks: number | null; passed: boolean | null;
  started_at: string; submitted_at: string | null;
  tab_switches: number; late_submission: boolean; auto_submitted: boolean; status: string;
}

const pctOf = (s: ExamSession) => (s.total_marks ? Math.round(((s.score || 0) / s.total_marks) * 100) : 0);

/** Who sat an exam, how they did, and the buttons to close it and release the marks. */
export function ExamResults({ base }: { base: string }) {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [exam, setExam] = useState<Exam | null>(null);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [ex, ss] = await Promise.all([api.exams.get(id), api.examSessions.list({ exam: id })]);
    setExam(ex as Exam);
    setSessions(Array.isArray(ss) ? ss as ExamSession[] : []);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    load().catch(() => router.push(`${base}/cbt`)).finally(() => setLoading(false));
  }, [id, load, router, base]);

  async function closeNow() {
    if (!confirm('Close this exam now? Anyone still sitting it will be submitted with the answers saved so far.')) return;
    setBusy(true);
    try { await api.exams.close(id); toast.success('Exam closed.'); await load(); } catch { /* shown */ }
    finally { setBusy(false); }
  }

  async function releaseNow() {
    if (!confirm('Release the results? Students will see their scores and the marks are added to the grade book. This cannot be undone.')) return;
    setBusy(true);
    try {
      const res = await api.exams.release(id);
      toast.success(res.grades_posted ? `Results released. ${res.grades_posted} grade${res.grades_posted > 1 ? 's' : ''} posted.` : 'Results released.');
      await load();
    } catch { /* shown */ }
    finally { setBusy(false); }
  }

  async function resetOne(s: ExamSession) {
    if (!confirm(`Let ${s.student_name || 'this student'} sit the exam again? Their current attempt will be deleted. This is logged.`)) return;
    try { await api.examSessions.reset(s.id); toast.success('Attempt removed.'); await load(); } catch { /* shown */ }
  }

  if (loading) return <div role="status" className="text-sm text-muted p-8">Loading results…</div>;
  if (!exam) return null;

  const done = sessions.filter(s => s.status !== 'active');
  const sitting = sessions.length - done.length;
  const held = exam.release_mode === 'on_release' && !exam.results_released;
  const passed = done.filter(s => s.passed).length;
  const avg = done.length ? Math.round(done.reduce((a, s) => a + pctOf(s), 0) / done.length) : 0;
  const st = statusLabel(exam);

  return (
    <div className="max-w-[1120px]">
      <header className="mb-6">
        <Link href={`${base}/cbt`} className="text-[13px] text-muted hover:text-ink">&larr; All exams</Link>
        <div className="flex items-start justify-between gap-4 flex-wrap mt-2">
          <div>
            <h1 className="text-[22px] font-semibold text-ink leading-tight">{exam.title}: results</h1>
            <p className="text-[13px] text-muted mt-1"><span className={`font-medium ${st.tone}`}>{st.text}</span> · {exam.subject_name || 'No subject'}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`${base}/cbt/${id}`} className="inline-flex items-center h-11 px-4 rounded border border-line bg-surface text-sm font-medium text-ink hover:bg-surface-2">Questions</Link>
            {exam.status === 'published' && <Button variant="secondary" onClick={closeNow} disabled={busy}>Close exam</Button>}
            {held && exam.status !== 'draft' && <Button onClick={releaseNow} disabled={busy}>Release results</Button>}
          </div>
        </div>
      </header>

      {held && (
        <div role="note" className="mb-5 text-sm text-warning bg-warning/10 border border-warning/30 rounded px-3 py-2.5">
          Results are on hold. Students only see that their exam was submitted. {exam.status === 'published' ? 'Close the exam, then release the results.' : 'Release the results when you have checked them.'}
        </div>
      )}

      <SummaryStrip className="mb-6">
        <Stat label="Submitted" value={done.length} note={sitting ? `${sitting} still sitting` : undefined} />
        <Stat label="Passed" value={passed} />
        <Stat label="Average" value={`${avg}%`} note={`Pass mark ${exam.pass_mark}%`} />
      </SummaryStrip>

      <div className="bg-surface border border-line rounded overflow-x-auto">
        {sessions.length === 0 ? (
          <p className="p-8 text-sm text-muted">No one has started this exam yet.</p>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-muted bg-surface-2">
                {['Student', 'Score', 'Percent', 'Result', 'Tab switches', 'Notes', 'Submitted', ''].map(h => (
                  <th key={h || 'actions'} scope="col" className="text-left font-semibold px-4 py-3">{h || <span className="sr-only">Actions</span>}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => {
                const isActive = s.status === 'active';
                const pct = pctOf(s);
                return (
                  <tr key={s.id} className="border-t border-line hover:bg-surface-2">
                    <th scope="row" className="text-left px-4 py-3 font-semibold text-ink">{s.student_name || s.student}</th>
                    <td className="px-4 py-3 tabular-nums">{isActive || s.score === null ? '—' : `${s.score}/${s.total_marks}`}</td>
                    <td className="px-4 py-3 tabular-nums">{isActive || s.score === null ? '—' : `${pct}%`}</td>
                    <td className="px-4 py-3">
                      {isActive ? <span className="text-muted">Still sitting</span>
                        : s.passed === null ? <span className="text-muted">—</span>
                        : <span className={`font-semibold ${s.passed ? 'text-success' : 'text-danger'}`}>{s.passed ? 'Pass' : 'Fail'}</span>}
                    </td>
                    <td className="px-4 py-3 tabular-nums">{s.tab_switches || 0}</td>
                    <td className="px-4 py-3 text-warning">
                      {[s.auto_submitted && 'Time ran out', s.late_submission && 'Late'].filter(Boolean).join(', ') || <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 text-muted">{s.submitted_at ? new Date(s.submitted_at).toLocaleString('en-NG') : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => resetOne(s)} className="text-brand hover:underline cursor-pointer">Let them retake</button>
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

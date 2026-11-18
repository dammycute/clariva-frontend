'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Exam {
  id: string; title: string; subject_name?: string | null; duration_mins: number;
  question_count: number; total_marks: number; status: string; pass_mark: number;
  start_time: string | null; end_time: string | null; is_open: boolean;
  my_status: 'not_started' | 'in_progress' | 'submitted' | null;
  my_result: { score: number; total_marks: number; passed: boolean } | null;
  release_mode: string; results_released: boolean;
}

const when = (iso: string) => new Date(iso).toLocaleString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function action(ex: Exam): { label: string; href?: string; note: string } {
  if (ex.my_status === 'submitted') {
    const r = ex.my_result;
    return {
      label: 'Submitted',
      note: r ? `Your score: ${r.score}/${r.total_marks}. ${r.passed ? 'You passed.' : 'You did not pass.'}` : 'Your teacher will release the results.',
    };
  }
  if (ex.status !== 'published') return { label: 'Closed', note: 'This exam is closed.' };
  if (ex.start_time && new Date(ex.start_time) > new Date()) return { label: 'Not open yet', note: `Opens ${when(ex.start_time)}` };
  if (ex.end_time && new Date(ex.end_time) < new Date() && ex.my_status !== 'in_progress') return { label: 'Closed', note: 'The exam window has ended.' };
  if (ex.my_status === 'in_progress') return { label: 'Continue', href: `/student/exams/${ex.id}/take`, note: 'Your saved answers are waiting for you.' };
  return { label: 'Start exam', href: `/student/exams/${ex.id}/take`, note: ex.end_time ? `Closes ${when(ex.end_time)}` : '' };
}

export default function StudentExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.exams.list()
      .then(d => setExams(Array.isArray(d) ? d as Exam[] : []))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-[900px]">
      <header className="mb-6">
        <h1 className="text-[22px] font-semibold text-ink leading-tight">CBT exams</h1>
        <p className="text-[13px] text-muted mt-1">Exams set for your class.</p>
      </header>

      {loading ? (
        <div role="status" className="space-y-3 animate-pulse">
          {[0, 1].map(i => <div key={i} className="h-20 rounded bg-line" />)}
        </div>
      ) : failed ? (
        <p role="alert" className="text-sm text-danger">We could not load your exams. Refresh to try again.</p>
      ) : exams.length === 0 ? (
        <p className="text-sm text-muted border-t border-line pt-6">No exams are set for your class right now.</p>
      ) : (
        <ul className="border-t border-line">
          {exams.map(ex => {
            const a = action(ex);
            return (
              <li key={ex.id} className="py-4 border-b border-line flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-[15px] font-semibold text-ink">{ex.title}</h2>
                  <p className="text-[13px] text-muted mt-0.5">
                    {ex.subject_name || 'Subject not set'} · {ex.duration_mins} min · {ex.question_count} questions · pass mark {ex.pass_mark}%
                  </p>
                  {a.note && <p className="text-[13px] text-muted mt-0.5">{a.note}</p>}
                </div>
                {a.href ? (
                  <Link href={a.href}
                    className="inline-flex items-center h-10 px-4 rounded bg-brand text-brand-ink text-sm font-medium hover:opacity-90 shrink-0">{a.label}</Link>
                ) : (
                  <span className="text-sm text-muted shrink-0">{a.label}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

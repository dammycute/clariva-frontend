'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Monitor, PartyPopper, Frown, Map, X, Flag, ChevronLeft, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Exam {
  id: string; title: string; subject_name?: string;
  duration_mins: number; question_count: number;
  instructions: string; shuffle_questions: boolean; shuffle_options: boolean;
  pass_mark: number; status: string;
}

interface Question {
  id: string; body: string; question_type: string;
  options: string[] | null; mark: number; image_url?: string | null;
}

type Screen = 'start' | 'exam' | 'result';

export default function TakeExamPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [screen, setScreen] = useState<Screen>('start');
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  // exam state
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showNavigator, setShowNavigator] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // timer
  const [displayTime, setDisplayTime] = useState<number | null>(null);
  const remainingRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // tab switches
  const [showTabWarning, setShowTabWarning] = useState(false);
  const tabSwitchesRef = useRef(0);

  // result
  const [result, setResult] = useState<{ score: number; total_marks: number; passed: boolean; percentage: number } | null>(null);

  // fetch exam metadata on mount
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const ex = await api.exams.get(id) as Exam;
        if (ex.status !== 'published' && ex.status !== 'ongoing') {
          toast.error('This exam is not available.');
          router.push('/dashboard/cbt');
          return;
        }
        setExam(ex);
      } catch {
        router.push('/dashboard/cbt');
      }
    })();
  }, [id, router]);

  // start exam
  const handleStart = useCallback(async () => {
    if (!id) return;
    setStarting(true);
    setStartError(null);
    try {
      const session = await api.exams.startExam(id) as { session_id: string; time_remaining: number | null; questions: Question[] };

      setSessionId(session.session_id);
      setQuestions(session.questions || []);

      const seconds = session.time_remaining ?? (exam!.duration_mins * 60);
      remainingRef.current = seconds;
      setDisplayTime(seconds);

      setScreen('exam');
    } catch (err: unknown) {
      setStartError(err instanceof Error ? err.message : 'Failed to start exam');
    }
    finally { setStarting(false); }
  }, [id, exam]);

  // timer tick - single interval, reads/writes ref
  useEffect(() => {
    if (screen !== 'exam' || submitting) return;
    timerRef.current = setInterval(() => {
      remainingRef.current -= 1;
      setDisplayTime(remainingRef.current < 0 ? 0 : remainingRef.current);
      if (remainingRef.current <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        handleSubmit();
      }
    }, 1000);
    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, submitting]);

  // tab switch detection - show warning and end exam on first switch
  useEffect(() => {
    if (screen !== 'exam') return;
    let wasHidden = false;
    const handler = () => {
      if (document.hidden) {
        wasHidden = true;
      } else if (wasHidden) {
        tabSwitchesRef.current += 1;
        setShowTabWarning(true);
        wasHidden = false;
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [screen]);

  // warn before closing / navigating away
  useEffect(() => {
    if (screen !== 'exam') return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [screen]);

  // submission
  const handleSubmit = useCallback(async () => {
    if (submitting || !sessionId) return;
    setSubmitting(true);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    try {
      const res = await api.exams.submitExam(sessionId, answers, tabSwitchesRef.current) as { score: number; total_marks: number; passed: boolean; percentage: number };
      setResult(res);
      setScreen('result');
    } catch {
      toast.error('Failed to submit exam. Please try again.');
    }
    finally { setSubmitting(false); }
  }, [submitting, sessionId, answers]);

  // pre-submit confirmation
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmUnanswered, setConfirmUnanswered] = useState<number[]>([]);

  const handleSubmitClick = useCallback(() => {
    const unanswered = questions
      .map((q, i) => ({ q, i }))
      .filter(({ q }) => !answers[q.id])
      .map(({ i }) => i + 1);
    if (unanswered.length > 0) {
      setConfirmUnanswered(unanswered);
      setShowConfirm(true);
    } else {
      setShowConfirm(true);
      setConfirmUnanswered([]);
    }
  }, [questions, answers]);

  const confirmSubmit = useCallback(() => {
    setShowConfirm(false);
    handleSubmit();
  }, [handleSubmit]);

  // answer tracking
  const answeredCount = Object.keys(answers).length;
  const currentQuestion = questions[currentIndex];
  const isFlagged = currentQuestion ? flagged.has(currentQuestion.id) : false;
  const totalQuestions = questions.length;

  // format time
  const formatTime = (s: number) => {
    const m = Math.max(0, Math.floor(s / 60));
    const sec = Math.max(0, s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const timerWarning = displayTime !== null && displayTime > 0 && displayTime <= 300;

  // ---- Start Screen ----
  if (screen === 'start') {
    return (
      <div className="max-w-lg mx-auto mt-8">
        <div className="bg-surface border border-line rounded p-6">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3" aria-hidden="true"><Monitor size={24} /></div>
            <h1 className="text-xl font-semibold text-ink">{exam?.title || 'Loading…'}</h1>
            {exam?.subject_name && <p className="text-xs text-muted mt-1">{exam.subject_name}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-surface-2 rounded p-3 text-center">
              <p className="text-lg font-semibold text-ink">{exam?.question_count || 0}</p>
              <p className="text-xs text-muted">Questions</p>
            </div>
            <div className="bg-surface-2 rounded p-3 text-center">
              <p className="text-lg font-semibold text-ink">{exam?.duration_mins || 0} min</p>
              <p className="text-xs text-muted">Time Allowed</p>
            </div>
            <div className="bg-surface-2 rounded p-3 text-center">
              <p className="text-lg font-semibold text-ink">{exam?.question_count || 0}</p>
              <p className="text-xs text-muted">Total Marks</p>
            </div>
            <div className="bg-surface-2 rounded p-3 text-center">
              <p className="text-lg font-semibold text-ink">{exam?.pass_mark || 0}%</p>
              <p className="text-xs text-muted">Pass Mark</p>
            </div>
          </div>
          {exam?.instructions && (
            <div className="mb-5">
              <p className="text-xs font-semibold text-muted mb-1">Instructions</p>
              <p className="text-xs text-muted whitespace-pre-wrap">{exam.instructions}</p>
            </div>
          )}
          {startError && (
            <div className="mb-4 text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{startError}</div>
          )}
          <button onClick={handleStart} disabled={starting || !exam}
            className="w-full text-sm py-3 rounded bg-brand text-brand-ink font-semibold hover:opacity-90 disabled:opacity-50 transition-colors">
            {starting ? 'Starting Exam…' : 'Start Exam'}
          </button>
        </div>
      </div>
    );
  }

  // ---- Result Screen ----
  if (screen === 'result' && result) {
    const pct = result.percentage;
    const passed = result.passed;
    return (
      <div className="max-w-lg mx-auto mt-8">
        <div className="bg-surface border border-line rounded p-8 text-center">
          <div className="text-6xl mb-4" aria-hidden="true">{passed ? <PartyPopper size={40} /> : <Frown size={40} />}</div>
          <h2 className="text-xl font-semibold text-ink mb-2">{passed ? 'Congratulations!' : 'Not this time'}</h2>
          <p className="text-xs text-muted mb-6">
            {passed ? 'You passed the exam. Great work!' : `You needed ${exam?.pass_mark || 40}% to pass. Keep practicing!`}
          </p>
          <div className="flex items-center justify-center gap-8 mb-5">
            <div>
              <p className="text-3xl font-semibold text-ink">{result.score}/{result.total_marks}</p>
              <p className="text-xs text-muted">Score</p>
            </div>
            <div>
              <p className={`text-3xl font-semibold ${passed ? 'text-brand' : 'text-danger'}`}>{pct}%</p>
              <p className="text-xs text-muted">Percentage</p>
            </div>
          </div>
          <div className="h-3 bg-surface-2 rounded-full overflow-hidden mb-6">
            <div className={`h-full rounded-full transition-all duration-1000 ${passed ? 'bg-brand' : 'bg-danger'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
          <button onClick={() => router.push('/dashboard/cbt')} className="text-sm px-6 py-2.5 rounded bg-brand text-brand-ink hover:bg-brand">Back to Exams</button>
        </div>
      </div>
    );
  }

  // ---- Exam Screen ----
  return (
    <div className="max-w-3xl mx-auto">
      {/* sticky header */}
      <div className="bg-surface border border-line rounded p-3 mb-4 sticky top-0 z-20 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-ink truncate">{exam?.title}</h1>
          <p className="text-xs text-muted">{exam?.subject_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">{answeredCount}/{totalQuestions}</span>
          <button onClick={() => setShowNavigator(!showNavigator)} aria-label="Question map"
            className="px-2 py-1 rounded border border-line hover:bg-surface-2"><Map size={16} aria-hidden="true" /></button>
          <div className={`text-base font-semibold font-mono min-w-[60px] text-center ${timerWarning ? 'text-red-600 animate-pulse' : 'text-ink'}`}>
            {displayTime !== null ? formatTime(displayTime) : '--:--'}
          </div>
          <button onClick={handleSubmitClick} disabled={answeredCount === 0 || submitting}
            className="text-xs px-3 py-1.5 rounded bg-brand text-brand-ink hover:opacity-90 disabled:opacity-40">
            Submit
          </button>
        </div>
      </div>

      {/* question navigator panel */}
      {showNavigator && (
        <div className="bg-surface border border-line rounded p-4 mb-4 sticky top-[68px] z-10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-ink">Question Map</span>
            <button onClick={() => setShowNavigator(false)} aria-label="Close question map" className="text-xs text-muted hover:text-ink"><X size={16} aria-hidden="true" /></button>
          </div>
          <div className="flex items-center gap-3 mb-2 text-xs text-muted">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded border border-line bg-surface inline-block" /> Unanswered</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Answered</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-400 inline-block" /> Flagged</span>
          </div>
          <div className="grid grid-cols-10 gap-1.5">
            {questions.map((q, i) => {
              const ans = answers[q.id];
              const flg = flagged.has(q.id);
              let bg = 'bg-surface border border-line';
              if (ans) bg = 'bg-green-500 text-white border-green-500';
              else if (flg) bg = 'bg-amber-400 text-white border-amber-400';
              return (
                <button key={q.id} onClick={() => { setCurrentIndex(i); setShowNavigator(false); }}
                  className={`w-full aspect-square rounded text-xs font-semibold ${bg} hover:opacity-80 transition-opacity`}>
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* question area */}
      {currentQuestion && (
        <div className="bg-surface border border-line rounded p-5 mb-4">
          {/* question header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0 mr-3">
              <span className="text-xs font-semibold text-muted">Question {currentIndex + 1} of {totalQuestions}</span>
              <span className="text-xs text-muted ml-2">({currentQuestion.mark} mark{currentQuestion.mark > 1 ? 's' : ''})</span>
              {isFlagged && <span className="text-amber-500 ml-2 inline-flex" aria-hidden="true"><Flag size={16} /></span>}
            </div>
            <button onClick={() => {
              const s = new Set(flagged);
              isFlagged ? s.delete(currentQuestion.id) : s.add(currentQuestion.id);
              setFlagged(s);
            }}
              className={`text-xs px-2.5 py-1 rounded border transition-colors inline-flex items-center gap-1 ${isFlagged ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-line hover:bg-surface-2 text-muted'}`}>
              <Flag size={16} aria-hidden="true" /> {isFlagged ? 'Flagged' : 'Flag'}
            </button>
          </div>

          {/* question body */}
          <p className="text-base font-semibold text-ink mb-4 leading-relaxed">{currentQuestion.body}</p>

          {/* mcq */}
          {currentQuestion.question_type === 'mcq' && currentQuestion.options && (
            <div className="space-y-2">
              {currentQuestion.options.map((opt, oi) => {
                const selected = answers[currentQuestion.id] === opt;
                return (
                  <button key={oi} onClick={() => setAnswers({ ...answers, [currentQuestion.id]: opt })}
                    className={`w-full text-left px-4 py-3 min-h-[52px] rounded border-2 text-sm font-medium transition-all ${
                      selected ? 'border-green-500 bg-green-50 text-green-800' : 'border-line bg-surface text-ink hover:border-brand hover:bg-page'
                    }`}>
                    <span className="font-semibold mr-2">{String.fromCharCode(65 + oi)}.</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {/* true/false */}
          {currentQuestion.question_type === 'true_false' && (
            <div className="grid grid-cols-2 gap-3">
              {['True', 'False'].map(v => {
                const selected = answers[currentQuestion.id] === v;
                return (
                  <button key={v} onClick={() => setAnswers({ ...answers, [currentQuestion.id]: v })}
                    className={`w-full px-4 py-3 min-h-[52px] rounded border-2 text-sm font-semibold transition-all ${
                      selected ? 'border-green-500 bg-green-50 text-green-800' : 'border-line bg-surface text-ink hover:border-brand hover:bg-page'
                    }`}>
                    {v}
                  </button>
                );
              })}
            </div>
          )}

          {/* short answer */}
          {currentQuestion.question_type === 'short_answer' && (
            <textarea value={answers[currentQuestion.id] || ''} onChange={e => setAnswers({ ...answers, [currentQuestion.id]: e.target.value })}
              placeholder="Type your answer here" rows={4}
              className="w-full px-4 py-3 rounded border-2 border-line text-sm outline-none focus:border-brand resize-y min-h-[100px]" />
          )}
        </div>
      )}

      {/* bottom navigation */}
      <div className="flex items-center justify-between mb-8">
        <button onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}
          className="text-sm px-4 py-2 rounded border border-line hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center gap-1">
          <ChevronLeft size={16} aria-hidden="true" /> Previous
        </button>
        <span className="text-xs text-muted">
          {answeredCount} of {totalQuestions} answered
        </span>
        <button onClick={() => setCurrentIndex(Math.min(totalQuestions - 1, currentIndex + 1))} disabled={currentIndex === totalQuestions - 1}
          className="text-sm px-4 py-2 rounded border border-line hover:bg-surface-2 disabled:opacity-30 disabled:cursor-not-allowed">
          Next
        </button>
      </div>

      {/* submitting overlay */}
      {submitting && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-surface rounded p-8 text-center max-w-sm">
            <div className="mb-4 flex justify-center text-brand animate-spin" aria-hidden="true"><Loader2 size={32} /></div>
            <p className="text-sm font-semibold text-ink">Submitting your exam…</p>
            <p className="text-xs text-muted mt-1">Please wait, do not close this page.</p>
          </div>
        </div>
      )}

      {/* tab switch warning modal */}
      {showTabWarning && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-surface rounded p-6 max-w-md w-[90vw] text-center">
            <div className="text-5xl mb-4 text-danger flex justify-center" aria-hidden="true"><AlertTriangle size={40} /></div>
            <h3 className="text-lg font-semibold text-ink mb-2">Tab Switch Detected</h3>
            <p className="text-sm text-muted mb-2">
              You switched away from the exam window. This is not allowed.
            </p>
            <p className="text-sm font-semibold text-danger mb-5">
              Your exam will now be submitted. This cannot be undone.
            </p>
            <button onClick={() => { setShowTabWarning(false); handleSubmit(); }}
              className="w-full text-sm py-3 rounded bg-danger text-white font-semibold hover:opacity-90 transition-colors">
              End Exam
            </button>
          </div>
        </div>
      )}

      {/* pre-submit confirmation modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowConfirm(false)}>
          <div className="bg-surface rounded p-6 max-w-md w-[90vw]" onClick={e => e.stopPropagation()}>
            {confirmUnanswered.length > 0 ? (
              <>
                <div className="mb-3 text-amber-500 flex justify-center" aria-hidden="true"><AlertTriangle size={32} /></div>
                <h3 className="text-base font-semibold text-ink mb-2">Unanswered Questions</h3>
                <p className="text-xs text-muted mb-3">You have <strong>{confirmUnanswered.length}</strong> unanswered question{confirmUnanswered.length > 1 ? 's' : ''}:</p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {confirmUnanswered.map(n => (
                    <span key={n} className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs font-semibold">{n}</span>
                  ))}
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowConfirm(false)} className="text-sm px-4 py-2 rounded border border-line hover:bg-surface-2">Go Back</button>
                  <button onClick={confirmSubmit} className="text-sm px-4 py-2 rounded bg-brand text-brand-ink hover:opacity-90">Submit Anyway</button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-3 text-brand flex justify-center" aria-hidden="true"><CheckCircle2 size={32} /></div>
                <h3 className="text-base font-semibold text-ink mb-2">Submit Exam?</h3>
                <p className="text-xs text-muted mb-4">All questions answered. Ready to submit?</p>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowConfirm(false)} className="text-sm px-4 py-2 rounded border border-line hover:bg-surface-2">Cancel</button>
                  <button onClick={confirmSubmit} className="text-sm px-4 py-2 rounded bg-brand text-brand-ink hover:opacity-90">Submit Exam</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

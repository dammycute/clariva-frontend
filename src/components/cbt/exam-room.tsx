'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useParams, useRouter } from 'next/navigation';
import { api, type ExamResult } from '@/lib/api';
import { AnswerSaver, type SaveStatus } from '@/lib/autosave';
import { Button } from '@/components/ui/button';

interface Exam {
  id: string; title: string; subject_name?: string | null;
  duration_mins: number; question_count: number; total_marks: number;
  instructions: string | null; pass_mark: number; status: string;
  time_limit_enforced?: boolean;
}

interface Question {
  id: string; body: string; question_type: string;
  options: string[] | null; mark: number; image_url?: string | null;
}

type Screen = 'start' | 'exam' | 'result';

const SAVE_LABEL: Record<SaveStatus, string> = {
  idle: '',
  saving: 'Saving…',
  saved: 'All answers saved',
  offline: 'Offline. Your answers are kept and will send when you are back online.',
};

/** The student's exam room: start or resume, answer with autosave, submit, see the result. */
export function ExamRoom({ backHref }: { backHref: string }) {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [screen, setScreen] = useState<Screen>('start');
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showNavigator, setShowNavigator] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const [displayTime, setDisplayTime] = useState<number | null>(null);
  const remainingRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tabSwitchesRef = useRef(0);
  const saverRef = useRef<AnswerSaver | null>(null);
  const answersRef = useRef<Record<string, string>>({});
  const submittingRef = useRef(false);

  const [showTabWarning, setShowTabWarning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmUnanswered, setConfirmUnanswered] = useState<number[]>([]);
  const [result, setResult] = useState<ExamResult | null>(null);

  // exam details for the start screen
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setExam(await api.exams.get(id) as Exam);
      } catch {
        toast.error('This exam is not available.');
        router.push(backHref);
      }
    })();
  }, [id, router, backHref]);

  const finish = useCallback((res: ExamResult) => {
    saverRef.current?.stop();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setResult(res);
    setScreen('result');
  }, []);

  const handleStart = useCallback(async () => {
    if (!id) return;
    setStarting(true);
    setStartError(null);
    try {
      const session = await api.exams.startExam(id);
      const qs = session.questions as Question[];
      const saved = session.saved_answers || {};

      setSessionId(session.session_id);
      setQuestions(qs);
      setAnswers(saved);
      answersRef.current = saved;

      // pick up where the student stopped
      const firstOpen = qs.findIndex(q => !saved[q.id]);
      setCurrentIndex(firstOpen === -1 ? 0 : firstOpen);
      if (Object.keys(saved).length > 0) toast.success('Welcome back. Your saved answers are restored.');

      remainingRef.current = session.time_remaining;
      setDisplayTime(session.time_remaining);

      saverRef.current = new AnswerSaver({
        send: batch => api.exams.saveAnswers(session.session_id, batch),
        onStatus: setSaveStatus,
        onReply: reply => {
          if (reply.time_remaining != null) remainingRef.current = reply.time_remaining;   // server clock wins
          if (reply.closed) finish(reply as ExamResult);
        },
      });
      setScreen('exam');
    } catch (err: unknown) {
      setStartError(err instanceof Error ? err.message : 'We could not start the exam. Try again.');
    }
    finally { setStarting(false); }
  }, [id, finish]);

  const setAnswer = useCallback((questionId: string, value: string) => {
    setAnswers(prev => {
      const next = { ...prev, [questionId]: value };
      answersRef.current = next;
      return next;
    });
    saverRef.current?.queue(questionId, value);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current || !sessionId) return;
    submittingRef.current = true;
    setSubmitting(true);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    try {
      await saverRef.current?.flush();              // best effort; the full set is sent below as well
      const res = await api.exams.submitExam(sessionId, answersRef.current, tabSwitchesRef.current);
      finish(res);
    } catch {
      toast.error('We could not submit yet. Your answers are saved. Check your connection and try again.');
      submittingRef.current = false;
      setSubmitting(false);
    }
  }, [sessionId, finish]);

  // one clock tick per second; the server's time left is applied whenever a save comes back
  useEffect(() => {
    if (screen !== 'exam' || submitting) return;
    timerRef.current = setInterval(() => {
      if (remainingRef.current == null) return;
      remainingRef.current -= 1;
      setDisplayTime(Math.max(0, remainingRef.current));
      if (remainingRef.current <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        void handleSubmit();
      }
    }, 1000);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [screen, submitting, handleSubmit]);

  // send anything waiting as soon as the connection is back
  useEffect(() => {
    if (screen !== 'exam') return;
    const online = () => { void saverRef.current?.flush(); };
    window.addEventListener('online', online);
    return () => window.removeEventListener('online', online);
  }, [screen]);

  // tab switch detection: same rule as before, the first switch ends the exam
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

  // warn before closing or leaving the page
  useEffect(() => {
    if (screen !== 'exam') return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [screen]);

  // stop the saver if the student leaves the page
  useEffect(() => () => { saverRef.current?.stop(); }, []);

  const handleSubmitClick = useCallback(() => {
    setConfirmUnanswered(questions.map((q, i) => ({ q, i })).filter(({ q }) => !answers[q.id]).map(({ i }) => i + 1));
    setShowConfirm(true);
  }, [questions, answers]);

  const confirmSubmit = useCallback(() => {
    setShowConfirm(false);
    void handleSubmit();
  }, [handleSubmit]);

  const answeredCount = Object.values(answers).filter(v => v !== '').length;
  const currentQuestion = questions[currentIndex];
  const isFlagged = currentQuestion ? flagged.has(currentQuestion.id) : false;
  const totalQuestions = questions.length;

  const formatTime = (s: number) => {
    const m = Math.max(0, Math.floor(s / 60));
    const sec = Math.max(0, s % 60);
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };
  const timerWarning = displayTime !== null && displayTime > 0 && displayTime <= 300;

  // ---- start screen ----
  if (screen === 'start') {
    return (
      <div className="max-w-lg mx-auto mt-8">
        <div className="bg-surface border border-line rounded p-6">
          <h1 className="text-xl font-semibold text-ink">{exam?.title || 'Loading…'}</h1>
          {exam?.subject_name && <p className="text-sm text-muted mt-1">{exam.subject_name}</p>}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 my-6 border-y border-line py-5">
            <div><dt className="text-[13px] text-muted">Questions</dt><dd className="text-lg font-semibold text-ink tabular-nums">{exam?.question_count ?? 0}</dd></div>
            <div><dt className="text-[13px] text-muted">Time allowed</dt><dd className="text-lg font-semibold text-ink tabular-nums">{exam?.duration_mins ?? 0} min</dd></div>
            <div><dt className="text-[13px] text-muted">Total marks</dt><dd className="text-lg font-semibold text-ink tabular-nums">{exam?.total_marks ?? 0}</dd></div>
            <div><dt className="text-[13px] text-muted">Pass mark</dt><dd className="text-lg font-semibold text-ink tabular-nums">{exam?.pass_mark ?? 0}%</dd></div>
          </dl>
          {exam?.instructions && (
            <div className="mb-5">
              <p className="text-[13px] font-medium text-ink mb-1">Instructions</p>
              <p className="text-sm text-muted whitespace-pre-wrap">{exam.instructions}</p>
            </div>
          )}
          <ul className="text-[13px] text-muted mb-5 list-disc pl-5 space-y-1">
            <li>Your answers are saved as you go. If your connection drops, you can come back and continue.</li>
            <li>The clock keeps running while you are away.</li>
            <li>Leaving this window ends the exam.</li>
          </ul>
          {startError && (
            <div role="alert" className="mb-4 text-[13px] text-danger bg-danger-soft border border-danger/30 rounded px-3 py-2">{startError}</div>
          )}
          <Button onClick={handleStart} disabled={starting || !exam} className="w-full">
            {starting ? 'Starting…' : 'Start exam'}
          </Button>
        </div>
      </div>
    );
  }

  // ---- result screen ----
  if (screen === 'result' && result) {
    const held = result.held;
    const passed = !!result.passed;
    return (
      <div className="max-w-lg mx-auto mt-8">
        <div className="bg-surface border border-line rounded p-8">
          <h2 className="text-xl font-semibold text-ink">
            {held ? 'Your exam is submitted' : passed ? 'You passed' : 'You did not pass this time'}
          </h2>
          {result.auto_submitted && (
            <p className="text-sm text-muted mt-2">Your time ran out, so your saved answers were submitted for you.</p>
          )}
          {held ? (
            <p className="text-sm text-muted mt-3">{result.message || 'Your answers are saved. Your teacher will release the results.'}</p>
          ) : (
            <>
              <p className="text-sm text-muted mt-2">
                {passed ? 'Well done.' : `You needed ${exam?.pass_mark ?? 40}% to pass.`}
              </p>
              <dl className="flex gap-10 my-6">
                <div><dt className="text-[13px] text-muted">Score</dt><dd className="text-3xl font-semibold text-ink tabular-nums">{result.score}/{result.total_marks}</dd></div>
                <div><dt className="text-[13px] text-muted">Percentage</dt><dd className={`text-3xl font-semibold tabular-nums ${passed ? 'text-success' : 'text-danger'}`}>{result.percentage}%</dd></div>
              </dl>
            </>
          )}
          {result.late_submission && <p className="text-[13px] text-warning mb-4">This was submitted after the time limit.</p>}
          <Button onClick={() => router.push(backHref)} className="mt-4">Back to exams</Button>
        </div>
      </div>
    );
  }

  // ---- exam screen ----
  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-surface border border-line rounded p-3 mb-4 sticky top-0 z-20 flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-ink truncate">{exam?.title}</h1>
          <p
            role="status"
            className={`text-xs truncate ${saveStatus === 'offline' ? 'text-danger' : 'text-muted'}`}
          >
            {SAVE_LABEL[saveStatus] || exam?.subject_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted tabular-nums">{answeredCount}/{totalQuestions}</span>
          <button onClick={() => setShowNavigator(!showNavigator)} aria-expanded={showNavigator}
            className="text-xs px-2.5 py-1.5 rounded border border-line hover:bg-surface-2 cursor-pointer">Question map</button>
          <div className={`text-base font-semibold font-mono min-w-[60px] text-center ${timerWarning ? 'text-danger animate-pulse' : 'text-ink'}`}>
            {displayTime !== null ? formatTime(displayTime) : '--:--'}
          </div>
          <Button onClick={handleSubmitClick} disabled={submitting} className="h-8 px-3 text-xs">Submit</Button>
        </div>
      </div>

      {showNavigator && (
        <div className="bg-surface border border-line rounded p-4 mb-4 sticky top-[68px] z-10">
          <div className="flex items-center gap-4 mb-3 text-xs text-muted">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border border-line bg-surface inline-block" /> Not answered</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-success inline-block" /> Answered</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-warning inline-block" /> Flagged</span>
          </div>
          <div className="grid grid-cols-10 gap-1.5">
            {questions.map((q, i) => {
              const ans = answers[q.id];
              let bg = 'bg-surface border border-line text-ink';
              if (ans) bg = 'bg-success text-brand-ink border-success';
              else if (flagged.has(q.id)) bg = 'bg-warning text-brand-ink border-warning';
              return (
                <button key={q.id} onClick={() => { setCurrentIndex(i); setShowNavigator(false); }}
                  aria-label={`Question ${i + 1}${ans ? ', answered' : ''}`}
                  className={`w-full aspect-square rounded text-xs font-medium ${bg} hover:opacity-80 cursor-pointer`}>
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {currentQuestion && (
        <div className="bg-surface border border-line rounded p-5 mb-4">
          <div className="flex items-start justify-between mb-4">
            <p className="text-[13px] text-muted">
              Question {currentIndex + 1} of {totalQuestions} · {currentQuestion.mark} mark{currentQuestion.mark > 1 ? 's' : ''}
            </p>
            <button onClick={() => {
              const s = new Set(flagged);
              if (isFlagged) s.delete(currentQuestion.id); else s.add(currentQuestion.id);
              setFlagged(s);
            }}
              aria-pressed={isFlagged}
              className={`text-xs px-2.5 py-1 rounded border cursor-pointer ${isFlagged ? 'border-warning bg-warning/10 text-warning' : 'border-line hover:bg-surface-2 text-muted'}`}>
              {isFlagged ? 'Flagged' : 'Flag for review'}
            </button>
          </div>

          <p className="text-base font-medium text-ink mb-4 leading-relaxed whitespace-pre-wrap">{currentQuestion.body}</p>

          {currentQuestion.question_type === 'mcq' && currentQuestion.options && (
            <div role="radiogroup" aria-label="Choose one answer" className="space-y-2">
              {currentQuestion.options.map((opt, oi) => {
                const selected = answers[currentQuestion.id] === opt;
                return (
                  <button key={oi} role="radio" aria-checked={selected} onClick={() => setAnswer(currentQuestion.id, opt)}
                    className={`w-full text-left px-4 py-3 min-h-[48px] rounded border text-sm cursor-pointer ${
                      selected ? 'border-brand bg-brand-soft text-ink font-medium' : 'border-line bg-surface text-ink hover:bg-surface-2'
                    }`}>
                    <span className="font-semibold mr-2">{String.fromCharCode(65 + oi)}.</span>
                    {opt}
                  </button>
                );
              })}
            </div>
          )}

          {currentQuestion.question_type === 'true_false' && (
            <div role="radiogroup" aria-label="True or false" className="grid grid-cols-2 gap-3">
              {['True', 'False'].map(v => {
                const selected = answers[currentQuestion.id] === v;
                return (
                  <button key={v} role="radio" aria-checked={selected} onClick={() => setAnswer(currentQuestion.id, v)}
                    className={`px-4 py-3 min-h-[48px] rounded border text-sm cursor-pointer ${
                      selected ? 'border-brand bg-brand-soft text-ink font-medium' : 'border-line bg-surface text-ink hover:bg-surface-2'
                    }`}>
                    {v}
                  </button>
                );
              })}
            </div>
          )}

          {currentQuestion.question_type === 'short_answer' && (
            <div>
              <label htmlFor="short-answer" className="sr-only">Your answer</label>
              <textarea id="short-answer" value={answers[currentQuestion.id] || ''}
                onChange={e => setAnswer(currentQuestion.id, e.target.value)}
                placeholder="Type your answer here" rows={4}
                className="w-full px-4 py-3 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand resize-y min-h-[100px]" />
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <Button variant="secondary" onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))} disabled={currentIndex === 0}>Previous</Button>
        <span className="text-xs text-muted tabular-nums">{answeredCount} of {totalQuestions} answered</span>
        <Button variant="secondary" onClick={() => setCurrentIndex(Math.min(totalQuestions - 1, currentIndex + 1))} disabled={currentIndex === totalQuestions - 1}>Next</Button>
      </div>

      {submitting && (
        <div role="status" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-surface rounded p-8 text-center max-w-sm">
            <p className="text-sm font-semibold text-ink">Submitting your exam…</p>
            <p className="text-xs text-muted mt-1">Please wait. Do not close this page.</p>
          </div>
        </div>
      )}

      {showTabWarning && (
        <div role="alertdialog" aria-modal="true" aria-labelledby="tab-warning-title" className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-surface rounded p-6 max-w-md w-[90vw]">
            <h3 id="tab-warning-title" className="text-lg font-semibold text-ink mb-2">You left the exam window</h3>
            <p className="text-sm text-muted mb-2">Switching to another window or tab is not allowed.</p>
            <p className="text-sm font-medium text-danger mb-5">Your exam will now be submitted. This cannot be undone.</p>
            <Button onClick={() => { setShowTabWarning(false); void handleSubmit(); }} className="w-full bg-danger text-brand-ink">End exam</Button>
          </div>
        </div>
      )}

      {showConfirm && (
        <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowConfirm(false)}>
          <div className="bg-surface rounded p-6 max-w-md w-[90vw]" onClick={e => e.stopPropagation()}>
            {confirmUnanswered.length > 0 ? (
              <>
                <h3 id="confirm-title" className="text-base font-semibold text-ink mb-2">You have unanswered questions</h3>
                <p className="text-sm text-muted mb-3">
                  {confirmUnanswered.length} question{confirmUnanswered.length > 1 ? 's are' : ' is'} not answered:
                </p>
                <div className="flex flex-wrap gap-1 mb-5">
                  {confirmUnanswered.map(n => (
                    <button key={n} onClick={() => { setCurrentIndex(n - 1); setShowConfirm(false); }}
                      className="px-2 py-0.5 bg-warning/10 text-warning rounded text-xs font-medium cursor-pointer">{n}</button>
                  ))}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" onClick={() => setShowConfirm(false)}>Go back</Button>
                  <Button onClick={confirmSubmit}>Submit anyway</Button>
                </div>
              </>
            ) : (
              <>
                <h3 id="confirm-title" className="text-base font-semibold text-ink mb-2">Submit your exam?</h3>
                <p className="text-sm text-muted mb-5">You have answered every question. You cannot change answers after you submit.</p>
                <div className="flex gap-2 justify-end">
                  <Button variant="secondary" onClick={() => setShowConfirm(false)}>Cancel</Button>
                  <Button onClick={confirmSubmit}>Submit exam</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

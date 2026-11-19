'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError, type ExamResult } from '@/lib/api';
import { AnswerSaver, type SaveStatus } from '@/lib/autosave';
import {
  loadAttempt, saveQuestions, saveMeta, clearAttempt, secondsLeft, unsentAnswers, withTimeout,
  type LocalAttempt,
} from '@/lib/exam-store';
import { prepareOfflineShell } from '@/lib/offline-shell';
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
  offline: 'No connection. Keep going: your answers are kept on this device and will send when you are back online.',
};

const SAVE_TIMEOUT_MS = 15000;     // a request hanging on a weak connection is given up and retried
const SUBMIT_TIMEOUT_MS = 20000;
const SUBMIT_RETRY_MS = 8000;

/** The student's exam room: start or resume, answer with autosave, submit, see the result. */
export function ExamRoom({ backHref }: { backHref: string }) {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [screen, setScreen] = useState<Screen>('start');
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showNavigator, setShowNavigator] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  const [displayTime, setDisplayTime] = useState<number | null>(null);
  // When time runs out, by this device's clock. Counting down from this (not by subtracting a
  // second per tick) keeps the clock right through a sleeping tab, a reload or no connection.
  const endsAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const tabSwitchesRef = useRef(0);
  const finishedInTimeRef = useRef(true);
  const sessionIdRef = useRef<string | null>(null);
  const [waiting, setWaiting] = useState(false);          // submitted here, not yet confirmed by the server
  const [pendingCount, setPendingCount] = useState(0);
  const [hasLocal, setHasLocal] = useState(false);        // an unfinished exam is saved on this device
  const retryingRef = useRef(false);
  const saverRef = useRef<AnswerSaver | null>(null);
  const answersRef = useRef<Record<string, string>>({});
  const submittingRef = useRef(false);

  const [showTabWarning, setShowTabWarning] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmUnanswered, setConfirmUnanswered] = useState<number[]>([]);
  const [result, setResult] = useState<ExamResult | null>(null);

  // exam details for the start screen. With no connection, fall back to the copy saved on this device.
  useEffect(() => {
    if (!id) return;
    const local = loadAttempt(id);
    setHasLocal(!!local);
    (async () => {
      try {
        const e = await withTimeout(api.exams.get(id), SAVE_TIMEOUT_MS) as Exam;
        setExam(e);
        try { localStorage.setItem(`cbt-exam:${id}`, JSON.stringify(e)); } catch { /* optional */ }
      } catch (err) {
        if (err instanceof ApiError) {          // the server answered: this exam is not available
          toast.error('This exam is not available.');
          router.push(backHref);
          return;
        }
        try {                                   // no connection: use the details seen earlier
          const raw = localStorage.getItem(`cbt-exam:${id}`);
          if (raw) { setExam(JSON.parse(raw) as Exam); return; }
        } catch { /* fall through */ }
        setStartError('No connection. Check your internet and reload this page.');
      }
    })();
  }, [id, router, backHref]);

  // make the exam page able to reopen offline (production only)
  useEffect(() => { void prepareOfflineShell(); }, []);

  /** Write the running exam to this device. Cheap enough to call on every answer. */
  const persist = useCallback((extra: Partial<LocalAttempt> = {}) => {
    const sid = sessionIdRef.current;
    if (!id || !sid) return;
    saveMeta(id, {
      sessionId: sid,
      answers: answersRef.current,
      endsAt: endsAtRef.current,
      tabSwitches: tabSwitchesRef.current,
      submitPending: submittingRef.current,
      finishedInTime: finishedInTimeRef.current,
      ...extra,
    });
  }, [id]);

  const finish = useCallback((res: ExamResult) => {
    saverRef.current?.stop();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (id) clearAttempt(id);                 // the server has the result; the device copy is not needed
    setWaiting(false);
    setResult(res);
    setScreen('result');
  }, [id]);

  /** One try at handing in the exam. Returns true when the server has it. */
  const attemptSubmit = useCallback(async (): Promise<boolean> => {
    const sid = sessionIdRef.current;
    if (!sid || retryingRef.current) return false;
    retryingRef.current = true;
    try {
      await saverRef.current?.flush();              // best effort; the full set is sent below as well
      const res = await withTimeout(
        api.exams.submitExam(sid, answersRef.current, tabSwitchesRef.current, finishedInTimeRef.current),
        SUBMIT_TIMEOUT_MS);
      finish(res);
      return true;
    } catch {
      setWaiting(true);                             // keep the answers, keep trying
      return false;
    } finally { retryingRef.current = false; }
  }, [finish]);

  const handleSubmit = useCallback(async () => {
    if (submittingRef.current || !sessionIdRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    // Pressed before the clock reached zero, or the clock ran out here: either way it was in time.
    const left = secondsLeft(endsAtRef.current);
    finishedInTimeRef.current = left == null || left >= 0;
    persist({ submitPending: true, finishedInTime: finishedInTimeRef.current });
    await attemptSubmit();
  }, [attemptSubmit, persist]);

  /** Open the exam room with this data. Used for a normal start, a resume, and an offline resume. */
  const enterExam = useCallback((o: {
    sessionId: string; questions: Question[]; answers: Record<string, string>;
    endsAt: number | null; unsent: Record<string, string>; tabSwitches: number; submitPending: boolean;
  }) => {
    sessionIdRef.current = o.sessionId;
    setQuestions(o.questions);
    setAnswers(o.answers);
    answersRef.current = o.answers;
    tabSwitchesRef.current = o.tabSwitches;
    endsAtRef.current = o.endsAt;
    setDisplayTime(secondsLeft(o.endsAt));

    const firstOpen = o.questions.findIndex(q => !o.answers[q.id]);       // pick up where the student stopped
    setCurrentIndex(firstOpen === -1 ? 0 : firstOpen);

    saveQuestions(id, o.questions);
    saverRef.current = new AnswerSaver({
      send: batch => withTimeout(api.exams.saveAnswers(o.sessionId, batch), SAVE_TIMEOUT_MS),
      onStatus: setSaveStatus,
      onReply: reply => {
        // the server clock wins whenever we can reach it
        if (reply.time_remaining != null) endsAtRef.current = Date.now() + reply.time_remaining * 1000;
        if (reply.expired) endsAtRef.current = Date.now();
        persist();
        if (reply.closed) finish(reply as ExamResult);
      },
    });
    // anything typed on this device that the server may not have yet
    for (const [q, a] of Object.entries(o.unsent)) saverRef.current.queue(q, a);
    persist({ submitPending: o.submitPending });
    setScreen('exam');
    if (o.submitPending) {                  // the student had already submitted; finish the hand-in
      submittingRef.current = true;
      setSubmitting(true);
      void attemptSubmit();
    }
  }, [id, persist, finish, attemptSubmit]);

  const handleStart = useCallback(async () => {
    if (!id) return;
    setStarting(true);
    setStartError(null);
    const local = loadAttempt(id);
    try {
      const session = await withTimeout(api.exams.startExam(id), SAVE_TIMEOUT_MS);
      const qs = session.questions as Question[];
      const serverAnswers = session.saved_answers || {};
      // the copy on this device only counts if it is the same attempt
      const mine = local && local.sessionId === session.session_id ? local : null;
      if (local && !mine) clearAttempt(id);
      const answers = { ...serverAnswers, ...(mine?.answers || {}) };
      if (Object.keys(answers).length > 0) toast.success('Welcome back. Your saved answers are restored.');
      if (mine) finishedInTimeRef.current = mine.finishedInTime;
      enterExam({
        sessionId: session.session_id, questions: qs, answers,
        endsAt: session.time_remaining == null ? null : Date.now() + session.time_remaining * 1000,
        unsent: unsentAnswers(answers, serverAnswers),
        tabSwitches: mine?.tabSwitches || 0,
        submitPending: !!mine?.submitPending,
      });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        // The server gave a real answer (already submitted, not open, not yours). The device copy is out of date.
        clearAttempt(id);
        setStartError(err.message);
      } else if (local) {
        // No connection, but this exam was already opened here: carry on from the device copy.
        toast('No connection. Continuing from this device. Your answers will send when you are back online.', { icon: '⚠️' });
        finishedInTimeRef.current = local.finishedInTime;
        enterExam({
          sessionId: local.sessionId, questions: local.questions as Question[], answers: local.answers,
          endsAt: local.endsAt, unsent: local.answers, tabSwitches: local.tabSwitches,
          submitPending: local.submitPending,
        });
      } else {
        setStartError('We could not reach the server. Check your internet and try again.');
      }
    }
    finally { setStarting(false); }
  }, [id, enterExam]);

  const setAnswer = useCallback((questionId: string, value: string) => {
    const next = { ...answersRef.current, [questionId]: value };
    answersRef.current = next;                   // updated now, so the copy below is never one answer behind
    setAnswers(next);
    persist();                                 // on this device first, so a crash or reload loses nothing
    saverRef.current?.queue(questionId, value);
  }, [persist]);

  // one clock tick per second, read from the end time so a slept tab or a reload cannot drift
  useEffect(() => {
    if (screen !== 'exam' || submitting) return;
    timerRef.current = setInterval(() => {
      const left = secondsLeft(endsAtRef.current);
      if (left == null) return;
      setDisplayTime(left);
      if (left <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        void handleSubmit();
      }
    }, 1000);
    return () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; } };
  }, [screen, submitting, handleSubmit]);

  // when the connection comes back: send what is waiting and finish a pending hand-in
  useEffect(() => {
    if (screen !== 'exam') return;
    const online = () => {
      if (submittingRef.current) void attemptSubmit();
      else void saverRef.current?.flush();
    };
    const offline = () => setSaveStatus('offline');
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, [screen, attemptSubmit]);

  // a hand-in that could not reach the server keeps trying by itself
  useEffect(() => {
    if (!waiting) return;
    setPendingCount(Object.keys(answersRef.current).length);
    const t = setInterval(() => { void attemptSubmit(); }, SUBMIT_RETRY_MS);
    return () => clearInterval(t);
  }, [waiting, attemptSubmit]);

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
            <li>Your answers are saved as you go. If your connection drops, keep answering: they are kept on this device and sent when you are back online.</li>
            <li>The clock keeps running if the connection drops. Do not close the page or clear your browser data until the exam is submitted.</li>
            <li>Leaving this window ends the exam.</li>
          </ul>
          {startError && (
            <div role="alert" className="mb-4 text-[13px] text-danger bg-danger-soft border border-danger/30 rounded px-3 py-2">{startError}</div>
          )}
          <Button onClick={handleStart} disabled={starting || !exam} className="w-full">
            {starting ? 'Starting…' : hasLocal ? 'Continue exam' : 'Start exam'}
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
            {waiting ? (
              <>
                <p className="text-sm font-semibold text-ink">Waiting for the connection</p>
                <p className="text-xs text-muted mt-2">
                  Your exam is finished and your {pendingCount} answer{pendingCount === 1 ? ' is' : 's are'} saved on this device.
                  It will be sent as soon as you are online. Keep this page open.
                </p>
                <Button onClick={() => { void attemptSubmit(); }} className="mt-4">Try again now</Button>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold text-ink">Submitting your exam…</p>
                <p className="text-xs text-muted mt-1">Please wait. Do not close this page.</p>
              </>
            )}
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

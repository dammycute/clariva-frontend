/**
 * A copy of the student's running exam, kept on their device.
 *
 * If the connection drops and the page is reloaded or the browser closes, the exam can be opened
 * again and carry on from here. It holds the questions the server already sent (never the
 * answer key) and the answers the student typed. It is removed once the server has the result,
 * and on logout.
 */

const ATTEMPT = 'cbt-attempt:';
const QUESTIONS = 'cbt-questions:';

export interface LocalAttempt {
  sessionId: string;
  questions: unknown[];
  answers: Record<string, string>;
  /** When the time runs out, by this device's clock (ms). Null when the exam has no time limit. */
  endsAt: number | null;
  tabSwitches: number;
  /** The student pressed Submit (or time ran out) but the server has not confirmed it yet. */
  submitPending: boolean;
  /** The student finished before the clock reached zero. Sent along so an offline hand-in is not marked late. */
  finishedInTime: boolean;
}

type Meta = Omit<LocalAttempt, 'questions'>;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch { return null; }
}

function write(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked: the exam still works online */ }
}

export function loadAttempt(examId: string): LocalAttempt | null {
  const meta = read<Meta>(ATTEMPT + examId);
  const questions = read<unknown[]>(QUESTIONS + examId);
  if (!meta || !questions || !meta.sessionId) return null;
  return { ...meta, questions };
}

/** Save the questions once, when the attempt opens. */
export function saveQuestions(examId: string, questions: unknown[]): void {
  write(QUESTIONS + examId, questions);
}

/** Save everything except the questions. Small, so it is safe to call on every answer. */
export function saveMeta(examId: string, meta: Meta): void {
  write(ATTEMPT + examId, meta);
}

export function clearAttempt(examId: string): void {
  try {
    localStorage.removeItem(ATTEMPT + examId);
    localStorage.removeItem(QUESTIONS + examId);
  } catch { /* nothing to clear */ }
}

/** Remove every saved attempt on this device (used at logout). */
export function clearAllAttempts(): void {
  try {
    const doomed: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith(ATTEMPT) || k.startsWith(QUESTIONS))) doomed.push(k);
    }
    doomed.forEach(k => localStorage.removeItem(k));
  } catch { /* nothing to clear */ }
}

/** Seconds left by the device clock, never below zero. Null when there is no time limit. */
export function secondsLeft(endsAt: number | null, now: number = Date.now()): number | null {
  if (endsAt == null) return null;
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

/** The answers the server does not have yet (new or different). Local values are the newest. */
export function unsentAnswers(local: Record<string, string>, server: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [q, a] of Object.entries(local)) if (server[q] !== a) out[q] = a;
  return out;
}

/** Give up waiting for a request that is hanging on a weak connection. The caller retries. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      v => { clearTimeout(timer); resolve(v); },
      e => { clearTimeout(timer); reject(e); },
    );
  });
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'offline';

export interface SaveReply {
  closed: boolean;
  time_remaining?: number | null;
}

interface Options<R extends SaveReply> {
  /** Sends a batch of answers ({ question id: answer }) to the server. Must reject on failure. */
  send: (answers: Record<string, string>) => Promise<R>;
  onStatus?: (status: SaveStatus) => void;
  /** Called with every successful reply (for example to sync the clock). */
  onReply?: (reply: R) => void;
  /** How long to wait after the last change before sending. Default 1500 ms. */
  delayMs?: number;
  /** Longest wait between retries when the connection is down. Default 30 s. */
  maxRetryMs?: number;
}

/**
 * Collects answers as a student types and sends them in small batches. When the connection
 * drops it keeps the answers, shows "offline", and retries with a growing delay. An answer
 * typed while a send is failing is never lost: the newest value for a question always wins.
 */
export class AnswerSaver<R extends SaveReply = SaveReply> {
  private pending: Record<string, string> = {};
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Promise<boolean> | null = null;
  private failures = 0;
  private stopped = false;

  constructor(private readonly opts: Options<R>) {}

  /** Record an answer. It is sent after a short pause. */
  queue(questionId: string, answer: string): void {
    if (this.stopped) return;
    this.pending[questionId] = answer;
    this.opts.onStatus?.('saving');
    this.schedule(this.opts.delayMs ?? 1500);
  }

  hasPending(): boolean {
    return Object.keys(this.pending).length > 0;
  }

  /** Send everything now. Resolves true when nothing is left waiting, false if the send failed. */
  async flush(): Promise<boolean> {
    this.clearTimer();
    while (!this.stopped && this.hasPending()) {
      const ok = await this.sendOnce();
      if (!ok) return false;
    }
    return true;
  }

  /** Stop all sending and timers (the attempt is over). */
  stop(): void {
    this.stopped = true;
    this.clearTimer();
  }

  private async sendOnce(): Promise<boolean> {
    if (this.inFlight) await this.inFlight;
    if (!this.hasPending()) return true;

    const batch = this.pending;
    this.pending = {};
    this.opts.onStatus?.('saving');

    this.inFlight = (async () => {
      try {
        const reply = await this.opts.send(batch);
        this.failures = 0;
        this.opts.onStatus?.(this.hasPending() ? 'saving' : 'saved');
        this.opts.onReply?.(reply);
        return true;
      } catch {
        // Put the batch back. Anything typed meanwhile is newer, so it wins.
        this.pending = { ...batch, ...this.pending };
        this.failures += 1;
        this.opts.onStatus?.('offline');
        const wait = Math.min(3000 * 2 ** (this.failures - 1), this.opts.maxRetryMs ?? 30000);
        this.schedule(wait);
        return false;
      } finally {
        this.inFlight = null;
      }
    })();
    return this.inFlight;
  }

  private schedule(ms: number): void {
    this.clearTimer();
    if (this.stopped) return;
    this.timer = setTimeout(() => { void this.flush(); }, ms);
  }

  private clearTimer(): void {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
  }
}

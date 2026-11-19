import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AnswerSaver, type SaveReply, type SaveStatus } from '@/lib/autosave';

const ok: SaveReply = { closed: false, time_remaining: 100 };

describe('AnswerSaver', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('sends several quick answers as one batch after a short pause', async () => {
    const send = vi.fn().mockResolvedValue(ok);
    const saver = new AnswerSaver({ send, delayMs: 1000 });
    saver.queue('q1', 'a');
    saver.queue('q2', 'b');
    saver.queue('q1', 'c');                       // changed their mind: the newest value wins
    expect(send).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1000);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({ q1: 'c', q2: 'b' });
    expect(saver.hasPending()).toBe(false);
  });

  it('reports saving, then saved', async () => {
    const seen: SaveStatus[] = [];
    const saver = new AnswerSaver({ send: vi.fn().mockResolvedValue(ok), delayMs: 500, onStatus: s => seen.push(s) });
    saver.queue('q1', 'a');
    await vi.advanceTimersByTimeAsync(500);
    expect(seen[0]).toBe('saving');
    expect(seen[seen.length - 1]).toBe('saved');
  });

  it('keeps the answers and goes offline when a send fails, then retries and succeeds', async () => {
    const send = vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue(ok);
    const seen: SaveStatus[] = [];
    const saver = new AnswerSaver({ send, delayMs: 500, onStatus: s => seen.push(s) });
    saver.queue('q1', 'a');
    await vi.advanceTimersByTimeAsync(500);       // first send fails
    expect(seen).toContain('offline');
    expect(saver.hasPending()).toBe(true);
    await vi.advanceTimersByTimeAsync(3000);      // first retry waits 3 s
    expect(send).toHaveBeenCalledTimes(2);
    expect(send).toHaveBeenLastCalledWith({ q1: 'a' });
    expect(saver.hasPending()).toBe(false);
    expect(seen[seen.length - 1]).toBe('saved');
  });

  it('does not lose an answer typed while a send is failing, and the newest value wins', async () => {
    let fail = true;
    const send = vi.fn(async (answers: Record<string, string>) => {
      if (fail) { saver.queue('q1', 'newer'); throw new Error('network'); }
      return { ...ok, echoed: answers } as SaveReply;
    });
    const saver = new AnswerSaver({ send, delayMs: 500 });
    saver.queue('q1', 'older');
    saver.queue('q2', 'b');
    await vi.advanceTimersByTimeAsync(500);
    fail = false;
    await vi.advanceTimersByTimeAsync(3000);
    expect(send).toHaveBeenLastCalledWith({ q1: 'newer', q2: 'b' });
  });

  it('waits longer between retries while the connection stays down, up to a limit', async () => {
    const send = vi.fn().mockRejectedValue(new Error('network'));
    const saver = new AnswerSaver({ send, delayMs: 100, maxRetryMs: 8000 });
    saver.queue('q1', 'a');
    await vi.advanceTimersByTimeAsync(100);       // try 1 fails
    await vi.advanceTimersByTimeAsync(3000);      // try 2 fails, next wait 6 s
    await vi.advanceTimersByTimeAsync(6000);      // try 3 fails, next wait capped at 8 s
    expect(send).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(7999);
    expect(send).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(1);
    expect(send).toHaveBeenCalledTimes(4);
    saver.stop();
  });

  it('flush sends at once and reports whether it worked', async () => {
    const send = vi.fn().mockResolvedValue(ok);
    const saver = new AnswerSaver({ send, delayMs: 60000 });
    saver.queue('q1', 'a');
    await expect(saver.flush()).resolves.toBe(true);
    expect(send).toHaveBeenCalledTimes(1);

    const failing = new AnswerSaver({ send: vi.fn().mockRejectedValue(new Error('x')), delayMs: 60000 });
    failing.queue('q1', 'a');
    await expect(failing.flush()).resolves.toBe(false);
    failing.stop();
  });

  it('passes every reply on, so the page can sync the clock or end the attempt', async () => {
    const replies: SaveReply[] = [];
    const saver = new AnswerSaver({
      send: vi.fn().mockResolvedValue({ closed: true, time_remaining: 0 }),
      delayMs: 100, onReply: r => replies.push(r),
    });
    saver.queue('q1', 'a');
    await vi.advanceTimersByTimeAsync(100);
    expect(replies).toEqual([{ closed: true, time_remaining: 0 }]);
  });

  it('sends nothing after stop', async () => {
    const send = vi.fn().mockResolvedValue(ok);
    const saver = new AnswerSaver({ send, delayMs: 100 });
    saver.queue('q1', 'a');
    saver.stop();
    saver.queue('q2', 'b');
    await vi.advanceTimersByTimeAsync(5000);
    expect(send).not.toHaveBeenCalled();
  });
});

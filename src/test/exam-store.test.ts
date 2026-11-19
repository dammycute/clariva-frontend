import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  loadAttempt, saveQuestions, saveMeta, clearAttempt, clearAllAttempts,
  secondsLeft, unsentAnswers, withTimeout,
} from '@/lib/exam-store';

const meta = {
  sessionId: 's1', answers: { q1: 'A' }, endsAt: 1_000_000, tabSwitches: 0,
  submitPending: false, finishedInTime: true,
};

describe('device copy of a running exam', () => {
  beforeEach(() => { localStorage.clear(); });

  it('brings back the questions and answers after a reload', () => {
    saveQuestions('e1', [{ id: 'q1', body: 'Q?' }]);
    saveMeta('e1', meta);
    const back = loadAttempt('e1');
    expect(back?.sessionId).toBe('s1');
    expect(back?.answers).toEqual({ q1: 'A' });
    expect(back?.questions).toHaveLength(1);
  });

  it('is empty when nothing was saved, or only half was', () => {
    expect(loadAttempt('e1')).toBeNull();
    saveMeta('e1', meta);                      // no questions saved
    expect(loadAttempt('e1')).toBeNull();
  });

  it('keeps each exam apart and clears one or all', () => {
    saveQuestions('e1', []); saveMeta('e1', meta);
    saveQuestions('e2', []); saveMeta('e2', { ...meta, sessionId: 's2' });
    clearAttempt('e1');
    expect(loadAttempt('e1')).toBeNull();
    expect(loadAttempt('e2')?.sessionId).toBe('s2');
    clearAllAttempts();
    expect(loadAttempt('e2')).toBeNull();
  });

  it('does not touch other saved things when clearing', () => {
    localStorage.setItem('theme', 'dark');
    saveQuestions('e1', []); saveMeta('e1', meta);
    clearAllAttempts();
    expect(localStorage.getItem('theme')).toBe('dark');
  });
});

describe('time left', () => {
  it('counts down from the end time and stops at zero', () => {
    expect(secondsLeft(10_000, 4_000)).toBe(6);
    expect(secondsLeft(10_000, 10_000)).toBe(0);
    expect(secondsLeft(10_000, 99_000)).toBe(0);
  });
  it('is null when there is no time limit', () => {
    expect(secondsLeft(null)).toBeNull();
  });
});

describe('answers the server may not have', () => {
  it('lists new and changed answers only', () => {
    expect(unsentAnswers({ q1: 'A', q2: 'B', q3: 'C' }, { q1: 'A', q2: 'X' })).toEqual({ q2: 'B', q3: 'C' });
  });
  it('is empty when the server is up to date', () => {
    expect(unsentAnswers({ q1: 'A' }, { q1: 'A' })).toEqual({});
  });
});

describe('withTimeout', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('passes a quick answer through', async () => {
    await expect(withTimeout(Promise.resolve(5), 1000)).resolves.toBe(5);
  });
  it('gives up on a request that hangs', async () => {
    const hang = new Promise<number>(() => undefined);
    const p = withTimeout(hang, 1000);
    const assertion = expect(p).rejects.toThrow('timeout');
    await vi.advanceTimersByTimeAsync(1000);
    await assertion;
  });
});

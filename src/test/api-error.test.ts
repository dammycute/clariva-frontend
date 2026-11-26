import { describe, it, expect, vi, afterEach } from 'vitest';
import { ApiError, request } from '@/lib/api';

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn(), success: vi.fn() } }));

const reply = (body: unknown, status: number) =>
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })));

describe('server errors', () => {
  afterEach(() => { vi.unstubAllGlobals(); });

  it('shows the sentence the server sent, and keeps its code for the program', async () => {
    reply({ detail: 'Your plan covers 60 students.', code: 'student_limit' }, 409);
    const err = (await request('POST', '/students/', {}).catch((e: unknown) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe('Your plan covers 60 students.');
    expect(err.code).toBe('student_limit');
  });

  it('still shows field errors from a form', async () => {
    reply({ email: ['Enter a valid email address.'] }, 400);
    const err = (await request('POST', '/x/', {}).catch((e: unknown) => e)) as ApiError;
    expect(err.message).toBe('Email: Enter a valid email address.');
    expect(err.code).toBeUndefined();
  });
});

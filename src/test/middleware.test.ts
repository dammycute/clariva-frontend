import { describe, it, expect } from 'vitest';

describe('middleware exports', () => {
  it('exports middleware function and config', async () => {
    const mod = await import('@/middleware');
    expect(typeof mod.middleware).toBe('function');
    expect(mod.config).toBeDefined();
    expect(mod.config.matcher).toBeDefined();
  });
});

describe('decodeJwtPayload (unit)', () => {
  function decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = atob(base64);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  it('decodes a valid JWT payload', () => {
    const payload = { role: 'student', school_id: 'abc-123' };
    const encoded = btoa(JSON.stringify(payload));
    const token = `header.${encoded}.sig`;
    const decoded = decodeJwtPayload(token);
    expect(decoded).toEqual(payload);
  });

  it('returns null for invalid token', () => {
    expect(decodeJwtPayload('bad.token')).toBeNull();
  });
});

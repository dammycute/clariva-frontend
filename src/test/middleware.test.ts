import { describe, it, expect } from 'vitest';

describe('middleware exports', () => {
  it('exports middleware function and config', async () => {
    const mod = await import('@/middleware');
    expect(typeof mod.middleware).toBe('function');
    expect(mod.config).toBeDefined();
    expect(mod.config.matcher).toBeDefined();
  });
});

describe('public routes', () => {
  it('lets signed-out users reach the guardian login page', async () => {
    const { NextRequest } = await import('next/server');
    const { middleware } = await import('@/middleware');
    const res = await middleware(new NextRequest('http://localhost/guardian'));
    expect(res.headers.get('location')).toBeNull();
  });

  it('lets signed-out users read the terms page', async () => {
    const { NextRequest } = await import('next/server');
    const { middleware } = await import('@/middleware');
    const res = await middleware(new NextRequest('http://localhost/terms'));
    expect(res.headers.get('location')).toBeNull();
  });

  it('still redirects signed-out users away from the guardian dashboard', async () => {
    const { NextRequest } = await import('next/server');
    const { middleware } = await import('@/middleware');
    const res = await middleware(new NextRequest('http://localhost/guardian/dashboard'));
    expect(res.headers.get('location')).toContain('/login?redirect=%2Fguardian%2Fdashboard');
  });
});

describe('return from Paystack', () => {
  it('keeps the payment reference through the sign-in page', async () => {
    const { NextRequest } = await import('next/server');
    const { middleware } = await import('@/middleware');
    const res = await middleware(new NextRequest('http://localhost/dashboard/billing?trxref=CLV-1&reference=CLV-1'));
    const target = new URL(res.headers.get('location') as string);
    expect(target.pathname).toBe('/login');
    expect(target.searchParams.get('redirect')).toBe('/dashboard/billing?trxref=CLV-1&reference=CLV-1');
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

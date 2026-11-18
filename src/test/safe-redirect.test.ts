import { describe, it, expect } from 'vitest';
import { safeRedirect } from '@/lib/safe-redirect';

describe('safeRedirect', () => {
  it('allows same-site paths, including query strings', () => {
    expect(safeRedirect('/dashboard/fees')).toBe('/dashboard/fees');
    expect(safeRedirect('/dashboard/grades?tab=reports')).toBe('/dashboard/grades?tab=reports');
  });

  it('rejects other sites and tricks', () => {
    expect(safeRedirect('https://evil.example')).toBeNull();
    expect(safeRedirect('//evil.example')).toBeNull();
    expect(safeRedirect('/\\evil.example')).toBeNull();
    expect(safeRedirect('javascript:alert(1)')).toBeNull();
    expect(safeRedirect('/ok\nLocation: x')).toBeNull();
  });

  it('rejects empty values and the login page', () => {
    expect(safeRedirect(null)).toBeNull();
    expect(safeRedirect('')).toBeNull();
    expect(safeRedirect('/')).toBeNull();
  });
});

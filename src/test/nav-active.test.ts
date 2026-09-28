import { describe, it, expect } from 'vitest';
import { navScore, findActiveHref, hrefParts } from '@/lib/nav-active';

const DASHBOARD = '/dashboard';
const STUDENTS = '/dashboard/students';
const CLASSES = '/dashboard/students?tab=classes';
const GRADES = '/dashboard/grades';

describe('hrefParts', () => {
  it('splits path and query params', () => {
    const { path, params } = hrefParts(CLASSES);
    expect(path).toBe('/dashboard/students');
    expect(params.get('tab')).toBe('classes');
  });

  it('handles hrefs without query', () => {
    const { path, params } = hrefParts(STUDENTS);
    expect(path).toBe('/dashboard/students');
    expect([...params.entries()]).toEqual([]);
  });
});

describe('navScore', () => {
  it('matches exact path', () => {
    expect(navScore(STUDENTS, '/dashboard/students', '')).toBeGreaterThan(0);
  });

  it('matches on segment boundary only', () => {
    expect(navScore(STUDENTS, '/dashboard/students/abc', '')).toBeGreaterThan(0);
    expect(navScore(STUDENTS, '/dashboard/studentsXYZ', '')).toBe(0);
  });

  it('requires query params in href to be present in search', () => {
    expect(navScore(CLASSES, '/dashboard/students', 'tab=classes')).toBeGreaterThan(0);
    expect(navScore(CLASSES, '/dashboard/students', 'tab=subjects')).toBe(0);
    expect(navScore(CLASSES, '/dashboard/students', '')).toBe(0);
  });

  it('matches "/" exactly only', () => {
    expect(navScore('/', '/', '')).toBeGreaterThan(0);
    expect(navScore('/', '/dashboard', '')).toBe(0);
  });
});

describe('findActiveHref', () => {
  const hrefs = [DASHBOARD, STUDENTS, CLASSES, GRADES];

  it('prefers specific item over dashboard prefix match', () => {
    expect(findActiveHref(hrefs, '/dashboard/classes', '')).toBe(DASHBOARD);
    expect(findActiveHref(hrefs, '/dashboard/grades', '')).toBe(GRADES);
    expect(findActiveHref(hrefs, '/dashboard/students', '')).toBe(STUDENTS);
  });

  it('activates classes link only when tab matches', () => {
    expect(findActiveHref(hrefs, '/dashboard/students', 'tab=classes')).toBe(CLASSES);
    expect(findActiveHref(hrefs, '/dashboard/students', 'tab=subjects')).toBe(STUDENTS);
    expect(findActiveHref(hrefs, '/dashboard/students', '')).toBe(STUDENTS);
  });

  it('activates dashboard only on root dashboard', () => {
    expect(findActiveHref(hrefs, '/dashboard', '')).toBe(DASHBOARD);
    expect(findActiveHref(hrefs, '/dashboard/students/abc-123', '')).toBe(STUDENTS);
  });

  it('returns null when nothing matches', () => {
    expect(findActiveHref(hrefs, '/bursary/invoices', '')).toBeNull();
  });

  it('never activates two items at once', () => {
    for (const [path, search] of [['/dashboard', ''], ['/dashboard/students', 'tab=classes'], ['/dashboard/students', '']] as const) {
      const matches = hrefs.filter(h => navScore(h, path, search) > 0);
      const active = findActiveHref(hrefs, path, search);
      expect(active).not.toBeNull();
      expect(matches).toContain(active);
      expect(matches.filter(h => h === active)).toHaveLength(1);
    }
  });
});

import { request } from '@/lib/api';
import type { School } from '@/types/school';

/** A school as the console sees it: the shared School type plus its billing fields. */
export type AdminSchool = School & {
  trial_ends_at: string | null;
  single_device_students?: boolean;
  paid_blocks?: number;
  access_until?: string | null;
  declared_students?: number;
};

export const PLANS = ['trial', 'basic', 'standard', 'premium'] as const;
export const TERMS = ['1st Term', '2nd Term', '3rd Term'] as const;

/** Onboarding gives every school 30 days; older rows have no `trial_ends_at`, so we fall back to created_at. */
export const TRIAL_DAYS = 30;

export const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`;

export const shortDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const dateTime = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—';

export type Tone = 'success' | 'warning' | 'danger' | 'muted';

export const TONE_CLASS: Record<Tone, string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger-soft text-danger',
  muted: 'bg-surface-2 text-muted',
};

/** Where a school stands on paying, from the same fields the API returns. */
export function trialState(
  school: Pick<AdminSchool, 'status' | 'created_at' | 'trial_ends_at'> & { access_until?: string | null },
): { label: string; tone: Tone; daysLeft: number | null } {
  if (school.status === 'suspended') return { label: 'Suspended', tone: 'danger', daysLeft: null };
  if (school.status === 'pending') return { label: 'Awaiting payment', tone: 'danger', daysLeft: null };
  if (school.access_until) {
    const daysLeft = Math.ceil((new Date(school.access_until).getTime() - Date.now()) / 86_400_000);
    if (daysLeft < 0) return { label: `Lapsed ${shortDate(school.access_until)}`, tone: 'danger', daysLeft };
    if (daysLeft <= 21) return { label: `${daysLeft} days to pay`, tone: 'warning', daysLeft };
    return { label: `Paid to ${shortDate(school.access_until)}`, tone: 'success', daysLeft };
  }
  const end = school.trial_ends_at
    ? new Date(school.trial_ends_at)
    : new Date(new Date(school.created_at).getTime() + TRIAL_DAYS * 86_400_000);
  const daysLeft = Math.ceil((end.getTime() - Date.now()) / 86_400_000);
  if (daysLeft < 0) return { label: `Trial ended ${shortDate(end.toISOString())}`, tone: 'danger', daysLeft };
  if (daysLeft === 0) return { label: 'Trial ends today', tone: 'warning', daysLeft };
  if (daysLeft <= 7) return { label: `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`, tone: 'warning', daysLeft };
  return { label: `Ends ${shortDate(end.toISOString())}`, tone: 'muted', daysLeft };
}

/** Every page of a list endpoint, so a console table is never cut off at the first page. */
export async function listAll<T>(path: string, maxPages = 20): Promise<T[]> {
  const all: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const data = await request<{ results?: T[]; next?: string | null } | T[]>(
      'GET',
      `${path}${sep}page_size=500&page=${page}`,
    );
    const rows = Array.isArray(data) ? data : data.results ?? [];
    all.push(...rows);
    if (Array.isArray(data) || !data.next) break;
  }
  return all;
}

/** Download one school's JSON backup. The API requires an explicit school_id for super admins. */
export async function downloadBackup(schoolId: string, filename: string) {
  const data = await request<Record<string, unknown>>('GET', `/schools/backup/?school_id=${schoolId}`);
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

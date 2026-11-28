import { request } from '@/lib/api';

/**
 * Billing rules, shared by the portal and the console.
 *
 * Deliberately separate from `lib/pricing.ts`: the landing page still quotes
 * "purely per 50" and is not part of this change.
 *
 * The 10 free places belong to the school once, not to every block: one block
 * covers 60 students, two cover 110, six cover 310. Past 10 students each block
 * is a full 50.
 */
export const PRICE_PER_BLOCK = 30000;
export const BLOCK_SIZE = 50;
export const BUFFER_STUDENTS = 10;
export const GRACE_DAYS = 21;

export function blocksForStudents(students: number): number {
  if (!Number.isFinite(students) || students < 1) return 0;
  return Math.max(1, Math.ceil(Math.max(students - BUFFER_STUDENTS, 1) / BLOCK_SIZE));
}

export const priceForStudents = (students: number) => blocksForStudents(students) * PRICE_PER_BLOCK;
export const placesForBlocks = (blocks: number) => blocks * BLOCK_SIZE + BUFFER_STUDENTS;

export const naira = (koboOrNaira: number, kobo = false): string => {
  const value = kobo ? koboOrNaira / 100 : koboOrNaira;
  return `₦${Math.round(value).toLocaleString('en-NG')}`;
};

export const shortDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export type BillingState = 'pending' | 'active' | 'grace' | 'lapsed' | 'suspended';

export type BillingTerm = {
  academic_year: string;
  term: string;
  resumes_on: string;
  provisional: boolean;
  next_academic_year: string;
  next_term: string;
  next_resumes_on: string;
  access_until: string;
};

export type BillingStatus = {
  school: {
    id: string; name: string; state: string | null; status: string;
    current_term: string; current_academic_year: string;
  };
  enforce: boolean;
  state: BillingState;
  access_until: string | null;
  students: number;
  declared_students: number;
  quote_students: number;
  paid_blocks: number;
  blocks_needed: number;
  limit: number;
  remaining: number;
  price_per_block: number;
  price_per_term: number;
  days_left: number | null;
  upgrade: { blocks: number; extra_blocks: number; amount: number } | null;
  next_term: BillingTerm | null;
  payment_opens_on: string | null;
  can_pay: boolean;
  blocked_reason: string | null;
  dates_provisional: boolean;
};

export type Payment = {
  id: string;
  school?: string;
  school_name?: string;
  reference: string;
  provider: 'paystack' | 'manual';
  kind: 'new' | 'renewal' | 'upgrade' | 'grant';
  status: 'pending' | 'paid' | 'failed' | 'abandoned';
  amount: number;
  blocks_after: number;
  students_at_payment: number;
  academic_year: string;
  term: string;
  covers_from: string;
  access_until: string;
  channel: string;
  paid_at: string | null;
  note: string;
  created_at: string;
};

export type StartedPayment = {
  reference: string;
  authorization_url: string | null;
  access_code: string | null;
  amount: number;
  blocks: number;
  students: number;
  kind: string;
  term: string;
  academic_year: string;
  covers_from: string;
  access_until: string;
};

async function list<T>(path: string): Promise<T[]> {
  const data = await request<{ results?: T[] } | T[]>('GET', path);
  return Array.isArray(data) ? data : data.results ?? [];
}

/** Sent on `window` once a payment is confirmed, so the tour can move on without a reload. */
export const BILLING_CHANGED = 'clarriva:billing-changed';

/** Why a school cannot pay right now, in words. */
export function blockedReason(status: BillingStatus): string {
  const reasons: Record<string, string> = {
    missing_calendar: "Your state's term dates are not published yet. We will contact you — you cannot pay for this term until they are.",
    window_closed: status.payment_opens_on
      ? `Payment for ${status.next_term?.term ?? 'the next term'} opens on ${shortDate(status.payment_opens_on)}.`
      : 'Payment is not open for this term yet.',
    no_students: 'Add your students first, so we know what to bill for.',
    suspended: 'This school account is suspended. Contact support.',
  };
  return reasons[status.blocked_reason || ''] || '';
}

export const billing = {
  status: () => request<BillingStatus>('GET', '/billing/status/'),
  payments: () => list<Payment>('/billing/payments/?page_size=100'),
  initialize: (payload: { kind: 'new' | 'renewal' | 'upgrade'; students?: number; callback_url?: string }) =>
    request<StartedPayment>('POST', '/billing/payments/initialize/', payload),
  verify: (reference: string) =>
    request<{ status: string; duplicate: boolean; payment: Payment }>(
      'POST', '/billing/payments/verify/', { reference },
    ),
};

export const billingAdmin = {
  payments: (school?: string) =>
    list<Payment>(`/billing/admin/payments/?page_size=100${school ? `&school=${school}` : ''}`),
  school: (id: string) => request<BillingStatus>('GET', `/billing/admin/schools/${id}/`),
  manual: (payload: {
    school: string; academic_year?: string; term?: string;
    students?: number; access_until?: string; note?: string;
  }) => request<Payment>('POST', '/billing/admin/payments/manual/', payload),
  setBlocks: (school: string, blocks: number) =>
    request<{ blocks: number; limit: number }>(
      'POST', `/billing/admin/schools/${school}/blocks/`, { blocks },
    ),
  calendars: (params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    return list<TermCalendarRow>(`/billing/calendars/${qs}`);
  },
  calendarsDue: () => request<CalendarsDue>('GET', '/billing/calendars/due/'),
  saveSessionDates: (payload: { states: string[]; dates: SessionDate[]; confirm_unusual?: boolean }) =>
    request<{ saved: number; extended_schools: number }>('POST', '/billing/calendars/bulk/', payload),
  reminderRecipients: () => request<Recipient[]>('GET', '/billing/calendars/recipients/'),
  saveReminderRecipients: (ids: string[]) =>
    request<Recipient[]>('PUT', '/billing/calendars/recipients/', { ids }),
  createCalendar: (payload: {
    state: string; school?: string | null; academic_year: string;
    term: string; resumes_on: string; provisional?: boolean; source_url?: string; confirm_unusual?: boolean;
  }) => request<TermCalendarRow>('POST', '/billing/calendars/', payload),
  updateCalendar: (id: string, payload: {
    resumes_on?: string; provisional?: boolean; source_url?: string; confirm_unusual?: boolean;
  }) =>
    request<TermCalendarRow>('PATCH', `/billing/calendars/${id}/`, payload),
  deleteCalendar: (id: string) => request<void>('DELETE', `/billing/calendars/${id}/`),
};

export type TermCalendarRow = {
  id: string;
  state: string;
  state_name: string;
  school: string | null;
  school_name: string | null;
  academic_year: string;
  term: string;
  resumes_on: string;
  provisional: boolean;
  source_url: string;
  confirmed_by_name: string | null;
  confirmed_at: string | null;
};

export type DueSlot = { academic_year: string; term: string };
export type CalendarsDue = {
  states: { id: string; name: string; schools: number; missing: DueSlot[]; unconfirmed: DueSlot[] }[];
  schools_without_state: string[];
  email_ready: boolean;
};
export type SessionDate = DueSlot & { resumes_on: string; provisional: boolean; source_url: string };
export type Recipient = { id: string; name: string; email: string; selected: boolean };

/** The one-line status the portal shows in its banner and on the billing page. */
export function stateLabel(state: BillingState): { text: string; tone: 'success' | 'warning' | 'danger' | 'muted' } {
  switch (state) {
    case 'active': return { text: 'Paid for this term', tone: 'success' };
    case 'grace': return { text: 'Payment window open', tone: 'warning' };
    case 'lapsed': return { text: 'Lapsed', tone: 'danger' };
    case 'pending': return { text: 'Awaiting payment', tone: 'danger' };
    case 'suspended': return { text: 'Suspended', tone: 'danger' };
    default: return { text: state, tone: 'muted' };
  }
}

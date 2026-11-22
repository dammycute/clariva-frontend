import toast from 'react-hot-toast';
import { clearAllAttempts } from '@/lib/exam-store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

export class ApiError extends Error {
  status: number;
  fields: Record<string, string[]>;
  constructor(message: string, status: number, fields: Record<string, string[]> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

const FIELD_LABELS: Record<string, string> = {
  username: 'Username',
  email: 'Email',
  user_email: 'Email',
  user_phone: 'Phone',
  phone: 'Phone',
  first_name: 'First name',
  last_name: 'Last name',
  staff_role: 'Role',
  role: 'Role',
  qualification: 'Qualification',
  date_joined: 'Date joined',
  subjects: 'Subjects',
  school: 'School',
  password: 'Password',
  name: 'Name',
  csv: 'CSV file',
};

function toMessages(val: unknown): string[] {
  if (val == null) return [];
  if (typeof val === 'string') return [val];
  if (Array.isArray(val)) return val.flatMap(v => toMessages(v));
  if (typeof val === 'object') {
    return Object.entries(val as Record<string, unknown>).flatMap(([k, v]) =>
      toMessages(v).map(m => `${k}: ${m}`),
    );
  }
  return [String(val)];
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  // Read from cookie only — no localStorage for access tokens
  const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string) {
  // Secure flags: HttpOnly cannot be set from JS, but server should set it.
  // SameSite=Strict prevents CSRF. Secure requires HTTPS in production.
  const isSecure = window.location.protocol === 'https:';
  document.cookie = `${name}=${value}; path=/; max-age=${2 * 60 * 60}; SameSite=Strict${isSecure ? '; Secure' : ''}`;
}
function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}
function setTokens(access: string, _refresh: string, role?: string) {
  setCookie('access_token', access);
  // Store refresh token in sessionStorage (not localStorage) for tab isolation
  sessionStorage.setItem('refresh_token', _refresh);
  if (role) sessionStorage.setItem('user_role', role);
}
/** A random id for this browser. It lets the server tell "same device signing in again" from "another device". */
function getDeviceId(): string {
  try {
    let id = localStorage.getItem('device-id');
    if (!id) {
      id = (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`).slice(0, 64);
      localStorage.setItem('device-id', id);
    }
    return id;
  } catch { return ''; }
}

const REPLACED_MESSAGE = 'You were signed out because your account was opened on another device.';

async function isSessionReplaced(res: Response): Promise<boolean> {
  try { return (await res.clone().json()).code === 'session_replaced'; } catch { return false; }
}

/** This student signed in somewhere else. Drop this device's sign-in and say why on the login page. */
function sessionReplaced() {
  clearTokens();
  if (typeof window !== 'undefined') window.location.assign('/login?reason=session_replaced');
}

function clearTokens() {
  sessionStorage.removeItem('refresh_token');
  sessionStorage.removeItem('user_role');
  deleteCookie('access_token');
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = _refreshToken();
  try { return await refreshPromise; } finally { refreshPromise = null; }
}

async function _refreshToken(): Promise<string | null> {
  const refresh = sessionStorage.getItem('refresh_token');
  if (!refresh) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) {
      if (res.status === 401 && await isSessionReplaced(res)) sessionReplaced();
      else clearTokens();
      return null;
    }
    const data = await res.json();
    setCookie('access_token', data.access);
    sessionStorage.setItem('refresh_token', data.refresh);
    return data.access;
  } catch {
    // No connection is not the same as a bad token. Keep the session so a student who drops
    // offline in the middle of an exam is not logged out.
    return null;
  }
}

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const isFormData = body instanceof FormData;
  const headers: Record<string, string> = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const fetchOpts: RequestInit = { method, headers };
  if (body !== undefined) {
    fetchOpts.body = isFormData ? body : JSON.stringify(body);
  }

  let res = await fetch(`${API_BASE}${path}`, fetchOpts);

  if (res.status === 401) {
    if (await isSessionReplaced(res)) {
      sessionReplaced();
      throw new ApiError(REPLACED_MESSAGE, 401);
    }
    const newToken = await refreshToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${path}`, { ...fetchOpts, headers });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const fields: Record<string, string[]> = {};
    let fallback = '';
    for (const [key, val] of Object.entries(err as Record<string, unknown>)) {
      const msgs = toMessages(val);
      if (key === 'detail' || key === 'error') {
        fallback = msgs.join(' ');
        continue;
      }
      if (key === 'non_field_errors') {
        fallback = fallback || msgs.join(' ');
        continue;
      }
      if (msgs.length) fields[key] = msgs;
    }
    const shown = Object.entries(fields)
      .slice(0, 3)
      .map(([k, v]) => `${FIELD_LABELS[k] || k}: ${v[0]}`);
    const extra = Object.keys(fields).length - shown.length;
    let msg = shown.join(' · ');
    if (extra > 0) msg += ` (+${extra} more)`;
    if (!msg) msg = fallback || 'Request failed';
    toast.error(msg);
    throw new ApiError(msg, res.status, fields);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export { request, setTokens };

export const auth = {
  async login(email: string, password: string) {
    const data = await request<{ access: string; refresh: string; role?: string }>('POST', '/auth/login/', { email, password, device_id: getDeviceId() });
    setTokens(data.access, data.refresh, data.role);
    return data;
  },
  async studentLogin(studentId: string, password: string) {
    const data = await request<{ access: string; refresh: string; role?: string }>('POST', '/auth/student-login/', { student_id: studentId, password, device_id: getDeviceId() });
    setTokens(data.access, data.refresh, data.role);
    return data;
  },
  async onboard(payload: Record<string, unknown>) {
    const data = await request<{ user: Record<string, unknown>; access: string; refresh: string }>('POST', '/auth/onboard/', payload);
    setTokens(data.access, data.refresh, 'school_admin');
    return data;
  },
  async adminCreateUser(payload: Record<string, unknown>) {
    return request<Record<string, unknown>>('POST', '/auth/admin/create-user/', payload);
  },
  async me() {
    return request<{ id: number; email: string; first_name: string; last_name: string; phone: string | null; role: string; school_id: number | null }>('GET', '/auth/me/');
  },
  logout() {
    const refresh = typeof window !== 'undefined' ? sessionStorage.getItem('refresh_token') : null;
    // Best-effort server-side revoke; local state is cleared regardless.
    if (refresh) void request('POST', '/auth/logout/', { refresh }).catch(() => undefined);
    clearTokens();
    clearAllAttempts();   // do not leave a student's exam copy on a shared computer
    try { localStorage.removeItem('portal-last-user'); } catch { /* nothing to clear */ }
  },
  getToken,
  getRole: () => typeof window !== 'undefined' ? sessionStorage.getItem('user_role') : null,
};

function unwrap<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && 'results' in (data as Record<string, unknown>)) {
    return (data as { results: T[] }).results;
  }
  return [];
}

function createApi<T = unknown>(basePath: string) {
  const id = (p: string) => `${basePath}${p}/`.replace('//', '/');
  return {
    // The server sends results in pages. Read every page so lists are never cut off at the first one.
    list: async (params?: Record<string, string>) => {
      const all: T[] = [];
      for (let page = 1; page <= 100; page++) {
        const qs = '?' + new URLSearchParams({ page_size: '500', ...params, page: String(page) }).toString();
        const data = await request<unknown>('GET', `${basePath}${qs}`);
        all.push(...unwrap<T>(data));
        const next = data && typeof data === 'object' ? (data as { next?: string | null }).next : null;
        if (!next) break;
      }
      return all;
    },
    get: (pk: number | string) => request<T>('GET', id(`${pk}`)),
    create: (data: Partial<T>) => request<T>('POST', basePath, data),
    update: (pk: number | string, data: Partial<T>) => request<T>('PATCH', id(`${pk}`), data),
    patch: (pk: number | string, data: Partial<T>) => request<T>('PATCH', id(`${pk}`), data),
    delete: (pk: number | string) => request<void>('DELETE', id(`${pk}`)),
  };
}

export const portal = {
  lookup: (params: { code?: string } | { admission_no?: string }) => request<{
    student_id: string; full_name: string; admission_no: string; class_name: string | null;
    status: string; school_name: string | null;
    fee_summary: {
      total_due: number; total_paid: number; balance: number; status: string;
      items: { description: string; amount_due: number; amount_paid: number }[];
    };
    latest_report_card: {
      term: string; academic_year: string; average: number | null;
      class_rank: number | null;
      subjects: { name: string; score: number; grade: string }[];
    } | null;
    attendance: {
      rate: number | null; present: number; absent: number; late: number; total: number;
    };
    recent_notifications: { id: string; type: string; title: string; message: string; read: boolean; created_at: string }[];
  }>('POST', '/portal/lookup/', params as Record<string, unknown>),

  setup: (phone: string, password: string, student_code: string) =>
    request<{ message: string }>('POST', '/portal/setup/', { phone, password, student_code }),

  children: () => request<Array<{
    id: string; full_name: string; admission_no: string; class_name: string | null;
    status: string; gender: string | null;
    fee_summary: { total_due: number; total_paid: number; balance: number };
    latest_report_card: { term: string; academic_year: string; average: number } | null;
    attendance_rate: number | null;
  }>>('GET', '/portal/children/'),
};

const examsBase = createApi('/exams/exams/');

/** What the server says after an answer save. `closed` means the attempt already ended. */
export type ExamSaveReply = {
  closed: boolean;
  time_remaining?: number | null;
  saved?: number;
  /** Time is up. The attempt is still open for a short wait so the device can hand in with Submit. */
  expired?: boolean;
} & Partial<ExamResult>;

/** What a student is told after submitting. While results are held there is no score. */
export type ExamResult = {
  submitted: boolean;
  held: boolean;
  message?: string;
  late_submission: boolean;
  auto_submitted: boolean;
  score?: number;
  total_marks?: number;
  passed?: boolean;
  percentage?: number;
};

export const api = {
  schools: createApi('/schools/'),
  gradingConfig: {
    get: (schoolId: number | string) => request<Record<string, unknown>>('GET', `/schools/${schoolId}/grading/`),
    update: (schoolId: number | string, data: Record<string, unknown>) => request<Record<string, unknown>>('PUT', `/schools/${schoolId}/grading/`, data),
  },
  locations: {
    states: createApi<{ id: number; name: string; code: string }>('/locations/states/'),
    lgas: createApi<{ id: number; name: string; state: number }>('/locations/lgas/'),
  },
  classes: createApi<{ id: string; name: string; year_group: string | null; arm: string | null; academic_year: string | null }>('/classes/'),
  staff: createApi('/staff/'),
  feeItems: {
    ...createApi('/fees/items/'),
    /** How many invoices bill this fee, and how many of them already have a payment. */
    deleteImpact: (id: string | number) =>
      request<{ invoices: number; with_payments: number }>('GET', `/fees/items/${id}/delete_impact/`),
    /** Delete a fee. `invoices` says what happens to the invoices made from it. */
    remove: (id: string | number, invoices?: 'delete' | 'keep') =>
      request<void>('DELETE', `/fees/items/${id}/${invoices === 'delete' ? '?with_invoices=true' : invoices === 'keep' ? '?keep_invoices=true' : ''}`),
  },
  attendance: createApi('/attendance/'),
  grades: createApi('/grades/'),
  subjects: createApi('/exams/subjects/'),
  studentSubjects: createApi('/exams/student-subjects/'),
  timetables: createApi('/timetable/timetables/'),
  reportCards: createApi('/results/report-cards/'),
  exams: {
    ...examsBase,
    uploadQuestions: (examId: string | number, file: File, replace: boolean): Promise<{ created: number; warnings: string[]; errors: string[]; replaced: boolean }> => {
      const fd = new FormData();
      fd.append('questions_file', file);
      if (replace) fd.append('replace', 'true');
      return request('POST', `/exams/exams/${examId}/upload_questions/`, fd);
    },
    downloadTemplate: () => {
      const token = getToken();
      return fetch(`${API_BASE}/exams/exams/question_template/`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
    },
    startExam: (examId: string | number) =>
      request<{
        session_id: string; time_remaining: number | null; questions: unknown[];
        saved_answers: Record<string, string>;
      }>('POST', `/exams/exams/${examId}/start/`),
    /** Save answers as the student types. The reply also carries the server's time left. */
    saveAnswers: (sessionId: string | number, answers: Record<string, string>) =>
      request<ExamSaveReply>('POST', `/exams/sessions/${sessionId}/save/`, { answers }),
    submitExam: (sessionId: string | number, answers: Record<string, string>, tab_switches: number = 0, finished_in_time?: boolean) =>
      request<ExamResult>('POST', `/exams/sessions/${sessionId}/submit/`, { answers, tab_switches, finished_in_time }),
    duplicate: (examId: string | number) =>
      request('POST', `/exams/exams/${examId}/duplicate/`),
    close: (examId: string | number) =>
      request<{ status: string; attempts_submitted: number }>('POST', `/exams/exams/${examId}/close/`),
    release: (examId: string | number) =>
      request<{ results_released: boolean; grades_posted: number }>('POST', `/exams/exams/${examId}/release/`),
    copyQuestions: (examId: string | number, sourceExamId: string | number) =>
      request<{ created: number }>('POST', `/exams/exams/${examId}/copy_questions/`, { source_exam: sourceExamId }),
  },
  questions: createApi('/exams/questions/'),
  examSessions: {
    ...createApi('/exams/sessions/'),
    reset: (sessionId: string | number) =>
      request<{ reset: boolean }>('POST', `/exams/sessions/${sessionId}/reset/`),
  },
  announcements: createApi('/comms/'),
  notifications: createApi('/comms/notifications/'),
  analytics: {
    get: (schoolId: number | string) => request<{
      school_name: string; current_term: string; current_academic_year: string;
      students: number; total_students: number; staff: number; classes: number; subjects: number;
      fees: { total_due: number; total_paid: number; outstanding: number };
      attendance: { total: number; present: number; rate: number };
      exams: { total_sessions: number; submitted: number; avg_score: number };
    }>('GET', `/schools/${schoolId}/analytics/`),
  },
  students: {
    ...createApi('/students/') as ReturnType<typeof createApi> & { timeline: (id: string) => Promise<unknown[]> },
    timeline: (id: string) => request<Array<{ type: string; date: string; title: string; description: string }>>('GET', `/students/${id}/timeline/`),
  },
  feeInvoices: {
    ...createApi('/fees/invoices/') as ReturnType<typeof createApi> & { bursarySummary: () => Promise<unknown> },
    bursarySummary: () => request<{
      total_students: number; total_due: number; total_paid: number; outstanding: number;
      collection_rate: number; paid_invoices: number; pending_invoices: number;
      item_breakdown: { name: string; total_due: number; total_paid: number; outstanding: number }[];
    }>('GET', '/fees/bursary-summary/'),
  },
  audit: createApi('/audit/'),
};

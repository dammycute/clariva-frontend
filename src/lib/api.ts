const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
}
function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; max-age=0`;
}
function setTokens(access: string, refresh: string) {
  localStorage.setItem('access_token', access);
  localStorage.setItem('refresh_token', refresh);
  setCookie('access_token', access);
}
function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  deleteCookie('access_token');
}

async function refreshToken(): Promise<string | null> {
  const refresh = localStorage.getItem('refresh_token');
  if (!refresh) return null;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) { clearTokens(); return null; }
    const data = await res.json();
    localStorage.setItem('access_token', data.access);
    return data.access;
  } catch { clearTokens(); return null; }
}

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  // Auto-refresh on 401
  if (res.status === 401) {
    const newToken = await refreshToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(`${API_BASE}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });
    }
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    const firstKey = Object.keys(err)[0];
    let firstMsg = firstKey && err[firstKey]?.[0];
    if (firstMsg && typeof firstMsg === 'object') {
      const subKey = Object.keys(firstMsg)[0];
      firstMsg = subKey ? `${subKey}: ${firstMsg[subKey]?.[0] || JSON.stringify(firstMsg[subKey])}` : JSON.stringify(firstMsg);
    }
    throw new Error(firstMsg ? `${firstKey}: ${firstMsg}` : err.detail || 'Request failed');
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Auth
export { request };

export const auth = {
  async login(email: string, password: string) {
    const data = await request<{ access: string; refresh: string }>('POST', '/auth/login/', { email, password });
    setTokens(data.access, data.refresh);
    return data;
  },
  async register(payload: Record<string, unknown>) {
    const data = await request<{ id: number }>('POST', '/auth/register/', payload);
    return data;
  },
  async me() {
    return request<{ id: number; email: string; first_name: string; last_name: string; phone: string | null; role: string; school_id: number | null }>('GET', '/auth/me/');
  },
  logout() { clearTokens(); },
  getToken,
};

// CRUD helpers
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
    list: async (params?: Record<string, string>) => {
      const qs = params ? '?' + new URLSearchParams(params).toString() : '';
      const data = await request<unknown>('GET', `${basePath}${qs}`);
      return unwrap<T>(data);
    },
    get: (pk: number | string) => request<T>('GET', id(`${pk}`)),
    create: (data: Partial<T>) => request<T>('POST', basePath, data),
    update: (pk: number | string, data: Partial<T>) => request<T>('PATCH', id(`${pk}`), data),
    patch: (pk: number | string, data: Partial<T>) => request<T>('PATCH', id(`${pk}`), data),
    delete: (pk: number | string) => request<void>('DELETE', id(`${pk}`)),
  };
}

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
  students: createApi<{ id: string; admission_no: string; full_name: string; gender: string | null; class_group: string | null; guardian_name: string | null; guardian_phone: string | null; status: string; class_name?: string }>('/students/'),
  classes: createApi<{ id: string; name: string; year_group: string | null; arm: string | null; academic_year: string | null }>('/classes/'),
  staff: createApi('/staff/'),
  feeItems: createApi('/fees/items/'),
  feeInvoices: createApi('/fees/invoices/'),
  attendance: createApi('/attendance/'),
  grades: createApi('/grades/'),
  subjects: createApi('/exams/subjects/'),
  studentSubjects: createApi('/exams/student-subjects/'),
  timetables: createApi('/exams/timetables/'),
  reportCards: createApi('/exams/report-cards/'),
  exams: createApi('/exams/exams/'),
  questions: createApi('/exams/questions/'),
  examSessions: createApi('/exams/sessions/'),
  announcements: createApi('/comms/'),
  audit: createApi('/audit/'),
};

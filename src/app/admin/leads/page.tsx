'use client';

import { useEffect, useMemo, useState } from 'react';
import { Mail, Phone, Search } from 'lucide-react';
import { dateTime, listAll } from '@/lib/admin';

type Lead = {
  id: string;
  name: string;
  school_name: string;
  role: string;
  role_label: string;
  phone: string;
  email: string;
  students: number | null;
  message: string;
  emailed: boolean;
  created_at: string;
};

export default function ConsoleLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    listAll<Lead>('/leads/demo-requests/')
      .then(rows => setLeads(rows))
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load demo requests.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter(l => [l.name, l.school_name, l.phone, l.email, l.role_label, l.message]
      .some(v => (v || '').toLowerCase().includes(q)));
  }, [leads, query]);

  return (
    <div className="max-w-[1120px]">
      <header className="mb-5">
        <h1 className="text-[22px] font-semibold text-ink leading-tight">Demo requests</h1>
        <p className="text-[13px] text-muted mt-1">
          {leads.length} {leads.length === 1 ? 'request' : 'requests'} from the landing page · newest first
        </p>
      </header>

      {error && (
        <div role="alert" className="mb-4 text-sm text-danger bg-danger-soft border border-danger/30 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="relative mb-4 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search name, school, phone, email…"
          aria-label="Search demo requests"
          className="w-full h-11 pl-9 pr-3 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand"
        />
      </div>

      <div className="bg-surface border border-line rounded overflow-hidden">
        {loading ? (
          <div className="divide-y divide-line">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-4 animate-pulse" aria-hidden="true">
                <div className="h-4 w-1/3 rounded bg-surface-2" />
                <div className="h-3 w-1/4 rounded bg-surface-2 mt-2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted text-center">
            {leads.length === 0 ? 'No demo requests yet. The form on the landing page lands here.' : 'No requests match that search.'}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map(lead => (
              <li key={lead.id} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">
                      {lead.name} <span className="font-normal text-muted">· {lead.school_name}</span>
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {lead.role_label}
                      {lead.students ? ` · ${lead.students.toLocaleString()} students` : ''}
                      {' · '}{dateTime(lead.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`tel:${lead.phone}`}
                      className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-line text-xs font-medium text-ink hover:bg-surface-2 transition-colors"
                    >
                      <Phone size={13} /> {lead.phone}
                    </a>
                    {lead.email && (
                      <a
                        href={`mailto:${lead.email}`}
                        className="inline-flex items-center gap-1.5 h-9 px-3 rounded border border-line text-xs font-medium text-ink hover:bg-surface-2 transition-colors"
                      >
                        <Mail size={13} /> Email
                      </a>
                    )}
                  </div>
                </div>
                {lead.message && (
                  <p className="text-[13px] text-muted mt-2 whitespace-pre-line max-w-3xl">{lead.message}</p>
                )}
                {!lead.emailed && (
                  <p className="text-xs text-warning mt-2">The notification email was not sent for this request.</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

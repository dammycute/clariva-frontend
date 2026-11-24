'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { request } from '@/lib/api';
import { dateTime, listAll, type AdminSchool } from '@/lib/admin';

type AuditEntry = {
  id: string;
  school: string | null;
  action: string;
  model_name: string;
  object_id: string | null;
  object_repr: string | null;
  user_name: string | null;
  created_at: string;
};

const ACTIONS = ['all', 'create', 'update', 'delete', 'created', 'updated', 'deleted', 'exported'];

const ACTION_BADGE: Record<string, string> = {
  create: 'bg-success/10 text-success',
  created: 'bg-success/10 text-success',
  update: 'bg-warning/10 text-warning',
  updated: 'bg-warning/10 text-warning',
  delete: 'bg-danger-soft text-danger',
  deleted: 'bg-danger-soft text-danger',
};

export default function ConsoleAudit() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [schools, setSchools] = useState<AdminSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [action, setAction] = useState('all');
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get('school');
    if (initial) setSchoolId(initial);
    listAll<AdminSchool>('/schools/').then(setSchools).catch(() => {});
  }, []);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError('');

    const params = new URLSearchParams({ page_size: '200' });
    if (schoolId) params.set('school', schoolId);
    if (action !== 'all') params.set('action', action);
    if (appliedQuery) params.set('search', appliedQuery);

    request<{ results?: AuditEntry[] } | AuditEntry[]>('GET', `/audit/?${params.toString()}`)
      .then(data => {
        if (!live) return;
        setLogs(Array.isArray(data) ? data : data.results ?? []);
      })
      .catch(err => {
        if (!live) return;
        setError(err instanceof Error ? err.message : 'Could not load the activity log.');
        setLogs([]);
      })
      .finally(() => { if (live) setLoading(false); });

    return () => { live = false; };
  }, [schoolId, action, appliedQuery]);

  const schoolNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of schools) map.set(s.id, s.name);
    return map;
  }, [schools]);

  return (
    <div className="max-w-[1120px]">
      <header className="mb-5">
        <h1 className="text-[22px] font-semibold text-ink leading-tight">Activity log</h1>
        <p className="text-[13px] text-muted mt-1">
          Every recorded write across the platform, newest first{schoolId ? ` · ${schoolNames.get(schoolId) || 'one school'}` : ''}
        </p>
      </header>

      {error && (
        <div role="alert" className="mb-4 text-sm text-danger bg-danger-soft border border-danger/30 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <form
          className="relative flex-1"
          onSubmit={e => { e.preventDefault(); setAppliedQuery(query.trim()); }}
        >
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search model or description, then press Enter…"
            aria-label="Search the activity log"
            className="w-full h-11 pl-9 pr-3 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand"
          />
        </form>
        <select
          value={schoolId}
          onChange={e => setSchoolId(e.target.value)}
          aria-label="Filter by school"
          className="h-11 px-3 rounded border border-line bg-surface text-[13px] text-ink outline-none focus:border-brand max-w-[260px]"
        >
          <option value="">All schools</option>
          {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select
          value={action}
          onChange={e => setAction(e.target.value)}
          aria-label="Filter by action"
          className="h-11 px-3 rounded border border-line bg-surface text-[13px] text-ink outline-none focus:border-brand capitalize"
        >
          {ACTIONS.map(a => <option key={a} value={a}>{a === 'all' ? 'All actions' : a}</option>)}
        </select>
      </div>

      <div className="bg-surface border border-line rounded overflow-hidden">
        {loading ? (
          <div className="divide-y divide-line">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="px-4 py-3 animate-pulse" aria-hidden="true">
                <div className="h-4 w-1/3 rounded bg-surface-2" />
                <div className="h-3 w-1/5 rounded bg-surface-2 mt-2" />
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted text-center">
            No activity matches these filters.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {logs.map(log => (
              <li key={log.id} className="px-4 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs px-2 py-0.5 rounded capitalize shrink-0 ${ACTION_BADGE[log.action] || 'bg-surface-2 text-muted'}`}>
                      {log.action}
                    </span>
                    <span className="text-sm text-ink truncate">
                      <span className="font-medium">{log.model_name}</span>
                      {log.object_repr ? ` · ${log.object_repr}` : ''}
                    </span>
                  </div>
                  <span className="text-xs text-muted shrink-0">{dateTime(log.created_at)}</span>
                </div>
                <p className="text-xs text-muted mt-0.5 truncate">
                  {log.user_name || 'System'}
                  {log.school ? ` · ${schoolNames.get(log.school) || 'School'}` : ' · Platform'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!loading && logs.length > 0 && (
        <p className="text-xs text-muted mt-3">
          Showing the newest {logs.length} {logs.length === 1 ? 'entry' : 'entries'}. Narrow with a school or action.
        </p>
      )}
    </div>
  );
}

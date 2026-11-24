'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Search } from 'lucide-react';
import { listAll, PLANS, TONE_CLASS, trialState, type AdminSchool } from '@/lib/admin';

const STATUS_FILTERS = ['all', 'active', 'suspended'] as const;

export default function ConsoleSchools() {
  const [schools, setSchools] = useState<AdminSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [plan, setPlan] = useState('all');

  useEffect(() => {
    // The overview links here with ?status=suspended; read it once on mount.
    const initial = new URLSearchParams(window.location.search).get('status');
    if (initial && (STATUS_FILTERS as readonly string[]).includes(initial)) setStatus(initial);

    listAll<AdminSchool>('/schools/')
      .then(list => setSchools(list))
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load schools.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return schools.filter(s => {
      if (status !== 'all' && s.status !== status) return false;
      if (plan !== 'all' && s.plan !== plan) return false;
      if (!q) return true;
      return [s.name, s.subdomain, s.state, s.lga, s.school_type, s.plan]
        .some(v => (v || '').toLowerCase().includes(q));
    });
  }, [schools, query, status, plan]);

  const activeCount = schools.filter(s => s.status === 'active').length;
  const onTrial = schools.filter(s => s.plan === 'trial').length;

  return (
    <div className="max-w-[1120px]">
      <header className="mb-5">
        <h1 className="text-[22px] font-semibold text-ink leading-tight">Schools</h1>
        <p className="text-[13px] text-muted mt-1">
          {schools.length} total · {activeCount} active · {onTrial} on trial
        </p>
      </header>

      {error && (
        <div role="alert" className="mb-4 text-sm text-danger bg-danger-soft border border-danger/30 rounded px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search name, subdomain, state…"
            aria-label="Search schools"
            className="w-full h-11 pl-9 pr-3 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand"
          />
        </div>
        <div className="flex gap-2">
          {STATUS_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setStatus(f)}
              aria-pressed={status === f}
              className={`px-3 h-11 rounded text-[13px] font-medium capitalize transition-colors cursor-pointer ${
                status === f ? 'bg-brand text-brand-ink' : 'bg-surface border border-line text-muted hover:text-ink'
              }`}
            >
              {f}
            </button>
          ))}
          <select
            value={plan}
            onChange={e => setPlan(e.target.value)}
            aria-label="Filter by plan"
            className="h-11 px-3 rounded border border-line bg-surface text-[13px] text-ink outline-none focus:border-brand capitalize"
          >
            <option value="all">All plans</option>
            {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="bg-surface border border-line rounded overflow-hidden">
        {loading ? (
          <div className="divide-y divide-line">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-4 py-4 animate-pulse" aria-hidden="true">
                <div className="h-4 w-1/3 rounded bg-surface-2" />
                <div className="h-3 w-1/4 rounded bg-surface-2 mt-2" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted text-center">
            {schools.length === 0 ? 'No schools yet.' : 'No schools match these filters.'}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map(s => {
              const trial = trialState(s);
              return (
                <li key={s.id}>
                  <Link
                    href={`/admin/schools/${s.id}`}
                    className="flex items-center gap-4 px-4 py-3 min-h-[60px] hover:bg-surface-2 transition-colors"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink truncate">{s.name}</span>
                      <span className="block text-xs text-muted truncate">
                        {s.subdomain} · {s.current_term} {s.current_academic_year}
                        {s.state ? ` · ${s.state}` : ''}
                      </span>
                    </span>
                    <span className="hidden sm:block text-xs text-muted capitalize w-20 shrink-0">{s.plan}</span>
                    <span className={`hidden md:inline text-xs px-2 py-0.5 rounded whitespace-nowrap shrink-0 ${TONE_CLASS[trial.tone]}`}>
                      {trial.label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded capitalize whitespace-nowrap shrink-0 ${
                      s.status === 'active' ? 'bg-success/10 text-success' : 'bg-danger-soft text-danger'
                    }`}>
                      {s.status}
                    </span>
                    <ChevronRight size={16} className="text-muted shrink-0" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!loading && filtered.length > 0 && (
        <p className="text-xs text-muted mt-3">Showing {filtered.length} of {schools.length} schools.</p>
      )}
    </div>
  );
}

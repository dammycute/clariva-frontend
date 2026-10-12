'use client';

import { useState, useEffect } from 'react';
import { request } from '@/lib/api';

interface AuditEntry {
  id: string;
  school: string | null;
  user: string | null;
  action: string;
  model_name: string;
  object_id: string | null;
  object_repr: string | null;
  changes: Record<string, unknown> | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-success/10 text-success',
  update: 'bg-warning/10 text-warning',
  delete: 'bg-danger-soft text-danger',
};

export default function SuperAdminAudit() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await request<{ results: AuditEntry[] }>('GET', '/audit/');
        setLogs(data.results || []);
      } catch { /* empty */ }
      setLoading(false);
    })();
  }, []);

  const filtered = logs.filter(log => {
    if (actionFilter !== 'all' && log.action !== actionFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return log.model_name?.toLowerCase().includes(q) ||
             log.object_repr?.toLowerCase().includes(q) ||
             log.user?.toLowerCase().includes(q);
    }
    return true;
  });

  const actionCounts = logs.reduce((acc, log) => { acc[log.action] = (acc[log.action] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold text-ink">Audit Logs</h1>
        <p className="text-xs text-muted mt-0.5">{logs.length} total entries across all schools</p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setActionFilter('all')}
          className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
            actionFilter === 'all' ? 'bg-brand text-brand-ink' : 'bg-surface-2 text-muted hover:bg-brand-soft'
          }`}>All ({logs.length})</button>
        {Object.entries(actionCounts).sort(([,a],[,b]) => b - a).map(([action, count]) => (
          <button key={action} onClick={() => setActionFilter(action)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              actionFilter === action ? 'bg-brand text-brand-ink' : 'bg-surface-2 text-muted hover:bg-brand-soft'
            }`}>{action} ({count})</button>
        ))}
      </div>

      <div className="mb-4">
        <input type="text" placeholder="Search by model, description, or user..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md px-3 py-2 rounded border border-line text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent" />
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 bg-surface rounded animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-line rounded p-8 text-center text-sm text-muted">No audit logs found.</div>
      ) : (
        <div className="bg-surface border border-line rounded overflow-hidden">
          <div className="divide-y divide-line">
            {filtered.map(log => (
              <div key={log.id} className="px-4 py-3 hover:bg-[#F8FAFC] transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${ACTION_COLORS[log.action] || 'bg-surface-2 text-muted'}`}>
                      {log.action}
                    </span>
                    <span className="text-xs font-semibold text-ink">{log.model_name}</span>
                    {log.object_repr && (
                      <span className="text-xs text-muted">- {log.object_repr}</span>
                    )}
                  </div>
                  <span className="text-xs text-muted">
                    {new Date(log.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted">
                  {log.user && <span>User: {log.user}</span>}
                  {log.object_id && <span>ID: {log.object_id}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

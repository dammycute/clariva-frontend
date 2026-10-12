'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Search, ClipboardList } from 'lucide-react';

interface LogEntry {
  id: number; action: string; model_name: string;
  object_id: string | null; object_repr: string | null;
  user_name: string | null; ip_address: string | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-success/10 text-success',
  updated: 'bg-brand-soft text-ink',
  deleted: 'bg-danger-soft text-danger',
};

const MODELS = ['', 'Student', 'Staff', 'Class', 'Subject', 'FeeItem', 'FeeInvoice', 'FeeInvoiceItem', 'Grade', 'Attendance', 'TimeTable', 'TimeSlot', 'ReportCard', 'Announcement'];

export default function AuditPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filterAction) params.action = filterAction;
    if (filterModel) params.model = filterModel;
    if (search) params.search = search;
    const data = await api.audit.list(params);
    setLogs(data as LogEntry[]);
    setLoading(false);
  }, [filterAction, filterModel, search]);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Activity Log</h1>
          <p className="text-xs text-muted mt-0.5">Track all changes across the system</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 mb-4 bg-surface border border-line rounded px-3.5 py-2.5 max-w-2xl">
        <span className="text-sm" aria-hidden="true"><Search size={16} /></span>
        <input type="text" placeholder="Search model or record…" value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 border-none bg-transparent text-sm text-ink outline-none placeholder:text-muted" />
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
          className="text-sm border border-line rounded px-2.5 py-1.5 bg-surface text-muted outline-none">
          <option value="">All actions</option>
          <option value="created">Created</option>
          <option value="updated">Updated</option>
          <option value="deleted">Deleted</option>
        </select>
        <select value={filterModel} onChange={e => setFilterModel(e.target.value)}
          className="text-sm border border-line rounded px-2.5 py-1.5 bg-surface text-muted outline-none">
          <option value="">All models</option>
          {MODELS.filter(Boolean).map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="bg-surface border border-line rounded overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted">Loading activity log…</div>
        ) : logs.length === 0 ? (
          <div className="p-12 flex flex-col items-center text-center">
            <div className="text-4xl mb-3" aria-hidden="true"><ClipboardList size={24} /></div>
            <h3 className="text-base font-semibold text-ink mb-1">No activity yet</h3>
            <p className="text-xs text-muted">Actions will appear here as you use the system.</p>
          </div>
        ) : (
          <div className="divide-y divide-line">
            {logs.map(log => (
              <div key={log.id} className="px-4 py-3 hover:bg-page flex items-start gap-3">
                <span className={`mt-0.5 px-2 py-0.5 rounded text-xs font-semibold shrink-0 ${ACTION_COLORS[log.action] || 'bg-surface-2 text-muted'}`}>
                  {log.action}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-ink">
                    <strong>{log.user_name || 'System'}</strong>
                    {' '}{log.action}d{' '}
                    <strong>{log.model_name}</strong>
                    {log.object_repr && <span className="text-muted">: {log.object_repr}</span>}
                  </p>
                  <p className="text-xs text-muted mt-0.5">
                    {new Date(log.created_at).toLocaleString('en-NG')}
                    {log.ip_address && ` · IP: ${log.ip_address}`}
                    {log.object_id && ` · ID: ${log.object_id}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

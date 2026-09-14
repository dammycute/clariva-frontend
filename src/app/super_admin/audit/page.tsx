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
  create: 'bg-[#DCFCE7] text-[#1A7A4A]',
  update: 'bg-[#FEF3C7] text-[#D4930A]',
  delete: 'bg-[#FEE2E2] text-[#B91C1C]',
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
        <h1 className="text-2xl font-bold text-[#0D2B55]">Audit Logs</h1>
        <p className="text-xs text-[#64748B] mt-0.5">{logs.length} total entries across all schools</p>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setActionFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            actionFilter === 'all' ? 'bg-[#0D2B55] text-white' : 'bg-[#F0F4FA] text-[#64748B] hover:bg-[#E8F0FA]'
          }`}>All ({logs.length})</button>
        {Object.entries(actionCounts).sort(([,a],[,b]) => b - a).map(([action, count]) => (
          <button key={action} onClick={() => setActionFilter(action)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              actionFilter === action ? 'bg-[#0D2B55] text-white' : 'bg-[#F0F4FA] text-[#64748B] hover:bg-[#E8F0FA]'
            }`}>{action} ({count})</button>
        ))}
      </div>

      <div className="mb-4">
        <input type="text" placeholder="Search by model, description, or user..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full max-w-md px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm focus:outline-none focus:ring-2 focus:ring-[#1A7A4A] focus:border-transparent" />
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-14 bg-white rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-8 text-center text-sm text-[#64748B]">No audit logs found.</div>
      ) : (
        <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden">
          <div className="divide-y divide-[#DDE5F0]">
            {filtered.map(log => (
              <div key={log.id} className="px-4 py-3 hover:bg-[#F8FAFC] transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${ACTION_COLORS[log.action] || 'bg-[#F0F4FA] text-[#64748B]'}`}>
                      {log.action}
                    </span>
                    <span className="text-xs font-semibold text-[#0D2B55]">{log.model_name}</span>
                    {log.object_repr && (
                      <span className="text-[11px] text-[#64748B]">— {log.object_repr}</span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#64748B]">
                    {new Date(log.created_at).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-[#64748B]">
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

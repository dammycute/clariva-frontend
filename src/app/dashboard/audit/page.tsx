'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface LogEntry {
  id: number; action: string; model_name: string;
  object_id: string | null; object_repr: string | null;
  user_name: string | null; ip_address: string | null;
  created_at: string;
}

const ACTION_COLORS: Record<string, string> = {
  created: 'bg-[#DCFCE7] text-[#1A7A4A]',
  updated: 'bg-[#E8F0FA] text-[#0D2B55]',
  deleted: 'bg-[#FEE2E2] text-[#B91C1C]',
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
          <h1 className="text-2xl font-bold text-[#0D2B55]">Activity Log</h1>
          <p className="text-xs text-[#64748B] mt-0.5">Track all changes across the system</p>
        </div>
      </div>

      <div className="flex items-center gap-2.5 mb-4 bg-white border border-[#DDE5F0] rounded-xl px-3.5 py-2.5 max-w-2xl">
        <span className="text-sm">🔍</span>
        <input type="text" placeholder="Search model or record…" value={search} onChange={e => setSearch(e.target.value)}
          className="flex-1 border-none bg-transparent text-sm text-[#0D2B55] outline-none placeholder:text-[#64748B]" />
        <select value={filterAction} onChange={e => setFilterAction(e.target.value)}
          className="text-sm border border-[#DDE5F0] rounded-lg px-2.5 py-1.5 bg-white text-[#64748B] outline-none">
          <option value="">All actions</option>
          <option value="created">Created</option>
          <option value="updated">Updated</option>
          <option value="deleted">Deleted</option>
        </select>
        <select value={filterModel} onChange={e => setFilterModel(e.target.value)}
          className="text-sm border border-[#DDE5F0] rounded-lg px-2.5 py-1.5 bg-white text-[#64748B] outline-none">
          <option value="">All models</option>
          {MODELS.filter(Boolean).map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-[#64748B]">Loading activity log…</div>
        ) : logs.length === 0 ? (
          <div className="p-12 flex flex-col items-center text-center">
            <div className="text-4xl mb-3">📋</div>
            <h3 className="text-base font-bold text-[#0D2B55] mb-1">No activity yet</h3>
            <p className="text-xs text-[#64748B]">Actions will appear here as you use the system.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#DDE5F0]">
            {logs.map(log => (
              <div key={log.id} className="px-4 py-3 hover:bg-[#F8FAFF] flex items-start gap-3">
                <span className={`mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${ACTION_COLORS[log.action] || 'bg-[#F0F4FA] text-[#64748B]'}`}>
                  {log.action}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#0D2B55]">
                    <strong>{log.user_name || 'System'}</strong>
                    {' '}{log.action}d{' '}
                    <strong>{log.model_name}</strong>
                    {log.object_repr && <span className="text-[#64748B]">: {log.object_repr}</span>}
                  </p>
                  <p className="text-[10px] text-[#64748B] mt-0.5">
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

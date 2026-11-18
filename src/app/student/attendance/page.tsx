'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Attendance { status: string; date: string; }

export default function StudentAttendancePage() {
  const [records, setRecords] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.attendance.list().then(d => {
      setRecords(Array.isArray(d) ? d as Attendance[] : []);
      setLoading(false);
    });
  }, []);

  const present = records.filter(r => r.status === 'present').length;
  const late = records.filter(r => r.status === 'late').length;
  const absent = records.filter(r => r.status === 'absent').length;
  const rate = records.length > 0 ? Math.round((present / records.length) * 100) : 0;

  if (loading) return <div className="text-sm text-muted p-8">Loading attendance…</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink mb-1">My Attendance</h1>
      <p className="text-xs text-muted mb-5">Your attendance record</p>

      <div className="grid grid-cols-4 gap-4 mb-5">
        <div className="bg-surface border border-line rounded p-4 text-center">
          <p className="text-2xl font-semibold text-ink">{records.length}</p>
          <p className="text-xs text-muted">Total</p>
        </div>
        <div className="bg-surface border border-line rounded p-4 text-center">
          <p className="text-2xl font-semibold text-brand">{present}</p>
          <p className="text-xs text-muted">Present</p>
        </div>
        <div className="bg-surface border border-line rounded p-4 text-center">
          <p className="text-2xl font-semibold text-warning">{late}</p>
          <p className="text-xs text-muted">Late</p>
        </div>
        <div className="bg-surface border border-line rounded p-4 text-center">
          <p className="text-2xl font-semibold text-danger">{absent}</p>
          <p className="text-xs text-muted">Absent</p>
        </div>
      </div>

      <div className="bg-surface border border-line rounded p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-ink">Attendance Rate</span>
          <span className={`text-xs font-semibold ${rate >= 75 ? 'text-brand' : 'text-danger'}`}>{rate}%</span>
        </div>
        <div className="h-3 bg-surface-2 rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${rate >= 75 ? 'bg-brand' : 'bg-danger'}`} style={{ width: `${rate}%` }} />
        </div>
      </div>

      <div className="bg-surface border border-line rounded overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-xs font-semibold text-muted bg-page">
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr><td colSpan={2} className="px-4 py-6 text-center text-muted">No attendance records.</td></tr>
            ) : (
              records.slice().reverse().map((r, i) => (
                <tr key={i} className="hover:bg-page border-t border-line">
                  <td className="px-4 py-2.5">{new Date(r.date).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                      r.status === 'present' ? 'bg-success/10 text-success' :
                      r.status === 'late' ? 'bg-warning/10 text-warning' : 'bg-danger-soft text-danger'
                    }`}>{r.status}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

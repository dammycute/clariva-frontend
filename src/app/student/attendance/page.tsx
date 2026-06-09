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

  if (loading) return <div className="text-sm text-[#64748B] p-8">Loading attendance…</div>;

  return (
    <div>
      <h1 className="text-xl font-bold text-[#0D2B55] mb-1">My Attendance</h1>
      <p className="text-xs text-[#64748B] mb-5">Your attendance record</p>

      <div className="grid grid-cols-4 gap-4 mb-5">
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#0D2B55]">{records.length}</p>
          <p className="text-[10px] text-[#64748B]">Total</p>
        </div>
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#1A7A4A]">{present}</p>
          <p className="text-[10px] text-[#64748B]">Present</p>
        </div>
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#D4930A]">{late}</p>
          <p className="text-[10px] text-[#64748B]">Late</p>
        </div>
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#B91C1C]">{absent}</p>
          <p className="text-[10px] text-[#64748B]">Absent</p>
        </div>
      </div>

      <div className="bg-white border border-[#DDE5F0] rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-[#0D2B55]">Attendance Rate</span>
          <span className={`text-xs font-bold ${rate >= 75 ? 'text-[#1A7A4A]' : 'text-[#B91C1C]'}`}>{rate}%</span>
        </div>
        <div className="h-3 bg-[#F0F4FA] rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${rate >= 75 ? 'bg-[#1A7A4A]' : 'bg-[#B91C1C]'}`} style={{ width: `${rate}%` }} />
        </div>
      </div>

      <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-[11px] font-bold text-[#64748B] uppercase bg-[#F7F9FC]">
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr><td colSpan={2} className="px-4 py-6 text-center text-[#64748B]">No attendance records.</td></tr>
            ) : (
              records.slice().reverse().map((r, i) => (
                <tr key={i} className="hover:bg-[#F8FAFF] border-t border-[#DDE5F0]">
                  <td className="px-4 py-2.5">{new Date(r.date).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.status === 'present' ? 'bg-[#DCFCE7] text-[#1A7A4A]' :
                      r.status === 'late' ? 'bg-[#FEF3C7] text-[#D4930A]' : 'bg-[#FEE2E2] text-[#B91C1C]'
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

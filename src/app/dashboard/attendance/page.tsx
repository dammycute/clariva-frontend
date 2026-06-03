'use client';

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

interface Cls { id: string; name: string; year_group: string | null; }
interface Student { id: string; full_name: string; class_group: string | null; }

const STATUSES = ['present', 'absent', 'late'] as const;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function AttendancePage() {
  const [clsList, setClsList] = useState<Cls[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [savedRecords, setSavedRecords] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mode, setMode] = useState<'mark' | 'dashboard' | 'calendar'>('mark');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Dashboard
  const [dashDate, setDashDate] = useState(date);
  const [dashStats, setDashStats] = useState<{ class_id: string; present: number; absent: number; late: number; total: number }[]>([]);
  // Calendar
  const [calStudent, setCalStudent] = useState('');
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calData, setCalData] = useState<Record<string, string>>({});

  async function loadAll() {
    setLoading(true);
    const [clsRes, stuRes] = await Promise.all([
      api.classes.list(),
      api.students.list({ status: 'active' }),
    ]);
    setClsList(clsRes as Cls[]);
    setStudents(stuRes as Student[]);
    setLoading(false);
  }
  useEffect(() => { loadAll(); }, []);

  const classStudents = students.filter(s => String(s.class_group) === selectedClass);

  // Load existing attendance for selected class + date
  useEffect(() => {
    if (!selectedClass || !date) return;
    (async () => {
      const records = await api.attendance.list({ class_id: selectedClass, date }) as { student: string; status: string }[];
      const map: Record<string, string> = {};
      const saved: Record<string, string> = {};
      for (const r of records) {
        map[r.student] = r.status;
        saved[r.student] = r.status;
      }
      setAttendance(map);
      setSavedRecords(saved);
    })();
  }, [selectedClass, date]);

  function setStatus(studentId: string, status: string) {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  }

  function markAll(status: string) {
    const map: Record<string, string> = {};
    for (const s of classStudents) map[s.id] = status;
    setAttendance(map);
  }

  async function handleSave() {
    if (!selectedClass || !date) return;
    setSaving(true);
    setMessage('');
    let saved = 0;
    try {
      for (const student of classStudents) {
        const status = attendance[student.id];
        if (!status) continue;
        const existing = savedRecords[student.id];
        if (existing === status) continue; // unchanged
        if (existing) {
          // Update existing record
          const records = await api.attendance.list({ class_id: selectedClass, date, student_id: student.id }) as { id: string }[];
          if (records.length > 0) {
            await api.attendance.update(records[0].id, { status } as Record<string, unknown>);
          }
        } else {
          await api.attendance.create({
            student: student.id,
            class_group: selectedClass,
            date,
            status,
          } as Record<string, unknown>);
        }
        saved++;
      }
      setMessage(`Saved ${saved} record${saved !== 1 ? 's' : ''}.`);
      // Refresh saved state
      const records = await api.attendance.list({ class_id: selectedClass, date }) as { student: string; status: string }[];
      const savedMap: Record<string, string> = {};
      for (const r of records) savedMap[r.student] = r.status;
      setSavedRecords(savedMap);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      present: 'bg-[#D1FAE5] text-[#065F46]',
      absent: 'bg-[#FEE2E2] text-[#B91C1C]',
      late: 'bg-[#FEF3C7] text-[#D4930A]',
    };
    return styles[status] || '';
  }

  // ─── Dashboard ───────────────────────────────────────────────

  async function loadDashboard() {
    if (!dashDate) return;
    const records = await api.attendance.list({ date: dashDate }) as { class_group: string; status: string }[];
    const byClass: Record<string, { present: number; absent: number; late: number; total: number }> = {};
    for (const r of records) {
      if (!byClass[r.class_group]) byClass[r.class_group] = { present: 0, absent: 0, late: 0, total: 0 };
      byClass[r.class_group][r.status as keyof typeof byClass[string]]++;
      byClass[r.class_group].total++;
    }
    const stats = Object.entries(byClass).map(([class_id, data]) => ({ class_id, ...data }));
    setDashStats(stats);
  }

  // ─── Calendar ────────────────────────────────────────────────

  async function loadCalendar() {
    if (!calStudent) return;
    const startDate = new Date(calYear, calMonth, 1).toISOString().split('T')[0];
    const endDate = new Date(calYear, calMonth + 1, 0).toISOString().split('T')[0];
    const records = await api.attendance.list({ student_id: calStudent }) as { date: string; status: string }[];
    const map: Record<string, string> = {};
    for (const r of records) {
      const d = new Date(r.date);
      if (d.getMonth() === calMonth && d.getFullYear() === calYear) {
        map[String(d.getDate())] = r.status;
      }
    }
    setCalData(map);
  }

  useEffect(() => { if (mode === 'dashboard') loadDashboard(); }, [mode, dashDate]);
  useEffect(() => { if (mode === 'calendar') loadCalendar(); }, [mode, calStudent, calMonth, calYear]);

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay = new Date(calYear, calMonth, 1).getDay();

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0D2B55]">Attendance</h1>
          <p className="text-xs text-[#64748B] mt-0.5">Mark and track daily attendance</p>
        </div>
      </div>

      <div className="flex gap-1 mb-5 bg-white border border-[#DDE5F0] rounded-xl p-1 w-fit">
        {(['mark', 'dashboard', 'calendar'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors capitalize ${
              mode === m ? 'bg-[#0D2B55] text-white' : 'text-[#64748B] hover:text-[#0D2B55]'
            }`}>
            {m === 'mark' ? '✅ Mark' : m === 'dashboard' ? '📊 Dashboard' : '📅 Calendar'}
          </button>
        ))}
      </div>

      {mode === 'mark' && (
        <>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setAttendance({}); setSavedRecords({}); }}
              className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#0D2B55] outline-none">
              <option value="">Select class</option>
              {[...new Set(clsList.map(c => c.year_group))].sort().map(yg => (
                <optgroup key={yg} label={yg || 'Other'}>
                  {clsList.filter(c => c.year_group === yg).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#0D2B55] outline-none" />
            {selectedClass && (
              <>
                <div className="flex gap-1 ml-2">
                  <button onClick={() => markAll('present')} className="text-[11px] px-2 py-1 rounded bg-[#D1FAE5] text-[#065F46]">All Present</button>
                  <button onClick={() => markAll('absent')} className="text-[11px] px-2 py-1 rounded bg-[#FEE2E2] text-[#B91C1C]">All Absent</button>
                  <button onClick={() => markAll('late')} className="text-[11px] px-2 py-1 rounded bg-[#FEF3C7] text-[#D4930A]">All Late</button>
                </div>
                <button onClick={handleSave} disabled={saving}
                  className="text-sm px-4 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D] disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save Attendance'}
                </button>
              </>
            )}
          </div>

          {message && (
            <div className={`px-4 py-2 rounded-lg text-xs mb-3 ${message.includes('Saved') ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#B91C1C]'}`}>
              {message}
            </div>
          )}

          <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden">
            {!selectedClass ? (
              <div className="p-8 text-center text-sm text-[#64748B]">Select a class and date to mark attendance.</div>
            ) : classStudents.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#64748B]">No active students in this class.</div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[11px] font-bold tracking-wider text-[#64748B] uppercase bg-[#F7F9FC]">
                    <th className="text-left px-4 py-3">#</th><th className="text-left px-4 py-3">Student</th>
                    <th className="text-center px-2 py-3">Present</th>
                    <th className="text-center px-2 py-3">Absent</th>
                    <th className="text-center px-2 py-3">Late</th>
                  </tr>
                </thead>
                <tbody>
                  {classStudents.map((student, idx) => {
                    const current = attendance[student.id] || savedRecords[student.id] || '';
                    return (
                      <tr key={student.id} className="hover:bg-[#F8FAFF] border-t border-[#DDE5F0]">
                        <td className="px-4 py-2.5 text-[#64748B]">{idx + 1}</td>
                        <td className="px-4 py-2.5 font-semibold">{student.full_name}</td>
                        {STATUSES.map(status => (
                          <td key={status} className="px-2 py-2.5 text-center">
                            <input type="radio" name={`att-${student.id}`} value={status}
                              checked={current === status}
                              onChange={() => setStatus(student.id, status)}
                              className="w-4 h-4 text-[#1A7A4A] focus:ring-[#1A7A4A]" />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {mode === 'dashboard' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <input type="date" value={dashDate} onChange={e => setDashDate(e.target.value)}
              className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#0D2B55] outline-none" />
            <button onClick={loadDashboard} className="text-sm px-4 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D]">Refresh</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashStats.map(st => {
              const cls = clsList.find(c => String(c.id) === st.class_id);
              const rate = st.total > 0 ? Math.round((st.present / st.total) * 100) : 0;
              return (
                <div key={st.class_id} className="bg-white border border-[#DDE5F0] rounded-xl p-4">
                  <h3 className="text-sm font-bold text-[#0D2B55] mb-2">{cls?.name || 'Unknown'}</h3>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${rate >= 75 ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#B91C1C]'}`}>
                      {rate}%
                    </span>
                    <span className="text-xs text-[#64748B]">{st.total} students</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-[#D1FAE5] rounded-lg py-1.5"><span className="font-bold text-[#065F46]">{st.present}</span><br/><span className="text-[10px] text-[#065F46]">Present</span></div>
                    <div className="bg-[#FEE2E2] rounded-lg py-1.5"><span className="font-bold text-[#B91C1C]">{st.absent}</span><br/><span className="text-[10px] text-[#B91C1C]">Absent</span></div>
                    <div className="bg-[#FEF3C7] rounded-lg py-1.5"><span className="font-bold text-[#D4930A]">{st.late}</span><br/><span className="text-[10px] text-[#D4930A]">Late</span></div>
                  </div>
                </div>
              );
            })}
            {dashStats.length === 0 && (
              <div className="col-span-full text-center text-sm text-[#64748B] py-12">No attendance records for this date.</div>
            )}
          </div>
        </div>
      )}

      {mode === 'calendar' && (
        <div>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
              className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#0D2B55] outline-none">
              <option value="">Select class</option>
              {[...new Set(clsList.map(c => c.year_group))].sort().map(yg => (
                <optgroup key={yg} label={yg || 'Other'}>
                  {clsList.filter(c => c.year_group === yg).map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <select value={calStudent} onChange={e => { setCalStudent(e.target.value); setCalData({}); }}
              className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#0D2B55] outline-none">
              <option value="">Select student</option>
              {students.filter(s => String(s.class_group) === selectedClass).map(s => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
            <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }} className="text-sm px-2 py-1 rounded border border-[#DDE5F0]">◀</button>
            <span className="text-sm font-bold text-[#0D2B55]">{MONTHS[calMonth]} {calYear}</span>
            <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }} className="text-sm px-2 py-1 rounded border border-[#DDE5F0]">▶</button>
          </div>

          {calStudent ? (
            <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden max-w-md">
              <div className="grid grid-cols-7 text-center text-[10px] font-bold text-[#64748B] uppercase bg-[#F7F9FC] border-b border-[#DDE5F0]">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="py-2">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 text-center">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="py-3" />)}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const status = calData[String(day)];
                  const colors: Record<string, string> = { present: 'bg-[#D1FAE5]', absent: 'bg-[#FEE2E2]', late: 'bg-[#FEF3C7]' };
                  return (
                    <div key={day} className={`py-2 text-sm ${colors[status] || ''} ${status ? 'font-bold' : ''}`}>
                      {day}
                      {status && <div className="text-[8px] uppercase">{status}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center text-sm text-[#64748B] py-12">Select a class and student to view their monthly attendance.</div>
          )}
        </div>
      )}
    </div>
  );
}

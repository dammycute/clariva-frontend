'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ClipboardList, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface Cls { id: string; name: string; year_group: string | null; }
interface Student { id: string; first_name: string; last_name: string; class_group: string | null; }

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function AttendancePage() {
  const [clsList, setClsList] = useState<Cls[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selectedClass, setSelectedClass] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [mode, setMode] = useState<'view' | 'calendar'>('view');

  // View (class attendance table)
  const [viewRecords, setViewRecords] = useState<{ student: string; status: string; student_name?: string }[]>([]);
  const [viewLoading, setViewLoading] = useState(false);

  // Calendar
  const [calStudent, setCalStudent] = useState('');
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calData, setCalData] = useState<Record<string, string>>({});

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [clsRes, stuRes] = await Promise.all([
        api.classes.list(),
        api.students.list({ status: 'active' }),
      ]);
      setClsList(clsRes as Cls[]);
      setStudents(stuRes as Student[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { loadAll(); }, []);

  // Load attendance records for selected class + date
  useEffect(() => {
    if (!selectedClass || !date) return;
    (async () => {
      setViewLoading(true);
      const records = await api.attendance.list({ class_id: selectedClass, date }) as { student: string; status: string }[];
      const enriched = records.map(r => ({
        ...r,
        student_name: (() => { const s = students.find(s => s.id === r.student); return s ? `${s.first_name} ${s.last_name}`.trim() : r.student; })(),
      }));
      setViewRecords(enriched);
      setViewLoading(false);
    })();
  }, [selectedClass, date, students]);

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      present: 'bg-success/10 text-success',
      absent: 'bg-danger-soft text-danger',
      late: 'bg-warning/10 text-warning',
    };
    return styles[status] || '';
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

  useEffect(() => { if (mode === 'calendar') loadCalendar(); }, [mode, calStudent, calMonth, calYear]);

  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay = new Date(calYear, calMonth, 1).getDay();

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Attendance</h1>
          <p className="text-xs text-muted mt-0.5">View attendance records</p>
        </div>
      </div>

      <div className="flex gap-1 mb-5 bg-surface border border-line rounded p-1 w-fit">
        {(['view', 'calendar'] as const).map(m => (
          <button key={m} onClick={() => setMode(m)}
            className={`px-4 py-2 text-sm font-semibold rounded transition-colors capitalize ${
              mode === m ? 'bg-brand text-brand-ink' : 'text-muted hover:text-ink'
            }`}>
            {m === 'view'
              ? <><ClipboardList size={16} className="inline align-[-2px]" aria-hidden="true" /> Class View</>
              : <><Calendar size={16} className="inline align-[-2px]" aria-hidden="true" /> Calendar</>}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-danger-soft border border-danger/30 text-danger rounded p-6 text-center mb-4">
          <p className="text-sm mb-3">{error}</p>
          <button onClick={loadAll} className="text-sm px-4 py-2 rounded bg-danger text-white hover:bg-danger">Try Again</button>
        </div>
      )}

      {mode === 'view' && (
        <>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
              className="text-sm border border-line rounded px-3 py-2 bg-surface text-ink outline-none">
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
              className="text-sm border border-line rounded px-3 py-2 bg-surface text-ink outline-none" />
          </div>

          <div className="bg-surface border border-line rounded overflow-x-auto mb-20">
            {!selectedClass ? (
              <div className="p-8 text-center text-sm text-muted">Select a class and date to view attendance.</div>
            ) : viewLoading ? (
              <div className="p-8 text-center text-sm text-muted">Loading...</div>
            ) : viewRecords.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted">No attendance records for this class and date.</div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-xs font-semibold text-muted bg-page">
                    <th className="text-left px-4 py-3">#</th><th className="text-left px-4 py-3">Student</th>
                    <th className="text-center px-2 py-3 w-1/3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {viewRecords.map((r, idx) => (
                    <tr key={r.student} className="border-t border-line hover:bg-page">
                      <td className="px-4 py-2 text-muted">{idx + 1}</td>
                      <td className="px-4 py-2 font-semibold">{r.student_name}</td>
                      <td className="px-2 py-2 text-center">
                        <span className={`inline-block px-3 py-1.5 rounded text-xs font-semibold ${getStatusBadge(r.status)}`}>
                          {r.status === 'present' ? 'Present' : r.status === 'absent' ? 'Absent' : 'Late'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {mode === 'calendar' && (
        <div>
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
              className="text-sm border border-line rounded px-3 py-2 bg-surface text-ink outline-none">
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
              className="text-sm border border-line rounded px-3 py-2 bg-surface text-ink outline-none">
              <option value="">Select student</option>
              {students.filter(s => String(s.class_group) === selectedClass).map(s => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
              ))}
            </select>
            <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }} className="text-sm px-2 py-1 rounded border border-line"><ChevronLeft size={16} aria-hidden="true" className="inline" /></button>
            <span className="text-sm font-semibold text-ink">{MONTHS[calMonth]} {calYear}</span>
            <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }} className="text-sm px-2 py-1 rounded border border-line"><ChevronRight size={16} aria-hidden="true" className="inline" /></button>
          </div>

          {calStudent ? (
            <div className="bg-surface border border-line rounded overflow-hidden max-w-md">
              <div className="grid grid-cols-7 text-center text-xs font-semibold text-muted bg-page border-b border-line">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="py-2">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 text-center">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} className="py-3" />)}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                  const status = calData[String(day)];
                  const colors: Record<string, string> = { present: 'bg-success/10', absent: 'bg-danger-soft', late: 'bg-warning/10' };
                  return (
                    <div key={day} className={`py-2 text-sm ${colors[status] || ''} ${status ? 'font-semibold' : ''}`}>
                      {day}
                      {status && <div className="text-xs">{status}</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center text-sm text-muted py-12">Select a class and student to view their monthly attendance.</div>
          )}
        </div>
      )}
    </div>
  );
}

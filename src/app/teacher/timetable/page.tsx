'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Class { id: string; name: string; }
interface Slot { id: string; day: string; period: number; start_time: string; end_time: string; subject: string; subject_name?: string; teacher: string | null; teacher_name?: string; room: string | null; }
interface TT { id: string; class_group: string; class_name?: string; term: string; academic_year: string; is_published: boolean; slots: Slot[]; }

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function TeacherTimetablePage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [tt, setTt] = useState<TT | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.classes.list({ teacher_id: 'me' }).then(d => setClasses(d as Class[]));
  }, []);

  useEffect(() => {
    if (!selectedClass) { setTt(null); return; }
    setLoading(true);
    api.timetables.list({ class_id: selectedClass }).then(d => {
      const list = Array.isArray(d) ? d as TT[] : [];
      setTt(list[0] || null);
      setLoading(false);
    });
  }, [selectedClass]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink mb-1">My Timetable</h1>
      <p className="text-xs text-muted mb-5">View your class timetables</p>

      <div className="mb-4">
        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
          className="text-sm border border-line rounded px-3 py-2 bg-surface outline-none">
          <option value="">Select class</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-sm text-muted p-8">Loading timetable…</div>
      ) : !tt ? (
        <div className="bg-surface border border-line rounded p-8 text-center text-sm text-muted">
          {selectedClass ? 'No timetable published for this class.' : 'Select a class to view its timetable.'}
        </div>
      ) : (
        <div className="bg-surface border border-line rounded overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-page">
                <th className="px-3 py-2.5 text-xs font-semibold text-muted text-left w-20">Period</th>
                {DAYS.map(d => <th key={d} className="px-3 py-2.5 text-xs font-semibold text-muted text-center">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map(p => (
                <tr key={p} className="border-t border-line">
                  <td className="px-3 py-2.5 font-semibold text-ink">{p}</td>
                  {DAYS.map(d => {
                    const slot = tt.slots.find(s => s.day === d && s.period === p);
                    const isMySubject = slot?.teacher_name || slot?.subject_name;
                    return (
                      <td key={d} className={`px-3 py-2.5 text-center ${slot ? (isMySubject ? 'bg-brand-soft' : '') : 'bg-[#FAFBFC]'}`}>
                        {slot ? (
                          <div>
                            <div className="font-semibold text-ink">{slot.subject_name || '-'}</div>
                            <div className="text-xs text-muted">{slot.room || ''} {slot.teacher_name ? `· ${slot.teacher_name}` : ''}</div>
                          </div>
                        ) : (
                          <span className="text-line">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

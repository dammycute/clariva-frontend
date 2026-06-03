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
      <h1 className="text-xl font-bold text-[#0D2B55] mb-1">My Timetable</h1>
      <p className="text-xs text-[#64748B] mb-5">View your class timetables</p>

      <div className="mb-4">
        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
          className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white outline-none">
          <option value="">Select class</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-sm text-[#64748B] p-8">Loading timetable…</div>
      ) : !tt ? (
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-8 text-center text-sm text-[#64748B]">
          {selectedClass ? 'No timetable published for this class.' : 'Select a class to view its timetable.'}
        </div>
      ) : (
        <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#F7F9FC]">
                <th className="px-3 py-2.5 text-[11px] font-bold text-[#64748B] uppercase text-left w-20">Period</th>
                {DAYS.map(d => <th key={d} className="px-3 py-2.5 text-[11px] font-bold text-[#64748B] uppercase text-center">{d}</th>)}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map(p => (
                <tr key={p} className="border-t border-[#DDE5F0]">
                  <td className="px-3 py-2.5 font-bold text-[#0D2B55]">{p}</td>
                  {DAYS.map(d => {
                    const slot = tt.slots.find(s => s.day === d && s.period === p);
                    const isMySubject = slot?.teacher_name || slot?.subject_name;
                    return (
                      <td key={d} className={`px-3 py-2.5 text-center ${slot ? (isMySubject ? 'bg-[#E8F0FA]' : '') : 'bg-[#FAFBFC]'}`}>
                        {slot ? (
                          <div>
                            <div className="font-semibold text-[#0D2B55]">{slot.subject_name || '—'}</div>
                            <div className="text-[10px] text-[#64748B]">{slot.room || ''} {slot.teacher_name ? `· ${slot.teacher_name}` : ''}</div>
                          </div>
                        ) : (
                          <span className="text-[#DDE5F0]">—</span>
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

'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Slot { id: string; day: string; period: number; start_time: string; end_time: string; subject_name?: string; teacher_name?: string; room: string | null; }
interface TT { id: string; class_name?: string; term: string; academic_year: string; is_published: boolean; slots: Slot[]; }

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const PERIODS = [1, 2, 3, 4, 5, 6, 7, 8];

export default function StudentTimetablePage() {
  const [tt, setTt] = useState<TT | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [stu] = await Promise.all([api.students.list()]);
        const students = Array.isArray(stu) ? stu as Array<{ class_group?: string }> : [];
        const classId = students[0]?.class_group;
        if (classId) {
          const data = await api.timetables.list({ class_id: classId });
          const list = Array.isArray(data) ? data as TT[] : [];
          setTt(list[0] || null);
        }
      } catch { /* */ }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <div className="text-sm text-[#64748B] p-8">Loading timetable…</div>;

  return (
    <div>
      <h1 className="text-xl font-bold text-[#0D2B55] mb-1">My Timetable</h1>
      <p className="text-xs text-[#64748B] mb-5">{tt ? `${tt.class_name || ''} · ${tt.term} ${tt.academic_year}` : ''}</p>

      {!tt ? (
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-8 text-center text-sm text-[#64748B]">No timetable published for your class.</div>
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
                    return (
                      <td key={d} className={`px-3 py-2.5 text-center ${slot ? 'bg-[#E8F0FA]' : 'bg-[#FAFBFC]'}`}>
                        {slot ? (
                          <div>
                            <div className="font-semibold text-[#0D2B55]">{slot.subject_name || '—'}</div>
                            <div className="text-[10px] text-[#64748B]">{slot.teacher_name || ''}{slot.room ? ` · ${slot.room}` : ''}</div>
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

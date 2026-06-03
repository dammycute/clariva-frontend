'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Class { id: string; name: string; year_group: string | null; arm: string | null; form_teacher: string | null; academic_year: string | null; }
interface Student { id: string; full_name: string; admission_no: string; status: string; }

export default function TeacherClassesPage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [studentsMap, setStudentsMap] = useState<Record<string, Student[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const cls = await api.classes.list({ teacher_id: 'me' }) as Class[];
      setClasses(cls);
      const map: Record<string, Student[]> = {};
      await Promise.all(cls.map(async (c) => {
        const stu = await api.students.list({ class_id: c.id }) as Student[];
        map[c.id] = stu;
      }));
      setStudentsMap(map);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-sm text-[#64748B] p-8">Loading classes…</div>;

  return (
    <div>
      <h1 className="text-xl font-bold text-[#0D2B55] mb-1">My Classes</h1>
      <p className="text-xs text-[#64748B] mb-5">{classes.length} class{classes.length !== 1 ? 'es' : ''} assigned to you</p>

      {classes.length === 0 ? (
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-8 text-center text-sm text-[#64748B]">No classes assigned.</div>
      ) : (
        <div className="grid gap-4">
          {classes.map(c => {
            const students = studentsMap[c.id] || [];
            const active = students.filter(s => s.status === 'active');
            return (
              <div key={c.id} className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#DDE5F0] bg-[#F8FAFF] flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-[#0D2B55]">{c.name}</h2>
                    <p className="text-[10px] text-[#64748B]">{c.year_group || '—'} · {c.academic_year || '—'}</p>
                  </div>
                  <span className="text-xs text-[#64748B]">{active.length} active students</span>
                </div>
                <div className="divide-y divide-[#DDE5F0] max-h-48 overflow-y-auto">
                  {students.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-[#64748B]">No students.</div>
                  ) : (
                    students.map(s => (
                      <div key={s.id} className="px-4 py-2 flex items-center justify-between text-xs hover:bg-[#F8FAFF]">
                        <span className="font-semibold text-[#0D2B55]">{s.full_name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[#64748B]">{s.admission_no}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${s.status === 'active' ? 'bg-[#DCFCE7] text-[#1A7A4A]' : 'bg-[#FEE2E2] text-[#B91C1C]'}`}>{s.status}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

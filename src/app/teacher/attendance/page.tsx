'use client';

import { useState, useEffect } from 'react';
import { api, auth } from '@/lib/api';

interface Class { id: string; name: string; }
interface Student { id: string; first_name: string; last_name: string; admission_no: string; }

export default function TeacherAttendancePage() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.classes.list({ teacher_id: 'me' }).then(d => setClasses(d as Class[]));
  }, []);

  useEffect(() => {
    if (!selectedClass) { setStudents([]); return; }
    (async () => {
      const stu = await api.students.list({ class_id: selectedClass, status: 'active' }) as Student[];
      setStudents(stu);
      // Load existing attendance for this date
      const att = await api.attendance.list({ class_id: selectedClass, date }) as Array<{ student: string; status: string }>;
      const map: Record<string, string> = {};
      att.forEach(a => { map[a.student] = a.status; });
      stu.forEach(s => { if (!map[s.id]) map[s.id] = 'present'; });
      setAttendance(map);
    })();
  }, [selectedClass, date]);

  async function saveAll() {
    setSaving(true);
    const token = auth.getToken();
    for (const student of students) {
      const status = attendance[student.id] || 'present';
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/attendance/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token ?? ''}` },
        body: JSON.stringify({ student: student.id, class_group: selectedClass, date, status }),
      });
    }
    setSaving(false);
  }

  function setAll(status: string) {
    const map: Record<string, string> = {};
    students.forEach(s => { map[s.id] = status; });
    setAttendance(map);
  }

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink mb-1">Mark Attendance</h1>
      <p className="text-xs text-muted mb-5">For your assigned classes</p>

      <div className="flex items-center gap-3 mb-4">
        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
          className="text-sm border border-line rounded px-3 py-2 bg-surface outline-none">
          <option value="">Select class</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input type="date" value={date} onChange={e => setDate(e.target.value)}
          className="text-sm border border-line rounded px-3 py-2 outline-none" />
      </div>

      {selectedClass && (
        <div className="bg-surface border border-line rounded overflow-hidden">
          <div className="px-4 py-2.5 border-b border-line bg-page flex items-center justify-between">
            <span className="text-xs font-semibold text-ink">{students.length} students</span>
            <div className="flex gap-1.5">
              <button onClick={() => setAll('present')} className="text-xs px-2 py-1 rounded bg-success/10 text-success font-semibold">All Present</button>
              <button onClick={() => setAll('absent')} className="text-xs px-2 py-1 rounded bg-danger-soft text-danger font-semibold">All Absent</button>
              <button onClick={saveAll} disabled={saving}
                className="text-xs px-2 py-1 rounded bg-brand text-brand-ink font-semibold disabled:opacity-50">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
          {students.map(s => (
            <div key={s.id} className="px-4 py-2.5 flex items-center justify-between border-b border-line last:border-b-0 hover:bg-page">
              <div>
                <p className="text-xs font-semibold text-ink">{s.first_name} {s.last_name}</p>
                <p className="text-xs text-muted">{s.admission_no}</p>
              </div>
              <div className="flex gap-1">
                {['present', 'absent', 'late'].map(st => (
                  <button key={st} onClick={() => setAttendance({ ...attendance, [s.id]: st })}
                    className={`text-xs px-2.5 py-1 rounded font-semibold capitalize ${
                      attendance[s.id] === st
                        ? st === 'present' ? 'bg-success/10 text-success' : st === 'late' ? 'bg-warning/10 text-warning' : 'bg-danger-soft text-danger'
                        : 'bg-surface-2 text-muted'
                    }`}>{st}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

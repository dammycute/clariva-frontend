'use client';

import { useState, useEffect } from 'react';
import { api, auth } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { SummaryStrip, Stat, StatSkeleton, Panel, LinkList } from '@/components/ui/summary';

const WORK = [
  { label: 'Mark attendance', text: 'Record who is in class today.', href: '/teacher/attendance' },
  { label: 'Enter grades', text: 'Add scores for your subjects.', href: '/teacher/grades' },
  { label: 'My classes', text: 'See the classes you teach and their students.', href: '/teacher/classes' },
  { label: 'Timetable', text: 'Your weekly schedule.', href: '/teacher/timetable' },
];

export default function TeacherDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ classes: 0, students: 0, subjects: 0, examSessions: 0, avgScore: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auth.me().then(user => {
      if (user.role !== 'teacher') { router.push('/'); return; }
    }).catch(() => router.push('/'));

    (async () => {
      try {
        const cls = await api.classes.list({ teacher_id: 'me' });
        const classIds = (Array.isArray(cls) ? cls : []).map(c => c.id).filter(Boolean);
        const stuPerClass = await Promise.all(
          classIds.map(id => api.students.list({ class_id: String(id) }))
        );
        const uniqueStudentIds = new Set(stuPerClass.flat().map(s => (s as Record<string, unknown>).id));
        const sub = await api.subjects.list({ teacher_id: 'me' });
        setStats({
          classes: classIds.length,
          students: uniqueStudentIds.size,
          subjects: Array.isArray(sub) ? sub.length : 0,
          examSessions: 0,
          avgScore: 0,
        });

        try {
          const sessions = await api.examSessions.list() as Array<{ score: number; total_marks: number }>;
          if (Array.isArray(sessions)) {
            const total = sessions.reduce((a, s) => a + (s.score || 0), 0);
            setStats(prev => ({
              ...prev,
              examSessions: sessions.length,
              avgScore: sessions.length > 0 ? Math.round((total / sessions.length) * 100) / 100 : 0,
            }));
          }
        } catch { /* */ }
      } catch { /* */ }
      finally { setLoading(false); }
    })();
  }, [router]);

  return (
    <div className="max-w-[1120px]">
      <header className="mb-6">
        <h1 className="text-[22px] font-semibold text-ink leading-tight">Overview</h1>
        <p className="text-[13px] text-muted mt-1">Your classes, students and exams.</p>
      </header>

      <SummaryStrip className="mb-6">
        {loading ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />) : (
          <>
            <Stat label="Classes" value={stats.classes} />
            <Stat label="Students" value={stats.students.toLocaleString()} />
            <Stat label="Subjects" value={stats.subjects} />
            <Stat
              label="CBT sessions"
              value={stats.examSessions}
              note={stats.examSessions > 0 ? `average score ${stats.avgScore}` : undefined}
            />
          </>
        )}
      </SummaryStrip>

      <Panel title="Where to work">
        <LinkList items={WORK} />
      </Panel>
    </div>
  );
}

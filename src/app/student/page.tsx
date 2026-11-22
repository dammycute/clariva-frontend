'use client';

import { useState, useEffect } from 'react';
import { api, auth } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { SummaryStrip, Stat, StatSkeleton, Panel, LinkList } from '@/components/ui/summary';

const AREAS = [
  { label: 'My grades', text: 'Your scores for each subject.', href: '/student/grades' },
  { label: 'Attendance', text: 'Days you were present, absent or late.', href: '/student/attendance' },
  { label: 'Timetable', text: 'Your weekly schedule.', href: '/student/timetable' },
  { label: 'CBT exams', text: 'Exams you can take or have taken.', href: '/student/exams' },
];

export default function StudentDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ first_name: string; last_name: string; admission_no: string; class_name?: string; } | null>(null);
  const [gradeCount, setGradeCount] = useState(0);
  const [attRate, setAttRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auth.me().then(user => {
      if (user.role !== 'student') { router.push('/login'); return; }
    }).catch(() => router.push('/login'));

    (async () => {
      try {
        const me = await auth.me();
        const [profile, gr, att] = await Promise.all([
          api.students.get(me.id) as Promise<{ first_name: string; last_name: string; admission_no: string; class_name?: string }>,
          api.grades.list(),
          api.attendance.list(),
        ]);
        setProfile(profile);
        setGradeCount(Array.isArray(gr) ? gr.length : 0);
        const attArr = Array.isArray(att) ? att as Array<{ status: string }> : [];
        const p = attArr.filter(a => a.status === 'present').length;
        setAttRate(attArr.length > 0 ? Math.round((p / attArr.length) * 100) : null);
      } catch { /* */ }
      finally { setLoading(false); }
    })();
  }, [router]);

  return (
    <div className="max-w-[1120px]">
      <header className="mb-6">
        <h1 className="text-[22px] font-semibold text-ink leading-tight">{profile ? `${profile.first_name} ${profile.last_name}` : 'Overview'}</h1>
        {profile && <p className="text-[13px] text-muted mt-1">{profile.admission_no} · {profile.class_name || 'Class not set'}</p>}
      </header>

      <SummaryStrip cols={2} className="mb-6">
        {loading ? Array.from({ length: 2 }).map((_, i) => <StatSkeleton key={i} />) : (
          <>
            <Stat label="Grades entered" value={gradeCount} />
            <Stat
              label="Attendance rate"
              value={attRate === null ? '-' : `${attRate}%`}
              tone={attRate !== null && attRate < 75 ? 'danger' : undefined}
              note={attRate === null ? 'No attendance recorded yet' : undefined}
            />
          </>
        )}
      </SummaryStrip>

      <Panel title="Where to look">
        <LinkList items={AREAS} />
      </Panel>
    </div>
  );
}

'use client';
import { useState, useEffect } from 'react';
import { api, auth } from '@/lib/api';
import { SummaryStrip, Stat, StatSkeleton, Panel, LinkList } from '@/components/ui/summary';

const AREAS = [
  { label: 'Grade approval', text: 'Review, approve or reject grades teachers have submitted.', href: '/principal/grades' },
  { label: 'Report cards', text: 'Generate termly report cards and release them to guardians.', href: '/principal/reports' },
  { label: 'CBT exams', text: 'See every computer-based test in the school.', href: '/principal/cbt' },
  { label: 'Timetable', text: 'Manage class schedules and period settings.', href: '/principal/timetable' },
];

export default function PrincipalDashboard() {
  const [stats, setStats] = useState({ students: 0, staff: 0, classes: 0, subjects: 0, examSessions: 0, avgScore: 0 });
  const [school, setSchool] = useState<{ name: string; current_term: string; current_academic_year: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = await auth.me();
        if (!me?.school_id) { setLoading(false); return; }
        const [analysis, s] = await Promise.all([
          api.analytics.get(me.school_id),
          api.schools.get(me.school_id) as Promise<{ name: string; current_term: string; current_academic_year: string }>,
        ]);
        setSchool(s);
        setStats({
          students: analysis.students, staff: analysis.staff, classes: analysis.classes, subjects: analysis.subjects,
          examSessions: analysis.exams.submitted, avgScore: analysis.exams.avg_score,
        });
      } catch { setFailed(true); }
      finally { setLoading(false); }
    })();
  }, []);

  const dash = '-';

  return (
    <div className="max-w-[1120px]">
      <header className="mb-6">
        <h1 className="text-[22px] font-semibold text-ink leading-tight">{school?.name || 'Overview'}</h1>
        <p className="text-[13px] text-muted mt-1">{school?.current_term || dash} {school?.current_academic_year || ''}</p>
      </header>

      {failed && (
        <div role="alert" className="mb-6 text-sm text-danger bg-danger-soft border border-danger/30 rounded px-3 py-2">
          We couldn&apos;t load the school numbers. Refresh to try again.
        </div>
      )}

      <SummaryStrip className="mb-6">
        {loading ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />) : (
          <>
            <Stat label="Students" value={failed ? dash : stats.students.toLocaleString()} note={failed ? undefined : `across ${stats.classes} classes`} />
            <Stat label="Staff" value={failed ? dash : stats.staff.toLocaleString()} />
            <Stat label="Subjects" value={failed ? dash : stats.subjects.toLocaleString()} />
            <Stat label="CBT submissions" value={failed ? dash : stats.examSessions.toLocaleString()} note={failed || !stats.examSessions ? undefined : `average score ${Math.round(stats.avgScore)}%`} />
          </>
        )}
      </SummaryStrip>

      <Panel title="Where to work">
        <LinkList items={AREAS} />
      </Panel>
    </div>
  );
}

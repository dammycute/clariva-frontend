'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { request } from '@/lib/api';
import { SummaryStrip, Stat, StatSkeleton, Panel } from '@/components/ui/summary';

interface SystemStats {
  total_schools: number;
  active_schools: number;
  suspended_schools: number;
  total_students: number;
  active_students: number;
  total_staff: number;
  total_classes: number;
  total_subjects: number;
  fees: { total_due: number; total_paid: number; outstanding: number };
  attendance: { total: number; present: number; rate: number };
  recent_schools: {
    id: string; name: string; subdomain: string; status: string;
    plan: string; current_academic_year: string; created_at: string; student_count: number;
  }[];
}

const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`;

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await request<SystemStats>('GET', '/schools/system-stats/');
        setStats(data);
      } catch { /* empty */ }
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="max-w-[1120px]">
        <div className="h-6 w-48 bg-line rounded animate-pulse mb-6" />
        <SummaryStrip className="mb-6">{Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)}</SummaryStrip>
      </div>
    );
  }

  if (!stats) {
    return <div role="alert" className="text-sm text-danger">We couldn&apos;t load the system numbers. Refresh to try again.</div>;
  }

  return (
    <div className="max-w-[1120px]">
      <header className="mb-6">
        <h1 className="text-[22px] font-semibold text-ink leading-tight">System overview</h1>
        <p className="text-[13px] text-muted mt-1">
          All schools · {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </header>

      <SummaryStrip className="mb-px rounded-b-none">
        <Stat label="Schools" value={stats.total_schools.toLocaleString()} note={`${stats.active_schools} active`} />
        <Stat label="Students" value={stats.total_students.toLocaleString()} note={`${stats.active_students} active`} />
        <Stat label="Staff" value={stats.total_staff.toLocaleString()} />
        <Stat label="Fees collected" value={naira(stats.fees.total_paid)} note={stats.fees.outstanding > 0 ? `${naira(stats.fees.outstanding)} outstanding` : 'Fully collected'} />
      </SummaryStrip>
      <SummaryStrip label="More numbers" className="mb-6 rounded-t-none border-t-0">
        <Stat label="Classes" value={stats.total_classes.toLocaleString()} />
        <Stat label="Subjects" value={stats.total_subjects.toLocaleString()} />
        <Stat label="Attendance" value={`${stats.attendance.rate}%`} note={`${stats.attendance.present.toLocaleString()} of ${stats.attendance.total.toLocaleString()} records present`} />
        <Stat label="Suspended schools" value={stats.suspended_schools.toLocaleString()} tone={stats.suspended_schools > 0 ? 'danger' : undefined} />
      </SummaryStrip>

      <Panel title="Recent schools" action={<Link href="/super_admin/schools" className="text-[13px] text-brand hover:underline">All schools</Link>}>
        {stats.recent_schools.length === 0 ? (
          <p className="px-4 py-5 text-sm text-muted">No schools yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {stats.recent_schools.map(s => (
              <li key={s.id} className="px-4 py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{s.name}</p>
                  <p className="text-[13px] text-muted truncate">{s.subdomain}.clariva.ng · {s.plan} · {s.student_count} students</p>
                </div>
                <span className={`text-[13px] shrink-0 ${s.status === 'active' ? 'text-success' : 'text-danger'}`}>{s.status}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { api, auth } from '@/lib/api';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

type Student = { id: string; first_name: string; last_name: string; admission_no: string; class_name?: string; student_status: string };

const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`;

const SHORTCUTS = [
  { label: 'Record a payment', href: '/dashboard/fees' },
  { label: 'Take attendance', href: '/dashboard/attendance' },
  { label: 'Enter grades', href: '/dashboard/grades' },
  { label: 'Add a student', href: '/dashboard/students' },
  { label: 'Print report cards', href: '/dashboard/grades?tab=reports' },
];

type Attention = { tone: 'danger' | 'warning' | 'info'; text: string; action: string; href: string };

export default function DashboardHome() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({
    students: 0, staff: 0, classes: 0,
    outstanding: 0, totalFees: 0, collected: 0,
    present: 0, totalAttendance: 0,
  });
  const [recentStudents, setRecentStudents] = useState<Student[]>([]);
  const [school, setSchool] = useState<{ name: string; current_term: string; current_academic_year: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const me = await auth.me();
        if (!me?.school_id) { setLoaded(true); return; }

        const [analysis, schoolInfo] = await Promise.all([
          api.analytics.get(me.school_id),
          api.schools.get(me.school_id) as Promise<{ name: string; current_term: string; current_academic_year: string }>,
        ]);

        setSchool(schoolInfo);
        setStats({
          students: analysis.students,
          staff: analysis.staff,
          classes: analysis.classes,
          outstanding: analysis.fees.outstanding,
          totalFees: analysis.fees.total_due,
          collected: analysis.fees.total_paid,
          present: analysis.attendance.present,
          totalAttendance: analysis.attendance.total,
        });

        const s = await api.students.list({ status: 'active' });
        setRecentStudents((Array.isArray(s) ? s as Student[] : []).slice(0, 5));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
      } finally { setLoaded(true); }
    })();
  }, []);

  const attRate = stats.totalAttendance > 0 ? Math.round((stats.present / stats.totalAttendance) * 100) : 0;
  const collRate = stats.totalFees > 0 ? Math.round((stats.collected / stats.totalFees) * 100) : 0;
  const dash = '—';

  const attention: Attention[] = [];
  if (loaded && !error) {
    if (stats.outstanding > 0) {
      attention.push({
        tone: collRate < 50 ? 'danger' : 'warning',
        text: `${naira(stats.outstanding)} in fees is still outstanding (${collRate}% collected)`,
        action: 'View fees', href: '/dashboard/fees',
      });
    }
    if (stats.totalAttendance === 0) {
      attention.push({ tone: 'info', text: 'No attendance has been recorded yet', action: 'Open attendance', href: '/dashboard/attendance' });
    } else if (attRate < 75) {
      attention.push({ tone: 'warning', text: `Attendance is ${attRate}%, below the 75% mark`, action: 'Open attendance', href: '/dashboard/attendance' });
    }
    if (stats.students === 0) {
      attention.push({ tone: 'info', text: 'No students have been added yet', action: 'Add a student', href: '/dashboard/students' });
    }
  }

  const dot = { danger: 'bg-danger', warning: 'bg-warning', info: 'bg-muted' } as const;

  return (
    <div className="max-w-[1120px]">
      <header className="mb-6">
        <h1 className="text-[22px] font-semibold text-ink leading-tight">Overview</h1>
        <p className="text-[13px] text-muted mt-1">
          {school?.current_term || dash} {school?.current_academic_year || ''}
          {' · '}{new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </header>

      {error && (
        <div role="alert" className="mb-6 text-sm text-danger bg-danger-soft border border-danger/30 rounded px-3 py-2">
          {error}
        </div>
      )}

      {/* Summary strip */}
      <section aria-label="Summary" className="bg-line border border-line rounded overflow-hidden grid grid-cols-2 lg:grid-cols-4 gap-px mb-6">
        {!loaded ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 bg-surface space-y-2">
              <div className="h-3 w-1/2 bg-surface-2 rounded animate-pulse" />
              <div className="h-7 w-2/3 bg-surface-2 rounded animate-pulse" />
              <div className="h-3 w-1/3 bg-surface-2 rounded animate-pulse" />
            </div>
          ))
        ) : (
          <>
            <Stat label="Students" value={error ? dash : stats.students.toLocaleString()} note={error ? '' : `across ${stats.classes} ${stats.classes === 1 ? 'class' : 'classes'}`} />
            <Stat label="Staff" value={error ? dash : stats.staff.toLocaleString()} />
            <Stat
              label="Fees collected"
              value={error ? dash : naira(stats.collected)}
              note={error ? '' : `of ${naira(stats.totalFees)} billed, ${collRate}%`}
              progress={error ? undefined : collRate}
            />
            <Stat
              label="Attendance"
              value={error ? dash : stats.totalAttendance > 0 ? `${attRate}%` : dash}
              note={error || stats.totalAttendance === 0 ? '' : `${stats.present.toLocaleString()} of ${stats.totalAttendance.toLocaleString()} records present`}
            />
          </>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Panel title="Needs attention" aside={loaded && !error && attention.length > 0 ? `${attention.length} open` : undefined}>
            {!loaded ? (
              <div className="p-4 space-y-3">
                {[0, 1].map(i => <div key={i} className="h-4 bg-surface-2 rounded animate-pulse" />)}
              </div>
            ) : attention.length === 0 ? (
              <p className="px-4 py-5 text-sm text-muted">{error ? 'Unavailable until the data loads.' : 'Nothing needs attention right now.'}</p>
            ) : (
              <ul className="divide-y divide-line">
                {attention.map(a => (
                  <li key={a.text} className="px-4 py-3 flex items-center gap-3 text-sm">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${dot[a.tone]}`} aria-hidden="true" />
                    <span className="flex-1 text-ink">{a.text}</span>
                    <Link href={a.href} className="text-brand font-medium hover:underline shrink-0">{a.action}</Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Recent admissions" action={<Link href="/dashboard/students" className="text-[13px] text-brand hover:underline">All students</Link>}>
            {!loaded ? (
              <div className="p-4 space-y-3">
                {[0, 1, 2].map(i => <div key={i} className="h-4 bg-surface-2 rounded animate-pulse" />)}
              </div>
            ) : recentStudents.length === 0 ? (
              <p className="px-4 py-5 text-sm text-muted">No students yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {recentStudents.map(s => (
                  <li key={s.id}>
                    <Link href={`/dashboard/students/${s.id}`} className="block px-4 py-2.5 hover:bg-surface-2 transition-colors">
                      <p className="text-sm text-ink font-medium">{s.first_name} {s.last_name}</p>
                      <p className="text-xs text-muted mt-0.5">{s.admission_no} · {s.class_name || 'No class'}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Shortcuts">
            <ul className="divide-y divide-line">
              {SHORTCUTS.map(s => (
                <li key={s.href + s.label}>
                  <Link href={s.href} className="flex items-center justify-between px-4 min-h-[44px] text-sm text-ink hover:bg-surface-2 transition-colors">
                    {s.label}
                    <ChevronRight size={16} className="text-muted" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, note, progress }: { label: string; value: string; note?: string; progress?: number }) {
  return (
    <div className="p-4 bg-surface">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="text-[26px] font-semibold text-ink leading-tight mt-1 tabular-nums">{value}</p>
      {note && <p className="text-xs text-muted mt-1 tabular-nums">{note}</p>}
      {progress !== undefined && (
        <div
          className="h-1 bg-surface-2 rounded-full overflow-hidden mt-2"
          role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${label}: ${progress}%`}
        >
          <div className="h-full bg-brand" style={{ width: `${Math.min(progress, 100)}%` }} />
        </div>
      )}
    </div>
  );
}

function Panel({ title, aside, action, children }: { title: string; aside?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-surface border border-line rounded overflow-hidden">
      <div className="px-4 h-11 border-b border-line flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {aside && <span className="text-[13px] text-muted">{aside}</span>}
        {action}
      </div>
      {children}
    </section>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { request } from '@/lib/api';
import { SummaryStrip, Stat, StatSkeleton, Panel } from '@/components/ui/summary';
import { listAll, shortDate, trialState, type AdminSchool } from '@/lib/admin';

interface SystemStats {
  total_schools: number;
  active_schools: number;
  suspended_schools: number;
  total_students: number;
  active_students: number;
  total_staff: number;
  total_classes: number;
  total_subjects: number;
  recent_schools: {
    id: string; name: string; subdomain: string; status: string; plan: string;
    current_academic_year: string; created_at: string; student_count: number;
  }[];
}

type Attention = { tone: 'danger' | 'warning' | 'info'; text: string; action: string; href: string };

const dot = { danger: 'bg-danger', warning: 'bg-warning', info: 'bg-muted' } as const;

export default function ConsoleOverview() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [schools, setSchools] = useState<AdminSchool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [numbers, list] = await Promise.all([
          request<SystemStats>('GET', '/schools/system-stats/'),
          listAll<AdminSchool>('/schools/'),
        ]);
        setStats(numbers);
        setSchools(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load the console numbers.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const suspended = schools.filter(s => s.status === 'suspended');
  const expiring = schools.filter(s => {
    const t = trialState(s);
    return t.daysLeft !== null && t.daysLeft >= 0 && t.daysLeft <= 7;
  });
  const expired = schools.filter(s => {
    const t = trialState(s);
    return t.daysLeft !== null && t.daysLeft < 0;
  });

  const attention: Attention[] = [];
  if (suspended.length > 0) {
    attention.push({
      tone: 'danger',
      text: `${suspended.length} ${suspended.length === 1 ? 'school is' : 'schools are'} suspended`,
      action: 'Review', href: '/admin/schools?status=suspended',
    });
  }
  if (expired.length > 0) {
    attention.push({
      tone: 'danger',
      text: `${expired.length} ${expired.length === 1 ? 'school has' : 'schools have'} finished the trial`,
      action: 'Follow up', href: '/admin/schools',
    });
  }
  if (expiring.length > 0) {
    attention.push({
      tone: 'warning',
      text: `${expiring.length} ${expiring.length === 1 ? 'school ends' : 'schools end'} the trial within 7 days`,
      action: 'See who', href: '/admin/schools',
    });
  }

  const dash = '—';

  return (
    <div className="max-w-[1120px]">
      <header className="mb-6">
        <h1 className="text-[22px] font-semibold text-ink leading-tight">Platform overview</h1>
        <p className="text-[13px] text-muted mt-1">
          Every school on Clariva ·{' '}
          {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </header>

      {error && (
        <div role="alert" className="mb-6 text-sm text-danger bg-danger-soft border border-danger/30 rounded px-3 py-2">
          {error}
        </div>
      )}

      <SummaryStrip className="mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <Stat
              label="Schools"
              value={error ? dash : (stats?.total_schools ?? 0).toLocaleString()}
              note={error ? '' : `${stats?.active_schools ?? 0} active · ${stats?.suspended_schools ?? 0} suspended`}
            />
            <Stat
              label="Students"
              value={error ? dash : (stats?.total_students ?? 0).toLocaleString()}
              note={error ? '' : `${(stats?.active_students ?? 0).toLocaleString()} active`}
            />
            <Stat
              label="Staff"
              value={error ? dash : (stats?.total_staff ?? 0).toLocaleString()}
              note={error ? '' : `${(stats?.total_classes ?? 0).toLocaleString()} classes · ${(stats?.total_subjects ?? 0).toLocaleString()} subjects`}
            />
            <Stat
              label="Trials ending"
              value={error ? dash : expiring.length.toLocaleString()}
              note={error ? '' : `${expired.length} already ended`}
              tone={expiring.length > 0 ? 'danger' : undefined}
            />
          </>
        )}
      </SummaryStrip>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Panel title="Needs attention" aside={!loading && attention.length > 0 ? `${attention.length} open` : undefined}>
            {loading ? (
              <div className="p-4 space-y-3">
                {[0, 1].map(i => <div key={i} className="h-4 bg-surface-2 rounded animate-pulse" />)}
              </div>
            ) : attention.length === 0 ? (
              <p className="px-4 py-5 text-sm text-muted">
                {error ? 'Unavailable until the data loads.' : 'Nothing needs attention right now.'}
              </p>
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

          <Panel title="Newest schools" action={<Link href="/admin/schools" className="text-[13px] text-brand hover:underline">All schools</Link>}>
            {loading ? (
              <div className="p-4 space-y-3">
                {[0, 1, 2].map(i => <div key={i} className="h-4 bg-surface-2 rounded animate-pulse" />)}
              </div>
            ) : !stats || stats.recent_schools.length === 0 ? (
              <p className="px-4 py-5 text-sm text-muted">No schools yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {stats.recent_schools.map(s => (
                  <li key={s.id}>
                    <Link href={`/admin/schools/${s.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-surface-2 transition-colors">
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-ink truncate">{s.name}</span>
                        <span className="block text-[13px] text-muted truncate">
                          {s.subdomain} · {s.student_count} students · joined {shortDate(s.created_at)}
                        </span>
                      </span>
                      <span className={`text-[13px] shrink-0 ${s.status === 'active' ? 'text-success' : 'text-danger'}`}>
                        {s.status}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Console">
            <ul className="divide-y divide-line">
              {[
                { label: 'All schools', href: '/admin/schools' },
                { label: 'Payments', href: '/admin/billing' },
                { label: 'Term calendars', href: '/admin/calendars' },
                { label: 'Demo requests', href: '/admin/leads' },
                { label: 'Users', href: '/admin/users' },
                { label: 'Activity log', href: '/admin/audit' },
                { label: 'Maintenance', href: '/admin/system' },
              ].map(item => (
                <li key={item.href}>
                  <Link href={item.href} className="flex items-center justify-between px-4 min-h-[44px] text-sm text-ink hover:bg-surface-2 transition-colors">
                    {item.label}
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

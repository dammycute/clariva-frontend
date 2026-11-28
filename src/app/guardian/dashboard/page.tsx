'use client';

import { useState, useEffect } from 'react';
import { auth, portal } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Section, Figure } from '@/components/ui/report';
import { Walkthrough } from '@/components/walkthrough';

interface NotificationItem {
  id: string; type: string; title: string; message: string; read: boolean; created_at: string;
}

interface ChildData {
  id: string; full_name: string; admission_no: string; class_name: string | null;
  status: string; gender: string | null;
  fee_summary: { total_due: number; total_paid: number; balance: number };
  latest_report_card: { term: string; academic_year: string; average: number } | null;
  attendance_rate: number | null;
  recent_notifications: NotificationItem[];
}

const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`;

export default function GuardianDashboard() {
  const router = useRouter();
  const [children, setChildren] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(0);
  const [guide, setGuide] = useState(false);

  useEffect(() => {
    if (!auth.getToken()) return;
    auth.me()
      .then(u => setGuide(!u.must_change_password && u.walkthrough_done !== undefined && !u.walkthrough_done))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const token = auth.getToken();
    if (!token) {
      router.push('/guardian');
      return;
    }
    portal.children()
      .then(data => {
        setChildren(data as unknown as ChildData[]);
        setLoading(false);
      })
      .catch(() => {
        router.push('/guardian');
      });
  }, [router]);

  const handleLogout = () => {
    auth.logout();
    router.push('/guardian');
  };

  const totalBalance = children.reduce((a, c) => a + c.fee_summary.balance, 0);
  const child = children[active];

  const header = (
    <header className="flex items-center justify-between mb-10">
      <span className="text-lg font-semibold text-ink">Clarriva</span>
      <Button variant="secondary" onClick={handleLogout} className="h-9 px-3">Sign out</Button>
    </header>
  );

  if (loading) {
    return (
      <div role="status" aria-label="Loading your records" className="min-h-dvh bg-page">
        <div className="max-w-3xl mx-auto px-6 py-10 space-y-4 animate-pulse" aria-hidden="true">
          <div className="h-5 w-24 rounded bg-line" />
          <div className="h-8 w-64 rounded bg-line mt-8" />
          <div className="h-28 rounded bg-line" />
        </div>
        <span className="sr-only">Loading your records…</span>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-page">
      {guide && <Walkthrough role="parent" onClose={() => setGuide(false)} />}
      <main className="max-w-3xl mx-auto px-6 py-8">
        {header}

        <div className="mb-6" data-tour="children">
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Your children</h1>
          {children.length > 0 && (
            <p className="text-sm text-muted mt-1">
              {totalBalance > 0
                ? <>Total fees outstanding: <span className="text-danger font-medium tabular-nums">{naira(totalBalance)}</span></>
                : 'All fees are paid.'}
            </p>
          )}
        </div>

        {children.length === 0 && (
          <p className="text-sm text-muted border-t border-line pt-6">No children are linked to your account yet. Ask the school to link your phone number to your child&apos;s record.</p>
        )}

        {children.length > 1 && (
          <div role="tablist" aria-label="Children" className="flex gap-5 border-b border-line mb-6">
            {children.map((c, idx) => (
              <button
                key={c.id}
                role="tab"
                aria-selected={active === idx}
                onClick={() => setActive(idx)}
                className={`pb-2.5 -mb-px text-sm border-b-2 cursor-pointer transition-colors ${
                  active === idx ? 'border-brand text-ink font-semibold' : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                {c.full_name.split(' ')[0]}
              </button>
            ))}
          </div>
        )}

        {child && (
          <div>
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-ink tracking-tight">{child.full_name}</h2>
              <p className="text-sm text-muted mt-1">
                {child.admission_no} · {child.class_name || 'Class not set'}
                {child.gender && <> · {child.gender}</>}
              </p>
              <p className={`text-[13px] mt-1 ${child.status === 'active' ? 'text-success' : 'text-danger'}`}>
                {child.status.charAt(0).toUpperCase() + child.status.slice(1)}
              </p>
            </div>

            <div data-tour="fees">
            <Section title="Fees">
              <dl className="grid grid-cols-3 gap-4">
                <Figure label="Charged" value={naira(child.fee_summary.total_due)} />
                <Figure label="Paid" value={naira(child.fee_summary.total_paid)} />
                <Figure label="Balance" value={naira(child.fee_summary.balance)} tone={child.fee_summary.balance > 0 ? 'danger' : 'success'} />
              </dl>
            </Section>
            </div>

            <div data-tour="results">
            <Section title="Latest report card">
              {child.latest_report_card ? (
                <dl className="grid grid-cols-2 gap-4">
                  <Figure label={`${child.latest_report_card.term} ${child.latest_report_card.academic_year}`} value={`${child.latest_report_card.average}%`} tone={child.latest_report_card.average >= 50 ? undefined : 'danger'} />
                </dl>
              ) : (
                <p className="text-sm text-muted">No report cards have been released yet.</p>
              )}
            </Section>
            </div>

            <Section title="Attendance">
              {child.attendance_rate !== null ? (
                <dl className="grid grid-cols-2 gap-4">
                  <Figure label="Attendance rate" value={`${child.attendance_rate}%`} tone={child.attendance_rate >= 75 ? undefined : 'danger'} />
                </dl>
              ) : (
                <p className="text-sm text-muted">No attendance has been recorded yet.</p>
              )}
            </Section>

            {child.recent_notifications && child.recent_notifications.length > 0 && (
              <Section title="Recent updates">
                <ul className="divide-y divide-line border-y border-line">
                  {child.recent_notifications.slice(0, 3).map(n => (
                    <li key={n.id} className="py-3">
                      <p className="text-sm font-medium text-ink">{n.title}</p>
                      <p className="text-[13px] text-muted mt-0.5">{n.message}</p>
                      {n.created_at && (
                        <p className="text-xs text-muted/80 mt-1 tabular-nums">{new Date(n.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

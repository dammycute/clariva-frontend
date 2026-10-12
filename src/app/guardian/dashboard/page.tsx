'use client';

import { useState, useEffect } from 'react';
import { auth, portal } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { CheckCircle2, FileText, Banknote, BarChart3, Megaphone, ChevronUp, ChevronDown } from 'lucide-react';

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

export default function GuardianDashboard() {
  const router = useRouter();
  const [children, setChildren] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChild, setExpandedChild] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

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

  if (loading) return <div className="min-h-dvh bg-page flex items-center justify-center"><p className="text-sm text-muted">Loading your dashboard…</p></div>;

  if (children.length === 0) {
    return (
      <div className="min-h-dvh bg-page">
        <header className="h-14 bg-surface border-b border-line flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand rounded flex items-center justify-center text-brand-ink font-semibold text-xs">C</div>
            <span className="font-semibold text-sm text-ink">Parent Portal</span>
          </div>
          <button onClick={handleLogout} className="text-xs px-3 py-1.5 rounded border border-line bg-surface hover:bg-surface-2">Log out</button>
        </header>
        <main className="max-w-4xl mx-auto p-6">
          <div className="bg-surface border border-line rounded p-8 text-center">
            <p className="text-sm text-muted">No children linked to your account yet.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-page">
      <header className="h-14 bg-surface border-b border-line flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand rounded flex items-center justify-center text-brand-ink font-semibold text-xs">C</div>
          <span className="font-semibold text-sm text-ink">Parent Portal</span>
        </div>
        <button onClick={handleLogout} className="text-xs px-3 py-1.5 rounded border border-line bg-surface hover:bg-surface-2">Log out</button>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-semibold text-ink">My Children</h1>
          {totalBalance > 0 && (
            <div className="text-xs bg-danger-soft text-danger px-3 py-1.5 rounded font-semibold">
              Outstanding: ₦{totalBalance.toLocaleString()}
            </div>
          )}
        </div>
        <p className="text-xs text-muted mb-6">View your wards&apos; school information, fees, report cards, and attendance</p>

        {/* Tabs for multiple children */}
        {children.length > 1 && (
          <div className="flex gap-1 mb-4 bg-surface-2 rounded p-1">
            {children.map((child, idx) => (
              <button key={child.id} onClick={() => setActiveTab(idx)}
                className={`flex-1 text-xs py-2 rounded font-semibold transition-colors ${
                  activeTab === idx ? 'bg-surface text-ink' : 'text-muted hover:text-ink'
                }`}>
                {child.full_name.split(' ')[0]}
              </button>
            ))}
          </div>
        )}

        {renderChild(children[activeTab], expandedChild === children[activeTab].id, () => {
          setExpandedChild(expandedChild === children[activeTab].id ? null : children[activeTab].id);
        })}

        {/* Show other children if not using tabs */}
        {children.length > 1 && (
          <div className="mt-4 grid gap-4">
            {children.filter((_, i) => i !== activeTab).map(child => (
              <div key={child.id} className="bg-surface border border-line rounded overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-page"
                  onClick={() => { setActiveTab(children.indexOf(child)); }}>
                  <div>
                    <h2 className="text-base font-semibold text-ink">{child.full_name}</h2>
                    <p className="text-xs text-muted mt-0.5">{child.admission_no} · {child.class_name || '-'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                    child.fee_summary.balance > 0 ? 'bg-danger-soft text-danger' : 'bg-success/10 text-success'
                  }`}>
                    {child.fee_summary.balance > 0 ? `₦${child.fee_summary.balance.toLocaleString()}` : 'Paid'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );

  function renderChild(child: ChildData, isExpanded: boolean, onToggle: () => void) {
    const { fee_summary: fees, latest_report_card: rc, attendance_rate } = child;
    return (
      <div className="bg-surface border border-line rounded overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-line cursor-pointer hover:bg-page" onClick={onToggle}>
          <div>
            <h2 className="text-base font-semibold text-ink">{child.full_name}</h2>
            <p className="text-xs text-muted mt-0.5">{child.admission_no} · {child.class_name || '-'} · {child.gender || '-'}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${child.status === 'active' ? 'bg-success/10 text-success' : 'bg-danger-soft text-danger'}`}>{child.status}</span>
            <span className="text-muted text-sm">{isExpanded ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}</span>
          </div>
        </div>

        {isExpanded && (
          <div className="px-5 py-4 space-y-5">
            {/* Fee Summary */}
            <div>
              <p className="text-xs font-semibold text-muted mb-2">Fees</p>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-page rounded px-3 py-2">
                  <p className="text-xs text-muted">Total Due</p>
                  <p className="text-sm font-semibold text-ink">₦{fees.total_due.toLocaleString()}</p>
                </div>
                <div className="bg-page rounded px-3 py-2">
                  <p className="text-xs text-muted">Paid</p>
                  <p className="text-sm font-semibold text-brand">₦{fees.total_paid.toLocaleString()}</p>
                </div>
                <div className="bg-page rounded px-3 py-2">
                  <p className="text-xs text-muted">Outstanding</p>
                  <p className={`text-sm font-semibold ${fees.balance > 0 ? 'text-danger' : 'text-brand'}`}>₦{fees.balance.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Report Card */}
            <div>
              <p className="text-xs font-semibold text-muted mb-2">Latest Report Card</p>
              {rc ? (
                <div className="bg-page rounded px-3 py-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-ink">{rc.term} {rc.academic_year}</p>
                  </div>
                  <span className={`text-sm font-semibold ${rc.average >= 50 ? 'text-brand' : 'text-danger'}`}>{rc.average}%</span>
                </div>
              ) : (
                <p className="text-xs text-muted">No report cards yet.</p>
              )}
            </div>

            {/* Attendance */}
            <div>
              <p className="text-xs font-semibold text-muted mb-2">Attendance Rate</p>
              {attendance_rate !== null ? (
                <div className="bg-page rounded px-3 py-2">
                  <span className={`text-sm font-semibold ${attendance_rate >= 75 ? 'text-brand' : 'text-danger'}`}>{attendance_rate}%</span>
                </div>
              ) : (
                <p className="text-xs text-muted">No attendance records yet.</p>
              )}
            </div>

            {/* Notifications */}
            {child.recent_notifications && child.recent_notifications.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted mb-2">Recent Updates</p>
                <div className="space-y-1.5">
                  {child.recent_notifications.slice(0, 3).map(n => (
                    <div key={n.id} className="bg-page rounded px-3 py-2 flex items-start gap-2">
                      <span className="text-xs mt-0.5" aria-hidden="true">
                        {n.type === 'attendance' ? <CheckCircle2 size={16} /> : n.type === 'exam' ? <FileText size={16} /> : n.type === 'fee' ? <Banknote size={16} /> : n.type === 'grade' ? <BarChart3 size={16} /> : <Megaphone size={16} />}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink">{n.title}</p>
                        <p className="text-xs text-muted">{n.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
}

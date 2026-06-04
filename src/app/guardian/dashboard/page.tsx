'use client';

import { useState, useEffect } from 'react';
import { portal } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface ChildData {
  id: string; full_name: string; admission_no: string; class_name: string | null;
  status: string; gender: string | null;
  fee_summary: { total_due: number; total_paid: number; balance: number };
  latest_report_card: { term: string; academic_year: string; average: number } | null;
  attendance_rate: number | null;
}

export default function GuardianDashboard() {
  const router = useRouter();
  const [children, setChildren] = useState<ChildData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedChild, setExpandedChild] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
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
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    document.cookie = 'access_token=; path=/; max-age=0';
    router.push('/guardian');
  };

  const totalBalance = children.reduce((a, c) => a + c.fee_summary.balance, 0);

  if (loading) return <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center"><p className="text-sm text-[#64748B]">Loading your dashboard…</p></div>;

  if (children.length === 0) {
    return (
      <div className="min-h-screen bg-[#F7F9FC]">
        <header className="h-14 bg-white border-b border-[#DDE5F0] flex items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#1A7A4A] rounded-lg flex items-center justify-center text-white font-bold text-xs">C</div>
            <span className="font-semibold text-sm text-[#0D2B55]">Parent Portal</span>
          </div>
          <button onClick={handleLogout} className="text-xs px-3 py-1.5 rounded-lg border border-[#DDE5F0] bg-white hover:bg-[#F0F4FA]">Log out</button>
        </header>
        <main className="max-w-4xl mx-auto p-6">
          <div className="bg-white border border-[#DDE5F0] rounded-xl p-8 text-center">
            <p className="text-sm text-[#64748B]">No children linked to your account yet.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <header className="h-14 bg-white border-b border-[#DDE5F0] flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#1A7A4A] rounded-lg flex items-center justify-center text-white font-bold text-xs">C</div>
          <span className="font-semibold text-sm text-[#0D2B55]">Parent Portal</span>
        </div>
        <button onClick={handleLogout} className="text-xs px-3 py-1.5 rounded-lg border border-[#DDE5F0] bg-white hover:bg-[#F0F4FA]">Log out</button>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold text-[#0D2B55]">My Children</h1>
          {totalBalance > 0 && (
            <div className="text-xs bg-[#FEE2E2] text-[#B91C1C] px-3 py-1.5 rounded-lg font-bold">
              Outstanding: ₦{totalBalance.toLocaleString()}
            </div>
          )}
        </div>
        <p className="text-xs text-[#64748B] mb-6">View your wards&apos; school information, fees, report cards, and attendance</p>

        {/* Tabs for multiple children */}
        {children.length > 1 && (
          <div className="flex gap-1 mb-4 bg-[#F0F4FA] rounded-lg p-1">
            {children.map((child, idx) => (
              <button key={child.id} onClick={() => setActiveTab(idx)}
                className={`flex-1 text-xs py-2 rounded-md font-semibold transition-colors ${
                  activeTab === idx ? 'bg-white text-[#0D2B55] shadow-sm' : 'text-[#64748B] hover:text-[#0D2B55]'
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
              <div key={child.id} className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#F8FAFF]"
                  onClick={() => { setActiveTab(children.indexOf(child)); }}>
                  <div>
                    <h2 className="text-base font-bold text-[#0D2B55]">{child.full_name}</h2>
                    <p className="text-xs text-[#64748B] mt-0.5">{child.admission_no} · {child.class_name || '—'}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    child.fee_summary.balance > 0 ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-[#DCFCE7] text-[#1A7A4A]'
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
      <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#DDE5F0] cursor-pointer hover:bg-[#F8FAFF]" onClick={onToggle}>
          <div>
            <h2 className="text-base font-bold text-[#0D2B55]">{child.full_name}</h2>
            <p className="text-xs text-[#64748B] mt-0.5">{child.admission_no} · {child.class_name || '—'} · {child.gender || '—'}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${child.status === 'active' ? 'bg-[#DCFCE7] text-[#1A7A4A]' : 'bg-[#FEE2E2] text-[#B91C1C]'}`}>{child.status}</span>
            <span className="text-[#64748B] text-sm">{isExpanded ? '▲' : '▼'}</span>
          </div>
        </div>

        {isExpanded && (
          <div className="px-5 py-4 space-y-5">
            {/* Fee Summary */}
            <div>
              <p className="text-[11px] font-bold text-[#64748B] uppercase mb-2">Fees</p>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="bg-[#F7F9FC] rounded-lg px-3 py-2">
                  <p className="text-[10px] text-[#64748B]">Total Due</p>
                  <p className="text-sm font-bold text-[#0D2B55]">₦{fees.total_due.toLocaleString()}</p>
                </div>
                <div className="bg-[#F7F9FC] rounded-lg px-3 py-2">
                  <p className="text-[10px] text-[#64748B]">Paid</p>
                  <p className="text-sm font-bold text-[#1A7A4A]">₦{fees.total_paid.toLocaleString()}</p>
                </div>
                <div className="bg-[#F7F9FC] rounded-lg px-3 py-2">
                  <p className="text-[10px] text-[#64748B]">Outstanding</p>
                  <p className={`text-sm font-bold ${fees.balance > 0 ? 'text-[#B91C1C]' : 'text-[#1A7A4A]'}`}>₦{fees.balance.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* Report Card */}
            <div>
              <p className="text-[11px] font-bold text-[#64748B] uppercase mb-2">Latest Report Card</p>
              {rc ? (
                <div className="bg-[#F7F9FC] rounded-lg px-3 py-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#0D2B55]">{rc.term} {rc.academic_year}</p>
                  </div>
                  <span className={`text-sm font-bold ${rc.average >= 50 ? 'text-[#1A7A4A]' : 'text-[#B91C1C]'}`}>{rc.average}%</span>
                </div>
              ) : (
                <p className="text-xs text-[#64748B]">No report cards yet.</p>
              )}
            </div>

            {/* Attendance */}
            <div>
              <p className="text-[11px] font-bold text-[#64748B] uppercase mb-2">Attendance Rate</p>
              {attendance_rate !== null ? (
                <div className="bg-[#F7F9FC] rounded-lg px-3 py-2">
                  <span className={`text-sm font-bold ${attendance_rate >= 75 ? 'text-[#1A7A4A]' : 'text-[#B91C1C]'}`}>{attendance_rate}%</span>
                </div>
              ) : (
                <p className="text-xs text-[#64748B]">No attendance records yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
}

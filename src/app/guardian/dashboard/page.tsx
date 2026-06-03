'use client';

import { useState, useEffect } from 'react';
import { auth, api } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface InvoiceItem {
  id: string; fee_item: string | null; fee_name: string | null;
  amount_due: number; amount_paid: number;
}

interface Invoice {
  id: string; student: string; amount_due: number; amount_paid: number;
  status: string; items: InvoiceItem[];
}

interface ReportCard {
  id: string; student: string; term: string; academic_year: string;
  total_score: number; total_possible: number; average: number;
  class_rank: number; generated_at: string;
}

export default function GuardianDashboard() {
  const router = useRouter();
  const [children, setChildren] = useState<(Record<string, unknown> & { id: string; full_name: string; admission_no: string; gender: string | null; class_group: string | null; status: string; class_name?: string })[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const [expandedChild, setExpandedChild] = useState<string | null>(null);

  useEffect(() => {
    auth.me().then(user => {
      if (!user) { router.push('/guardian'); return; }
      setUserEmail(user.email || '');
      loadData(user.email || '');
    }).catch(() => router.push('/guardian'));
  }, [router]);

  async function loadData(email: string) {
    setLoading(true);
    const [stuRes, clsRes, invRes, rcRes] = await Promise.all([
      api.students.list(),
      api.classes.list(),
      api.feeInvoices.list(),
      api.reportCards.list(),
    ]);

    const students = stuRes as Array<Record<string, unknown>>;
    const classes = clsRes as { id: string; name: string }[];
    const allInvoices = invRes as Invoice[];
    const allRcs = Array.isArray(rcRes) ? rcRes as ReportCard[] : [];

    const classMap = new Map(classes.map(c => [c.id, c.name]));
    const myChildren = students.filter(s => s.guardian_email === email);
    setChildren(myChildren.map(s => ({
      ...s, class_name: classMap.get(String(s.class_group || '')) || '—',
    } as typeof children[0])));

    const studentIds = new Set(myChildren.map(s => s.id as string));
    setInvoices(allInvoices.filter(inv => studentIds.has(inv.student)));
    setReportCards(allRcs.filter(rc => studentIds.has(rc.student)));
    setLoading(false);
  }

  const handleLogout = () => { auth.logout(); router.push('/guardian'); };

  const totalBalance = invoices.reduce((a, i) => a + (Number(i.amount_due) - Number(i.amount_paid)), 0);

  if (loading) return <div className="min-h-screen bg-[#F7F9FC] flex items-center justify-center"><p className="text-sm text-[#64748B]">Loading your dashboard…</p></div>;

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <header className="h-14 bg-white border-b border-[#DDE5F0] flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#1A7A4A] rounded-lg flex items-center justify-center text-white font-bold text-xs">C</div>
          <span className="font-semibold text-sm text-[#0D2B55]">Parent Portal</span>
          <span className="text-xs text-[#64748B] ml-2">{userEmail}</span>
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

        {children.length === 0 ? (
          <div className="bg-white border border-[#DDE5F0] rounded-xl p-8 text-center">
            <p className="text-sm text-[#64748B]">No children linked to your account yet. Contact the school to link your email.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {children.map(child => {
              const childInvoices = invoices.filter(i => i.student === child.id);
              const childRcs = reportCards.filter(rc => rc.student === child.id);
              const totalDue = childInvoices.reduce((a, i) => a + Number(i.amount_due), 0);
              const totalPaid = childInvoices.reduce((a, i) => a + Number(i.amount_paid), 0);
              const outstanding = totalDue - totalPaid;
              const allItems = childInvoices.flatMap(inv => (inv.items || []));
              const isExpanded = expandedChild === child.id;

              return (
                <div key={child.id} className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-[#DDE5F0] cursor-pointer hover:bg-[#F8FAFF]"
                    onClick={() => setExpandedChild(isExpanded ? null : child.id)}>
                    <div>
                      <h2 className="text-base font-bold text-[#0D2B55]">{child.full_name}</h2>
                      <p className="text-xs text-[#64748B] mt-0.5">{child.admission_no} · {child.class_name} · {child.gender || '—'}</p>
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
                        <p className="text-[11px] font-bold text-[#64748B] uppercase mb-2">💰 Fees</p>
                        {allItems.length === 0 ? (
                          <p className="text-xs text-[#64748B]">No fee records yet.</p>
                        ) : (
                          <>
                            <div className="grid grid-cols-3 gap-3 mb-3">
                              <div className="bg-[#F7F9FC] rounded-lg px-3 py-2">
                                <p className="text-[10px] text-[#64748B]">Total Due</p>
                                <p className="text-sm font-bold text-[#0D2B55]">₦{totalDue.toLocaleString()}</p>
                              </div>
                              <div className="bg-[#F7F9FC] rounded-lg px-3 py-2">
                                <p className="text-[10px] text-[#64748B]">Paid</p>
                                <p className="text-sm font-bold text-[#1A7A4A]">₦{totalPaid.toLocaleString()}</p>
                              </div>
                              <div className="bg-[#F7F9FC] rounded-lg px-3 py-2">
                                <p className="text-[10px] text-[#64748B]">Outstanding</p>
                                <p className={`text-sm font-bold ${outstanding > 0 ? 'text-[#B91C1C]' : 'text-[#1A7A4A]'}`}>₦{outstanding.toLocaleString()}</p>
                              </div>
                            </div>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-[10px] font-bold text-[#64748B] uppercase">
                                  <th className="text-left py-1.5">Fee</th><th className="text-left py-1.5">Due</th>
                                  <th className="text-left py-1.5">Paid</th><th className="text-left py-1.5">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {allItems.map(item => {
                                  const bal = Number(item.amount_due) - Number(item.amount_paid);
                                  return (
                                    <tr key={item.id} className="border-t border-[#DDE5F0]">
                                      <td className="py-1.5">{item.fee_name || 'Fee'}</td>
                                      <td className="py-1.5">₦{Number(item.amount_due).toLocaleString()}</td>
                                      <td className="py-1.5">₦{Number(item.amount_paid).toLocaleString()}</td>
                                      <td className="py-1.5">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${bal <= 0 ? 'bg-[#DCFCE7] text-[#1A7A4A]' : 'bg-[#FEE2E2] text-[#B91C1C]'}`}>
                                          {bal <= 0 ? 'Paid' : 'Pending'}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </>
                        )}
                      </div>

                      {/* Report Cards */}
                      <div>
                        <p className="text-[11px] font-bold text-[#64748B] uppercase mb-2">📄 Report Cards</p>
                        {childRcs.length === 0 ? (
                          <p className="text-xs text-[#64748B]">No report cards available yet.</p>
                        ) : (
                          <div className="divide-y divide-[#DDE5F0]">
                            {childRcs.map(rc => {
                              const pct = rc.total_possible > 0 ? Math.round((rc.total_score / rc.total_possible) * 100) : 0;
                              return (
                                <div key={rc.id} className="py-2.5 flex items-center justify-between">
                                  <div>
                                    <p className="text-xs font-semibold text-[#0D2B55]">{rc.term} {rc.academic_year}</p>
                                    <p className="text-[10px] text-[#64748B]">Score: {rc.total_score}/{rc.total_possible} · Rank: {rc.class_rank}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs font-bold ${pct >= 50 ? 'text-[#1A7A4A]' : 'text-[#B91C1C]'}`}>{pct}%</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${rc.average >= 50 ? 'bg-[#DCFCE7] text-[#1A7A4A]' : 'bg-[#FEE2E2] text-[#B91C1C]'}`}>
                                      {rc.average >= 50 ? 'Pass' : 'Fail'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

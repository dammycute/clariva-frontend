'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { portal } from '@/lib/api';
import type { JSX } from 'react';

type LookupResult = {
  student_id: string; full_name: string; admission_no: string;
  class_name: string | null; status: string; school_name: string | null;
  fee_summary: {
    total_due: number; total_paid: number; balance: number; status: string;
    items: { description: string; amount_due: number; amount_paid: number }[];
  };
  latest_report_card: {
    term: string; academic_year: string; average: number | null;
    class_rank: number | null;
    subjects: { name: string; score: number; grade: string }[];
  } | null;
  attendance: {
    rate: number | null; present: number; absent: number; late: number; total: number;
  };
};

const WAEC_GRADES = [
  { grade: 'A1', desc: 'Excellent' }, { grade: 'B2', desc: 'Very Good' },
  { grade: 'B3', desc: 'Good' }, { grade: 'C4', desc: 'Credit' },
  { grade: 'C5', desc: 'Credit' }, { grade: 'C6', desc: 'Credit' },
  { grade: 'D7', desc: 'Pass' }, { grade: 'E8', desc: 'Pass' },
  { grade: 'F9', desc: 'Fail' },
];

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    inactive: 'bg-red-100 text-red-700',
    graduated: 'bg-blue-100 text-blue-700',
    suspended: 'bg-amber-100 text-amber-700',
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}

function FeeStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    paid: 'bg-green-100 text-green-700',
    partial: 'bg-amber-100 text-amber-700',
    unpaid: 'bg-red-100 text-red-700',
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
}

function ProgressBar({ pct, color }: { pct: number; color?: string }) {
  return (
    <div className="h-2.5 bg-[#F0F4FA] rounded-full overflow-hidden">
      <div className={`h-full rounded-full ${color || 'bg-[#1A7A4A]'}`} style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }} />
    </div>
  );
}

function Card({ title, children, className = '' }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-[#DDE5F0] rounded-xl overflow-hidden ${className}`}>
      {title && <div className="px-4 py-3 border-b border-[#DDE5F0]"><h2 className="text-sm font-bold text-[#0D2B55]">{title}</h2></div>}
      <div className="p-4">{children}</div>
    </div>
  );
}

export default function PortalPage(): JSX.Element {
  const params = useParams();
  const code = params?.code as string;

  const [data, setData] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    (async () => {
      try {
        const res = await portal.lookup(code) as LookupResult;
        setData(res);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Code not found');
      }
      finally { setLoading(false); }
    })();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#1A7A4A] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#64748B]">Loading student records…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F8FAFF] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-[#DDE5F0] rounded-2xl p-8 text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-lg font-bold text-[#0D2B55] mb-2">Code not found</h2>
          <p className="text-sm text-[#64748B] mb-6">This code was not found. Check the code on your child&apos;s report card and try again.</p>
          <Link href="/" className="inline-block text-sm px-5 py-2.5 rounded-lg bg-[#1A7A4A] text-white font-bold hover:bg-[#14663D]">Go to Home</Link>
        </div>
      </div>
    );
  }

  if (!data) return <div />;

  const fee = data.fee_summary;
  const rc = data.latest_report_card;
  const att = data.attendance;
  const ts = new Date().toLocaleString();

  return (
    <div className="min-h-screen bg-[#F8FAFF]">
      <div className="max-w-3xl mx-auto px-4 py-6 print:px-0 print:py-0">
        {/* header */}
        <div className="flex items-center justify-between mb-6 print:hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1A7A4A] rounded-lg flex items-center justify-center text-white font-bold text-sm">C</div>
            <span className="text-sm font-semibold text-[#0D2B55]">Clariva</span>
          </div>
          <button onClick={() => window.print()}
            className="text-xs px-3 py-1.5 rounded-lg border border-[#DDE5F0] hover:bg-[#F0F4FA] cursor-pointer">🖨 Print</button>
        </div>

        {/* print header */}
        <div className="hidden print:block text-center mb-6">
          <p className="text-lg font-bold text-[#0D2B55]">{data.school_name || 'Student Records'}</p>
          <p className="text-xs text-[#64748B]">Generated {ts}</p>
          <hr className="my-3 border-[#DDE5F0]" />
        </div>

        <h1 className="text-lg font-bold text-[#0D2B55] mb-4 print:text-xl">Student Records</h1>

        {/* student card */}
        <Card className="mb-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#0D2B55]">{data.full_name}</h2>
              <p className="text-xs text-[#64748B] mt-1">{data.admission_no}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-[#64748B]">
                <span>{data.class_name || 'Class not set'}</span>
                {data.school_name && <span>· {data.school_name}</span>}
              </div>
            </div>
            <StatusBadge status={data.status} />
          </div>
        </Card>

        {/* fee summary */}
        <Card title="Fee Summary" className="mb-4">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center">
              <p className="text-lg font-bold text-[#0D2B55]">₦{fee.total_due.toLocaleString()}</p>
              <p className="text-[10px] text-[#64748B]">Total Charged</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-[#0D2B55]">₦{fee.total_paid.toLocaleString()}</p>
              <p className="text-[10px] text-[#64748B]">Paid</p>
            </div>
            <div className="text-center">
              <p className={`text-lg font-bold ${fee.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ₦{fee.balance.toLocaleString()}
              </p>
              <p className="text-[10px] text-[#64748B]">Balance</p>
            </div>
          </div>
          <div className="flex items-center justify-between mb-3">
            <FeeStatusBadge status={fee.status} />
          </div>
          {fee.items.length > 0 && (
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-[#64748B] border-b border-[#DDE5F0]">
                  <th className="text-left py-1.5 font-bold">Item</th>
                  <th className="text-right py-1.5 font-bold">Amount</th>
                  <th className="text-right py-1.5 font-bold">Paid</th>
                  <th className="text-right py-1.5 font-bold">Balance</th>
                </tr>
              </thead>
              <tbody>
                {fee.items.map((item, i) => (
                  <tr key={i} className="border-b border-[#F0F4FA]">
                    <td className="py-1.5 text-[#0D2B55]">{item.description}</td>
                    <td className="py-1.5 text-right">₦{item.amount_due.toLocaleString()}</td>
                    <td className="py-1.5 text-right">₦{item.amount_paid.toLocaleString()}</td>
                    <td className={`py-1.5 text-right font-bold ${(item.amount_due - item.amount_paid) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₦{(item.amount_due - item.amount_paid).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* report card */}
        {rc && (
          <Card title={`Report Card — ${rc.term} ${rc.academic_year}`} className="mb-4">
            <div className="flex items-center gap-4 mb-4">
              {rc.average !== null && (
                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs text-[#64748B] mb-1">
                    <span>Average</span>
                    <span className="font-bold text-[#0D2B55]">{rc.average}%</span>
                  </div>
                  <ProgressBar pct={rc.average} color={rc.average >= 50 ? 'bg-[#1A7A4A]' : 'bg-red-500'} />
                </div>
              )}
              {rc.class_rank !== null && (
                <div className="text-center shrink-0">
                  <p className="text-lg font-bold text-[#0D2B55]">#{rc.class_rank}</p>
                  <p className="text-[10px] text-[#64748B]">Class Rank</p>
                </div>
              )}
            </div>

            {rc.subjects.length > 0 && (
              <table className="w-full text-xs border-collapse mb-3">
                <thead>
                  <tr className="text-[#64748B] border-b border-[#DDE5F0]">
                    <th className="text-left py-1.5 font-bold">Subject</th>
                    <th className="text-right py-1.5 font-bold">Score</th>
                    <th className="text-right py-1.5 font-bold">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {rc.subjects.map((s, i) => (
                    <tr key={i} className="border-b border-[#F0F4FA]">
                      <td className="py-1.5 text-[#0D2B55]">{s.name}</td>
                      <td className="py-1.5 text-right">{s.score}</td>
                      <td className="py-1.5 text-right font-bold">{s.grade || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <details className="text-xs text-[#64748B] print:block">
              <summary className="cursor-pointer font-bold print:hidden">WAEC Grade Legend</summary>
              <div className="mt-1 grid grid-cols-3 gap-1 print:grid-cols-4">
                {WAEC_GRADES.map(g => (
                  <span key={g.grade} className="flex gap-1">
                    <span className="font-bold text-[#0D2B55]">{g.grade}</span>
                    <span>{g.desc}</span>
                  </span>
                ))}
              </div>
            </details>
          </Card>
        )}

        {/* attendance */}
        <Card title="Attendance" className="mb-4">
          <div className="flex items-center gap-4 mb-3">
            {att.rate !== null && (
              <div className="flex-1">
                <div className="flex items-center justify-between text-xs text-[#64748B] mb-1">
                  <span>Attendance Rate</span>
                  <span className="font-bold text-[#0D2B55]">{att.rate}%</span>
                </div>
                <ProgressBar pct={att.rate} color={att.rate >= 75 ? 'bg-[#1A7A4A]' : att.rate >= 50 ? 'bg-amber-400' : 'bg-red-500'} />
              </div>
            )}
          </div>
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="bg-green-50 rounded-lg p-2">
              <p className="text-lg font-bold text-green-700">{att.present}</p>
              <p className="text-[10px] text-[#64748B]">Present</p>
            </div>
            <div className="bg-red-50 rounded-lg p-2">
              <p className="text-lg font-bold text-red-700">{att.absent}</p>
              <p className="text-[10px] text-[#64748B]">Absent</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-2">
              <p className="text-lg font-bold text-amber-700">{att.late}</p>
              <p className="text-[10px] text-[#64748B]">Late</p>
            </div>
          </div>
        </Card>

        {/* footer */}
        <div className="text-center py-6 border-t border-[#DDE5F0] print:border-t-0">
          <Link href="/guardian" className="text-sm text-[#1A7A4A] font-bold hover:underline print:hidden">
            Want to check anytime? Set up a parent account →
          </Link>
          <p className="text-[10px] text-[#94A3B8] mt-2">
            This information is provided by {data.school_name || 'the school'} via Clariva
          </p>
          <p className="text-[10px] text-[#94A3B8]">Generated {ts}</p>
        </div>
      </div>
    </div>
  );
}

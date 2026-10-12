'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { portal } from '@/lib/api';
import { Button } from '@/components/ui/button';
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
  { grade: 'A1', desc: 'Excellent' }, { grade: 'B2', desc: 'Very good' },
  { grade: 'B3', desc: 'Good' }, { grade: 'C4', desc: 'Credit' },
  { grade: 'C5', desc: 'Credit' }, { grade: 'C6', desc: 'Credit' },
  { grade: 'D7', desc: 'Pass' }, { grade: 'E8', desc: 'Pass' },
  { grade: 'F9', desc: 'Fail' },
];

const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`;
const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const STATUS_TONE: Record<string, string> = {
  active: 'text-success', paid: 'text-success', graduated: 'text-ink',
  partial: 'text-warning', suspended: 'text-warning',
  unpaid: 'text-danger', inactive: 'text-danger',
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="py-6 border-t border-line print:break-inside-avoid">
      <h2 className="text-[15px] font-semibold text-ink mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Figure({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div>
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className={`text-xl font-semibold tabular-nums mt-0.5 ${tone || 'text-ink'}`}>{value}</dd>
    </div>
  );
}

const TH = 'py-2 text-[13px] font-medium text-muted';

export default function PortalPage(): JSX.Element {
  const params = useParams();
  const code = Array.isArray(params?.code) ? params.code.join('/') : (params?.code as string);

  const [data, setData] = useState<LookupResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) return;
    (async () => {
      try {
        const params = code.startsWith('CLR-') ? { code } : { admission_no: code };
        const res = await portal.lookup(params) as LookupResult;
        setData(res);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Code not found');
      }
      finally { setLoading(false); }
    })();
  }, [code]);

  if (loading) {
    return (
      <div role="status" aria-label="Loading student records" className="min-h-dvh bg-page">
        <div className="max-w-3xl mx-auto px-6 py-10 space-y-4 animate-pulse" aria-hidden="true">
          <div className="h-3 w-24 rounded bg-line" />
          <div className="h-7 w-64 rounded bg-line" />
          <div className="h-3 w-48 rounded bg-line" />
          <div className="h-24 rounded bg-line mt-8" />
        </div>
        <span className="sr-only">Loading student records…</span>
      </div>
    );
  }

  if (error) {
    return (
      <main className="min-h-dvh flex items-center bg-page px-6">
        <div className="w-full max-w-[420px] mx-auto">
          <h1 className="text-2xl font-semibold text-ink tracking-tight text-balance">We couldn&apos;t find that code</h1>
          <p className="text-sm text-muted mt-2 text-pretty">
            Check the code on your child&apos;s report card or fee receipt, then try again.
          </p>
          <Link
            href="/"
            className="inline-flex items-center h-11 px-4 mt-6 rounded bg-brand text-brand-ink text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-[opacity,transform] duration-150"
          >
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  if (!data) return <div />;

  const fee = data.fee_summary;
  const rc = data.latest_report_card;
  const att = data.attendance;
  const ts = new Date().toLocaleString('en-NG');

  return (
    <div className="min-h-dvh bg-page print:bg-white">
      <main className="max-w-3xl mx-auto px-6 py-8 print:px-0 print:py-0">
        <header className="flex items-center justify-between mb-10 print:hidden">
          <Link href="/" className="text-lg font-semibold text-ink">Clariva</Link>
          <Button variant="secondary" onClick={() => window.print()} className="h-9 px-3">Print</Button>
        </header>

        <div className="hidden print:block mb-6">
          <p className="text-lg font-semibold text-ink">{data.school_name || 'Student records'}</p>
          <p className="text-[13px] text-muted">Generated {ts}</p>
        </div>

        <div className="mb-6">
          <p className="text-sm text-muted">Student records</p>
          <h1 className="text-3xl font-semibold text-ink tracking-tight mt-1 text-balance">{data.full_name}</h1>
          <p className="text-sm text-muted mt-2">
            {data.admission_no} · {data.class_name || 'Class not set'}
            {data.school_name && <> · {data.school_name}</>}
          </p>
          <p className={`text-[13px] mt-1 ${STATUS_TONE[data.status] || 'text-muted'}`}>{sentence(data.status)}</p>
        </div>

        <Section title="Fees">
          <dl className="grid grid-cols-3 gap-4 mb-2">
            <Figure label="Charged" value={naira(fee.total_due)} />
            <Figure label="Paid" value={naira(fee.total_paid)} />
            <Figure label="Balance" value={naira(fee.balance)} tone={fee.balance > 0 ? 'text-danger' : 'text-success'} />
          </dl>
          <p className={`text-[13px] mb-4 ${STATUS_TONE[fee.status] || 'text-muted'}`}>Status: {fee.status}</p>
          {fee.items.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th className={TH}>Item</th>
                    <th className={`${TH} text-right`}>Charged</th>
                    <th className={`${TH} text-right`}>Paid</th>
                    <th className={`${TH} text-right`}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {fee.items.map((item, i) => {
                    const bal = item.amount_due - item.amount_paid;
                    return (
                      <tr key={i} className="border-b border-line last:border-0">
                        <td className="py-2.5 text-ink">{item.description}</td>
                        <td className="py-2.5 text-right tabular-nums">{naira(item.amount_due)}</td>
                        <td className="py-2.5 text-right tabular-nums">{naira(item.amount_paid)}</td>
                        <td className={`py-2.5 text-right tabular-nums font-medium ${bal > 0 ? 'text-danger' : 'text-success'}`}>{naira(bal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {rc && (
          <Section title={`Report card, ${rc.term} ${rc.academic_year}`}>
            <dl className="grid grid-cols-2 gap-4 mb-4">
              {rc.average !== null && <Figure label="Average" value={`${rc.average}%`} tone={rc.average >= 50 ? 'text-ink' : 'text-danger'} />}
              {rc.class_rank !== null && <Figure label="Class position" value={`${rc.class_rank}`} />}
            </dl>

            {rc.subjects.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse mb-4">
                  <thead>
                    <tr className="border-b border-line text-left">
                      <th className={TH}>Subject</th>
                      <th className={`${TH} text-right`}>Score</th>
                      <th className={`${TH} text-right`}>Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rc.subjects.map((s, i) => (
                      <tr key={i} className="border-b border-line last:border-0">
                        <td className="py-2.5 text-ink">{s.name}</td>
                        <td className="py-2.5 text-right tabular-nums">{s.score}</td>
                        <td className="py-2.5 text-right font-medium">{s.grade || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <details className="text-[13px] text-muted print:block">
              <summary className="cursor-pointer text-ink print:hidden">WAEC grade key</summary>
              <ul className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 print:grid-cols-4">
                {WAEC_GRADES.map(g => (
                  <li key={g.grade}><span className="font-medium text-ink">{g.grade}</span> {g.desc}</li>
                ))}
              </ul>
            </details>
          </Section>
        )}

        <Section title="Attendance">
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {att.rate !== null && <Figure label="Attendance rate" value={`${att.rate}%`} tone={att.rate >= 75 ? 'text-ink' : 'text-danger'} />}
            <Figure label="Present" value={att.present} />
            <Figure label="Absent" value={att.absent} />
            <Figure label="Late" value={att.late} />
          </dl>
        </Section>

        <footer className="py-6 border-t border-line text-[13px] text-muted space-y-1.5">
          <p className="print:hidden">
            Want to check anytime?{' '}
            <Link href="/guardian" className="text-ink underline underline-offset-2">Create a parent account</Link>
          </p>
          <p>Provided by {data.school_name || 'the school'} through Clariva. Generated {ts}.</p>
        </footer>
      </main>
    </div>
  );
}

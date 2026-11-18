'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { SummaryStrip, Stat, StatSkeleton, Panel, LinkList } from '@/components/ui/summary';

const naira = (n: number) => `₦${Math.round(n).toLocaleString('en-NG')}`;

export default function BursaryDashboard() {
  const [summary, setSummary] = useState<{
    total_students: number; total_due: number; total_paid: number; outstanding: number;
    collection_rate: number; paid_invoices: number; pending_invoices: number;
    item_breakdown: { name: string; total_due: number; total_paid: number; outstanding: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    api.feeInvoices.bursarySummary()
      .then(setSummary)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  const dash = '-';

  return (
    <div className="max-w-[1120px]">
      <header className="mb-6">
        <h1 className="text-[22px] font-semibold text-ink leading-tight">Fee collection</h1>
        <p className="text-[13px] text-muted mt-1">Where fees stand across the school.</p>
      </header>

      {failed && (
        <div role="alert" className="mb-6 text-sm text-danger bg-danger-soft border border-danger/30 rounded px-3 py-2">
          We couldn&apos;t load the fee summary. Refresh to try again.
        </div>
      )}

      <SummaryStrip className="mb-6">
        {loading ? Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />) : (
          <>
            <Stat label="Charged" value={summary ? naira(summary.total_due) : dash} note={summary ? `${summary.total_students.toLocaleString()} students` : undefined} />
            <Stat label="Collected" value={summary ? naira(summary.total_paid) : dash} note={summary ? `${summary.collection_rate}% of charged` : undefined} progress={summary ? summary.collection_rate : undefined} />
            <Stat label="Outstanding" value={summary ? naira(summary.outstanding) : dash} tone={summary && summary.outstanding > 0 ? 'danger' : undefined} />
            <Stat label="Invoices" value={summary ? `${summary.paid_invoices} paid` : dash} note={summary ? `${summary.pending_invoices} pending` : undefined} />
          </>
        )}
      </SummaryStrip>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {summary && summary.item_breakdown.length > 0 && (
          <div className="lg:col-span-2">
            <Panel title="By fee item">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-line text-left">
                      <th className="px-4 py-2 text-[13px] font-medium text-muted">Item</th>
                      <th className="px-4 py-2 text-[13px] font-medium text-muted text-right">Charged</th>
                      <th className="px-4 py-2 text-[13px] font-medium text-muted text-right">Paid</th>
                      <th className="px-4 py-2 text-[13px] font-medium text-muted text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.item_breakdown.map((item, idx) => (
                      <tr key={idx} className="border-b border-line last:border-0">
                        <td className="px-4 py-2.5 text-ink">{item.name}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{naira(item.total_due)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{naira(item.total_paid)}</td>
                        <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${item.outstanding > 0 ? 'text-danger' : 'text-success'}`}>
                          {item.outstanding > 0 ? naira(item.outstanding) : 'Paid'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>
        )}

        <div className={summary && summary.item_breakdown.length > 0 ? '' : 'lg:col-span-3'}>
          <Panel title="Where to work">
            <LinkList items={[{ label: 'Invoices', text: 'Find an invoice and record a payment.', href: '/bursary/invoices' }]} />
          </Panel>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Banknote, User } from 'lucide-react';

export default function BursaryDashboard() {
  const [summary, setSummary] = useState<{
    total_students: number; total_due: number; total_paid: number; outstanding: number;
    collection_rate: number; paid_invoices: number; pending_invoices: number;
    item_breakdown: { name: string; total_due: number; total_paid: number; outstanding: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.feeInvoices.bursarySummary()
      .then(setSummary)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center text-sm text-muted py-12">Loading bursary summary…</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-ink">Bursary Dashboard</h1>
        <p className="text-xs text-muted mt-0.5">Fee collection overview for your school</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface border border-line rounded p-4">
          <p className="text-xs font-semibold text-muted">Total Due</p>
          <p className="text-xl font-semibold text-ink">₦{summary ? summary.total_due.toLocaleString() : '-'}</p>
        </div>
        <div className="bg-surface border border-line rounded p-4">
          <p className="text-xs font-semibold text-muted">Collected</p>
          <p className="text-xl font-semibold text-brand">₦{summary ? summary.total_paid.toLocaleString() : '-'}</p>
        </div>
        <div className="bg-surface border border-line rounded p-4">
          <p className="text-xs font-semibold text-muted">Outstanding</p>
          <p className="text-xl font-semibold text-danger">₦{summary ? summary.outstanding.toLocaleString() : '-'}</p>
        </div>
        <div className="bg-surface border border-line rounded p-4">
          <p className="text-xs font-semibold text-muted">Collection Rate</p>
          <p className="text-xl font-semibold text-warning">{summary ? `${summary.collection_rate}%` : '-'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-surface border border-line rounded p-4">
          <p className="text-xs font-semibold text-muted">Paid Invoices</p>
          <p className="text-xl font-semibold text-brand">{summary?.paid_invoices || 0}</p>
        </div>
        <div className="bg-surface border border-line rounded p-4">
          <p className="text-xs font-semibold text-muted">Pending Invoices</p>
          <p className="text-xl font-semibold text-danger">{summary?.pending_invoices || 0}</p>
        </div>
      </div>

      {summary && summary.item_breakdown.length > 0 && (
        <div className="bg-surface border border-line rounded overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-line">
            <h3 className="text-sm font-semibold text-ink">Fee Item Breakdown</h3>
          </div>
          <div className="divide-y divide-line">
            {summary.item_breakdown.map((item, idx) => (
              <div key={idx} className="px-4 py-3 flex items-center justify-between">
                <p className="text-xs font-semibold text-ink">{item.name}</p>
                <div className="text-right">
                  <p className="text-xs text-muted">₦{item.total_paid.toLocaleString()} / ₦{item.total_due.toLocaleString()}</p>
                  <p className={`text-xs font-semibold ${item.outstanding > 0 ? 'text-danger' : 'text-brand'}`}>
                    {item.outstanding > 0 ? `₦${item.outstanding.toLocaleString()} outstanding` : 'Fully paid'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Link href="/dashboard/fees"
          className="flex items-center gap-3 px-4 py-3.5 bg-surface border border-line rounded text-sm text-ink hover:bg-surface-2">
          <span className="text-lg" aria-hidden="true"><Banknote size={18} /></span> Manage Invoices
        </Link>
        <Link href="/dashboard/students"
          className="flex items-center gap-3 px-4 py-3.5 bg-surface border border-line rounded text-sm text-ink hover:bg-surface-2">
          <span className="text-lg" aria-hidden="true"><User size={18} /></span> View Students
        </Link>
      </div>
    </div>
  );
}

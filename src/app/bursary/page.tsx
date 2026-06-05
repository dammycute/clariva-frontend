'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

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

  if (loading) return <div className="text-center text-sm text-[#64748B] py-12">Loading bursary summary…</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#0D2B55]">Bursary Dashboard</h1>
        <p className="text-xs text-[#64748B] mt-0.5">Fee collection overview for your school</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4">
          <p className="text-[11px] font-bold text-[#64748B] uppercase">Total Due</p>
          <p className="text-xl font-bold text-[#0D2B55]">₦{summary ? summary.total_due.toLocaleString() : '—'}</p>
        </div>
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4">
          <p className="text-[11px] font-bold text-[#64748B] uppercase">Collected</p>
          <p className="text-xl font-bold text-[#1A7A4A]">₦{summary ? summary.total_paid.toLocaleString() : '—'}</p>
        </div>
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4">
          <p className="text-[11px] font-bold text-[#64748B] uppercase">Outstanding</p>
          <p className="text-xl font-bold text-[#B91C1C]">₦{summary ? summary.outstanding.toLocaleString() : '—'}</p>
        </div>
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4">
          <p className="text-[11px] font-bold text-[#64748B] uppercase">Collection Rate</p>
          <p className="text-xl font-bold text-[#D4930A]">{summary ? `${summary.collection_rate}%` : '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4">
          <p className="text-[11px] font-bold text-[#64748B] uppercase">Paid Invoices</p>
          <p className="text-xl font-bold text-[#1A7A4A]">{summary?.paid_invoices || 0}</p>
        </div>
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4">
          <p className="text-[11px] font-bold text-[#64748B] uppercase">Pending Invoices</p>
          <p className="text-xl font-bold text-[#B91C1C]">{summary?.pending_invoices || 0}</p>
        </div>
      </div>

      {summary && summary.item_breakdown.length > 0 && (
        <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-[#DDE5F0]">
            <h3 className="text-sm font-bold text-[#0D2B55]">Fee Item Breakdown</h3>
          </div>
          <div className="divide-y divide-[#DDE5F0]">
            {summary.item_breakdown.map((item, idx) => (
              <div key={idx} className="px-4 py-3 flex items-center justify-between">
                <p className="text-xs font-semibold text-[#0D2B55]">{item.name}</p>
                <div className="text-right">
                  <p className="text-xs text-[#64748B]">₦{item.total_paid.toLocaleString()} / ₦{item.total_due.toLocaleString()}</p>
                  <p className={`text-[10px] font-bold ${item.outstanding > 0 ? 'text-[#B91C1C]' : 'text-[#1A7A4A]'}`}>
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
          className="flex items-center gap-3 px-4 py-3.5 bg-white border border-[#DDE5F0] rounded-xl text-sm text-[#0D2B55] hover:bg-[#F0F4FA]">
          <span className="text-lg">💰</span> Manage Invoices
        </Link>
        <Link href="/dashboard/students"
          className="flex items-center gap-3 px-4 py-3.5 bg-white border border-[#DDE5F0] rounded-xl text-sm text-[#0D2B55] hover:bg-[#F0F4FA]">
          <span className="text-lg">👤</span> View Students
        </Link>
      </div>
    </div>
  );
}

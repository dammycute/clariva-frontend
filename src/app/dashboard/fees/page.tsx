'use client';

import { useState } from 'react';
import FeeItemsTab from './fee-items-tab';
import InvoicesTab from './invoices-tab';
import OutstandingTab from './outstanding-tab';

export default function FeesPage() {
  const [tab, setTab] = useState<'items' | 'invoices' | 'outstanding'>('items');
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey(k => k + 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0D2B55]">Fee Management</h1>
          <p className="text-xs text-[#64748B] mt-0.5">Tuition, levies & collections</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-white border border-[#DDE5F0] rounded-xl p-1 w-fit">
        <button onClick={() => setTab('items')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === 'items' ? 'bg-[#0D2B55] text-white' : 'text-[#64748B] hover:text-[#0D2B55]'
          }`}>📋 Fee Items</button>
        <button onClick={() => setTab('invoices')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === 'invoices' ? 'bg-[#0D2B55] text-white' : 'text-[#64748B] hover:text-[#0D2B55]'
          }`}>🧾 Invoices & Payments</button>
        <button onClick={() => setTab('outstanding')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
            tab === 'outstanding' ? 'bg-[#0D2B55] text-white' : 'text-[#64748B] hover:text-[#0D2B55]'
          }`}>📊 Outstanding Report</button>
      </div>

      {tab === 'items' && <FeeItemsTab key={`items-${refreshKey}`} onRefresh={refresh} />}
      {tab === 'invoices' && <InvoicesTab key={`inv-${refreshKey}`} onRefresh={refresh} />}
      {tab === 'outstanding' && <OutstandingTab key={`out-${refreshKey}`} />}
    </div>
  );
}

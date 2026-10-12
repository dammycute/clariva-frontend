'use client';

import { useState } from 'react';
import FeeItemsTab from './fee-items-tab';
import InvoicesTab from './invoices-tab';
import OutstandingTab from './outstanding-tab';
import { ClipboardList, FileText, BarChart3 } from 'lucide-react';

export default function FeesPage() {
  const [tab, setTab] = useState<'items' | 'invoices' | 'outstanding'>('items');
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey(k => k + 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Fee Management</h1>
          <p className="text-xs text-muted mt-0.5">Tuition, levies & collections</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-surface border border-line rounded p-1 w-fit">
        <button onClick={() => setTab('items')}
          className={`px-4 py-2 text-sm font-semibold rounded transition-colors ${
            tab === 'items' ? 'bg-brand text-brand-ink' : 'text-muted hover:text-ink'
          }`}><ClipboardList size={16} aria-hidden="true" className="inline align-[-3px] mr-1.5" />Fee Items</button>
        <button onClick={() => setTab('invoices')}
          className={`px-4 py-2 text-sm font-semibold rounded transition-colors ${
            tab === 'invoices' ? 'bg-brand text-brand-ink' : 'text-muted hover:text-ink'
          }`}><FileText size={16} aria-hidden="true" className="inline align-[-3px] mr-1.5" />Invoices & Payments</button>
        <button onClick={() => setTab('outstanding')}
          className={`px-4 py-2 text-sm font-semibold rounded transition-colors ${
            tab === 'outstanding' ? 'bg-brand text-brand-ink' : 'text-muted hover:text-ink'
          }`}><BarChart3 size={16} aria-hidden="true" className="inline align-[-3px] mr-1.5" />Outstanding Report</button>
      </div>

      {tab === 'items' && <FeeItemsTab key={`items-${refreshKey}`} onRefresh={refresh} />}
      {tab === 'invoices' && <InvoicesTab key={`inv-${refreshKey}`} onRefresh={refresh} />}
      {tab === 'outstanding' && <OutstandingTab key={`out-${refreshKey}`} />}
    </div>
  );
}

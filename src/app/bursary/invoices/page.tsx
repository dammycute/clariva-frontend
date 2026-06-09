'use client';

import { useState, useCallback } from 'react';
import InvoicesTab from '@/app/dashboard/fees/invoices-tab';

export default function BursaryInvoicesPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0D2B55]">Invoices & Payments</h1>
          <p className="text-xs text-[#64748B] mt-0.5">Manage fee collections</p>
        </div>
      </div>

      <InvoicesTab key={`inv-${refreshKey}`} onRefresh={refresh} />
    </div>
  );
}

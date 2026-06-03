'use client';

import { useState } from 'react';
import { auth } from '@/lib/api';

export default function BackupPage() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

  async function doBackup() {
    setBusy(true);
    setResult(null);
    try {
      const token = auth.getToken();
      const res = await fetch(`${base}/schools/backup/`, {
        headers: { 'Authorization': `Bearer ${token ?? ''}` },
      });
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      setResult(`Backup downloaded — ${data.count || 0} records`);
    } catch { setResult('Backup failed'); }
    finally { setBusy(false); }
  }

  async function doRestore() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setBusy(true);
      setResult(null);
      try {
        const text = await file.text();
        const token = auth.getToken();
        const res = await fetch(`${base}/schools/restore/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token ?? ''}` },
          body: text,
        });
        const data = await res.json();
        setResult(data.restored ? 'Restore completed successfully' : data.error || 'Restore failed');
      } catch { setResult('Restore failed'); }
      finally { setBusy(false); }
    };
    input.click();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0D2B55]">Backup & Restore</h1>
          <p className="text-xs text-[#64748B] mt-0.5">Download a full backup or restore from a previous backup file</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-5">
          <div className="text-3xl mb-3">💾</div>
          <h3 className="text-base font-bold text-[#0D2B55] mb-1">Download Backup</h3>
          <p className="text-xs text-[#64748B] mb-4">Export all school data as a JSON file. Includes students, staff, fees, grades, attendance, timetables, and more.</p>
          <button onClick={doBackup} disabled={busy}
            className="text-sm px-4 py-2.5 rounded-lg bg-[#0D2B55] text-white hover:bg-[#0A1F3D] disabled:opacity-50">
            {busy ? 'Processing…' : '⬇ Download Backup'}
          </button>
        </div>

        <div className="bg-white border border-[#DDE5F0] rounded-xl p-5">
          <div className="text-3xl mb-3">📥</div>
          <h3 className="text-base font-bold text-[#0D2B55] mb-1">Restore Backup</h3>
          <p className="text-xs text-[#64748B] mb-4">Upload a previously downloaded backup JSON file to restore your data. This will add records to your existing data.</p>
          <button onClick={doRestore} disabled={busy}
            className="text-sm px-4 py-2.5 rounded-lg border border-[#B91C1C] text-[#B91C1C] hover:bg-[#FEE2E2] disabled:opacity-50">
            {busy ? 'Processing…' : '📂 Upload & Restore'}
          </button>
        </div>
      </div>

      {result && (
        <div className={`text-sm px-4 py-3 rounded-xl ${result.includes('failed') ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-[#DCFCE7] text-[#1A7A4A]'}`}>
          {result}
        </div>
      )}
    </div>
  );
}

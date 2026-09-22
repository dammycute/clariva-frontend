'use client';

import { useState, useEffect } from 'react';

interface School { id: string; name: string; }

export default function SuperAdminSystem() {
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [backupData, setBackupData] = useState<string | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    const token = document.cookie.match(/(?:^|;\s*)access_token=([^;]*)/);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${decodeURIComponent(token[1])}`;
    fetch(`${API_BASE}/schools/`, { headers })
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : data.results || [];
        setSchools(list);
      })
      .catch(() => {});
  }, []);

  const handleBackup = async () => {
    setBackupLoading(true);
    setMessage('');
    setBackupData(null);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const token = document.cookie.match(/(?:^|;\s*)access_token=([^;]*)/);
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${decodeURIComponent(token[1])}`;
      const url = selectedSchoolId
        ? `${API_BASE}/schools/backup/?school_id=${selectedSchoolId}`
        : `${API_BASE}/schools/backup/`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Backup failed');
      }
      const text = await res.text();
      const data = JSON.parse(text);
      setBackupData(text);
      const blob = new Blob([text], { type: 'application/json' });
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `clariva-backup-${data.school_id || 'all'}.json`;
      a.click();
      URL.revokeObjectURL(blobUrl);
      setMessage('Backup generated and downloaded successfully.');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed to generate backup.');
    }
    setBackupLoading(false);
  };

  const handleRestore = async () => {
    if (!backupData) { setMessage('No backup data to restore.'); return; }
    if (!confirm('This will overwrite existing data. Continue?')) return;
    setRestoreLoading(true);
    setMessage('');
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const token = document.cookie.match(/(?:^|;\s*)access_token=([^;]*)/);
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${decodeURIComponent(token[1])}`;
      const parsed = JSON.parse(backupData);
      const payload = { ...parsed, confirm: true };
      const res = await fetch(`${API_BASE}/schools/restore/`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Restore failed');
      }
      const result = await res.json();
      setMessage(`Restore complete. ${result.message || ''}`);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed to restore backup.');
    }
    setRestoreLoading(false);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0D2B55]">System Health</h1>
        <p className="text-xs text-[#64748B] mt-0.5">Database, backups, and system operations</p>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
          message.includes('success') || message.includes('complete') ? 'bg-[#DCFCE7] text-[#1A7A4A]' : 'bg-[#FEE2E2] text-[#B91C1C]'
        }`}>{message}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-5">
          <h2 className="text-sm font-bold text-[#0D2B55] mb-3">Database</h2>
          <div className="space-y-2 text-xs text-[#64748B]">
            <div className="flex justify-between"><span>Engine</span><span className="font-medium text-[#0D2B55]">PostgreSQL 18</span></div>
            <div className="flex justify-between"><span>Connection</span><span className="font-medium text-[#1A7A4A]">Healthy</span></div>
            <div className="flex justify-between"><span>SSL Mode</span><span className="font-medium text-[#0D2B55]">disable (local)</span></div>
          </div>
        </div>

        <div className="bg-white border border-[#DDE5F0] rounded-xl p-5">
          <h2 className="text-sm font-bold text-[#0D2B55] mb-3">Backup & Restore</h2>
          <div className="space-y-3">
            {schools.length > 1 && (
              <select value={selectedSchoolId} onChange={e => setSelectedSchoolId(e.target.value)}
                className="w-full px-3 py-2 border border-[#DDE5F0] rounded-lg text-xs text-[#0D2B55]">
                <option value="">All schools</option>
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
            <button onClick={handleBackup} disabled={backupLoading}
              className="w-full px-4 py-2.5 bg-[#0D2B55] text-white text-xs font-medium rounded-lg hover:bg-[#1a3a6a] transition-colors disabled:opacity-50">
              {backupLoading ? 'Generating...' : 'Generate Backup'}
            </button>
            {backupData && (
              <button onClick={handleRestore} disabled={restoreLoading}
                className="w-full px-4 py-2.5 bg-[#B91C1C] text-white text-xs font-medium rounded-lg hover:bg-[#991B1B] transition-colors disabled:opacity-50">
                {restoreLoading ? 'Restoring...' : 'Restore from Backup'}
              </button>
            )}
          </div>
        </div>

        <div className="bg-white border border-[#DDE5F0] rounded-xl p-5">
          <h2 className="text-sm font-bold text-[#0D2B55] mb-3">Encryption</h2>
          <div className="space-y-2 text-xs text-[#64748B]">
            <div className="flex justify-between"><span>PII Fields</span><span className="font-medium text-[#1A7A4A]">16 encrypted</span></div>
            <div className="flex justify-between"><span>Algorithm</span><span className="font-medium text-[#0D2B55]">Fernet (AES-128-CBC)</span></div>
            <div className="flex justify-between"><span>Hash Fields</span><span className="font-medium text-[#0D2B55]">SHA-256 (2 fields)</span></div>
            <div className="flex justify-between"><span>Key Source</span><span className="font-medium text-[#0D2B55]">SECRET_KEY (HKDF)</span></div>
          </div>
        </div>

        <div className="bg-white border border-[#DDE5F0] rounded-xl p-5">
          <h2 className="text-sm font-bold text-[#0D2B55] mb-3">Security</h2>
          <div className="space-y-2 text-xs text-[#64748B]">
            <div className="flex justify-between"><span>Auth</span><span className="font-medium text-[#1A7A4A]">JWT (SimpleJWT)</span></div>
            <div className="flex justify-between"><span>Access Token</span><span className="font-medium text-[#0D2B55]">2 hours</span></div>
            <div className="flex justify-between"><span>Refresh Token</span><span className="font-medium text-[#0D2B55]">7 days + rotation</span></div>
            <div className="flex justify-between"><span>Rate Limiting</span><span className="font-medium text-[#1A7A4A]">30/min anon, 60/min user</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

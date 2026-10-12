'use client';

import { useState, useEffect } from 'react';
import { request } from '@/lib/api';

interface School { id: string; name: string; }

export default function SuperAdminSystem() {
  const [schools, setSchools] = useState<School[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [backupData, setBackupData] = useState<string | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    request<{ results: School[] }>('GET', '/schools/')
      .then(data => setSchools(data.results || []))
      .catch(() => {});
  }, []);

  const handleBackup = async () => {
    setBackupLoading(true);
    setMessage('');
    setBackupData(null);
    try {
      const qs = selectedSchoolId ? `?school_id=${selectedSchoolId}` : '';
      const data = await request<{
        school_id: string;
        data: Record<string, string>;
        counts: Record<string, number>;
      }>('GET', `/schools/backup/${qs}`);
      const text = JSON.stringify(data);
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
      const parsed = JSON.parse(backupData);
      const payload = { ...parsed, confirm: true };
      const result = await request<{ restored: boolean; message?: string }>('POST', '/schools/restore/', payload);
      setMessage(`Restore complete. ${result.message || ''}`);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed to restore backup.');
    }
    setRestoreLoading(false);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-ink">System Health</h1>
        <p className="text-xs text-muted mt-0.5">Database, backups, and system operations</p>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded text-sm ${
          message.includes('success') || message.includes('complete') ? 'bg-success/10 text-success' : 'bg-danger-soft text-danger'
        }`}>{message}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-line rounded p-5">
          <h2 className="text-sm font-semibold text-ink mb-3">Database</h2>
          <div className="space-y-2 text-xs text-muted">
            <div className="flex justify-between"><span>Engine</span><span className="font-medium text-ink">PostgreSQL 18</span></div>
            <div className="flex justify-between"><span>Connection</span><span className="font-medium text-brand">Healthy</span></div>
            <div className="flex justify-between"><span>SSL Mode</span><span className="font-medium text-ink">disable (local)</span></div>
          </div>
        </div>

        <div className="bg-surface border border-line rounded p-5">
          <h2 className="text-sm font-semibold text-ink mb-3">Backup & Restore</h2>
          <div className="space-y-3">
            {schools.length > 1 && (
              <select value={selectedSchoolId} onChange={e => setSelectedSchoolId(e.target.value)}
                className="w-full px-3 py-2 border border-line rounded text-xs text-ink">
                <option value="">All schools</option>
                {schools.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
            <button onClick={handleBackup} disabled={backupLoading}
              className="w-full px-4 py-2.5 bg-brand text-brand-ink text-xs font-medium rounded hover:opacity-90 transition-colors disabled:opacity-50">
              {backupLoading ? 'Generating...' : 'Generate Backup'}
            </button>
            {backupData && (
              <button onClick={handleRestore} disabled={restoreLoading}
                className="w-full px-4 py-2.5 bg-danger text-white text-xs font-medium rounded hover:bg-danger transition-colors disabled:opacity-50">
                {restoreLoading ? 'Restoring...' : 'Restore from Backup'}
              </button>
            )}
          </div>
        </div>

        <div className="bg-surface border border-line rounded p-5">
          <h2 className="text-sm font-semibold text-ink mb-3">Encryption</h2>
          <div className="space-y-2 text-xs text-muted">
            <div className="flex justify-between"><span>PII Fields</span><span className="font-medium text-brand">16 encrypted</span></div>
            <div className="flex justify-between"><span>Algorithm</span><span className="font-medium text-ink">Fernet (AES-128-CBC)</span></div>
            <div className="flex justify-between"><span>Hash Fields</span><span className="font-medium text-ink">SHA-256 (2 fields)</span></div>
            <div className="flex justify-between"><span>Key Source</span><span className="font-medium text-ink">SECRET_KEY (HKDF)</span></div>
          </div>
        </div>

        <div className="bg-surface border border-line rounded p-5">
          <h2 className="text-sm font-semibold text-ink mb-3">Security</h2>
          <div className="space-y-2 text-xs text-muted">
            <div className="flex justify-between"><span>Auth</span><span className="font-medium text-brand">JWT (SimpleJWT)</span></div>
            <div className="flex justify-between"><span>Access Token</span><span className="font-medium text-ink">2 hours</span></div>
            <div className="flex justify-between"><span>Refresh Token</span><span className="font-medium text-ink">7 days + rotation</span></div>
            <div className="flex justify-between"><span>Rate Limiting</span><span className="font-medium text-brand">30/min anon, 60/min user</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

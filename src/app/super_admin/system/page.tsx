'use client';

import { useState } from 'react';

export default function SuperAdminSystem() {
  const [backupUrl, setBackupUrl] = useState('');
  const [backupLoading, setBackupLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleBackup = async () => {
    setBackupLoading(true);
    setMessage('');
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const token = document.cookie.match(/(?:^|;\s*)access_token=([^;]*)/);
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${decodeURIComponent(token[1])}`;
      const res = await fetch(`${API_BASE}/schools/backup/`, { headers });
      if (!res.ok) throw new Error('Backup failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setBackupUrl(url);
      setMessage('Backup generated successfully. Click the link to download.');
    } catch {
      setMessage('Failed to generate backup.');
    }
    setBackupLoading(false);
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0D2B55]">System Health</h1>
        <p className="text-xs text-[#64748B] mt-0.5">Database, backups, and system operations</p>
      </div>

      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
          message.includes('success') ? 'bg-[#DCFCE7] text-[#1A7A4A]' : 'bg-[#FEE2E2] text-[#B91C1C]'
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
            <button onClick={handleBackup} disabled={backupLoading}
              className="w-full px-4 py-2.5 bg-[#0D2B55] text-white text-xs font-medium rounded-lg hover:bg-[#1a3a6a] transition-colors disabled:opacity-50">
              {backupLoading ? 'Generating...' : 'Generate System Backup'}
            </button>
            {backupUrl && (
              <a href={backupUrl} download="clariva-backup.json"
                className="block w-full px-4 py-2.5 bg-[#1A7A4A] text-white text-xs font-medium rounded-lg text-center hover:bg-[#15603a] transition-colors">
                Download Backup
              </a>
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
            <div className="flex justify-between"><span>RLS (Supabase)</span><span className="font-medium text-[#1A7A4A]">Enabled (14 tables)</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { request } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/summary';
import { downloadBackup, listAll, type AdminSchool } from '@/lib/admin';

interface SystemStats {
  total_schools: number;
  total_students: number;
  total_staff: number;
  total_classes: number;
  total_subjects: number;
}

type RestoreResult = { restored: boolean; items_processed: number; errors: string[] };

const fieldClass = 'w-full h-11 px-3 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand';

export default function ConsoleMaintenance() {
  const [schools, setSchools] = useState<AdminSchool[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [schoolId, setSchoolId] = useState('');
  const [busy, setBusy] = useState<'' | 'backup' | 'restore'>('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listAll<AdminSchool>('/schools/').then(setSchools).catch(() => {});
    request<SystemStats>('GET', '/schools/system-stats/').then(setStats).catch(() => {});
  }, []);

  async function backup() {
    const school = schools.find(s => s.id === schoolId);
    if (!school) { setIsError(true); setMessage('Pick a school first.'); return; }
    setBusy('backup');
    setMessage('');
    setIsError(false);
    try {
      await downloadBackup(school.id, `clarriva-${school.subdomain}-${new Date().toISOString().slice(0, 10)}.json`);
      setMessage('Backup downloaded.');
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : 'Could not build the backup.');
    } finally {
      setBusy('');
    }
  }

  async function restore(file: File) {
    setBusy('restore');
    setMessage('');
    setIsError(false);
    try {
      const payload = JSON.parse(await file.text()) as Record<string, unknown>;
      const target = (payload.school_id as string) || schoolId;
      if (!target) throw new Error('That file has no school_id. Pick the school above first.');
      if (!window.confirm('Restoring adds the rows in this file to the school. Existing rows are left alone. Continue?')) {
        setBusy('');
        return;
      }
      const result = await request<RestoreResult>('POST', '/schools/restore/', { ...payload, school_id: target, confirm: true });
      if (result.errors?.length) {
        setIsError(true);
        setMessage(`${result.items_processed} rows restored, ${result.errors.length} skipped: ${result.errors.slice(0, 3).join(' · ')}`);
      } else {
        setMessage(`Restore complete — ${result.items_processed} rows added.`);
      }
    } catch (err) {
      setIsError(true);
      setMessage(err instanceof Error ? err.message : 'Could not restore that file.');
    } finally {
      setBusy('');
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="max-w-[1120px]">
      <header className="mb-5">
        <h1 className="text-[22px] font-semibold text-ink leading-tight">Maintenance</h1>
        <p className="text-[13px] text-muted mt-1">Per-school backups, restores, and what the platform is running.</p>
      </header>

      {message && (
        <div
          role={isError ? 'alert' : 'status'}
          className={`mb-4 px-3 py-2 rounded text-sm border ${
            isError ? 'bg-danger-soft text-danger border-danger/30' : 'bg-success/10 text-success border-success/30'
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Backup">
          <div className="p-4 space-y-3">
            <p className="text-[13px] text-muted">
              Writes one school&apos;s students, classes, staff, fees, attendance, grades, subjects, timetables,
              report cards and announcements to a JSON file.
            </p>
            <select value={schoolId} onChange={e => setSchoolId(e.target.value)} aria-label="School to back up" className={fieldClass}>
              <option value="">Pick a school…</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <Button onClick={backup} disabled={!schoolId || busy !== ''} className="w-full">
              <Download size={15} /> {busy === 'backup' ? 'Building…' : 'Download backup'}
            </Button>
          </div>
        </Panel>

        <Panel title="Restore">
          <div className="p-4 space-y-3">
            <p className="text-[13px] text-muted">
              Restores a backup file into its own school. Only whitelisted fields are written, and rows that
              belong to another school are skipped.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              onChange={e => { const f = e.target.files?.[0]; if (f) void restore(f); }}
              aria-label="Backup file to restore"
              className="block w-full text-sm text-muted file:mr-3 file:h-9 file:px-3 file:rounded file:border file:border-line file:bg-surface file:text-ink file:text-xs file:font-medium cursor-pointer"
            />
            <p className="text-xs text-muted">
              {busy === 'restore' ? 'Restoring…' : 'Nothing happens until you confirm the prompt.'}
            </p>
          </div>
        </Panel>

        <Panel title="Platform">
          <ul className="divide-y divide-line text-sm">
            {[
              { label: 'Schools', value: stats ? stats.total_schools.toLocaleString() : '—' },
              { label: 'Students', value: stats ? stats.total_students.toLocaleString() : '—' },
              { label: 'Staff', value: stats ? stats.total_staff.toLocaleString() : '—' },
              { label: 'Classes', value: stats ? stats.total_classes.toLocaleString() : '—' },
              { label: 'Subjects', value: stats ? stats.total_subjects.toLocaleString() : '—' },
            ].map(row => (
              <li key={row.label} className="px-4 py-2.5 flex items-center justify-between">
                <span className="text-muted">{row.label}</span>
                <span className="text-ink font-medium tabular-nums">{row.value}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Sessions and limits">
          <ul className="divide-y divide-line text-sm">
            {[
              { label: 'Access token', value: '2 hours' },
              { label: 'Refresh token', value: '7 days, rotating' },
              { label: 'Anonymous requests', value: '30 / minute' },
              { label: 'Signed-in requests', value: '60 / minute' },
              { label: 'Demo form', value: '5 / hour' },
            ].map(row => (
              <li key={row.label} className="px-4 py-2.5 flex items-center justify-between">
                <span className="text-muted">{row.label}</span>
                <span className="text-ink font-medium">{row.value}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

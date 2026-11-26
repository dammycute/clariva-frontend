'use client';

import { useEffect, useState } from 'react';
import { billingAdmin, type Recipient } from '@/lib/billing';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/summary';

/** Which platform admins get the term date emails. Everyone, including new admins, unless changed. */
export function ReminderRecipients() {
  const [admins, setAdmins] = useState<Recipient[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    billingAdmin.reminderRecipients().then(setAdmins).catch(() => setMessage('Could not load the admins.'));
  }, []);

  const save = async () => {
    setBusy(true); setMessage('');
    try {
      setAdmins(await billingAdmin.saveReminderRecipients(admins.filter(a => a.selected).map(a => a.id)));
      setMessage('Saved.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const none = admins.length > 0 && !admins.some(a => a.selected);

  return (
    <div className="mt-6">
      <Panel title="Who gets the reminder emails" aside="New admins are included automatically">
        <div className="p-4 space-y-3">
          {admins.map(a => (
            <label key={a.id} className="flex items-center gap-2.5 text-sm text-ink cursor-pointer min-h-8">
              <input type="checkbox" checked={a.selected} className="w-4 h-4 accent-brand"
                onChange={() => setAdmins(list => list.map(x => (x.id === a.id ? { ...x, selected: !x.selected } : x)))} />
              {a.name} {a.name !== a.email && <span className="text-muted">{a.email}</span>}
            </label>
          ))}
          {none && <p className="text-sm text-danger">Choose at least one admin.</p>}
          {message && <p role="status" className="text-sm text-muted">{message}</p>}
          <Button onClick={save} disabled={busy || none || !admins.length}>{busy ? 'Saving…' : 'Save'}</Button>
        </div>
      </Panel>
    </div>
  );
}

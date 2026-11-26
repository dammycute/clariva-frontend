'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { billingAdmin, type CalendarsDue } from '@/lib/billing';

/** Fire this after term dates are saved or deleted, so the warning rechecks at once. */
export const DATES_CHANGED = 'clariva:term-dates-changed';

/** Shown on every console page while term dates are missing, in case the reminder email does not arrive. */
export function CalendarWarning() {
  const [due, setDue] = useState<CalendarsDue | null>(null);

  useEffect(() => {
    let gone = false;
    const check = () => {
      billingAdmin.calendarsDue().then(d => { if (!gone) setDue(d); }).catch(() => { /* the request already reports it */ });
    };
    check();
    window.addEventListener(DATES_CHANGED, check);
    return () => { gone = true; window.removeEventListener(DATES_CHANGED, check); };
  }, []);

  if (!due) return null;
  const missing = due.states.filter(s => s.missing.length > 0).length;
  const stateless = due.schools_without_state.length;
  if (!missing && !stateless && due.email_ready) return null;

  return (
    <div role="status" className="mb-4 text-sm text-warning bg-warning/10 border border-warning/30 rounded px-3 py-2">
      {missing > 0 && <span>Term dates are missing for {missing} {missing === 1 ? 'state' : 'states'}. </span>}
      {stateless > 0 && <span>{stateless} {stateless === 1 ? 'school has' : 'schools have'} no state set. </span>}
      {!due.email_ready && <span>Reminder email is not set up on this server. </span>}
      <Link href="/admin/calendars" className="underline underline-offset-2">Open term calendars</Link>
    </div>
  );
}

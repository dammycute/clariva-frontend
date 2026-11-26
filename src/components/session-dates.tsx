'use client';

import { useState } from 'react';
import { ApiError } from '@/lib/api';
import { billingAdmin, type CalendarsDue, type DueSlot } from '@/lib/billing';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/summary';
import { TextField } from '@/components/ui/text-field';

type State = { id: string; name: string };
type Row = { resumes_on: string; provisional: boolean };

const BLANK: Row[] = [0, 1, 2, 3].map(i => ({ resumes_on: '', provisional: i === 3 }));
const inputClass = 'h-11 w-full px-3 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand';

/** The four dates a session needs: its three terms, and the next session's 1st term. */
export function sessionSlots(year: string): DueSlot[] {
  const start = Number(year.split('/')[0]);
  const next = `${start + 1}/${start + 2}`;
  return [
    { academic_year: year, term: '1st Term' }, { academic_year: year, term: '2nd Term' },
    { academic_year: year, term: '3rd Term' }, { academic_year: next, term: '1st Term' },
  ];
}

const words = (slots: DueSlot[]) => slots.map(s => `${s.term} ${s.academic_year}`).join(', ');

/** What is still needed, then one form to enter a session's dates for several states at once. */
export function SessionDates({ defaultYear, states, due, onSaved }: {
  defaultYear: string; states: State[]; due: CalendarsDue | null; onSaved: () => Promise<void>;
}) {
  const [year, setYear] = useState(defaultYear);
  const [chosen, setChosen] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>(BLANK);
  const [link, setLink] = useState('');
  const [confirmUnusual, setConfirmUnusual] = useState(false);
  const [askUnusual, setAskUnusual] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const validYear = /^\d{4}\/\d{4}$/.test(year);
  const slots = validYear ? sessionSlots(year) : [];
  const needing = due?.states.map(s => s.id) ?? [];

  const setRow = (i: number, change: Partial<Row>) => setRows(r => r.map((row, j) => (j === i ? { ...row, ...change } : row)));
  const toggle = (id: string) => setChosen(c => (c.includes(id) ? c.filter(x => x !== id) : [...c, id]));

  const save = async () => {
    setError(''); setNotice('');
    const dates = slots
      .map((slot, i) => ({ ...slot, ...rows[i], source_url: rows[i].provisional ? '' : link.trim() }))
      .filter(d => d.resumes_on);
    if (!chosen.length || !dates.length) { setError('Choose at least one state and enter at least one date.'); return; }
    setBusy(true);
    try {
      const res = await billingAdmin.saveSessionDates({ states: chosen, dates, confirm_unusual: confirmUnusual });
      const extended = res.extended_schools ? ` ${res.extended_schools} paid school(s) gained time.` : '';
      setNotice(`Saved ${res.saved} dates.${extended}`);
      setRows(BLANK); setChosen([]); setLink(''); setAskUnusual(false); setConfirmUnusual(false);
      await onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.code === 'unusual_gap') setAskUnusual(true);
      setError(err instanceof Error ? err.message : 'Could not save the dates.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6 mb-6">
      {due && (due.states.length > 0 || due.schools_without_state.length > 0) && (
        <Panel title="Dates needed" aside="Only states that have schools">
          <ul className="divide-y divide-line">
            {due.states.map(s => (
              <li key={s.id} className="px-4 py-2.5 text-sm">
                <span className="font-medium text-ink">{s.name}</span>
                <span className="text-muted"> · {s.schools} {s.schools === 1 ? 'school' : 'schools'}</span>
                {s.missing.length > 0 && <span className="block text-danger">Missing: {words(s.missing)}</span>}
                {s.unconfirmed.length > 0 && <span className="block text-warning">Provisional: {words(s.unconfirmed)}</span>}
              </li>
            ))}
            {due.schools_without_state.length > 0 && (
              <li className="px-4 py-2.5 text-sm text-danger">
                These schools have no state from the list, so they cannot pay: {due.schools_without_state.join(', ')}.
              </li>
            )}
          </ul>
        </Panel>
      )}

      <Panel title="Enter a session's dates" aside="One entry for every state you tick">
        <div className="p-4 space-y-4">
          <div className="max-w-[220px]">
            <TextField id="session-year" label="Session" value={year} onChange={e => setYear(e.target.value)} placeholder="2026/2027" />
          </div>

          <fieldset>
            <legend className="text-sm font-medium text-ink mb-1.5">States that follow these dates</legend>
            {needing.length > 0 && (
              <button type="button" onClick={() => setChosen(needing)} className="mb-2 text-xs text-brand underline underline-offset-2 cursor-pointer">
                Tick every state that needs dates
              </button>
            )}
            <div className="max-h-40 overflow-y-auto rounded border border-line p-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1">
              {states.map(s => (
                <label key={s.id} className="flex items-center gap-2 text-sm text-ink cursor-pointer min-h-8">
                  <input type="checkbox" checked={chosen.includes(s.id)} onChange={() => toggle(s.id)} className="w-4 h-4 accent-brand" />
                  {s.name}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            {slots.map((slot, i) => (
              <div key={`${slot.academic_year}-${slot.term}`} className="grid grid-cols-1 sm:grid-cols-[1fr_200px_140px] gap-2 sm:items-center">
                <label htmlFor={`slot-${i}`} className="text-sm text-ink">
                  {slot.term} {slot.academic_year} starts
                  {i === 3 && <span className="block text-xs text-muted">Needed to bill 3rd Term. An estimate is fine: leave it provisional.</span>}
                </label>
                <input id={`slot-${i}`} type="date" value={rows[i].resumes_on} onChange={e => setRow(i, { resumes_on: e.target.value })} className={inputClass} />
                <label className="flex items-center gap-2 text-sm text-ink cursor-pointer min-h-11">
                  <input type="checkbox" checked={rows[i].provisional} onChange={e => setRow(i, { provisional: e.target.checked })} className="w-4 h-4 accent-brand" />
                  Provisional
                </label>
              </div>
            ))}
          </div>

          <TextField id="session-link" label="Link to the official notice" type="url" value={link}
            onChange={e => setLink(e.target.value)} placeholder="https://…"
            hint="Saved with every date that is not provisional. If states have different notices, save them separately." />

          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          {notice && <p role="status" className="text-sm text-success">{notice}</p>}
          {askUnusual && (
            <label className="flex items-center gap-2 text-sm text-ink cursor-pointer">
              <input type="checkbox" checked={confirmUnusual} onChange={e => setConfirmUnusual(e.target.checked)} className="w-4 h-4 accent-brand" />
              Dates are correct
            </label>
          )}
          <Button onClick={save} disabled={busy || !validYear}>{busy ? 'Saving…' : 'Save dates'}</Button>
        </div>
      </Panel>
    </div>
  );
}

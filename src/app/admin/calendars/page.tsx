'use client';

import { useCallback, useEffect, useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { billingAdmin, shortDate, type TermCalendarRow } from '@/lib/billing';
import { listAll, type AdminSchool } from '@/lib/admin';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/summary';
import { TextField } from '@/components/ui/text-field';
import ConfirmDialog from '@/components/confirm-dialog';

const TERMS = ['1st Term', '2nd Term', '3rd Term'] as const;

const selectClass =
  'h-11 w-full px-3 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand';

function currentYear() {
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

const EMPTY = {
  state: '', academic_year: currentYear(), term: '1st Term' as string,
  resumes_on: '', school: '', provisional: false,
};

export default function ConsoleCalendars() {
  const [rows, setRows] = useState<TermCalendarRow[]>([]);
  const [states, setStates] = useState<{ id: string; name: string; code: string }[]>([]);
  const [schools, setSchools] = useState<AdminSchool[]>([]);
  const [missing, setMissing] = useState<{ id: string; name: string; code: string }[]>([]);
  const [form, setForm] = useState({ ...EMPTY });
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<TermCalendarRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [calendars, stateList, schoolList, gaps] = await Promise.all([
      billingAdmin.calendars(),
      listAll<{ id: string; name: string; code: string }>('/locations/states/'),
      listAll<AdminSchool>('/schools/'),
      billingAdmin.missingCalendars(),
    ]);
    setRows(calendars);
    setStates(stateList);
    setSchools(schoolList);
    setMissing(gaps.states);
  }, []);

  useEffect(() => {
    load()
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load the calendars.'))
      .finally(() => setLoading(false));
  }, [load]);

  const reset = () => { setForm({ ...EMPTY }); setEditing(null); };

  const save = async () => {
    setError('');
    if (!form.state || !form.academic_year || !form.resumes_on) {
      setError('Choose a state, the academic year and the resumption date.');
      return;
    }
    setBusy(true);
    try {
      if (editing) {
        await billingAdmin.updateCalendar(editing, {
          resumes_on: form.resumes_on, provisional: form.provisional,
        });
      } else {
        await billingAdmin.createCalendar({
          state: form.state,
          school: form.school || null,
          academic_year: form.academic_year,
          term: form.term,
          resumes_on: form.resumes_on,
          provisional: form.provisional,
        });
      }
      reset();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that date.');
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (row: TermCalendarRow) => {
    setEditing(row.id);
    setForm({
      state: row.state, academic_year: row.academic_year, term: row.term,
      resumes_on: row.resumes_on, school: row.school || '', provisional: row.provisional,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async () => {
    if (!deleting) return;
    setBusy(true);
    try {
      await billingAdmin.deleteCalendar(deleting.id);
      setDeleting(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete that date.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-[1120px]">
      <header className="mb-5">
        <h1 className="text-[22px] font-semibold text-ink leading-tight">Term calendars</h1>
        <p className="text-[13px] text-muted mt-1">
          When each state&apos;s term resumes. Billing runs from these dates, so a school cannot
          pay for a term whose dates are missing.
        </p>
      </header>

      {error && (
        <div role="alert" className="mb-4 text-sm text-danger bg-danger-soft border border-danger/30 rounded px-3 py-2">
          {error}
        </div>
      )}

      {!loading && missing.length > 0 && (
        <div className="mb-4 text-sm text-warning bg-warning/10 border border-warning/30 rounded px-3 py-2">
          <span className="font-medium">
            {missing.length} {missing.length === 1 ? 'state has' : 'states have'} no resumption date in the next 90 days:
          </span>{' '}
          {missing.map(s => s.name).join(', ')}.
        </div>
      )}

      <Panel
        title={editing ? 'Edit a date' : 'Add a date'}
        aside={editing ? 'Only the date and the provisional flag can change' : undefined}
      >
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label htmlFor="cal-state" className="block text-sm font-medium text-ink mb-1.5">State</label>
            <select
              id="cal-state"
              value={form.state}
              onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
              disabled={Boolean(editing)}
              className={selectClass}
            >
              <option value="">Choose a state</option>
              {states.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <TextField
            id="cal-year"
            label="Academic year"
            value={form.academic_year}
            onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))}
            placeholder="2026/2027"
            disabled={Boolean(editing)}
          />
          <div>
            <label htmlFor="cal-term" className="block text-sm font-medium text-ink mb-1.5">Term</label>
            <select
              id="cal-term"
              value={form.term}
              onChange={e => setForm(f => ({ ...f, term: e.target.value }))}
              disabled={Boolean(editing)}
              className={selectClass}
            >
              {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <TextField
            id="cal-date"
            label="Resumes on"
            type="date"
            value={form.resumes_on}
            onChange={e => setForm(f => ({ ...f, resumes_on: e.target.value }))}
          />
          <div>
            <label htmlFor="cal-school" className="block text-sm font-medium text-ink mb-1.5">
              Override for one school (optional)
            </label>
            <select
              id="cal-school"
              value={form.school}
              onChange={e => setForm(f => ({ ...f, school: e.target.value }))}
              disabled={Boolean(editing)}
              className={selectClass}
            >
              <option value="">Every school in the state</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2.5 h-11 mt-6 cursor-pointer text-sm text-ink">
            <input
              type="checkbox"
              checked={form.provisional}
              onChange={e => setForm(f => ({ ...f, provisional: e.target.checked }))}
              className="w-4 h-4 accent-brand"
            />
            Provisional date
          </label>
        </div>
        <div className="px-4 pb-4 flex items-center gap-2">
          <Button onClick={save} disabled={busy}>
            {busy ? 'Saving…' : editing ? 'Save date' : 'Add date'}
          </Button>
          {editing && (
            <Button variant="ghost" onClick={reset} disabled={busy}>Cancel</Button>
          )}
        </div>
      </Panel>

      <div className="mt-6 bg-surface border border-line rounded overflow-hidden">
        {loading ? (
          <div className="divide-y divide-line">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-4 animate-pulse" aria-hidden="true">
                <div className="h-4 w-1/3 rounded bg-surface-2" />
              </div>
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted text-center">
            No dates yet. Add the first one above — schools in a state without dates cannot pay.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[13px] text-muted border-b border-line">
                  <th className="px-4 py-2 font-normal">State</th>
                  <th className="px-4 py-2 font-normal">Year</th>
                  <th className="px-4 py-2 font-normal">Term</th>
                  <th className="px-4 py-2 font-normal">Resumes</th>
                  <th className="px-4 py-2 font-normal">Note</th>
                  <th className="px-4 py-2 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map(row => (
                  <tr key={row.id}>
                    <td className="px-4 py-2.5 text-ink">
                      {row.state_name}
                      {row.school_name && (
                        <span className="block text-xs text-muted">override · {row.school_name}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-muted whitespace-nowrap">{row.academic_year}</td>
                    <td className="px-4 py-2.5 text-muted whitespace-nowrap">{row.term}</td>
                    <td className="px-4 py-2.5 text-ink whitespace-nowrap">{shortDate(row.resumes_on)}</td>
                    <td className="px-4 py-2.5 text-xs text-warning whitespace-nowrap">
                      {row.provisional ? 'Provisional' : ''}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startEdit(row)}
                          aria-label={`Edit ${row.state_name} ${row.term}`}
                          className="p-2 rounded text-muted hover:text-ink hover:bg-surface-2 cursor-pointer"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleting(row)}
                          aria-label={`Delete ${row.state_name} ${row.term}`}
                          className="p-2 rounded text-muted hover:text-danger hover:bg-surface-2 cursor-pointer"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete this date?"
        message={
          deleting
            ? `${deleting.state_name} — ${deleting.term} ${deleting.academic_year}. Schools that have already paid keep the dates saved on their payment.`
            : ''
        }
        confirmLabel="Delete"
        loading={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}

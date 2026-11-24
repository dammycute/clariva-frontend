'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { billingAdmin, naira, shortDate, type Payment } from '@/lib/billing';
import { listAll, type AdminSchool } from '@/lib/admin';
import { Button } from '@/components/ui/button';
import { Panel, Stat, StatSkeleton, SummaryStrip } from '@/components/ui/summary';
import { TextField } from '@/components/ui/text-field';

const TERMS = ['1st Term', '2nd Term', '3rd Term'] as const;
const selectClass =
  'h-11 w-full px-3 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand';

export default function ConsoleBilling() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [schools, setSchools] = useState<AdminSchool[]>([]);
  const [missing, setMissing] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');

  const [grant, setGrant] = useState({ school: '', academic_year: '', term: '1st Term', students: '', note: '' });
  const [blocks, setBlocks] = useState({ school: '', value: '' });

  const load = useCallback(async () => {
    const [rows, schoolList, gaps] = await Promise.all([
      billingAdmin.payments(),
      listAll<AdminSchool>('/schools/'),
      billingAdmin.missingCalendars(),
    ]);
    setPayments(rows);
    setSchools(schoolList);
    setMissing(gaps.states.length);
  }, []);

  useEffect(() => {
    load()
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load payments.'))
      .finally(() => setLoading(false));
  }, [load]);

  const paid = useMemo(() => payments.filter(p => p.status === 'paid'), [payments]);
  const collected = useMemo(() => paid.reduce((sum, p) => sum + p.amount, 0) / 100, [paid]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return payments;
    return payments.filter(p =>
      [p.reference, p.school_name, p.term, p.academic_year, p.status, p.kind]
        .some(v => (v || '').toLowerCase().includes(q)));
  }, [payments, query]);

  const submitGrant = async () => {
    setError(''); setNotice('');
    if (!grant.school) { setError('Choose a school.'); return; }
    setBusy(true);
    try {
      await billingAdmin.manual({
        school: grant.school,
        academic_year: grant.academic_year || undefined,
        term: grant.term,
        students: grant.students ? Number(grant.students) : undefined,
        note: grant.note || undefined,
      });
      setNotice('Cover added. The school can use the portal from now.');
      setGrant({ school: '', academic_year: '', term: '1st Term', students: '', note: '' });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that cover.');
    } finally {
      setBusy(false);
    }
  };

  const submitBlocks = async () => {
    setError(''); setNotice('');
    if (!blocks.school || blocks.value === '') { setError('Choose a school and a block count.'); return; }
    setBusy(true);
    try {
      const res = await billingAdmin.setBlocks(blocks.school, Number(blocks.value));
      setNotice(`Limit changed: ${res.blocks} blocks, up to ${res.limit} students.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change the limit.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-[1120px]">
      <header className="mb-5">
        <h1 className="text-[22px] font-semibold text-ink leading-tight">Payments</h1>
        <p className="text-[13px] text-muted mt-1">
          Every Paystack payment, grant and extension across all schools · newest first
        </p>
      </header>

      {error && (
        <div role="alert" className="mb-4 text-sm text-danger bg-danger-soft border border-danger/30 rounded px-3 py-2">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="mb-4 text-sm text-success bg-success/10 border border-success/30 rounded px-3 py-2">
          {notice}
        </div>
      )}
      {!loading && missing > 0 && (
        <div className="mb-4 text-sm text-warning bg-warning/10 border border-warning/30 rounded px-3 py-2">
          {missing} {missing === 1 ? 'state has' : 'states have'} no resumption date in the next 90 days.{' '}
          <Link href="/admin/calendars" className="underline underline-offset-2">Open term calendars</Link>
        </div>
      )}

      <SummaryStrip className="mb-6">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <StatSkeleton key={i} />)
        ) : (
          <>
            <Stat label="Payments" value={payments.length.toLocaleString()} note={`${paid.length} paid`} />
            <Stat label="Collected" value={naira(collected)} note="Before Paystack's fee" />
            <Stat label="Awaiting" value={payments.filter(p => p.status === 'pending').length.toLocaleString()} note="Started, not confirmed" />
            <Stat label="States without dates" value={missing.toLocaleString()} note="Schools there cannot pay" tone={missing ? 'danger' : undefined} />
          </>
        )}
      </SummaryStrip>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Panel title="All payments" aside={`${filtered.length} shown`}>
            <div className="p-3 border-b border-line">
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search school, reference, term…"
                aria-label="Search payments"
                className="w-full h-10 px-3 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand"
              />
            </div>
            {loading ? (
              <div className="p-4 space-y-3">
                {[0, 1, 2].map(i => <div key={i} className="h-4 bg-surface-2 rounded animate-pulse" />)}
              </div>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted text-center">
                {payments.length === 0 ? 'No payments yet.' : 'No payments match that search.'}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[13px] text-muted border-b border-line">
                      <th className="px-4 py-2 font-normal">School</th>
                      <th className="px-4 py-2 font-normal">Term</th>
                      <th className="px-4 py-2 font-normal">Amount</th>
                      <th className="px-4 py-2 font-normal">Covers until</th>
                      <th className="px-4 py-2 font-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filtered.map(p => (
                      <tr key={p.id}>
                        <td className="px-4 py-2.5 text-ink">
                          {p.school_name}
                          <span className="block text-xs text-muted">
                            {p.provider === 'manual' ? 'Manual' : 'Paystack'} · {p.kind} · {shortDate(p.paid_at || p.created_at)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-muted whitespace-nowrap">{p.term} {p.academic_year}</td>
                        <td className="px-4 py-2.5 text-ink tabular-nums whitespace-nowrap">{naira(p.amount, true)}</td>
                        <td className="px-4 py-2.5 text-muted whitespace-nowrap">{shortDate(p.access_until)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded capitalize ${
                            p.status === 'paid' ? 'bg-success/10 text-success'
                              : p.status === 'pending' ? 'bg-warning/10 text-warning'
                                : 'bg-surface-2 text-muted'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Add cover by hand">
            <div className="p-4 space-y-3">
              <div>
                <label htmlFor="grant-school" className="block text-sm font-medium text-ink mb-1.5">School</label>
                <select id="grant-school" value={grant.school}
                  onChange={e => setGrant(g => ({ ...g, school: e.target.value }))}
                  className={selectClass}>
                  <option value="">Choose a school</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <TextField id="grant-year" label="Year" value={grant.academic_year}
                  onChange={e => setGrant(g => ({ ...g, academic_year: e.target.value }))}
                  placeholder="2026/2027" />
                <div>
                  <label htmlFor="grant-term" className="block text-sm font-medium text-ink mb-1.5">Term</label>
                  <select id="grant-term" value={grant.term}
                    onChange={e => setGrant(g => ({ ...g, term: e.target.value }))}
                    className={selectClass}>
                    {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <TextField id="grant-students" label="Students" type="number" min={1}
                value={grant.students} onChange={e => setGrant(g => ({ ...g, students: e.target.value }))}
                hint="Leave empty to use the school's own count." />
              <TextField id="grant-note" label="Note" value={grant.note}
                onChange={e => setGrant(g => ({ ...g, note: e.target.value }))}
                placeholder="Why this cover was added" />
              <Button onClick={submitGrant} disabled={busy} className="w-full">
                {busy ? 'Saving…' : 'Add cover'}
              </Button>
              <p className="text-xs text-muted">
                Uses the state&apos;s calendar. Every entry is logged automatically.
              </p>
            </div>
          </Panel>

          <Panel title="Limit override">
            <div className="p-4 space-y-3">
              <div>
                <label htmlFor="blocks-school" className="block text-sm font-medium text-ink mb-1.5">School</label>
                <select id="blocks-school" value={blocks.school}
                  onChange={e => setBlocks(b => ({ ...b, school: e.target.value }))}
                  className={selectClass}>
                  <option value="">Choose a school</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <TextField id="blocks-value" label="Blocks" type="number" min={0}
                value={blocks.value} onChange={e => setBlocks(b => ({ ...b, value: e.target.value }))}
                hint="Each block covers 50 students plus 10 free places." />
              <Button variant="secondary" onClick={submitBlocks} disabled={busy} className="w-full">
                Change limit
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

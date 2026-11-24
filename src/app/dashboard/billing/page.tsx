'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { auth } from '@/lib/api';
import {
  billing, blocksForStudents, naira, placesForBlocks, priceForStudents, shortDate,
  stateLabel, type BillingStatus, type Payment,
} from '@/lib/billing';
import { Button } from '@/components/ui/button';
import { Panel, Stat, StatSkeleton, SummaryStrip } from '@/components/ui/summary';
import { cn } from '@/lib/utils';

const BILLING_ROLES = ['school_admin', 'admin_officer', 'principal'];

const CHIP: Record<string, string> = {
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
  danger: 'bg-danger-soft text-danger',
  muted: 'bg-surface-2 text-muted',
};

export default function BillingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [upgradeStudents, setUpgradeStudents] = useState('');

  const load = useCallback(async () => {
    const [s, p] = await Promise.all([billing.status(), billing.payments()]);
    setStatus(s);
    setPayments(p);
    setUpgradeStudents(String(Math.max(s.limit + 1, s.students + 1)));
  }, []);

  useEffect(() => {
    const role = auth.getRole();
    if (role && !BILLING_ROLES.includes(role)) { router.replace('/lapsed'); return; }

    (async () => {
      try {
        // Paystack sends the browser back here with ?reference= or ?trxref=.
        const params = new URLSearchParams(window.location.search);
        const reference = params.get('reference') || params.get('trxref');
        if (reference) {
          const done = await billing.verify(reference);
          if (done.status === 'paid') toast.success('Payment confirmed. Thank you.');
          window.history.replaceState({}, '', '/dashboard/billing');
        }
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load your billing details.');
      } finally {
        setLoading(false);
      }
    })();
  }, [load, router]);

  const pay = async (kind: 'new' | 'renewal' | 'upgrade') => {
    setBusy(true);
    try {
      const payload: { kind: 'new' | 'renewal' | 'upgrade'; students?: number; callback_url: string } = {
        kind,
        callback_url: `${window.location.origin}/dashboard/billing`,
      };
      if (kind === 'upgrade') payload.students = Number(upgradeStudents);
      const started = await billing.initialize(payload);
      if (started.authorization_url) window.location.assign(started.authorization_url);
      else toast.error('Paystack did not return a payment link. Try again.');
    } catch {
      // request() has already shown the reason.
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-[1120px]">
        <div className="h-7 w-40 rounded bg-line animate-pulse mb-6" />
        <SummaryStrip className="mb-6">
          {Array.from({ length: 4 }).map((_, i) => <StatSkeleton key={i} />)}
        </SummaryStrip>
        <div className="h-40 rounded border border-line bg-surface animate-pulse" />
      </div>
    );
  }

  if (!status) {
    return (
      <div className="max-w-[1120px]">
        <h1 className="text-[22px] font-semibold text-ink">Billing</h1>
        <p role="alert" className="text-sm text-danger mt-3">{error || 'Could not load billing.'}</p>
      </div>
    );
  }

  const label = stateLabel(status.state);
  const term = status.next_term;
  const upgradeBlocks = Number(upgradeStudents) > 0 ? blocksForStudents(Number(upgradeStudents)) : 0;
  const upgradePrice = status.paid_blocks && upgradeBlocks > status.paid_blocks
    ? (upgradeBlocks - status.paid_blocks) * status.price_per_block
    : 0;

  const blocked = {
    missing_calendar: "Your state's term dates are not published yet. We will contact you — you cannot pay for this term until they are.",
    window_closed: status.payment_opens_on
      ? `Payment for ${term?.term ?? 'the next term'} opens on ${shortDate(status.payment_opens_on)}.`
      : 'Payment is not open for this term yet.',
    no_students: 'Add your students first, so we know what to bill for.',
    suspended: 'This school account is suspended. Contact support.',
  } as Record<string, string>;

  return (
    <div className="max-w-[1120px]">
      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[22px] font-semibold text-ink leading-tight">Billing</h1>
          <span className={cn('text-xs px-2 py-0.5 rounded', CHIP[label.tone])}>{label.text}</span>
          {!status.enforce && (
            <span className="text-xs px-2 py-0.5 rounded bg-surface-2 text-muted">
              Not enforced yet
            </span>
          )}
        </div>
        <p className="text-[13px] text-muted mt-1">
          {status.school.name}
          {status.school.state ? ` · ${status.school.state}` : ''}
          {' · '}{status.price_per_block.toLocaleString('en-NG')} naira per block of 50 students,
          with 10 extra places on every block.
        </p>
      </header>

      {error && (
        <div role="alert" className="mb-4 text-sm text-danger bg-danger-soft border border-danger/30 rounded px-3 py-2">
          {error}
        </div>
      )}

      <SummaryStrip className="mb-6">
        <Stat
          label="Students"
          value={status.students.toLocaleString()}
          note={status.declared_students && !status.students ? `${status.declared_students} given at sign-up` : undefined}
        />
        <Stat
          label="Plan covers"
          value={status.limit ? status.limit.toLocaleString() : '—'}
          note={status.paid_blocks ? `${status.paid_blocks} block${status.paid_blocks === 1 ? '' : 's'} · ${status.remaining} left` : 'Nothing paid yet'}
          progress={status.limit ? Math.min((status.students / status.limit) * 100, 100) : undefined}
        />
        <Stat label="Access until" value={shortDate(status.access_until)} note={status.days_left !== null ? `${status.days_left} days` : 'Not paid yet'} />
        <Stat label="This term" value={naira(status.price_per_term)} note={status.blocks_needed ? `${status.blocks_needed} block${status.blocks_needed === 1 ? '' : 's'}` : '—'} />
      </SummaryStrip>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Panel title={term ? `${term.term} ${term.academic_year}` : 'Next term'}>
            {term ? (
              <div className="p-4 space-y-4">
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <dt className="text-[13px] text-muted">Resumes</dt>
                    <dd className="text-ink mt-0.5">
                      {shortDate(term.resumes_on)}
                      {term.provisional && <span className="ml-2 text-xs text-warning">provisional</span>}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[13px] text-muted">Covers until</dt>
                    <dd className="text-ink mt-0.5">
                      {shortDate(term.access_until)}
                      <span className="block text-xs text-muted">
                        {term.next_term} {term.next_academic_year} resumption plus 3 weeks
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[13px] text-muted">Students billed</dt>
                    <dd className="text-ink mt-0.5">{status.quote_students.toLocaleString()}</dd>
                  </div>
                  <div>
                    <dt className="text-[13px] text-muted">Total</dt>
                    <dd className="text-ink mt-0.5 font-medium">{naira(status.price_per_term)}</dd>
                  </div>
                </dl>

                {status.blocked_reason && blocked[status.blocked_reason] && (
                  <p className="text-sm text-warning">{blocked[status.blocked_reason]}</p>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  <Button
                    onClick={() => pay(status.state === 'pending' ? 'new' : 'renewal')}
                    disabled={busy || !status.can_pay}
                  >
                    {busy ? 'Opening Paystack…' : `Pay ${naira(status.price_per_term)}`}
                  </Button>
                  <span className="text-xs text-muted">
                    Secure payment by Paystack. The price is the total — no card or transfer fees added.
                  </span>
                </div>
              </div>
            ) : (
              <p className="px-4 py-5 text-sm text-muted">
                {blocked[status.blocked_reason || ''] || 'The term dates for your state are not published yet.'}
              </p>
            )}
          </Panel>

          {status.upgrade && (
            <Panel title="Add more students">
              <div className="p-4 space-y-4">
                <p className="text-sm text-muted">
                  Your plan covers {status.limit} students. An upgrade pays only the difference in
                  blocks — the dates do not change.
                </p>
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label htmlFor="upgrade-students" className="block text-[13px] text-muted mb-1">
                      Students you need
                    </label>
                    <input
                      id="upgrade-students"
                      type="number"
                      min={status.limit + 1}
                      value={upgradeStudents}
                      onChange={e => setUpgradeStudents(e.target.value)}
                      className="h-11 w-40 px-3 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand"
                    />
                  </div>
                  <Button
                    variant="secondary"
                    disabled={busy || upgradePrice <= 0}
                    onClick={() => pay('upgrade')}
                  >
                    {upgradePrice > 0
                      ? `Upgrade to ${upgradeBlocks} blocks · ${naira(upgradePrice)}`
                      : 'Upgrade'}
                  </Button>
                </div>
                {Number(upgradeStudents) > 0 && upgradePrice > 0 && (
                  <p className="text-xs text-muted">
                    {upgradeBlocks} blocks cover {placesForBlocks(upgradeBlocks)} students.
                    Quoted: {naira(priceForStudents(Number(upgradeStudents)))} for a full term.
                  </p>
                )}
              </div>
            </Panel>
          )}

          <Panel title="Payment history" aside={`${payments.length} ${payments.length === 1 ? 'payment' : 'payments'}`}>
            {payments.length === 0 ? (
              <p className="px-4 py-5 text-sm text-muted">No payments yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[13px] text-muted border-b border-line">
                      <th className="px-4 py-2 font-normal">Date</th>
                      <th className="px-4 py-2 font-normal">Term</th>
                      <th className="px-4 py-2 font-normal">Amount</th>
                      <th className="px-4 py-2 font-normal">Covers until</th>
                      <th className="px-4 py-2 font-normal">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {payments.map(p => (
                      <tr key={p.id}>
                        <td className="px-4 py-2.5 text-muted whitespace-nowrap">{shortDate(p.paid_at || p.created_at)}</td>
                        <td className="px-4 py-2.5 text-ink whitespace-nowrap">{p.term} {p.academic_year}</td>
                        <td className="px-4 py-2.5 text-ink tabular-nums whitespace-nowrap">{naira(p.amount, true)}</td>
                        <td className="px-4 py-2.5 text-muted whitespace-nowrap">{shortDate(p.access_until)}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn('text-xs px-2 py-0.5 rounded capitalize',
                            p.status === 'paid' ? 'bg-success/10 text-success'
                              : p.status === 'pending' ? 'bg-warning/10 text-warning'
                                : 'bg-surface-2 text-muted')}>
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
          <Panel title="How billing works">
            <ul className="p-4 space-y-3 text-[13px] text-muted">
              <li>₦{status.price_per_block.toLocaleString('en-NG')} per term for each block of 50 students.</li>
              <li>Every block includes 10 extra places, so one block covers 60 students.</li>
              <li>A paid term runs to three weeks after the next term resumes.</li>
              <li>Nothing is restricted during those three weeks.</li>
              <li>Upgrades pay only the difference in blocks, with no proration.</li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

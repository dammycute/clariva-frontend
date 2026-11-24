'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { billing, type BillingStatus } from '@/lib/billing';

type Notice = { tone: 'danger' | 'warning' | 'muted'; text: string; href: string; action: string };

const TONE = {
  danger: 'bg-danger-soft text-danger border-danger/30',
  warning: 'bg-warning/10 text-warning border-warning/30',
  muted: 'bg-surface-2 text-ink border-line',
} as const;

/**
 * The admin portal's billing banner. At most one message, in priority order, and
 * nothing at all while billing is dark.
 */
export function BillingBanner() {
  const [status, setStatus] = useState<BillingStatus | null>(null);

  useEffect(() => {
    billing.status().then(setStatus).catch(() => undefined);
  }, []);

  if (!status || !status.enforce || status.state === 'suspended') return null;

  const notices: Notice[] = [];
  if (status.state === 'pending') {
    notices.push({ tone: 'danger', text: 'Pay for this term to open the portal.', href: '/dashboard/billing', action: 'Pay now' });
  }
  if (status.state === 'lapsed') {
    notices.push({ tone: 'danger', text: 'Your subscription has lapsed. Admins can read and pay; changes are blocked.', href: '/dashboard/billing', action: 'Pay now' });
  }
  if (status.state === 'grace' && status.days_left !== null) {
    notices.push({
      tone: 'warning',
      text: `The new term has started. You have ${status.days_left} ${status.days_left === 1 ? 'day' : 'days'} left to pay — nothing is blocked until then.`,
      href: '/dashboard/billing', action: 'Pay now',
    });
  }
  if (status.limit > 0 && status.remaining <= 10) {
    notices.push({
      tone: status.remaining === 0 ? 'danger' : 'muted',
      text: `${status.students} of ${status.limit} student places used.`,
      href: '/dashboard/billing', action: 'Upgrade',
    });
  }
  if (status.state === 'active' && status.days_left !== null && status.days_left <= 30) {
    notices.push({
      tone: 'muted',
      text: `The next term resumes in ${status.days_left} ${status.days_left === 1 ? 'day' : 'days'}.`,
      href: '/dashboard/billing', action: 'Renew',
    });
  }

  const notice = notices[0];
  if (!notice) return null;

  return (
    <div className={`mb-4 flex flex-wrap items-center gap-3 rounded border px-3 py-2.5 text-sm ${TONE[notice.tone]}`}>
      <span className="flex-1 min-w-0">{notice.text}</span>
      <Link href={notice.href} className="inline-flex items-center gap-1 font-medium hover:underline shrink-0">
        {notice.action} <ArrowRight size={14} aria-hidden="true" />
      </Link>
    </div>
  );
}

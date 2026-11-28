'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { MousePointer2 } from 'lucide-react';
import { auth } from '@/lib/api';
import { BILLING_CHANGED, billing, blockedReason, type BillingStatus } from '@/lib/billing';
import { Button } from '@/components/ui/button';

type Step = {
  title: string;
  text: string;
  /** A sidebar item: the tour opens this page and points at its menu link. */
  href?: string;
  /** Something on the page itself, marked data-tour="…". */
  mark?: string;
  /** The menu name, for phones where the menu is closed. */
  menu?: string;
};

const nav = (href: string, menu: string, title: string, text: string): Step => ({ href, menu, title, text });

const SCHOOL_ADMIN: Step[] = [
  nav('/dashboard/teachers', 'Staff', 'Add your staff', 'Add teachers and other workers here, and give them sign-in details.'),
  nav('/dashboard/students?tab=classes', 'Classes', 'Create your classes', 'Do this before you add students.'),
  nav('/dashboard/students', 'Students', 'Add your students', 'Add them one at a time or import a file. Keep the sign-in details the import gives you.'),
  nav('/dashboard/fees', 'Fees', 'Follow the fees', 'Your bursar sets up fees. Here you see what is charged, paid and still owed.'),
  nav('/dashboard/comms', 'Communications', 'Send announcements', 'Share news with your school from here.'),
];

export const GUIDES: Record<string, Step[]> = {
  school_admin: SCHOOL_ADMIN,
  admin_officer: SCHOOL_ADMIN,
  principal: [
    nav('/principal/classes', 'Classes', 'See your classes', 'Check how the school is set up.'),
    nav('/principal/grades', 'Grades', 'Follow results', 'See academic work here. Report cards and CBT exams are in the same menu group.'),
    nav('/principal/comms', 'Communications', 'Keep people informed', 'Send announcements from here.'),
  ],
  teacher: [
    nav('/teacher/classes', 'My students', 'Check your students', 'If a class is missing, ask your school administrator.'),
    nav('/teacher/attendance', 'Attendance', 'Take attendance', 'Mark who is present each day.'),
    nav('/teacher/grades', 'Grades', 'Enter grades', 'Record test and exam scores here.'),
    nav('/teacher/cbt', 'CBT exams', 'Set a computer test', 'Create a test and add its questions.'),
  ],
  bursary: [
    nav('/bursary', 'Dashboard', 'See the money position', 'This page summarises school fees.'),
    nav('/bursary/fees', 'Fees', 'Set up fees', 'Add what each class pays. Only you can create or change fees.'),
    nav('/bursary/invoices', 'Invoices', 'Work with invoices', 'See what each student has been charged and what is still owed.'),
  ],
  student: [
    nav('/student/exams', 'CBT exams', 'Find your tests', 'Before exam day, sign in and open this page on the device you will use. Your account works on one device at a time.'),
    nav('/student/grades', 'My grades', 'See your grades', 'Your results are here.'),
    nav('/student/timetable', 'Timetable', 'Check your timetable', 'See when your lessons are.'),
  ],
  parent: [
    { mark: 'children', title: 'Your children', text: 'Each child linked to your account is shown here. If one is missing, ask the school.' },
    { mark: 'fees', title: 'Fees', text: 'See what has been charged, what is paid and what is still owed.' },
    { mark: 'results', title: 'Report card', text: 'Your child’s latest released result appears here.' },
  ],
  super_admin: [
    nav('/admin/calendars', 'Term calendars', 'Enter term dates', 'Add each state’s dates. Schools cannot pay without them.'),
    nav('/admin/schools', 'Schools', 'Look after schools', 'Every school on the platform is listed here.'),
    nav('/admin/billing', 'Payments', 'Watch payments', 'See what schools have paid.'),
  ],
};

// Roles that belong to one school, and so can be held back by that school's unpaid bill.
const SCHOOL_ROLES = ['school_admin', 'admin_officer', 'principal', 'teacher', 'bursary', 'student'];
// Who can pay. Matches BILLING_ROLES in lib/api.ts.
const PAYER_ROLES = ['school_admin', 'admin_officer'];
const CARD_WIDTH = 320;
const GAP = 14;

type Box = { top: number; left: number; width: number; height: number };

/** The first match that is really on screen (the closed phone menu sits off to the left). */
function onScreen(selector: string): HTMLElement | null {
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find(el => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth;
  }) || null;
}

/** Where the card goes: beside the target if there is room, otherwise above or below it. */
function placeCard(box: Box | null, height: number): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const width = Math.min(CARD_WIDTH, vw - 32);
  const clamp = (v: number, max: number) => Math.max(16, Math.min(v, max));
  if (!box) return { width, left: (vw - width) / 2, top: clamp((vh - height) / 2, vh - height - 16) };
  const beside = box.left + box.width + GAP;
  if (beside + width + 16 <= vw) return { width, left: beside, top: clamp(box.top - 12, vh - height - 16) };
  const below = box.top + box.height + GAP;
  const top = below + height + 16 <= vh ? below : box.top - height - GAP;
  return { width, left: clamp(box.left, vw - width - 16), top: clamp(top, vh - height - 16) };
}

/** Part one, for a school that has not paid yet. */
export function paymentSteps(status: BillingStatus): Step[] {
  if (!status.can_pay || !status.next_term) {
    return [{
      mark: 'term', title: 'Payment is not open yet',
      text: blockedReason(status) || 'You cannot pay right now. Contact support if this does not change.',
    }];
  }
  return [
    { mark: 'bill', title: 'Check what you are paying for', text: 'See how many students are billed, the total, and how long access lasts.' },
    { mark: 'pay', title: 'Pay with Paystack', text: 'Press Got it, then use this button. Paystack brings you back here to confirm your payment.' },
  ];
}

const seenKey = (userId: string) => `clarriva-pay-tour-seen:${userId}`;

function paymentTourSeen(userId: string) {
  try { return localStorage.getItem(seenKey(userId)) === '1'; } catch { return false; }
}

/**
 * The first sign-in tour, in two parts. A school that has not paid is shown how to pay;
 * the tour of the app starts once it can open the app.
 */
export function Walkthrough({ role, userId = '', onClose }: { role: string; userId?: string; onClose: () => void }) {
  const pathname = usePathname();
  const needsCheck = SCHOOL_ROLES.includes(role);
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [payDismissed, setPayDismissed] = useState(false);
  // Back from Paystack: the page is still confirming, so do not tell them to pay again.
  const [confirming, setConfirming] = useState(
    () => /[?&](reference|trxref)=/.test(window.location.search));

  useEffect(() => {
    if (!needsCheck) return;
    let latest = 0;
    const check = () => {
      const mine = ++latest;
      // If this fails nothing is shown; the next page load tries again.
      billing.status().then(s => { if (mine === latest) setStatus(s); }).catch(() => undefined);
    };
    const changed = () => { setConfirming(false); check(); };
    check();
    window.addEventListener(BILLING_CHANGED, changed);
    return () => { latest = -1; window.removeEventListener(BILLING_CHANGED, changed); };
  }, [needsCheck]);

  const finish = () => {
    onClose();
    // If this fails the tour simply shows again at the next sign-in.
    void auth.finishWalkthrough().catch(() => undefined);
  };

  if (!needsCheck) return <Tour steps={GUIDES[role]} onSkip={finish} onDone={finish} />;
  if (!status) return null;

  if (status.enforce && status.state === 'pending') {
    // Everyone else is told by the /lapsed page, and gets their tour after the school pays.
    if (!PAYER_ROLES.includes(role) || pathname !== '/dashboard/billing') return null;
    if (confirming || payDismissed || paymentTourSeen(userId)) return null;
    // Remembered on this device only: the account still owes them the tour of the app.
    const dismiss = () => {
      try { localStorage.setItem(seenKey(userId), '1'); } catch { /* shows again next visit */ }
      setPayDismissed(true);
    };
    return <Tour key="pay" steps={paymentSteps(status)} lastLabel="Got it" onSkip={dismiss} onDone={dismiss} />;
  }

  return <Tour key="app" steps={GUIDES[role]} onSkip={finish} onDone={finish} />;
}

/** Opens each step's page and points at the real thing on screen. */
function Tour({ steps, lastLabel = 'Done', onSkip, onDone }: {
  steps: Step[] | undefined; lastLabel?: string; onSkip: () => void; onDone: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [menuClosed, setMenuClosed] = useState(false);
  const [cardHeight, setCardHeight] = useState(200);
  const card = useRef<HTMLDivElement>(null);
  const startedAt = useRef(pathname);
  const step = steps?.[index];

  const href = step?.href;
  useEffect(() => {
    if (href) router.push(href);
  }, [href, router]);

  // Keep following the target: pages load late, windows resize, lists scroll.
  useEffect(() => {
    let scrolled = false;
    const follow = () => {
      let el: HTMLElement | null = null;
      let closed = false;
      if (step?.href) {
        el = onScreen(`nav a[href="${step.href}"]`);
        if (!el) { el = onScreen('[aria-label="Open navigation menu"]'); closed = Boolean(el); }
      } else if (step?.mark) {
        el = onScreen(`[data-tour="${step.mark}"]`);
      }
      if (el && !scrolled) { scrolled = true; el.scrollIntoView?.({ block: 'nearest' }); }
      const r = el?.getBoundingClientRect();
      const next = r ? { top: r.top, left: r.left, width: r.width, height: r.height } : null;
      setBox(old => (JSON.stringify(old) === JSON.stringify(next) ? old : next));
      setMenuClosed(closed);
    };
    follow();
    const timer = window.setInterval(follow, 200);
    return () => window.clearInterval(timer);
  }, [step?.href, step?.mark]);

  useLayoutEffect(() => {
    const h = card.current?.offsetHeight;
    if (h && h !== cardHeight) setCardHeight(h);
  }, [index, menuClosed, cardHeight]);

  useEffect(() => {
    card.current?.querySelector<HTMLElement>('[data-primary]')?.focus({ preventScroll: true });
  }, [index]);

  if (!steps || !step) return null;

  const last = index === steps.length - 1;
  const done = () => {
    onDone();
    if (step.href) router.push(startedAt.current);
  };

  // Keyboard: Escape skips, Tab stays inside the card.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onSkip(); return; }
    if (e.key !== 'Tab') return;
    const items = Array.from(card.current?.querySelectorAll<HTMLElement>('button') || []);
    const edge = e.shiftKey ? items[0] : items[items.length - 1];
    if (document.activeElement === edge) {
      e.preventDefault();
      (e.shiftKey ? items[items.length - 1] : items[0]).focus();
    }
  };

  return (
    // The full-screen layer also stops clicks reaching the page during the tour.
    <div className="fixed inset-0 z-[60]" onKeyDown={onKeyDown}>
      {box ? (
        <>
          <div
            data-testid="tour-spotlight"
            aria-hidden="true"
            className="absolute rounded-md ring-2 ring-brand transition-all duration-300 motion-reduce:transition-none"
            style={{
              top: box.top - 4, left: box.left - 4, width: box.width + 8, height: box.height + 8,
              boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.55)',
            }}
          />
          <div
            aria-hidden="true"
            className="absolute z-10 pointer-events-none transition-all duration-300 motion-reduce:transition-none"
            style={{ top: box.top + box.height * 0.6, left: box.left + Math.min(box.width - 24, box.width * 0.7) }}
          >
            <span className="absolute -left-2 -top-2 w-5 h-5 rounded-full bg-brand/60 motion-safe:animate-ping" />
            <MousePointer2 size={30} className="relative text-white fill-brand drop-shadow-lg motion-safe:animate-bounce" />
          </div>
        </>
      ) : <div aria-hidden="true" className="absolute inset-0 bg-black/55" />}

      <div
        ref={card}
        role="dialog"
        aria-modal="true"
        aria-label="Getting started"
        className="absolute z-20 bg-surface border border-line rounded-md shadow-lg p-4"
        style={placeCard(box, cardHeight)}
      >
        <div aria-live="polite">
          <p className="text-xs text-muted">Step {index + 1} of {steps.length}</p>
          <h2 className="text-base font-semibold text-ink mt-1">{step.title}</h2>
          <p className="text-sm text-muted mt-1.5">{step.text}</p>
          {menuClosed && (
            <p className="text-sm text-ink mt-2">Find it here: tap this <strong>Menu</strong> button, then <strong>{step.menu}</strong>.</p>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 mt-4">
          <button onClick={onSkip} className="text-sm text-muted hover:text-ink underline underline-offset-2 cursor-pointer">
            Skip
          </button>
          <div className="flex gap-2">
            {index > 0 && <Button variant="secondary" onClick={() => setIndex(index - 1)}>Back</Button>}
            <Button data-primary onClick={last ? done : () => setIndex(index + 1)}>{last ? lastLabel : 'Next'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

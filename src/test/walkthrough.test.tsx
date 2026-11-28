import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const push = vi.fn();
const router = { push };
let path = '/teacher';
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => path }));
const finishWalkthrough = vi.fn(() => Promise.resolve());
vi.mock('@/lib/api', () => ({ auth: { finishWalkthrough: () => finishWalkthrough() } }));
let status: Record<string, unknown> = { enforce: true, state: 'active' };
vi.mock('@/lib/billing', () => ({
  BILLING_CHANGED: 'billing-changed',
  blockedReason: () => 'Term dates are missing.',
  billing: { status: () => Promise.resolve(status) },
}));

import { GUIDES, Walkthrough, paymentSteps } from '@/components/walkthrough';
import type { BillingStatus } from '@/lib/billing';

const LAYOUTS: Record<string, string> = {
  school_admin: 'dashboard', admin_officer: 'dashboard', principal: 'principal', teacher: 'teacher',
  bursary: 'bursary', student: 'student', super_admin: 'admin',
};

afterEach(() => {
  cleanup(); vi.clearAllMocks(); localStorage.clear();
  status = { enforce: true, state: 'active' }; path = '/teacher';
});

const unpaid = { enforce: true, state: 'pending', can_pay: true, next_term: {} };

describe('first sign-in tour', () => {
  it('only points at menu items and page marks that exist', () => {
    const file = (path: string) => readFileSync(join(process.cwd(), 'src/app', path), 'utf8');
    for (const [role, steps] of Object.entries(GUIDES)) {
      for (const step of steps) {
        if (step.href) expect(file(`${LAYOUTS[role]}/layout.tsx`)).toContain(`label: '${step.menu}', href: '${step.href}'`);
        else expect(file('guardian/dashboard/page.tsx')).toContain(`data-tour="${step.mark}"`);
      }
    }
  });

  it('opens each page, then returns and remembers it is done', async () => {
    const onClose = vi.fn();
    render(<Walkthrough role="teacher" onClose={onClose} />);
    await screen.findByRole('dialog');
    await vi.waitFor(() => expect(push).toHaveBeenLastCalledWith('/teacher/classes'));
    fireEvent.click(screen.getByText('Next'));
    await vi.waitFor(() => expect(push).toHaveBeenLastCalledWith('/teacher/attendance'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Next'));
    fireEvent.click(screen.getByText('Done'));
    expect(push).toHaveBeenLastCalledWith('/teacher');
    expect(finishWalkthrough).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows an unpaid admin how to pay, then tours the app once payment is confirmed', async () => {
    status = unpaid;
    path = '/dashboard/billing';
    const onClose = vi.fn();
    render(<Walkthrough role="school_admin" userId="u1" onClose={onClose} />);
    expect(await screen.findByText('Check what you are paying for')).toBeTruthy();
    fireEvent.click(screen.getByText('Skip'));
    expect(screen.queryByRole('dialog')).toBeNull();
    // skipping the payment part must not use up the tour of the app
    expect(finishWalkthrough).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();

    status = { enforce: true, state: 'active' };
    window.dispatchEvent(new Event('billing-changed'));
    expect(await screen.findByText('Add your staff')).toBeTruthy();
  });

  it('remembers a skipped payment tour on this device', async () => {
    status = unpaid;
    path = '/dashboard/billing';
    localStorage.setItem('clarriva-pay-tour-seen:u1', '1');
    render(<Walkthrough role="school_admin" userId="u1" onClose={() => {}} />);
    await new Promise(r => setTimeout(r, 20));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows no tour to other unpaid users, or while a payment is being confirmed', async () => {
    status = unpaid;
    path = '/dashboard/billing';
    render(<Walkthrough role="teacher" userId="u2" onClose={() => {}} />);
    window.history.replaceState({}, '', '/dashboard/billing?reference=CLV-1');
    render(<Walkthrough role="school_admin" userId="u3" onClose={() => {}} />);
    await new Promise(r => setTimeout(r, 20));
    window.history.replaceState({}, '', '/');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('never tells a school to press a button it cannot use', () => {
    const steps = paymentSteps({ can_pay: false, next_term: null } as BillingStatus);
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({ mark: 'term', text: 'Term dates are missing.' });
    const page = readFileSync(join(process.cwd(), 'src/app/dashboard/billing/page.tsx'), 'utf8');
    for (const mark of ['term', 'bill', 'pay']) expect(page).toContain(`data-tour="${mark}"`);
  });

  it('can be skipped with the Escape key', () => {
    render(<Walkthrough role="parent" onClose={() => {}} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(finishWalkthrough).toHaveBeenCalledTimes(1);
  });
});

'use client';

import { useState } from 'react';
import { BLOCK_SIZE, blocksFor, naira, pricePerTerm } from '@/lib/pricing';

/** Type the number of students, see the price per term. */
export function PricingCalculator() {
  const [value, setValue] = useState('120');
  const students = parseInt(value, 10);
  const blocks = blocksFor(students);

  return (
    <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8 h-full">
      <label htmlFor="students" className="block text-sm font-medium text-ink">How many students does your school have?</label>
      <input
        id="students" type="number" inputMode="numeric" min={1} max={100000} value={value}
        onChange={e => setValue(e.target.value)}
        className="mt-3 h-12 w-full rounded-xl border border-line bg-page px-4 text-lg text-ink outline-none focus:border-brand"
      />
      <div className="mt-6 border-t border-line pt-6" aria-live="polite">
        {blocks > 0 ? (
          <>
            <p className="text-sm text-muted">Your price</p>
            <p className="mt-1 font-display text-5xl font-semibold tracking-tight text-ink tabular-nums">{naira(pricePerTerm(students))}<span className="font-sans text-base font-normal text-muted"> per term</span></p>
            <p className="mt-3 text-[13px] text-muted">
              {blocks} {blocks === 1 ? 'block' : 'blocks'} of {BLOCK_SIZE} students, at {naira(30000)} each.
            </p>
          </>
        ) : (
          <p className="text-sm text-muted">Enter your number of students to see the price.</p>
        )}
      </div>
    </div>
  );
}

import * as React from 'react';
import { cn } from '@/lib/utils';

/** A section of a plain, printable report: title, hairline above, content below. */
export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="py-6 border-t border-line print:break-inside-avoid">
      <h2 className="text-[15px] font-semibold text-ink mb-4">{title}</h2>
      {children}
    </section>
  );
}

/** One number with its label. Put several inside a <dl>. */
export function Figure({ label, value, tone }: { label: string; value: string | number; tone?: 'danger' | 'success' }) {
  return (
    <div>
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className={cn('text-xl font-semibold tabular-nums mt-0.5', tone === 'danger' ? 'text-danger' : tone === 'success' ? 'text-success' : 'text-ink')}>
        {value}
      </dd>
    </div>
  );
}

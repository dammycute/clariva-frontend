import * as React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/** One bordered strip of key numbers, split by hairlines. Use instead of separate stat cards. */
const COLS = { 2: 'grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-3', 4: 'grid-cols-2 lg:grid-cols-4' } as const;

export function SummaryStrip({ children, label = 'Summary', cols = 4, className }: { children: React.ReactNode; label?: string; cols?: 2 | 3 | 4; className?: string }) {
  return (
    <section
      aria-label={label}
      className={cn('bg-line border border-line rounded overflow-hidden grid gap-px', COLS[cols], className)}
    >
      {children}
    </section>
  );
}

export function Stat({
  label, value, note, progress, tone,
}: {
  label: string;
  value: string | number;
  note?: string;
  /** 0 to 100. Draws a thin bar under the note. */
  progress?: number;
  tone?: 'danger' | 'success';
}) {
  return (
    <div className="p-4 bg-surface">
      <p className="text-[13px] text-muted">{label}</p>
      <p className={cn('text-[26px] font-semibold leading-tight mt-1 tabular-nums', tone === 'danger' ? 'text-danger' : tone === 'success' ? 'text-success' : 'text-ink')}>
        {value}
      </p>
      {note && <p className="text-xs text-muted mt-1 tabular-nums">{note}</p>}
      {progress !== undefined && (
        <div
          className="h-1 bg-surface-2 rounded-full overflow-hidden mt-2"
          role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${label}: ${progress}%`}
        >
          <div className="h-full bg-brand" style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }} />
        </div>
      )}
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="p-4 bg-surface space-y-2">
      <div className="h-3 w-1/2 bg-surface-2 rounded animate-pulse" />
      <div className="h-7 w-2/3 bg-surface-2 rounded animate-pulse" />
      <div className="h-3 w-1/3 bg-surface-2 rounded animate-pulse" />
    </div>
  );
}

/** A titled, bordered block. `aside` is muted text, `action` is a link or button on the right. */
export function Panel({ title, aside, action, children }: { title: string; aside?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-surface border border-line rounded overflow-hidden">
      <div className="px-4 h-11 border-b border-line flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
        {aside && <span className="text-[13px] text-muted">{aside}</span>}
        {action}
      </div>
      {children}
    </section>
  );
}

/** A plain list of links, each with a label and an optional one-line description. */
export function LinkList({ items }: { items: { label: string; text?: string; href: string }[] }) {
  return (
    <ul className="divide-y divide-line">
      {items.map(a => (
        <li key={a.href + a.label}>
          <Link href={a.href} className="flex items-center justify-between gap-4 px-4 py-3 min-h-[44px] hover:bg-surface-2 transition-colors">
            <span>
              <span className="block text-sm font-medium text-ink">{a.label}</span>
              {a.text && <span className="block text-[13px] text-muted mt-0.5">{a.text}</span>}
            </span>
            <ChevronRight size={16} className="text-muted shrink-0" aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

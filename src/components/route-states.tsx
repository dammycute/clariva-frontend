'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

/** Shown when a page throws. Used by every portal's error.tsx. */
export function RouteError({
  error,
  reset,
  title = 'Something went wrong',
  message = "We couldn't load this page. Try again, and if it keeps happening, tell your school administrator.",
}: {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  message?: string;
}) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <div role="alert" className="max-w-[420px] py-10">
      <h1 className="text-xl font-semibold text-ink tracking-tight text-balance">{title}</h1>
      <p className="text-sm text-muted mt-2 text-pretty">{message}</p>
      <Button onClick={reset} className="mt-5">Try again</Button>
    </div>
  );
}

/** Quiet placeholder lines while a page loads. Used by every portal's loading.tsx. */
export function RouteLoading() {
  return (
    <div role="status" aria-label="Loading" className="max-w-3xl space-y-4 animate-pulse py-2">
      <div className="h-6 w-40 rounded bg-line" aria-hidden="true" />
      <div className="h-3 w-64 rounded bg-line" aria-hidden="true" />
      <div className="h-28 rounded bg-line" aria-hidden="true" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

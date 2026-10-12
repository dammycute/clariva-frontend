'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Application error:', error);
  }, [error]);

  return (
    <main className="min-h-[60vh] flex items-center px-6">
      <div className="w-full max-w-[420px] mx-auto">
        <h1 className="text-2xl font-semibold text-ink tracking-tight text-balance">Something went wrong</h1>
        <p className="text-sm text-muted mt-2 text-pretty">
          We couldn&apos;t load this page. Try again, and if it keeps happening, tell your school administrator.
        </p>
        <Button onClick={reset} className="mt-6">Try again</Button>
      </div>
    </main>
  );
}

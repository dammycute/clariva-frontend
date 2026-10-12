'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <h2 className="text-2xl font-semibold text-ink mb-3">Dashboard Error</h2>
      <p className="text-sm text-muted mb-6">
        Failed to load dashboard. Please try again.
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 bg-brand text-brand-ink text-sm font-semibold rounded hover:opacity-90 cursor-pointer transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

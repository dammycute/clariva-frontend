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
    console.error('Student portal error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <h2 className="text-2xl font-bold text-[#0D2B55] mb-3">Student Portal Error</h2>
      <p className="text-sm text-[#64748B] mb-6">
        Failed to load student portal. Please try again.
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 bg-[#1A7A4A] text-white text-sm font-bold rounded-lg hover:bg-[#14663D] cursor-pointer transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}

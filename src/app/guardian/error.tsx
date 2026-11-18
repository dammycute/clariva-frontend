'use client';

import { RouteError } from '@/components/route-states';

export default function Error(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="min-h-dvh bg-page flex items-center px-6">
      <div className="w-full max-w-[420px] mx-auto">
        <RouteError {...props} title="We couldn't load your records" message="Try again. If it keeps happening, ask your school for help." />
      </div>
    </main>
  );
}

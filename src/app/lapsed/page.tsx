'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { Button } from '@/components/ui/button';

const ADMIN_ROLES = ['school_admin', 'admin_officer'];   // principals cannot open /dashboard

/**
 * What a teacher, student or parent sees when the school's subscription has lapsed.
 * They cannot open the billing page, so they are told who can.
 */
export default function LapsedPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    const role = auth.getRole();
    if (role && ADMIN_ROLES.includes(role)) { router.replace('/dashboard/billing'); return; }
    setAdmin(Boolean(role));
  }, [router]);

  return (
    <main className="min-h-dvh flex items-center justify-center bg-page px-4">
      <div className="w-full max-w-[420px] bg-surface border border-line rounded p-6">
        <h1 className="text-xl font-semibold text-ink">Your school&apos;s subscription has lapsed</h1>
        <p className="text-sm text-muted mt-2">
          Clariva is paused for your school until the administrator pays for the new term.
          Tell your school administrator — nothing you have entered is lost.
        </p>
        {admin && (
          <Button className="w-full mt-5" onClick={() => router.push('/dashboard/billing')}>
            Go to billing
          </Button>
        )}
        <Button
          variant="ghost"
          className="w-full mt-2"
          onClick={() => { auth.logout(); router.push('/login'); }}
        >
          Sign out
        </Button>
      </div>
    </main>
  );
}

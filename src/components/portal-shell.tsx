'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { api, auth, ApiError } from '@/lib/api';
import { Sidebar, type NavSection } from '@/components/sidebar';
import NotificationBell from '@/components/notification-bell';
import { ThemeSwitch } from '@/components/theme-switch';
import { Walkthrough } from '@/components/walkthrough';

const LAST_USER = 'portal-last-user';

const ROLE_LABELS: Record<string, string> = {
  school_admin: 'School admin', admin_officer: 'Admin officer', principal: 'Principal',
  teacher: 'Teacher', bursary: 'Bursar', student: 'Student', super_admin: 'Super admin',
};

interface PortalShellProps {
  nav: NavSection[];
  children: React.ReactNode;
  /** Roles allowed in this portal. Anyone else is sent to `deniedHref`. Omit to allow any signed-in user. */
  allowRoles?: string[];
  deniedHref?: string;
  /** Show the school name under the wordmark (needs read access to the school). */
  showSchool?: boolean;
  /** Show the notification bell in the top bar. */
  bell?: boolean;
}

/**
 * Shared frame for every signed-in portal: auth guard, sidebar (wordmark, nav,
 * signed-in user), slim top bar. Each portal's layout is just a nav config.
 */
export function PortalShell({ nav, children, allowRoles, deniedHref = '/', showSchool = false, bell = false }: PortalShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [guide, setGuide] = useState<{ role: string; userId: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState('');
  const [roleLabel, setRoleLabel] = useState('');
  const [schoolName, setSchoolName] = useState('');

  useEffect(() => {
    if (!auth.getToken()) { router.push('/login'); return; }
    type Me = Awaited<ReturnType<typeof auth.me>>;
    const show = (user: Me, online: boolean) => {
      if (allowRoles && !allowRoles.includes(user.role)) { router.push(deniedHref); return; }
      const full = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      setUserName(full || user.email);
      setRoleLabel(ROLE_LABELS[user.role] || user.role.replace(/_/g, ' '));
      setReady(true);
      if (online && !user.must_change_password && user.walkthrough_done !== undefined && !user.walkthrough_done) {
        setGuide({ role: user.role, userId: String(user.id) });
      }
      if (online && showSchool && user.school_id) {
        (api.schools.get(user.school_id) as Promise<{ name: string }>)
          .then(s => setSchoolName(s?.name || ''))
          .catch(() => {});
      }
    };
    auth.me().then(user => {
      try { localStorage.setItem(LAST_USER, JSON.stringify(user)); } catch { /* optional */ }
      show(user, true);
    }).catch(err => {
      // 402 is handled in api.ts, which is already sending this user to billing or the lapsed page.
      if (err instanceof ApiError && err.status === 402) return;
      // The server said no (not signed in): go to the sign-in page. But if it simply could not be
      // reached, use the last known user so a student with a weak connection is not thrown out of an exam.
      if (!(err instanceof ApiError)) {
        try {
          const raw = localStorage.getItem(LAST_USER);
          if (raw && auth.getToken()) { show(JSON.parse(raw) as Me, false); return; }
        } catch { /* fall through */ }
      }
      router.push('/login');
    });
    // allowRoles is a static array from the layout; run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  if (!ready) return <ShellSkeleton />;

  const header = (
    <div className="hidden lg:block px-5 pt-5 pb-3 border-b border-line">
      <div className="text-lg font-semibold text-ink leading-tight">Clarriva</div>
      {schoolName && <div className="text-xs text-muted mt-0.5 truncate">{schoolName}</div>}
    </div>
  );

  const footer = (
    <div className="border-t border-line px-5 py-3 space-y-3">
      <ThemeSwitch />
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-ink truncate">{userName}</div>
          <div className="text-xs text-muted truncate">{roleLabel}</div>
        </div>
        <button
          onClick={() => { auth.logout(); router.push('/login'); }}
          className="text-xs text-muted hover:text-ink underline-offset-2 hover:underline cursor-pointer shrink-0"
        >
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="h-dvh flex overflow-hidden bg-page">
      <Sidebar sections={nav} header={header} footer={footer} />
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-12 bg-surface border-b border-line flex items-center justify-between lg:justify-end px-4 sm:px-6 shrink-0">
          <span className="lg:hidden text-base font-semibold text-ink">Clarriva</span>
          {bell && <NotificationBell />}
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">{children}</main>
      </div>
      {/* never over a running exam */}
      {guide && !pathname.endsWith('/take') && (
        <Walkthrough {...guide} onClose={() => setGuide(null)} />
      )}
    </div>
  );
}

/** Shown while the session is being checked, so the screen is never blank. */
function ShellSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="h-dvh flex bg-page">
      <div className="hidden lg:block w-58 border-r border-line bg-surface p-5 space-y-3 animate-pulse" aria-hidden="true">
        <div className="h-5 w-24 rounded bg-line" />
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-4 rounded bg-surface-2" />)}
      </div>
      <div className="flex-1 flex flex-col">
        <div className="h-12 border-b border-line bg-surface" />
        <div className="p-8 space-y-4 animate-pulse" aria-hidden="true">
          <div className="h-6 w-40 rounded bg-line" />
          <div className="h-24 rounded bg-line" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

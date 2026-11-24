'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { auth, ApiError } from '@/lib/api';
import { Sidebar, type NavSection } from '@/components/sidebar';
import { ThemeSwitch } from '@/components/theme-switch';

const LAST_ADMIN = 'console-last-admin';

type Admin = { name: string; email: string };

/**
 * Frame for the platform console. Kept separate from PortalShell on purpose: this is the
 * vendor's own tool (every school, not one), so it has its own guard, its own wordmark and
 * no school switcher.
 */
export function AdminShell({ nav, children }: { nav: NavSection[]; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [mustChange, setMustChange] = useState(false);

  useEffect(() => {
    if (!auth.getToken()) { router.replace('/admin/login'); return; }
    auth.me().then(user => {
      if (user.role !== 'super_admin') { router.replace('/dashboard'); return; }
      setMustChange(user.must_change_password === true);
      const next = {
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
        email: user.email,
      };
      setAdmin(next);
      try { localStorage.setItem(LAST_ADMIN, JSON.stringify(next)); } catch { /* optional */ }
    }).catch(err => {
      // Only a refused session ends here; a network blip keeps the cached admin signed in.
      if (err instanceof ApiError) { router.replace('/admin/login'); return; }
      try {
        const raw = localStorage.getItem(LAST_ADMIN);
        if (raw) { setAdmin(JSON.parse(raw) as Admin); return; }
      } catch { /* fall through */ }
      router.replace('/admin/login');
    });
  }, [router]);

  // An account made with a generated password sets its own before it can use the console.
  useEffect(() => {
    if (mustChange && pathname !== '/admin/account') router.replace('/admin/account');
  }, [mustChange, pathname, router]);

  if (!admin) return <ConsoleSkeleton />;

  const header = (
    <div className="hidden lg:block px-5 pt-5 pb-4 border-b border-line">
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-ink leading-tight">Clariva</span>
        <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-brand-soft text-brand">
          Console
        </span>
      </div>
      <div className="text-xs text-muted mt-0.5">Platform administration</div>
    </div>
  );

  const footer = (
    <div className="border-t border-line px-5 py-3 space-y-3">
      <ThemeSwitch />
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium text-ink truncate">{admin.name}</div>
          <div className="text-xs text-muted truncate">Super admin</div>
        </div>
        <button
          onClick={() => { auth.logout(); router.push('/admin/login'); }}
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
        <header className="h-12 bg-surface-2 border-b border-line flex items-center justify-between gap-4 px-4 sm:px-6 shrink-0">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Platform console</span>
          <span className="hidden lg:block text-xs text-muted truncate max-w-[40ch]">{admin.email}</span>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-20 lg:pb-8">{children}</main>
      </div>
    </div>
  );
}

function ConsoleSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="h-dvh flex bg-page">
      <div className="hidden lg:block w-58 border-r border-line bg-surface p-5 space-y-3 animate-pulse" aria-hidden="true">
        <div className="h-5 w-28 rounded bg-line" />
        <div className="h-3 w-20 rounded bg-surface-2" />
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-4 rounded bg-surface-2" />)}
      </div>
      <div className="flex-1 flex flex-col">
        <div className="h-12 border-b border-line bg-surface-2" />
        <div className="p-8 space-y-4 animate-pulse" aria-hidden="true">
          <div className="h-6 w-40 rounded bg-line" />
          <div className="h-24 rounded bg-line" />
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

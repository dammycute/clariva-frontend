'use client';

import { useState, useEffect, useCallback, Suspense, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { findActiveHref } from '@/lib/nav-active';

export interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

export interface NavSection {
  section: string;
  items: NavItem[];
}

interface SidebarProps {
  sections: NavSection[];
  /** Rendered at the top of the nav (wordmark, school name). */
  header?: ReactNode;
  /** Pinned to the bottom of the nav (signed-in user, sign out). */
  footer?: ReactNode;
}

function NavContent({ sections, pathname, onNavigate }: { sections: NavSection[]; pathname: string; onNavigate?: () => void }) {
  const searchParams = useSearchParams();
  const allHrefs = sections.flatMap(s => s.items.map(i => i.href));
  const activeHref = findActiveHref(allHrefs, pathname, searchParams.toString());

  return (
    <>
      {sections.map((section) => (
        <div key={section.section}>
          {section.section ? (
            <div className="text-xs font-medium text-muted px-5 pt-5 pb-1.5">
              {section.section}
            </div>
          ) : <div className="pt-3" />}
          {section.items.map((item) => {
            const isActive = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={isActive ? 'page' : undefined}
                className={`flex items-center gap-3 px-5 py-2 text-sm transition-colors relative min-h-[40px] lg:min-h-[36px] ${
                  isActive
                    ? 'bg-brand-soft text-brand font-medium before:absolute before:left-0 before:top-0 before:bottom-0 before:w-0.5 before:bg-brand'
                    : 'text-muted hover:bg-surface-2 hover:text-ink'
                }`}
              >
                <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}

export function Sidebar({ sections, header, footer }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const close = useCallback(() => setMobileOpen(false), []);

  // Close drawer on route change
  useEffect(() => { close(); }, [pathname, close]);

  // Close drawer on Escape
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, close]);

  // Lock body scroll when drawer open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [mobileOpen]);

  const navContent = (
    <Suspense fallback={null}>
      <NavContent sections={sections} pathname={pathname} onNavigate={close} />
    </Suspense>
  );

  return (
    <>
      {/* Mobile hamburger — only visible below lg */}
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={mobileOpen}
        className="lg:hidden fixed bottom-5 right-5 z-40 w-12 h-12 rounded-md bg-brand text-brand-ink shadow-md flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
      >
        <Menu size={22} />
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 lg:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <nav
        aria-label="Main navigation"
        className={`fixed top-0 left-0 bottom-0 w-64 bg-surface border-r border-line overflow-y-auto z-50 flex flex-col transform transition-transform duration-200 ease-out lg:static lg:translate-x-0 lg:w-58 lg:shrink-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Mobile close button */}
        <div className="lg:hidden flex items-center justify-between px-5 h-14 border-b border-line">
          <span className="font-semibold text-sm text-ink">Menu</span>
          <button
            type="button"
            onClick={close}
            aria-label="Close navigation menu"
            className="w-10 h-10 flex items-center justify-center rounded-md hover:bg-surface-2 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>
        {header}
        <div className="flex-1">{navContent}</div>
        {footer}
      </nav>
    </>
  );
}

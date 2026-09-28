'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import NotificationBell from '@/components/notification-bell';
import { auth } from '@/lib/api';
import { findActiveHref } from '@/lib/nav-active';

const BURSARY_NAV = [
  { label: 'Dashboard', href: '/bursary' },
  { label: 'Invoices', href: '/bursary/invoices' },
];

export default function BursaryLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ first_name: string; last_name: string; role: string } | null>(null);
  const activeHref = findActiveHref(BURSARY_NAV.map(i => i.href), pathname, '');

  useEffect(() => {
    auth.me().then(u => {
      if (u.role !== 'bursary' && u.role !== 'school_admin' && u.role !== 'super_admin') {
        router.push('/');
      } else {
        setUser(u);
      }
    }).catch(() => router.push('/'));
  }, [router]);

  const handleLogout = () => {
    auth.logout();
    router.push('/');
  };

  return (
    <div className="min-h-dvh bg-[#F7F9FC]">
      <header className="h-14 bg-white border-b border-[#DDE5F0] flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/bursary" className="font-bold text-sm text-[#0D2B55]">Bursary Portal</Link>
          <nav aria-label="Bursary navigation" className="hidden md:flex items-center gap-1">
            {BURSARY_NAV.map(item => {
              const isActive = item.href === activeHref;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    isActive
                      ? 'bg-[#E8F0FA] text-[#0D2B55]'
                      : 'hover:bg-[#F0F4FA] text-[#64748B] hover:text-[#0D2B55]'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <span className="text-xs text-[#64748B] hidden sm:inline">{user?.first_name} {user?.last_name}</span>
          <button
            onClick={handleLogout}
            aria-label="Log out"
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-[#DDE5F0] bg-white hover:bg-[#F0F4FA] cursor-pointer min-h-[36px]"
          >
            <LogOut size={14} /> Log out
          </button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-4 sm:p-6">{children}</main>
    </div>
  );
}

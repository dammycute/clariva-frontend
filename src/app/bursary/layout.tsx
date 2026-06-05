'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import NotificationBell from '@/components/notification-bell';
import { auth } from '@/lib/api';

export default function BursaryLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<{ first_name: string; last_name: string; role: string } | null>(null);

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
    <div className="min-h-screen bg-[#F7F9FC]">
      <header className="h-14 bg-white border-b border-[#DDE5F0] flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link href="/bursary" className="font-bold text-sm text-[#0D2B55]">Bursary Portal</Link>
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/bursary" className="px-3 py-1.5 text-xs rounded-lg hover:bg-[#F0F4FA] text-[#64748B] hover:text-[#0D2B55] font-medium">Dashboard</Link>
            <Link href="/dashboard/fees" className="px-3 py-1.5 text-xs rounded-lg hover:bg-[#F0F4FA] text-[#64748B] hover:text-[#0D2B55] font-medium">Invoices</Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <span className="text-xs text-[#64748B]">{user?.first_name} {user?.last_name}</span>
          <button onClick={handleLogout} className="text-xs px-3 py-1.5 rounded-lg border border-[#DDE5F0] bg-white hover:bg-[#F0F4FA]">Log out</button>
        </div>
      </header>
      <main className="max-w-5xl mx-auto p-6">{children}</main>
    </div>
  );
}

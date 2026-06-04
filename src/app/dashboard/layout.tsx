'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/api';
import { useEffect, useState } from 'react';
import NotificationBell from '@/components/notification-bell';

const NAV_ITEMS = [
  { section: 'Main', items: [
    { label: 'Dashboard', href: '/dashboard', icon: '📊' },
    { label: 'Students', href: '/dashboard/students', icon: '👥' },
    { label: 'Timetable', href: '/dashboard/timetable', icon: '📅' },
    { label: 'Attendance', href: '/dashboard/attendance', icon: '✅' },
  ]},
  { section: 'Academics', items: [
    { label: 'Grades & Reports', href: '/dashboard/grades', icon: '📝' },
    { label: 'CBT Exams', href: '/dashboard/cbt', icon: '💻', badge: 'Live' },
  ]},
  { section: 'Finance', items: [
    { label: 'Fees', href: '/dashboard/fees', icon: '💰' },
  ]},
  { section: 'Administration', items: [
    { label: 'Teachers', href: '/dashboard/teachers', icon: '👨‍🏫' },
    { label: 'Activity Log', href: '/dashboard/audit', icon: '📋' },
    { label: 'Communications', href: '/dashboard/comms', icon: '📣' },
    { label: 'Backup', href: '/dashboard/backup', icon: '💾' },
    { label: 'Settings', href: '/dashboard/settings', icon: '⚙️' },
  ]},
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [userInitials, setUserInitials] = useState('AD');

  useEffect(() => {
    if (!auth.getToken()) { router.push('/'); return; }
    auth.me().then(user => {
      if (user?.email) setUserInitials(user.email.substring(0, 2).toUpperCase());
    }).catch(() => {});
  }, [router]);

  const handleLogout = () => {
    auth.logout();
    router.push('/');
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#F7F9FC]">
      <header className="h-14 bg-white border-b border-[#DDE5F0] flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1A7A4A] rounded-lg flex items-center justify-center text-white font-bold text-sm">C</div>
            <span className="font-semibold text-base text-[#0D2B55]">Clariva</span>
          </div>
          <div className="h-4 w-px bg-[#DDE5F0]" />
          <span className="text-xs text-[#64748B]">Dashboard</span>
        </div>
        <div className="flex items-center gap-3.5">
          <NotificationBell />
          <button onClick={handleLogout}
            className="w-8 h-8 rounded-full bg-[#0D2B55] text-white text-xs font-bold flex items-center justify-center cursor-pointer hover:opacity-90"
            title="Log out">{userInitials}</button>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <nav className="w-60 bg-white border-r border-[#DDE5F0] overflow-y-auto shrink-0">
          {NAV_ITEMS.map((section) => (
            <div key={section.section}>
              <div className="text-[10px] font-bold tracking-wider text-[#64748B] uppercase px-5 pt-[18px] pb-1.5">{section.section}</div>
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-2.5 px-5 py-2 text-sm transition-colors relative ${
                      isActive
                        ? 'bg-[#E8F0FA] text-[#0D2B55] font-semibold before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-[#1A7A4A] before:rounded-r-sm'
                        : 'text-[#64748B] hover:bg-[#F0F4FA] hover:text-[#0D2B55]'
                    }`}>
                    <span className="text-base w-5.5 text-center">{item.icon}</span>
                    {item.label}
                    {item.badge && <span className="ml-auto bg-[#B91C1C] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{item.badge}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <main className="flex-1 overflow-y-auto p-6 lg:p-7">{children}</main>
      </div>
    </div>
  );
}

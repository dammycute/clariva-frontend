'use client';

import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import NotificationBell from '@/components/notification-bell';
import { Sidebar, type NavSection } from '@/components/sidebar';
import {
  LayoutDashboard, Users, School, CheckCircle2, UserCog,
  Megaphone, ClipboardList, Settings, HardDrive,
} from 'lucide-react';

const NAV_SECTIONS: NavSection[] = [
  { section: 'Main', items: [
    { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { label: 'Students', href: '/dashboard/students', icon: <Users size={18} /> },
    { label: 'Classes', href: '/dashboard/students?tab=classes', icon: <School size={18} /> },
    { label: 'Attendance', href: '/dashboard/attendance', icon: <CheckCircle2 size={18} /> },
  ]},
  { section: 'Administration', items: [
    { label: 'Staff', href: '/dashboard/teachers', icon: <UserCog size={18} /> },
    { label: 'Communications', href: '/dashboard/comms', icon: <Megaphone size={18} /> },
    { label: 'Activity Log', href: '/dashboard/audit', icon: <ClipboardList size={18} /> },
    { label: 'Settings', href: '/dashboard/settings', icon: <Settings size={18} /> },
    { label: 'Backup', href: '/dashboard/backup', icon: <HardDrive size={18} /> },
  ]},
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [userInitials, setUserInitials] = useState('AD');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!auth.getToken()) { router.push('/'); return; }
    auth.me().then(user => {
      setUserInitials(user.email ? user.email.substring(0, 2).toUpperCase() : 'AD');
      setChecking(false);
    }).catch(() => { router.push('/'); });
  }, [router]);

  if (checking) return null;

  const handleLogout = () => {
    auth.logout();
    router.push('/');
  };

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-[#F7F9FC]">
      <header className="h-14 bg-white border-b border-[#DDE5F0] flex items-center justify-between px-4 sm:px-6 shrink-0 z-10">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1A7A4A] rounded-lg flex items-center justify-center text-white font-bold text-sm" aria-hidden="true">C</div>
            <span className="font-semibold text-base text-[#0D2B55]">Clariva</span>
          </div>
          <div className="h-4 w-px bg-[#DDE5F0] hidden sm:block" />
          <span className="text-xs text-[#64748B] hidden sm:block">Dashboard</span>
        </div>
        <div className="flex items-center gap-3.5">
          <NotificationBell />
          <button
            onClick={handleLogout}
            aria-label={`Log out (signed in as ${userInitials})`}
            className="w-9 h-9 rounded-full bg-[#0D2B55] text-white text-xs font-bold flex items-center justify-center cursor-pointer hover:opacity-90 transition-opacity"
          >
            {userInitials}
          </button>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar sections={NAV_SECTIONS} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 pb-20 lg:pb-6">{children}</main>
      </div>
    </div>
  );
}

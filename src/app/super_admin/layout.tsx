'use client';

import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { Sidebar, type NavSection } from '@/components/sidebar';
import {
  LayoutDashboard, School, Users, Settings, ClipboardList,
} from 'lucide-react';

const NAV_SECTIONS: NavSection[] = [
  { section: 'System', items: [
    { label: 'Overview', href: '/super_admin', icon: <LayoutDashboard size={18} /> },
    { label: 'Schools', href: '/super_admin/schools', icon: <School size={18} /> },
    { label: 'Users', href: '/super_admin/users', icon: <Users size={18} /> },
  ]},
  { section: 'Operations', items: [
    { label: 'System Health', href: '/super_admin/system', icon: <Settings size={18} /> },
    { label: 'Audit Logs', href: '/super_admin/audit', icon: <ClipboardList size={18} /> },
  ]},
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [userInitials, setUserInitials] = useState('SA');
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!auth.getToken()) { router.push('/'); return; }
    auth.me().then(user => {
      if (user.role !== 'super_admin') { router.push('/dashboard'); return; }
      setUserInitials(user.email ? user.email.substring(0, 2).toUpperCase() : 'SA');
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
      <header className="h-14 bg-[#0D2B55] border-b border-[#1a3a6a] flex items-center justify-between px-4 sm:px-6 shrink-0 z-10">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1A7A4A] rounded-lg flex items-center justify-center text-white font-bold text-sm" aria-hidden="true">C</div>
            <span className="font-semibold text-base text-white">Clariva</span>
          </div>
          <div className="h-4 w-px bg-[#3a5a8a] hidden sm:block" />
          <span className="text-xs text-[#8aa4c8] font-medium hidden sm:block">Super Admin</span>
        </div>
        <button
          onClick={handleLogout}
          aria-label={`Log out (signed in as ${userInitials})`}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-[#1A7A4A] text-white font-bold hover:opacity-90 cursor-pointer min-h-[36px] transition-opacity"
        >
          <LogOut size={14} /> Log out
        </button>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar sections={NAV_SECTIONS} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 pb-20 lg:pb-6">{children}</main>
      </div>
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { Sidebar, type NavSection } from '@/components/sidebar';
import {
  LayoutDashboard, School, CheckCircle2, FileText, Monitor, Calendar,
} from 'lucide-react';

const NAV_SECTIONS: NavSection[] = [
  { section: 'Portal', items: [
    { label: 'Dashboard', href: '/teacher', icon: <LayoutDashboard size={18} /> },
    { label: 'My Classes', href: '/teacher/classes', icon: <School size={18} /> },
    { label: 'Attendance', href: '/teacher/attendance', icon: <CheckCircle2 size={18} /> },
    { label: 'Grades', href: '/teacher/grades', icon: <FileText size={18} /> },
    { label: 'CBT Exams', href: '/teacher/cbt', icon: <Monitor size={18} /> },
    { label: 'Timetable', href: '/teacher/timetable', icon: <Calendar size={18} /> },
  ]},
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!auth.getToken()) { router.push('/'); return; }
    auth.me().then(() => setChecking(false)).catch(() => {});
  }, [router]);

  if (checking) return null;

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-[#F7F9FC]">
      <header className="h-14 bg-white border-b border-[#DDE5F0] flex items-center justify-between px-4 sm:px-6 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#0D2B55] rounded-lg flex items-center justify-center text-white font-bold text-xs" aria-hidden="true">T</div>
          <span className="font-semibold text-sm text-[#0D2B55]">Teacher Portal</span>
          <span className="text-[11px] bg-[#E8F0FA] text-[#0D2B55] px-2 py-0.5 rounded-full font-bold hidden sm:inline-block">Teacher</span>
        </div>
        <button
          onClick={() => { auth.logout(); router.push('/'); }}
          aria-label="Log out"
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-[#DDE5F0] bg-white hover:bg-[#F0F4FA] cursor-pointer min-h-[36px]"
        >
          <LogOut size={14} /> Log out
        </button>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <Sidebar sections={NAV_SECTIONS} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 pb-20 lg:pb-6">{children}</main>
      </div>
    </div>
  );
}

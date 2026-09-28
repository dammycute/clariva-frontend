'use client';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/api';
import { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import { Sidebar, type NavSection } from '@/components/sidebar';
import {
  LayoutDashboard, School, BookOpen, Calendar, CheckCircle2,
  FileText, FileSignature, Monitor, Users, Megaphone, ClipboardList,
} from 'lucide-react';

const NAV_SECTIONS: NavSection[] = [
  { section: 'Main', items: [
    { label: 'Dashboard', href: '/principal', icon: <LayoutDashboard size={18} /> },
    { label: 'Classes', href: '/principal/classes', icon: <School size={18} /> },
    { label: 'Subjects', href: '/principal/subjects', icon: <BookOpen size={18} /> },
    { label: 'Timetable', href: '/principal/timetable', icon: <Calendar size={18} /> },
    { label: 'Attendance', href: '/principal/attendance', icon: <CheckCircle2 size={18} /> },
  ]},
  { section: 'Academics', items: [
    { label: 'Grades', href: '/principal/grades', icon: <FileText size={18} /> },
    { label: 'Report Cards', href: '/principal/reports', icon: <FileSignature size={18} /> },
    { label: 'CBT Exams', href: '/principal/cbt', icon: <Monitor size={18} /> },
  ]},
  { section: 'Administration', items: [
    { label: 'Teachers', href: '/principal/teachers', icon: <Users size={18} /> },
    { label: 'Communications', href: '/principal/comms', icon: <Megaphone size={18} /> },
    { label: 'Activity Log', href: '/principal/audit', icon: <ClipboardList size={18} /> },
  ]},
];

export default function PrincipalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!auth.getToken()) { router.push('/'); return; }
    auth.me().then(() => setChecking(false)).catch(() => { router.push('/'); });
  }, [router]);

  if (checking) return null;

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-[#F7F9FC]">
      <header className="h-14 bg-[#4C1D95] border-b border-[#6D28D9] flex items-center justify-between px-4 sm:px-6 shrink-0 z-10">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#FBBF24] rounded-lg flex items-center justify-center text-[#4C1D95] font-bold text-sm" aria-hidden="true">P</div>
            <span className="font-semibold text-base text-white">Principal Portal</span>
          </div>
          <div className="h-4 w-px bg-[#6D28D9] hidden sm:block" />
          <span className="text-xs text-[#C4B5FD] hidden sm:block">Academic Oversight</span>
        </div>
        <button
          onClick={() => { auth.logout(); router.push('/'); }}
          aria-label="Log out"
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-white/10 text-white hover:bg-white/20 cursor-pointer min-h-[36px]"
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

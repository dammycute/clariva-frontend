'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/api';
import { useEffect, useState } from 'react';

const NAV = [
  { label: 'Dashboard', href: '/teacher', icon: '📊' },
  { label: 'My Classes', href: '/teacher/classes', icon: '🏫' },
  { label: 'Attendance', href: '/teacher/attendance', icon: '✅' },
  { label: 'Grades', href: '/teacher/grades', icon: '📝' },
  { label: 'CBT Exams', href: '/teacher/cbt', icon: '💻' },
  { label: 'Timetable', href: '/teacher/timetable', icon: '📅' },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState('Teacher');

  useEffect(() => {
    if (!auth.getToken()) { router.push('/'); return; }
    auth.me().then(user => {
      if (user.role !== 'teacher') { router.push('/'); return; }
      setName(user.first_name || user.email);
    }).catch(() => {});
  }, [router]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#F7F9FC]">
      <header className="h-14 bg-white border-b border-[#DDE5F0] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#0D2B55] rounded-lg flex items-center justify-center text-white font-bold text-xs">T</div>
          <span className="font-semibold text-sm text-[#0D2B55]">Teacher Portal</span>
          <span className="text-[10px] bg-[#E8F0FA] text-[#0D2B55] px-2 py-0.5 rounded-full font-bold">Teacher</span>
        </div>
        <button onClick={() => { auth.logout(); router.push('/'); }}
          className="text-xs px-3 py-1.5 rounded-lg border border-[#DDE5F0] bg-white hover:bg-[#F0F4FA]">Log out</button>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <nav className="w-52 bg-white border-r border-[#DDE5F0] overflow-y-auto shrink-0 p-3 space-y-1">
          {NAV.map(item => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-2.5 px-3.5 py-2 text-sm rounded-xl transition-colors ${
                  isActive ? 'bg-[#0D2B55] text-white font-semibold' : 'text-[#64748B] hover:bg-[#F0F4FA] hover:text-[#0D2B55]'
                }`}>
                <span>{item.icon}</span> {item.label}
              </Link>
            );
          })}
        </nav>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

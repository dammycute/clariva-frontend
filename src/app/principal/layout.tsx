'use client';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/api';
import { useEffect } from 'react';

const NAV_ITEMS = [
  { section: 'Main', items: [
    { label: 'Dashboard', href: '/principal', icon: '📊' },
    { label: 'Classes', href: '/principal/classes', icon: '🏫' },
    { label: 'Subjects', href: '/principal/subjects', icon: '📚' },
    { label: 'Timetable', href: '/principal/timetable', icon: '📅' },
    { label: 'Attendance', href: '/principal/attendance', icon: '✅' },
  ]},
  { section: 'Academics', items: [
    { label: 'Grades', href: '/principal/grades', icon: '📝' },
    { label: 'Report Cards', href: '/principal/reports', icon: '📄' },
    { label: 'CBT Exams', href: '/principal/cbt', icon: '💻' },
  ]},
  { section: 'Administration', items: [
    { label: 'Teachers', href: '/principal/teachers', icon: '👨‍🏫' },
    { label: 'Communications', href: '/principal/comms', icon: '📣' },
    { label: 'Activity Log', href: '/principal/audit', icon: '📋' },
  ]},
];

export default function PrincipalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (!auth.getToken()) { router.push('/'); return; }
    auth.me().then(user => {
      if (user.role !== 'principal' && user.role !== 'school_admin' && user.role !== 'super_admin') {
        router.push('/');
        return;
      }
    }).catch(() => { router.push('/'); });
  }, [router]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#F7F9FC]">
      <header className="h-14 bg-[#4C1D95] border-b border-[#6D28D9] flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#FBBF24] rounded-lg flex items-center justify-center text-[#4C1D95] font-bold text-sm">P</div>
            <span className="font-semibold text-base text-white">Principal Portal</span>
          </div>
          <div className="h-4 w-px bg-[#6D28D9]" />
          <span className="text-xs text-[#C4B5FD]">Academic Oversight</span>
        </div>
        <div className="flex items-center gap-3.5">
          <button onClick={() => { auth.logout(); router.push('/'); }}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20">Log out</button>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <nav className="w-60 bg-[#1E1B4B] border-r border-[#312E81] overflow-y-auto shrink-0">
          {NAV_ITEMS.map((section) => (
            <div key={section.section}>
              <div className="text-[10px] font-bold tracking-wider text-[#A5B4FC] uppercase px-5 pt-[18px] pb-1.5">{section.section}</div>
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-2.5 px-5 py-2 text-sm transition-colors relative ${
                      isActive
                        ? 'bg-[#312E81] text-white font-semibold before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-[#FBBF24] before:rounded-r-sm'
                        : 'text-[#A5B4FC] hover:bg-[#312E81] hover:text-white'
                    }`}>
                    <span className="text-base w-5.5 text-center">{item.icon}</span>
                    {item.label}
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

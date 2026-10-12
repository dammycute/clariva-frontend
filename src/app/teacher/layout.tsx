'use client';

import { PortalShell } from '@/components/portal-shell';
import type { NavSection } from '@/components/sidebar';
import { LayoutDashboard, School, CheckCircle2, FileText, MonitorCheck, Calendar } from 'lucide-react';

const icon = { size: 16, strokeWidth: 1.75 } as const;

const NAV: NavSection[] = [
  { section: '', items: [
    { label: 'Dashboard', href: '/teacher', icon: <LayoutDashboard {...icon} /> },
  ]},
  { section: 'Teaching', items: [
    { label: 'My classes', href: '/teacher/classes', icon: <School {...icon} /> },
    { label: 'Attendance', href: '/teacher/attendance', icon: <CheckCircle2 {...icon} /> },
    { label: 'Grades', href: '/teacher/grades', icon: <FileText {...icon} /> },
    { label: 'CBT exams', href: '/teacher/cbt', icon: <MonitorCheck {...icon} /> },
    { label: 'Timetable', href: '/teacher/timetable', icon: <Calendar {...icon} /> },
  ]},
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell nav={NAV}>{children}</PortalShell>;
}

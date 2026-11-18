'use client';

import { PortalShell } from '@/components/portal-shell';
import type { NavSection } from '@/components/sidebar';
import { LayoutDashboard, FileText, CheckCircle2, Calendar, MonitorCheck } from 'lucide-react';

const icon = { size: 16, strokeWidth: 1.75 } as const;

const NAV: NavSection[] = [
  { section: '', items: [
    { label: 'Dashboard', href: '/student', icon: <LayoutDashboard {...icon} /> },
  ]},
  { section: 'School', items: [
    { label: 'My grades', href: '/student/grades', icon: <FileText {...icon} /> },
    { label: 'Attendance', href: '/student/attendance', icon: <CheckCircle2 {...icon} /> },
    { label: 'Timetable', href: '/student/timetable', icon: <Calendar {...icon} /> },
    { label: 'CBT exams', href: '/student/exams', icon: <MonitorCheck {...icon} /> },
  ]},
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell nav={NAV}>{children}</PortalShell>;
}

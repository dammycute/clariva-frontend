'use client';

import { PortalShell } from '@/components/portal-shell';
import type { NavSection } from '@/components/sidebar';
import {
  LayoutDashboard, Users, School, CheckCircle2, UserCog, FileText, Calendar,
  MonitorCheck, Banknote, Megaphone, ClipboardList, Settings, HardDrive,
} from 'lucide-react';

const icon = { size: 16, strokeWidth: 1.75 } as const;

const NAV: NavSection[] = [
  { section: '', items: [
    { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard {...icon} /> },
  ]},
  { section: 'Academics', items: [
    { label: 'Students', href: '/dashboard/students', icon: <Users {...icon} /> },
    { label: 'Classes', href: '/dashboard/students?tab=classes', icon: <School {...icon} /> },
    { label: 'Attendance', href: '/dashboard/attendance', icon: <CheckCircle2 {...icon} /> },
    { label: 'Grades', href: '/dashboard/grades', icon: <FileText {...icon} /> },
    { label: 'Timetable', href: '/dashboard/timetable', icon: <Calendar {...icon} /> },
    { label: 'CBT exams', href: '/dashboard/cbt', icon: <MonitorCheck {...icon} /> },
  ]},
  { section: 'Finance', items: [
    { label: 'Fees', href: '/dashboard/fees', icon: <Banknote {...icon} /> },
  ]},
  { section: 'School', items: [
    { label: 'Staff', href: '/dashboard/teachers', icon: <UserCog {...icon} /> },
    { label: 'Communications', href: '/dashboard/comms', icon: <Megaphone {...icon} /> },
  ]},
  { section: 'Admin', items: [
    { label: 'Activity log', href: '/dashboard/audit', icon: <ClipboardList {...icon} /> },
    { label: 'Settings', href: '/dashboard/settings', icon: <Settings {...icon} /> },
    { label: 'Backup', href: '/dashboard/backup', icon: <HardDrive {...icon} /> },
  ]},
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell nav={NAV} showSchool bell>{children}</PortalShell>;
}

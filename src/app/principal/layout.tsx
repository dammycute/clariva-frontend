'use client';

import { PortalShell } from '@/components/portal-shell';
import type { NavSection } from '@/components/sidebar';
import {
  LayoutDashboard, School, BookOpen, Calendar, CheckCircle2,
  FileText, FileSignature, MonitorCheck, Users, Megaphone, ClipboardList,
} from 'lucide-react';

const icon = { size: 16, strokeWidth: 1.75 } as const;

const NAV: NavSection[] = [
  { section: '', items: [
    { label: 'Dashboard', href: '/principal', icon: <LayoutDashboard {...icon} /> },
  ]},
  { section: 'School', items: [
    { label: 'Classes', href: '/principal/classes', icon: <School {...icon} /> },
    { label: 'Subjects', href: '/principal/subjects', icon: <BookOpen {...icon} /> },
    { label: 'Timetable', href: '/principal/timetable', icon: <Calendar {...icon} /> },
    { label: 'Attendance', href: '/principal/attendance', icon: <CheckCircle2 {...icon} /> },
  ]},
  { section: 'Academics', items: [
    { label: 'Grades', href: '/principal/grades', icon: <FileText {...icon} /> },
    { label: 'Report cards', href: '/principal/reports', icon: <FileSignature {...icon} /> },
    { label: 'CBT exams', href: '/principal/cbt', icon: <MonitorCheck {...icon} /> },
  ]},
  { section: 'Administration', items: [
    { label: 'Teachers', href: '/principal/teachers', icon: <Users {...icon} /> },
    { label: 'Communications', href: '/principal/comms', icon: <Megaphone {...icon} /> },
    { label: 'Activity log', href: '/principal/audit', icon: <ClipboardList {...icon} /> },
  ]},
];

export default function PrincipalLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell nav={NAV} showSchool>{children}</PortalShell>;
}

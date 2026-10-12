'use client';

import { PortalShell } from '@/components/portal-shell';
import type { NavSection } from '@/components/sidebar';
import { LayoutDashboard, School, Users, Activity, ClipboardList } from 'lucide-react';

const icon = { size: 16, strokeWidth: 1.75 } as const;

const NAV: NavSection[] = [
  { section: '', items: [
    { label: 'Overview', href: '/super_admin', icon: <LayoutDashboard {...icon} /> },
  ]},
  { section: 'System', items: [
    { label: 'Schools', href: '/super_admin/schools', icon: <School {...icon} /> },
    { label: 'Users', href: '/super_admin/users', icon: <Users {...icon} /> },
  ]},
  { section: 'Operations', items: [
    { label: 'System health', href: '/super_admin/system', icon: <Activity {...icon} /> },
    { label: 'Audit logs', href: '/super_admin/audit', icon: <ClipboardList {...icon} /> },
  ]},
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell nav={NAV} allowRoles={['super_admin']} deniedHref="/dashboard">{children}</PortalShell>;
}

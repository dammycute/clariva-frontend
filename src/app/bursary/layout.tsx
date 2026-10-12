'use client';

import { PortalShell } from '@/components/portal-shell';
import type { NavSection } from '@/components/sidebar';
import { LayoutDashboard, Receipt } from 'lucide-react';

const icon = { size: 16, strokeWidth: 1.75 } as const;

const NAV: NavSection[] = [
  { section: '', items: [
    { label: 'Dashboard', href: '/bursary', icon: <LayoutDashboard {...icon} /> },
    { label: 'Invoices', href: '/bursary/invoices', icon: <Receipt {...icon} /> },
  ]},
];

const ALLOWED = ['bursary', 'school_admin', 'super_admin'];

export default function BursaryLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell nav={NAV} allowRoles={ALLOWED} showSchool bell>{children}</PortalShell>;
}

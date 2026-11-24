'use client';

import { usePathname } from 'next/navigation';
import { AdminShell } from '@/components/admin-shell';
import type { NavSection } from '@/components/sidebar';
import {
  LayoutDashboard, School, Inbox, Users, ClipboardList, Wrench, CreditCard, CalendarClock, KeyRound,
} from 'lucide-react';

const icon = { size: 16, strokeWidth: 1.75 } as const;

const NAV: NavSection[] = [
  { section: '', items: [
    { label: 'Overview', href: '/admin', icon: <LayoutDashboard {...icon} /> },
  ]},
  { section: 'Customers', items: [
    { label: 'Schools', href: '/admin/schools', icon: <School {...icon} /> },
    { label: 'Demo requests', href: '/admin/leads', icon: <Inbox {...icon} /> },
    { label: 'Users', href: '/admin/users', icon: <Users {...icon} /> },
  ]},
  { section: 'Billing', items: [
    { label: 'Payments', href: '/admin/billing', icon: <CreditCard {...icon} /> },
    { label: 'Term calendars', href: '/admin/calendars', icon: <CalendarClock {...icon} /> },
  ]},
  { section: 'Operations', items: [
    { label: 'Activity log', href: '/admin/audit', icon: <ClipboardList {...icon} /> },
    { label: 'Maintenance', href: '/admin/system', icon: <Wrench {...icon} /> },
    { label: 'My account', href: '/admin/account', icon: <KeyRound {...icon} /> },
  ]},
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  // The console sign-in page lives under /admin but is not part of the console frame.
  if (pathname === '/admin/login') return <>{children}</>;
  return <AdminShell nav={NAV}>{children}</AdminShell>;
}

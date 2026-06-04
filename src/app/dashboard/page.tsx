'use client';

import { useState, useEffect } from 'react';
import { api, auth } from '@/lib/api';
import { CardSkeleton } from '@/components/skeleton';
import Link from 'next/link';

export default function DashboardHome() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string[]>([]);
  const [stats, setStats] = useState({
    students: 0, staff: 0, classes: 0, subjects: 0,
    outstanding: 0, totalFees: 0, collected: 0,
    present: 0, totalAttendance: 0,
  });
  const [recentStudents, setRecentStudents] = useState<{ id: string; full_name: string; admission_no: string; class_name?: string; status: string }[]>([]);
  const [school, setSchool] = useState<{ name: string; current_term: string; current_academic_year: string } | null>(null);

  useEffect(() => {
    (async () => {
      const errors: string[] = [];
      try {
        const [s, st, c, inv, sub, att] = await Promise.all([
          api.students.list({ status: 'active' }),
          api.staff.list(),
          api.classes.list(),
          api.feeInvoices.list(),
          api.subjects.list(),
          api.attendance.list(),
        ]);
        const studentsArr = Array.isArray(s) ? s as Array<{ id: string; full_name: string; admission_no: string; class_name?: string; status: string }> : [];
        const invoicesArr = Array.isArray(inv) ? inv as Array<{ amount_due: string | number; amount_paid: string | number }> : [];
        const attendanceArr = Array.isArray(att) ? att as Array<{ status: string }> : [];

        const outstanding = invoicesArr.reduce((a, i) => a + (Number(i.amount_due) - Number(i.amount_paid)), 0);
        const totalFees = invoicesArr.reduce((a, i) => a + Number(i.amount_due), 0);
        const paid = invoicesArr.reduce((a, i) => a + Number(i.amount_paid), 0);
        const present = attendanceArr.filter(a => a.status === 'present').length;

        setStats({
          students: studentsArr.length,
          staff: Array.isArray(st) ? st.length : 0,
          classes: Array.isArray(c) ? c.length : 0,
          subjects: Array.isArray(sub) ? sub.length : 0,
          outstanding,
          totalFees,
          collected: paid,
          present,
          totalAttendance: attendanceArr.length,
        });
        setRecentStudents(studentsArr.slice(0, 5));
        setLoaded(true);
      } catch (err) {
        errors.push(err instanceof Error ? err.message : 'Failed to load dashboard data');
        setError(errors);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const me = await auth.me();
        if (me?.school_id) {
          const s = await api.schools.get(me.school_id) as { name: string; current_term: string; current_academic_year: string };
          setSchool(s);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const attRate = stats.totalAttendance > 0 ? Math.round((stats.present / stats.totalAttendance) * 100) : 0;
  const collRate = stats.totalFees > 0 ? Math.round((stats.collected / stats.totalFees) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0D2B55]">{school?.name || 'Dashboard'}</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            {school?.current_term || '—'} · {school?.current_academic_year || '—'}
            {' · '}{new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      {!loaded ? <CardSkeleton count={4} /> : (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Students" value={error.length > 0 && stats.students === 0 ? '—' : stats.students} color="#0D2B55" bg="#E8F0FA" icon={error.length > 0 && stats.students === 0 ? '⚠️' : '👥'} href="/dashboard/students" />
        <MetricCard label="Staff" value={error.length > 0 && stats.staff === 0 ? '—' : stats.staff} color="#1A7A4A" bg="#DCFCE7" icon={error.length > 0 && stats.staff === 0 ? '⚠️' : '👨‍🏫'} href="/dashboard/teachers" />
        <MetricCard label="Classes" value={error.length > 0 && stats.classes === 0 ? '—' : stats.classes} color="#D4930A" bg="#FEF3C7" icon={error.length > 0 && stats.classes === 0 ? '⚠️' : '🏫'} href="/dashboard/students" />
        <MetricCard label="Subjects" value={error.length > 0 && stats.subjects === 0 ? '—' : stats.subjects} color="#7C3AED" bg="#F3E8FF" icon={error.length > 0 && stats.subjects === 0 ? '⚠️' : '📚'} href="/dashboard/grades" />
      </div>
      )}

      {/* Progress Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-[#0D2B55]">Attendance Rate</h3>
            <span className="text-xs text-[#64748B]">{stats.present}/{stats.totalAttendance}</span>
          </div>
          <div className="h-2.5 bg-[#F0F4FA] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${attRate}%`, background: attRate >= 75 ? '#1A7A4A' : attRate >= 50 ? '#D4930A' : '#B91C1C' }} />
          </div>
          <p className={`text-[11px] font-bold mt-1.5 ${attRate >= 75 ? 'text-[#1A7A4A]' : 'text-[#B91C1C]'}`}>{attRate}% present</p>
        </div>

        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-[#0D2B55]">Fee Collection</h3>
            <span className="text-xs text-[#64748B]">₦{stats.collected.toLocaleString()} / ₦{stats.totalFees.toLocaleString()}</span>
          </div>
          <div className="h-2.5 bg-[#F0F4FA] rounded-full overflow-hidden">
            <div className="h-full bg-[#1A7A4A] rounded-full transition-all duration-700" style={{ width: `${collRate}%` }} />
          </div>
          <p className="text-[11px] font-bold mt-1.5 text-[#1A7A4A]">{collRate}% collected</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Admissions */}
        <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#DDE5F0] flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#0D2B55]">Recent Admissions</h3>
            <Link href="/dashboard/students" className="text-[11px] text-[#1A7A4A] hover:underline">View all</Link>
          </div>
          {recentStudents.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#64748B]">No students yet.</div>
          ) : (
            <div className="divide-y divide-[#DDE5F0]">
              {recentStudents.map(s => (
                <div key={s.id} className="px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-[#0D2B55]">{s.full_name}</p>
                    <p className="text-[10px] text-[#64748B]">{s.admission_no} · {s.class_name || '—'}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    s.status === 'active' ? 'bg-[#DCFCE7] text-[#1A7A4A]' : 'bg-[#FEE2E2] text-[#B91C1C]'
                  }`}>{s.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#DDE5F0]">
            <h3 className="text-sm font-bold text-[#0D2B55]">Quick Actions</h3>
          </div>
          <div className="p-4 grid grid-cols-2 gap-2">
            {[
              { label: 'Mark Attendance', href: '/dashboard/attendance', icon: '✅' },
              { label: 'Enter Grades', href: '/dashboard/grades', icon: '📝' },
              { label: 'Record Payment', href: '/dashboard/fees', icon: '💰' },
              { label: 'Generate Reports', href: '/dashboard/grades', icon: '📄' },
              { label: 'Add Student', href: '/dashboard/students', icon: '👤' },
              { label: 'View Timetable', href: '/dashboard/timetable', icon: '📅' },
            ].map(a => (
              <Link key={a.href} href={a.href}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-[#DDE5F0] text-xs text-[#0D2B55] hover:bg-[#F0F4FA] transition-colors">
                <span>{a.icon}</span> {a.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, color, bg, icon, href }: {
  label: string; value: number | string; color: string; bg: string; icon: string; href: string;
}) {
  return (
    <Link href={href} className="bg-white border border-[#DDE5F0] rounded-xl px-4 py-3.5 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">{label}</p>
        <span className="text-base">{icon}</span>
      </div>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
    </Link>
  );
}

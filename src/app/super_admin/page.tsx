'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { request } from '@/lib/api';

interface SystemStats {
  total_schools: number;
  active_schools: number;
  suspended_schools: number;
  total_students: number;
  active_students: number;
  total_staff: number;
  total_classes: number;
  total_subjects: number;
  fees: { total_due: number; total_paid: number; outstanding: number };
  attendance: { total: number; present: number; rate: number };
  recent_schools: {
    id: string; name: string; subdomain: string; status: string;
    plan: string; current_academic_year: string; created_at: string; student_count: number;
  }[];
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await request<SystemStats>('GET', '/schools/system-stats/');
        setStats(data);
      } catch { /* empty */ }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="space-y-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-white rounded-xl animate-pulse" />)}</div>;

  if (!stats) return <div className="text-sm text-[#64748B]">Failed to load system stats.</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0D2B55]">System Overview</h1>
        <p className="text-xs text-[#64748B] mt-0.5">
          Cross-school metrics · {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Schools" value={stats.total_schools} sub={`${stats.active_schools} active`} color="#0D2B55" icon="🏫" />
        <MetricCard label="Students" value={stats.total_students} sub={`${stats.active_students} active`} color="#1A7A4A" icon="👥" />
        <MetricCard label="Staff" value={stats.total_staff} color="#7C3AED" icon="👨‍🏫" />
        <MetricCard label="Revenue" value={`₦${stats.fees.total_paid.toLocaleString()}`} sub={`${stats.fees.outstanding > 0 ? `₦${stats.fees.outstanding.toLocaleString()} outstanding` : 'Fully collected'}`} color="#D4930A" icon="💰" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Classes" value={stats.total_classes} color="#0D2B55" icon="🏫" />
        <MetricCard label="Subjects" value={stats.total_subjects} color="#7C3AED" icon="📚" />
        <MetricCard label="Attendance" value={`${stats.attendance.rate}%`} sub={`${stats.attendance.present}/${stats.attendance.total}`} color="#1A7A4A" icon="✅" />
        <MetricCard label="Suspended" value={stats.suspended_schools} color="#B91C1C" icon="⚠️" />
      </div>

      <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#DDE5F0] flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#0D2B55]">Recent Schools</h3>
          <Link href="/super_admin/schools" className="text-[11px] text-[#1A7A4A] hover:underline">View all</Link>
        </div>
        {stats.recent_schools.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#64748B]">No schools yet.</div>
        ) : (
          <div className="divide-y divide-[#DDE5F0]">
            {stats.recent_schools.map(s => (
              <div key={s.id} className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-[#0D2B55]">{s.name}</p>
                  <p className="text-[10px] text-[#64748B]">{s.subdomain}.clariva.ng · {s.plan} · {s.student_count} students</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  s.status === 'active' ? 'bg-[#DCFCE7] text-[#1A7A4A]' : 'bg-[#FEE2E2] text-[#B91C1C]'
                }`}>{s.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub, color, icon }: {
  label: string; value: number | string; sub?: string; color: string; icon: string;
}) {
  return (
    <div className="bg-white border border-[#DDE5F0] rounded-xl px-4 py-3.5">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">{label}</p>
        <span className="text-base">{icon}</span>
      </div>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-[10px] text-[#64748B] mt-0.5">{sub}</p>}
    </div>
  );
}

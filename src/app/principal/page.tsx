'use client';
import { useState, useEffect } from 'react';
import { api, auth } from '@/lib/api';
import Link from 'next/link';

export default function PrincipalDashboard() {
  const [stats, setStats] = useState({ students: 0, staff: 0, classes: 0, subjects: 0, examSessions: 0, avgScore: 0 });
  const [school, setSchool] = useState<{ name: string; current_term: string; current_academic_year: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const me = await auth.me();
        if (!me?.school_id) { setLoading(false); return; }
        const [analysis, s] = await Promise.all([
          api.analytics.get(me.school_id),
          api.schools.get(me.school_id) as Promise<{ name: string; current_term: string; current_academic_year: string }>,
        ]);
        setSchool(s);
        setStats({
          students: analysis.students, staff: analysis.staff, classes: analysis.classes, subjects: analysis.subjects,
          examSessions: analysis.exams.submitted, avgScore: analysis.exams.avg_score,
        });
      } catch { /* */ }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1E1B4B]">{school?.name || 'Principal Dashboard'}</h1>
      <p className="text-xs text-[#64748B] mt-0.5 mb-5">{school?.current_term || '—'} · {school?.current_academic_year || '—'}</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Students', value: stats.students, color: '#4C1D95', bg: '#EDE9FE', icon: '👥', href: '/principal/classes' },
          { label: 'Staff', value: stats.staff, color: '#1A7A4A', bg: '#DCFCE7', icon: '👨‍🏫', href: '/principal/teachers' },
          { label: 'Classes', value: stats.classes, color: '#D4930A', bg: '#FEF3C7', icon: '🏫', href: '/principal/classes' },
          { label: 'Subjects', value: stats.subjects, color: '#6D28D9', bg: '#EDE9FE', icon: '📚', href: '/principal/subjects' },
        ].map(m => (
          <Link key={m.label} href={m.href} className="bg-white border border-[#DDE5F0] rounded-xl px-4 py-3.5 hover:shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">{m.label}</p>
              <span className="text-base">{m.icon}</span>
            </div>
            <p className="text-xl font-bold" style={{ color: m.color }}>{loading ? '…' : m.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Link href="/principal/grades" className="bg-white border border-[#DDE5F0] rounded-xl p-4 hover:shadow-sm">
          <h3 className="text-sm font-bold text-[#1E1B4B] mb-1">📝 Grade Approval</h3>
          <p className="text-xs text-[#64748B]">Review, approve, or reject teacher-submitted grades</p>
        </Link>
        <Link href="/principal/reports" className="bg-white border border-[#DDE5F0] rounded-xl p-4 hover:shadow-sm">
          <h3 className="text-sm font-bold text-[#1E1B4B] mb-1">📄 Report Cards</h3>
          <p className="text-xs text-[#64748B]">Generate termly report cards and release to guardians</p>
        </Link>
        <Link href="/principal/cbt" className="bg-white border border-[#DDE5F0] rounded-xl p-4 hover:shadow-sm">
          <h3 className="text-sm font-bold text-[#1E1B4B] mb-1">💻 CBT Exams</h3>
          <p className="text-xs text-[#64748B]">Overview of all computer-based tests</p>
        </Link>
        <Link href="/principal/timetable" className="bg-white border border-[#DDE5F0] rounded-xl p-4 hover:shadow-sm">
          <h3 className="text-sm font-bold text-[#1E1B4B] mb-1">📅 Timetable</h3>
          <p className="text-xs text-[#64748B]">Manage class schedules and period settings</p>
        </Link>
      </div>
    </div>
  );
}

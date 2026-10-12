'use client';
import { useState, useEffect } from 'react';
import { api, auth } from '@/lib/api';
import Link from 'next/link';
import { Users, User, School, BookOpen, Pencil, FileText, Monitor, Calendar } from 'lucide-react';

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
      <h1 className="text-2xl font-semibold text-ink">{school?.name || 'Principal Dashboard'}</h1>
      <p className="text-xs text-muted mt-0.5 mb-5">{school?.current_term || '-'} · {school?.current_academic_year || '-'}</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Students', value: stats.students, color: '#4C1D95', bg: '#EDE9FE', icon: <Users size={16} aria-hidden="true" />, href: '/principal/classes' },
          { label: 'Staff', value: stats.staff, color: '#1A7A4A', bg: '#DCFCE7', icon: <User size={16} aria-hidden="true" />, href: '/principal/teachers' },
          { label: 'Classes', value: stats.classes, color: '#D4930A', bg: '#FEF3C7', icon: <School size={16} aria-hidden="true" />, href: '/principal/classes' },
          { label: 'Subjects', value: stats.subjects, color: '#6D28D9', bg: '#EDE9FE', icon: <BookOpen size={16} aria-hidden="true" />, href: '/principal/subjects' },
        ].map(m => (
          <Link key={m.label} href={m.href} className="bg-surface border border-line rounded px-4 py-3.5">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold text-muted">{m.label}</p>
              <span className="inline-flex items-center">{m.icon}</span>
            </div>
            <p className="text-xl font-semibold" style={{ color: m.color }}>{loading ? '…' : m.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Link href="/principal/grades" className="bg-surface border border-line rounded p-4">
          <h3 className="text-sm font-semibold text-ink mb-1 inline-flex items-center gap-1.5"><Pencil size={16} aria-hidden="true" /> Grade Approval</h3>
          <p className="text-xs text-muted">Review, approve, or reject teacher-submitted grades</p>
        </Link>
        <Link href="/principal/reports" className="bg-surface border border-line rounded p-4">
          <h3 className="text-sm font-semibold text-ink mb-1 inline-flex items-center gap-1.5"><FileText size={16} aria-hidden="true" /> Report Cards</h3>
          <p className="text-xs text-muted">Generate termly report cards and release to guardians</p>
        </Link>
        <Link href="/principal/cbt" className="bg-surface border border-line rounded p-4">
          <h3 className="text-sm font-semibold text-ink mb-1 inline-flex items-center gap-1.5"><Monitor size={16} aria-hidden="true" /> CBT Exams</h3>
          <p className="text-xs text-muted">Overview of all computer-based tests</p>
        </Link>
        <Link href="/principal/timetable" className="bg-surface border border-line rounded p-4">
          <h3 className="text-sm font-semibold text-ink mb-1 inline-flex items-center gap-1.5"><Calendar size={16} aria-hidden="true" /> Timetable</h3>
          <p className="text-xs text-muted">Manage class schedules and period settings</p>
        </Link>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { api, auth } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Pencil, Calendar, School } from 'lucide-react';

export default function TeacherDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ classes: 0, students: 0, subjects: 0, examSessions: 0, avgScore: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auth.me().then(user => {
      if (user.role !== 'teacher') { router.push('/'); return; }
    }).catch(() => router.push('/'));

    (async () => {
      try {
        const cls = await api.classes.list({ teacher_id: 'me' });
        const classIds = (Array.isArray(cls) ? cls : []).map(c => c.id).filter(Boolean);
        const stuPerClass = await Promise.all(
          classIds.map(id => api.students.list({ class_id: String(id) }))
        );
        const uniqueStudentIds = new Set(stuPerClass.flat().map(s => (s as Record<string, unknown>).id));
        const sub = await api.subjects.list({ teacher_id: 'me' });
        setStats({
          classes: classIds.length,
          students: uniqueStudentIds.size,
          subjects: Array.isArray(sub) ? sub.length : 0,
          examSessions: 0,
          avgScore: 0,
        });

        try {
          const sessions = await api.examSessions.list() as Array<{ score: number; total_marks: number }>;
          if (Array.isArray(sessions)) {
            const total = sessions.reduce((a, s) => a + (s.score || 0), 0);
            setStats(prev => ({
              ...prev,
              examSessions: sessions.length,
              avgScore: sessions.length > 0 ? Math.round((total / sessions.length) * 100) / 100 : 0,
            }));
          }
        } catch { /* */ }
      } catch { /* */ }
      finally { setLoading(false); }
    })();
  }, [router]);

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink mb-1">Teacher Dashboard</h1>
      <p className="text-xs text-muted mb-5">Welcome back! Here&apos;s your overview.</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-surface border border-line rounded p-4">
          <p className="text-xs font-semibold text-muted">My Classes</p>
          <p className="text-2xl font-semibold text-ink">{loading ? '…' : stats.classes}</p>
        </div>
        <div className="bg-surface border border-line rounded p-4">
          <p className="text-xs font-semibold text-muted">My Students</p>
          <p className="text-2xl font-semibold text-ink">{loading ? '…' : stats.students}</p>
        </div>
        <div className="bg-surface border border-line rounded p-4">
          <p className="text-xs font-semibold text-muted">My Subjects</p>
          <p className="text-2xl font-semibold text-ink">{loading ? '…' : stats.subjects}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-surface border border-line rounded p-4">
          <p className="text-xs font-semibold text-muted">Exam Sessions</p>
          <p className="text-2xl font-semibold text-ink">{loading ? '…' : stats.examSessions}</p>
        </div>
        <div className="bg-surface border border-line rounded p-4">
          <p className="text-xs font-semibold text-muted">Avg Score</p>
          <p className="text-2xl font-semibold text-brand">{loading ? '…' : `${stats.avgScore}%`}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Mark Attendance', href: '/teacher/attendance', icon: <CheckCircle2 size={16} aria-hidden="true" /> },
          { label: 'Enter Grades', href: '/teacher/grades', icon: <Pencil size={16} aria-hidden="true" /> },
          { label: 'View Timetable', href: '/teacher/timetable', icon: <Calendar size={16} aria-hidden="true" /> },
          { label: 'My Classes', href: '/teacher/classes', icon: <School size={16} aria-hidden="true" /> },
        ].map(a => (
          <Link key={a.href} href={a.href}
            className="flex items-center gap-3 px-4 py-3.5 bg-surface border border-line rounded text-sm text-ink hover:bg-surface-2 transition-colors">
            <span className="inline-flex items-center">{a.icon}</span> {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

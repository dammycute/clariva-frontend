'use client';

import { useState, useEffect } from 'react';
import { api, auth } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
        const [cls, stu, sub] = await Promise.all([
          api.classes.list({ teacher_id: 'me' }),
          api.students.list(),
          api.subjects.list({ teacher_id: 'me' }),
        ]);
        setStats({
          classes: Array.isArray(cls) ? cls.length : 0,
          students: Array.isArray(stu) ? stu.length : 0,
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
      <h1 className="text-xl font-bold text-[#0D2B55] mb-1">Teacher Dashboard</h1>
      <p className="text-xs text-[#64748B] mb-5">Welcome back! Here&apos;s your overview.</p>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4">
          <p className="text-[11px] font-bold text-[#64748B] uppercase">My Classes</p>
          <p className="text-2xl font-bold text-[#0D2B55]">{loading ? '…' : stats.classes}</p>
        </div>
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4">
          <p className="text-[11px] font-bold text-[#64748B] uppercase">My Students</p>
          <p className="text-2xl font-bold text-[#0D2B55]">{loading ? '…' : stats.students}</p>
        </div>
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4">
          <p className="text-[11px] font-bold text-[#64748B] uppercase">My Subjects</p>
          <p className="text-2xl font-bold text-[#0D2B55]">{loading ? '…' : stats.subjects}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4">
          <p className="text-[11px] font-bold text-[#64748B] uppercase">Exam Sessions</p>
          <p className="text-2xl font-bold text-[#0D2B55]">{loading ? '…' : stats.examSessions}</p>
        </div>
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4">
          <p className="text-[11px] font-bold text-[#64748B] uppercase">Avg Score</p>
          <p className="text-2xl font-bold text-[#1A7A4A]">{loading ? '…' : `${stats.avgScore}%`}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Mark Attendance', href: '/teacher/attendance', icon: '✅' },
          { label: 'Enter Grades', href: '/teacher/grades', icon: '📝' },
          { label: 'View Timetable', href: '/teacher/timetable', icon: '📅' },
          { label: 'My Classes', href: '/teacher/classes', icon: '🏫' },
        ].map(a => (
          <Link key={a.href} href={a.href}
            className="flex items-center gap-3 px-4 py-3.5 bg-white border border-[#DDE5F0] rounded-xl text-sm text-[#0D2B55] hover:bg-[#F0F4FA] transition-colors">
            <span className="text-lg">{a.icon}</span> {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

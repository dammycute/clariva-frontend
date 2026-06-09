'use client';

import { useState, useEffect } from 'react';
import { api, auth } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function StudentDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<{ first_name: string; last_name: string; admission_no: string; class_name?: string; } | null>(null);
  const [gradeCount, setGradeCount] = useState(0);
  const [attRate, setAttRate] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    auth.me().then(user => {
      if (user.role !== 'student') { router.push('/'); return; }
    }).catch(() => router.push('/'));

    (async () => {
      try {
        const [stu, gr, att] = await Promise.all([
          api.students.list(),
          api.grades.list(),
          api.attendance.list(),
        ]);
        const students = Array.isArray(stu) ? stu as Array<{ first_name: string; last_name: string; admission_no: string; class_name?: string }> : [];
        if (students[0]) setProfile(students[0]);
        setGradeCount(Array.isArray(gr) ? gr.length : 0);
        const attArr = Array.isArray(att) ? att as Array<{ status: string }> : [];
        const p = attArr.filter(a => a.status === 'present').length;
        setAttRate(attArr.length > 0 ? Math.round((p / attArr.length) * 100) : 0);
      } catch { /* */ }
      finally { setLoading(false); }
    })();
  }, [router]);

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-full bg-[#1A7A4A] flex items-center justify-center text-white font-bold text-sm">
          {`${profile?.first_name || ''} ${profile?.last_name || ''}`.split(' ').map(w => w[0]).join('').slice(0, 2) || 'ST'}
        </div>
        <div>
          <h1 className="text-lg font-bold text-[#0D2B55]">{profile ? `${profile.first_name} ${profile.last_name}` : 'Student'}</h1>
          <p className="text-xs text-[#64748B]">{profile?.admission_no} · {profile?.class_name || '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#0D2B55]">{loading ? '…' : gradeCount}</p>
          <p className="text-[10px] text-[#64748B]">Grades Entered</p>
        </div>
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4 text-center">
          <p className={`text-2xl font-bold ${attRate >= 75 ? 'text-[#1A7A4A]' : 'text-[#B91C1C]'}`}>{loading ? '…' : `${attRate}%`}</p>
          <p className="text-[10px] text-[#64748B]">Attendance Rate</p>
        </div>
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#0D2B55]">—</p>
          <p className="text-[10px] text-[#64748B]">Upcoming Exams</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'My Grades', href: '/student/grades', icon: '📝' },
          { label: 'Attendance', href: '/student/attendance', icon: '✅' },
          { label: 'Timetable', href: '/student/timetable', icon: '📅' },
          { label: 'CBT Exams', href: '/student/exams', icon: '💻' },
        ].map(a => (
          <Link key={a.href} href={a.href}
            className="flex items-center gap-3 px-4 py-3.5 bg-white border border-[#DDE5F0] rounded-xl text-sm text-[#0D2B55] hover:bg-[#F0F4FA]">
            <span className="text-lg">{a.icon}</span> {a.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

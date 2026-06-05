'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Exam { id: string; title: string; subject_name?: string; duration_mins: number; question_count: number; status: string; pass_mark: number; }

export default function StudentExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.exams.list({ status: 'published' }).then(d => {
      setExams(Array.isArray(d) ? d as Exam[] : []);
      setLoading(false);
    });
  }, []);

  return (
    <div>
      <h1 className="text-xl font-bold text-[#0D2B55] mb-1">CBT Exams</h1>
      <p className="text-xs text-[#64748B] mb-5">Take your assigned examinations</p>

      {loading ? (
        <div className="text-sm text-[#64748B] p-8">Loading exams…</div>
      ) : exams.length === 0 ? (
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-8 text-center text-sm text-[#64748B]">No exams available right now.</div>
      ) : (
        <div className="grid gap-3">
          {exams.map(ex => (
            <div key={ex.id} className="bg-white border border-[#DDE5F0] rounded-xl p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#0D2B55]">{ex.title}</h3>
                <p className="text-xs text-[#64748B] mt-0.5">{ex.subject_name || '—'} · {ex.duration_mins} min · {ex.question_count} questions · Pass: {ex.pass_mark}%</p>
              </div>
              <Link href={`/student/exams/${ex.id}/take`}
                className="text-sm px-4 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D]">Start Exam</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

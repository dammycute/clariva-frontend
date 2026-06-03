'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Grade { subject_name?: string; ca1: number; ca2: number; assignment: number; exam: number; total: number; term: string; academic_year: string; }

export default function StudentGradesPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.grades.list().then(d => {
      setGrades(Array.isArray(d) ? d as Grade[] : []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-sm text-[#64748B] p-8">Loading grades…</div>;

  return (
    <div>
      <h1 className="text-xl font-bold text-[#0D2B55] mb-1">My Grades</h1>
      <p className="text-xs text-[#64748B] mb-5">Your performance across all subjects</p>

      {grades.length === 0 ? (
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-8 text-center text-sm text-[#64748B]">No grades recorded yet.</div>
      ) : (
        <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[11px] font-bold text-[#64748B] uppercase bg-[#F7F9FC]">
                <th className="text-left px-4 py-3">Subject</th>
                <th className="text-center px-4 py-3">CA1</th>
                <th className="text-center px-4 py-3">CA2</th>
                <th className="text-center px-4 py-3">Assignment</th>
                <th className="text-center px-4 py-3">Exam</th>
                <th className="text-center px-4 py-3">Total</th>
                <th className="text-center px-4 py-3">Term</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((g, i) => (
                <tr key={i} className="hover:bg-[#F8FAFF] border-t border-[#DDE5F0]">
                  <td className="px-4 py-3 font-semibold">{g.subject_name || '—'}</td>
                  <td className="px-4 py-3 text-center">{g.ca1}</td>
                  <td className="px-4 py-3 text-center">{g.ca2}</td>
                  <td className="px-4 py-3 text-center">{g.assignment}</td>
                  <td className="px-4 py-3 text-center">{g.exam}</td>
                  <td className="px-4 py-3 text-center font-bold">{g.total}</td>
                  <td className="px-4 py-3 text-center text-[#64748B]">{g.term || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Grade { subject_name?: string; scores: Record<string, number>; total: number; term: string; academic_year: string; }

export default function StudentGradesPage() {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.grades.list().then(d => {
      setGrades(Array.isArray(d) ? d as Grade[] : []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="text-sm text-muted p-8">Loading grades…</div>;

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink mb-1">My Grades</h1>
      <p className="text-xs text-muted mb-5">Your performance across all subjects</p>

      {grades.length === 0 ? (
        <div className="bg-surface border border-line rounded p-8 text-center text-sm text-muted">No grades recorded yet.</div>
      ) : (
        <div className="bg-surface border border-line rounded overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-xs font-semibold text-muted bg-page">
                <th className="text-left px-4 py-3">Subject</th>
                {Object.keys(grades[0]?.scores || {}).map(key => (
                  <th key={key} className="text-center px-4 py-3">{key.toUpperCase()}</th>
                ))}
                <th className="text-center px-4 py-3">Total</th>
                <th className="text-center px-4 py-3">Term</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((g, i) => (
                <tr key={i} className="hover:bg-page border-t border-line">
                  <td className="px-4 py-3 font-semibold">{g.subject_name || '-'}</td>
                  {Object.keys(g.scores || {}).map(key => (
                    <td key={key} className="px-4 py-3 text-center">{g.scores[key] ?? '-'}</td>
                  ))}
                  <td className="px-4 py-3 text-center font-semibold">{g.total}</td>
                  <td className="px-4 py-3 text-center text-muted">{g.term || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
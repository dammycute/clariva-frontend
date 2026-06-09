'use client';
import { useState, useEffect } from 'react';
import { api, auth } from '@/lib/api';

interface GradeEntry { subject: string; scores: Record<string, number>; total: number | null; grade: string | null; }
interface ReportCard { id: string; student: string; student_name: string; class_name: string; term: string; academic_year: string; grades: GradeEntry[]; total_score: number | null; total_possible: number | null; average: number | null; class_rank: number | null; is_released: boolean; }
interface Cls { id: string; name: string; year_group: string | null; }

const TERMS = ['1st Term', '2nd Term', '3rd Term'];
const YEAR_GROUPS = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];

export default function PrincipalReportsPage() {
  const [clsList, setClsList] = useState<Cls[]>([]);
  const [cards, setCards] = useState<ReportCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [term, setTerm] = useState('1st Term');
  const [academicYear, setAcademicYear] = useState('2025/2026');


  useEffect(() => { api.classes.list().then(c => setClsList(c as Cls[])); }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { term, academic_year: academicYear };
    if (selectedClass) params.class_id = selectedClass;
    api.reportCards.list(params).then((r: unknown) => setCards(r as ReportCard[])).catch(() => {}).finally(() => setLoading(false));
  }, [term, academicYear, selectedClass]);

  async function handleGenerate() {
    if (!selectedClass) { setMessage('Select a class.'); return; }
    setGenerating(true); setMessage('');
    try {
      const token = auth.getToken();
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const res = await fetch(`${base}/exams/report-cards/generate/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token ?? ''}` },
        body: JSON.stringify({ class_id: selectedClass, term, academic_year: academicYear }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setMessage(`Generated ${data.generated} report card(s).`);
      const r = await api.reportCards.list({ class_id: selectedClass, term, academic_year: academicYear });
      setCards(r as ReportCard[]);
    } catch (err: unknown) { setMessage(err instanceof Error ? err.message : 'Generation failed'); }
    finally { setGenerating(false); }
  }

  async function toggleRelease(card: ReportCard) {
    try {
      const token = auth.getToken();
      const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const action = card.is_released ? 'unrelease' : 'release';
      const res = await fetch(`${base}/exams/report-cards/${card.id}/${action}/`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token ?? ''}` },
      });
      if (!res.ok) throw new Error('Failed');
      setMessage(card.is_released ? 'Report card unreleased.' : 'Report card released to guardian portal.');
      const r = await api.reportCards.list({ class_id: selectedClass, term, academic_year: academicYear });
      setCards(r as ReportCard[]);
    } catch { setMessage('Toggle failed.'); }
  }

  async function releaseAll() {
    if (!selectedClass) return;
    const unreleased = cards.filter(c => !c.is_released);
    for (const c of unreleased) {
      try {
        const token = auth.getToken();
        const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        await fetch(`${base}/exams/report-cards/${c.id}/release/`, { method: 'POST', headers: { 'Authorization': `Bearer ${token ?? ''}` } });
      } catch { /* */ }
    }
    setMessage(`Released ${unreleased.length} report card(s).`);
    const r = await api.reportCards.list({ class_id: selectedClass, term, academic_year: academicYear });
    setCards(r as ReportCard[]);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div><h1 className="text-xl font-bold text-[#1E1B4B]">Report Cards</h1><p className="text-xs text-[#64748B] mt-0.5">Generate and release termly report cards</p></div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white outline-none">
          <option value="">Select class</option>
          {YEAR_GROUPS.map(yg => <optgroup key={yg} label={yg}>{clsList.filter(c => c.year_group === yg).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</optgroup>)}
        </select>
        <select value={term} onChange={e => setTerm(e.target.value)} className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white outline-none">
          {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input value={academicYear} onChange={e => setAcademicYear(e.target.value)} className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white outline-none w-[130px]" />
        {selectedClass && (
          <button onClick={handleGenerate} disabled={generating} className="text-sm px-4 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D] disabled:opacity-50">
            {generating ? 'Generating…' : 'Generate'}
          </button>
        )}
      </div>

      {message && <div className={`px-4 py-2 rounded-lg text-xs mb-3 ${message.includes('Generated') || message.includes('Released') ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#B91C1C]'}`}>{message}</div>}

      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-[#64748B]">{cards.length} card(s) · {cards.filter(c => c.is_released).length} released</p>
        {cards.filter(c => !c.is_released).length > 0 && (
          <button onClick={releaseAll} className="text-sm px-4 py-1.5 rounded-lg bg-[#4C1D95] text-white hover:bg-[#3B1578]">Release All</button>
        )}
      </div>

      <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-x-auto">
        {loading ? <div className="p-8 text-center text-sm text-[#64748B]">Loading…</div>
        : cards.length === 0 ? <div className="p-8 text-center text-sm text-[#64748B]">{selectedClass ? 'No report cards. Generate above.' : 'Select a class.'}</div>
        : <table className="w-full text-xs">
            <thead><tr className="text-[11px] font-bold text-[#64748B] uppercase bg-[#F7F9FC]">
              <th className="text-left px-4 py-3">Student</th><th className="text-left px-4 py-3">Class</th><th className="text-right px-4 py-3">Average</th>
              <th className="text-right px-4 py-3">Rank</th><th className="text-center px-4 py-3">Released</th><th className="text-left px-4 py-3">Actions</th>
            </tr></thead>
            <tbody>{cards.map(c => (
              <tr key={c.id} className="hover:bg-[#F8FAFF] border-t border-[#DDE5F0]">
                <td className="px-4 py-3 font-semibold">{c.student_name}</td>
                <td className="px-4 py-3 text-[#64748B]">{c.class_name}</td>
                <td className="px-4 py-3 text-right font-bold">{c.average != null ? `${c.average}%` : '—'}</td>
                <td className="px-4 py-3 text-right">{c.class_rank || '—'}</td>
                <td className="px-4 py-3 text-center">{c.is_released ? <span className="text-[#1A7A4A] font-bold">✓</span> : <span className="text-[#B91C1C]">✗</span>}</td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleRelease(c)} className={`text-[11px] hover:underline mr-2 ${c.is_released ? 'text-[#B91C1C]' : 'text-[#1A7A4A]'}`}>
                    {c.is_released ? 'Unrelease' : 'Release'}
                  </button>
                </td>
              </tr>
            ))}</tbody>
          </table>}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

interface GradeEntry {
  subject: string;
  scores: Record<string, number>;
  total: number | null;
  grade: string | null;
}
interface ReportCard {
  id: string;
  student: string; student_name: string; class_name: string;
  term: string; academic_year: string;
  grades: GradeEntry[];
  total_score: number | null; total_possible: number | null;
  average: number | null; class_rank: number | null;
}
interface Cls { id: string; name: string; year_group: string | null; }

const TERMS = ['1st Term', '2nd Term', '3rd Term'];
const YEAR_GROUPS = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];

function getGradeColor(grade: string | null): string {
  if (!grade) return 'text-[#64748B]';
  if (grade === 'A1') return 'text-[#065F46]';
  if (grade === 'F9') return 'text-[#B91C1C]';
  return 'text-[#D4930A]';
}

export default function ReportCardTab({ onRefresh }: { onRefresh: () => void }) {
  const [clsList, setClsList] = useState<Cls[]>([]);
  const [cards, setCards] = useState<ReportCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');

  const [selectedClass, setSelectedClass] = useState('');
  const [term, setTerm] = useState('1st Term');
  const [academicYear, setAcademicYear] = useState('2025/2026');
  const [previewCard, setPreviewCard] = useState<ReportCard | null>(null);
  const [components, setComponents] = useState<{ key: string; label: string; max: number; enabled: boolean }[]>([]);

  const printRef = useRef<HTMLDivElement>(null);

  async function loadAll() {
    setLoading(true);
    const params: Record<string, string> = { term, academic_year: academicYear };
    if (selectedClass) params.class_id = selectedClass;
    const [clsRes, cardRes] = await Promise.all([
      api.classes.list(),
      api.reportCards.list(params),
    ]);
    setClsList(clsRes as Cls[]);
    setCards(cardRes as ReportCard[]);
    setLoading(false);
  }
  useEffect(() => { loadAll(); }, [term, academicYear, selectedClass]);

  const filteredCards = cards;

  async function handleGenerate() {
    if (!selectedClass) { setMessage('Select a class.'); return; }
    setGenerating(true);
    setMessage('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/exams/report-cards/generate/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        },
        body: JSON.stringify({ class_id: selectedClass, term, academic_year: academicYear }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Generation failed');
      setMessage(`Generated ${data.generated} report card${data.generated !== 1 ? 's' : ''}.`);
      const cardRes = await api.reportCards.list({ class_id: selectedClass, term });
      setCards(cardRes as ReportCard[]);
      onRefresh();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  async function handlePreview(card: ReportCard) {
    setPreviewCard(card);
    try {
      const me = await (await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}/auth/me/`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
      })).json();
      if (me?.school_id) {
        const gc = await api.gradingConfig.get(me.school_id) as unknown as { components: typeof components };
        setComponents(gc.components || []);
      }
    } catch { /* ignore */ }
  }

  function handlePrint() {
    if (!cardToPrint) return;
    const activeComponents = components.filter(c => c.enabled !== false);
    const maxTotal = activeComponents.reduce((s, c) => s + c.max, 0);
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;border:0';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) { toast.error('Print preview not available. Try a different browser.'); return; }
    doc.open();
    doc.write(`<!DOCTYPE html><html><head>
      <title>Report Card - ${cardToPrint.student_name}</title>
      <style>
        body { font-family: Inter, sans-serif; padding: 40px; max-width: 900px; margin: auto; color: #0D2B55; }
        .header { text-align: center; margin-bottom: 24px; }
        .header .title { font-size: 24px; font-weight: bold; letter-spacing: 2px; }
        .header .sub { font-size: 10px; color: #64748B; }
        .header .heading { font-size: 18px; font-weight: bold; border-bottom: 2px solid #1A7A4A; padding-bottom: 8px; margin-top: 12px; }
        .info { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 32px; font-size: 12px; margin-bottom: 16px; }
        .info .label { color: #64748B; }
        .info .value { font-weight: 600; }
        table { width: 100%; font-size: 12px; border-collapse: collapse; margin-bottom: 12px; }
        th { background: #0D2B55; color: white; text-align: left; padding: 8px 12px; }
        th.center { text-align: center; }
        td { padding: 6px 12px; border-bottom: 1px solid #DDE5F0; }
        td.center { text-align: center; }
        tr:nth-child(even) { background: #F7F9FC; }
        .totals { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; font-size: 12px; margin-bottom: 16px; }
        .totals > div { background: #F7F9FC; border-radius: 8px; padding: 10px; text-align: center; }
        .totals > div .lbl { font-size: 10px; color: #64748B; }
        .totals > div .val { font-weight: bold; }
        .legend { font-size: 10px; color: #64748B; border-top: 1px solid #DDE5F0; padding-top: 8px; margin-top: 8px; }
        .footer { font-size: 9px; color: #94A3B8; margin-top: 4px; }
        @media print { body { padding: 0; } }
      </style>
    </head><body>
      <div class="header">
        <div class="title">CLARIVA</div>
        <div class="sub">School Management Platform</div>
        <div class="heading">TERMLY REPORT CARD</div>
      </div>
      <div class="info">
        <div><span class="label">Student:</span> <span class="value">${cardToPrint.student_name}</span></div>
        <div><span class="label">Class:</span> <span class="value">${cardToPrint.class_name}</span></div>
        <div><span class="label">Term:</span> <span class="value">${cardToPrint.term}</span></div>
        <div><span class="label">Academic Year:</span> <span class="value">${cardToPrint.academic_year}</span></div>
      </div>
      <table>
        <thead><tr>
          <th>Subject</th>
          ${activeComponents.map(c => `<th class="center">${c.label} (${c.max})</th>`).join('')}
          <th class="center">Total (${maxTotal})</th><th class="center">Grade</th>
        </tr></thead>
        <tbody>
          ${(cardToPrint.grades || []).map(g => `
            <tr>
              <td style="font-weight:600">${g.subject}</td>
              ${activeComponents.map(c => `<td class="center">${g.scores?.[c.key] != null ? g.scores[c.key] : '-'}</td>`).join('')}
              <td class="center" style="font-weight:600">${g.total != null ? g.total : '-'}</td>
              <td class="center" style="font-weight:600">${g.grade || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div class="totals">
        <div><div class="lbl">Total Score</div><div class="val">${cardToPrint.total_score ?? '-'}</div></div>
        <div><div class="lbl">Average</div><div class="val">${cardToPrint.average != null ? cardToPrint.average + '%' : '-'}</div></div>
        <div><div class="lbl">Class Rank</div><div class="val">${cardToPrint.class_rank != null ? cardToPrint.class_rank : '-'}</div></div>
      </div>
      <div class="legend">WAEC Grading: A1(75-100%) B2(70-74%) B3(65-69%) C4(60-64%) C5(55-59%) C6(50-54%) D7(45-49%) E8(40-44%) F9(0-39%)</div>
      <div class="footer">Generated on ${new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })} via Clariva</div>
    </body></html>`);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 500);
  }

  const activeComponents = components.filter(c => c.enabled !== false);
  const maxTotal = activeComponents.reduce((s, c) => s + c.max, 0);

  const cardToPrint = previewCard;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
          className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#0D2B55] outline-none">
          <option value="">Select class</option>
          {YEAR_GROUPS.map(yg => (
            <optgroup key={yg} label={yg}>
              {clsList.filter(c => c.year_group === yg).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <select value={term} onChange={e => setTerm(e.target.value)}
          className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#0D2B55] outline-none">
          {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input value={academicYear} onChange={e => setAcademicYear(e.target.value)}
          className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#0D2B55] outline-none w-[130px]" />
        {selectedClass && (
          <button onClick={handleGenerate} disabled={generating}
            className="text-sm px-4 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D] disabled:opacity-50">
            {generating ? 'Generating…' : 'Generate Report Cards'}
          </button>
        )}
      </div>

      {message && (
        <div className={`px-4 py-2 rounded-lg text-xs mb-3 ${message.includes('Generated') || message.includes('generated') ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#B91C1C]'}`}>
          {message}
        </div>
      )}

      <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-x-auto">
        {loading ? <div className="p-8 text-center text-sm text-[#64748B]">Loading…</div>
        : filteredCards.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#64748B]">
            {selectedClass ? 'No report cards generated yet. Click "Generate Report Cards" above.' : 'Select a class to view report cards.'}
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[11px] font-bold tracking-wider text-[#64748B] uppercase bg-[#F7F9FC]">
                <th className="text-left px-4 py-3">Student</th><th className="text-left px-4 py-3">Class</th>
                <th className="text-right px-4 py-3">Subjects</th><th className="text-right px-4 py-3">Average</th>
                <th className="text-right px-4 py-3">Rank</th><th className="text-left px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCards.map(c => (
                <tr key={c.id} className="hover:bg-[#F8FAFF] border-t border-[#DDE5F0]">
                  <td className="px-4 py-3 font-semibold">{c.student_name}</td>
                  <td className="px-4 py-3 text-[#64748B]">{c.class_name}</td>
                  <td className="px-4 py-3 text-right">{c.grades?.length || 0}</td>
                  <td className="px-4 py-3 text-right font-bold">{c.average != null ? `${c.average}%` : '—'}</td>
                  <td className="px-4 py-3 text-right">{c.class_rank != null ? `${c.class_rank}` : '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handlePreview(c)} className="text-[11px] text-[#1A7A4A] hover:underline">Preview</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Print Preview Modal */}
      {cardToPrint && (
        <div id="report-card-modal" className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center py-8 overflow-y-auto" onClick={() => setPreviewCard(null)}>
          <div className="bg-white max-w-[900px] w-full mx-4 rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-0 no-print">
              <h2 className="text-base font-bold text-[#0D2B55]">Report Card Preview</h2>
              <div className="flex gap-2">
                <button onClick={handlePrint} className="text-sm px-4 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D]">🖨️ Print / Export PDF</button>
                <button onClick={() => setPreviewCard(null)} className="text-sm px-4 py-2 rounded-lg border border-[#DDE5F0] bg-white hover:bg-[#F0F4FA]">Close</button>
              </div>
            </div>

            <div ref={printRef} className="p-8 overflow-y-auto max-h-[70vh]" style={{ fontFamily: 'Inter, sans-serif' }}>
              <div className="text-center mb-6 print:mb-4">
                <div className="text-2xl font-bold tracking-wider text-[#0D2B55]">CLARIVA</div>
                <div className="text-[10px] text-[#64748B]">School Management Platform</div>
                <div className="mt-3 text-lg font-bold text-[#0D2B55] border-b-2 border-[#1A7A4A] pb-2">TERMLY REPORT CARD</div>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-1 mb-4 text-xs">
                <div><span className="text-[#64748B]">Student:</span> <span className="font-semibold text-[#0D2B55]">{cardToPrint.student_name}</span></div>
                <div><span className="text-[#64748B]">Class:</span> <span className="font-semibold text-[#0D2B55]">{cardToPrint.class_name}</span></div>
                <div><span className="text-[#64748B]">Term:</span> <span className="font-semibold text-[#0D2B55]">{cardToPrint.term}</span></div>
                <div><span className="text-[#64748B]">Academic Year:</span> <span className="font-semibold text-[#0D2B55]">{cardToPrint.academic_year}</span></div>
              </div>

              <table className="w-full text-xs border-collapse mb-3">
                <thead>
                  <tr className="bg-[#0D2B55] text-white">
                    <th className="text-left px-3 py-2">Subject</th>
                    {activeComponents.map(c => (
                      <th key={c.key} className="text-center px-2 py-2">{c.label} ({c.max})</th>
                    ))}
                    <th className="text-center px-2 py-2">Total ({maxTotal})</th>
                    <th className="text-center px-2 py-2">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {(cardToPrint.grades || []).map((g, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-[#F7F9FC]' : ''}>
                      <td className="px-3 py-1.5 font-semibold text-[#0D2B55]">{g.subject}</td>
                      {activeComponents.map(c => (
                        <td key={c.key} className="text-center px-2 py-1.5">{g.scores?.[c.key] != null ? g.scores[c.key] : '—'}</td>
                      ))}
                      <td className="text-center px-2 py-1.5 font-bold">{g.total != null ? g.total : '—'}</td>
                      <td className={`text-center px-2 py-1.5 font-bold ${getGradeColor(g.grade)}`}>{g.grade || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid grid-cols-3 gap-4 mb-4 text-xs">
                <div className="bg-[#F7F9FC] rounded-lg p-2.5 text-center">
                  <div className="text-[#64748B] text-[10px]">Total Score</div>
                  <div className="font-bold text-[#0D2B55]">{cardToPrint.total_score ?? '—'}</div>
                </div>
                <div className="bg-[#F7F9FC] rounded-lg p-2.5 text-center">
                  <div className="text-[#64748B] text-[10px]">Average</div>
                  <div className="font-bold text-[#0D2B55]">{cardToPrint.average != null ? `${cardToPrint.average}%` : '—'}</div>
                </div>
                <div className="bg-[#F7F9FC] rounded-lg p-2.5 text-center">
                  <div className="text-[#64748B] text-[10px]">Class Rank</div>
                  <div className="font-bold text-[#0D2B55]">{cardToPrint.class_rank != null ? `${cardToPrint.class_rank}` : '—'}</div>
                </div>
              </div>

              <div className="text-[10px] text-[#64748B] border-t border-[#DDE5F0] pt-2 mt-2">
                <span className="font-semibold">WAEC Grading:</span>{' '}
                A1(75-100%) B2(70-74%) B3(65-69%) C4(60-64%) C5(55-59%) C6(50-54%) D7(45-49%) E8(40-44%) F9(0-39%)
              </div>
              <div className="text-[9px] text-[#94A3B8] mt-1">Generated on {new Date().toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })} via Clariva</div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
}
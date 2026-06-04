'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Exam {
  id: string; title: string; subject: string; subject_name?: string;
  class_group: string | null; class_name?: string;
  duration_mins: number; pass_mark: number; question_count: number;
  start_time: string | null; end_time: string | null;
  status: string; instructions: string;
  shuffle_questions: boolean; shuffle_options: boolean;
  time_limit_enforced?: boolean;
}

interface Question {
  id: string; exam: string; body: string; question_type: string;
  options: string[] | null; correct_answer: string;
  topic: string | null; difficulty: string; mark: number;
}

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const Q_TYPES = ['mcq', 'true_false', 'short_answer'];

const typeLabel: Record<string, string> = { mcq: 'MCQ', true_false: 'T-F', short_answer: 'Short Answer' };
const diffColors: Record<string, string> = { easy: 'bg-green-100 text-green-700', medium: 'bg-amber-100 text-amber-700', hard: 'bg-red-100 text-red-700' };
const typeColors: Record<string, string> = { mcq: 'bg-blue-100 text-blue-700', true_false: 'bg-purple-100 text-purple-700', short_answer: 'bg-teal-100 text-teal-700' };

export default function ExamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  // filters
  const [typeFilter, setTypeFilter] = useState('all');
  const [diffFilter, setDiffFilter] = useState('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  // upload state
  const [dragging, setDragging] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [replaceMode, setReplaceMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ ok: boolean; msg: string; warnings?: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // reorder state
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderList, setReorderList] = useState<Question[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  // add/edit question modal
  const [showForm, setShowForm] = useState(false);
  const [editQId, setEditQId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [qForm, setQForm] = useState({
    body: '', question_type: 'mcq' as string, options: ['', '', '', ''],
    correct_answer: '', topic: '', difficulty: 'medium', mark: '1',
  });

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [ex, qs] = await Promise.all([
          api.exams.get(id),
          api.questions.list({ exam: id }),
        ]);
        setExam(ex as Exam);
        setQuestions(Array.isArray(qs) ? qs as Question[] : []);
      } catch { router.push('/dashboard/cbt'); }
      finally { setLoading(false); }
    })();
  }, [id, router]);

  async function loadQuestions() {
    const qs = await api.questions.list({ exam: id });
    setQuestions(Array.isArray(qs) ? qs as Question[] : []);
  }

  // ---- upload logic ----
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true); }, []);
  const handleDragLeave = useCallback(() => setDragging(false), []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.docx')) {
      setUploadFile(file); setUploadResult(null);
    } else { setUploadResult({ ok: false, msg: 'Please drop a .docx file' }); }
  }, []);

  async function handleUpload() {
    if (!uploadFile) return;
    setUploading(true); setUploadResult(null);
    try {
      const res = await api.exams.uploadQuestions(id, uploadFile, replaceMode);
      const created = (res as { questions_created?: number })?.questions_created ?? 0;
      const warnings = (res as { warnings?: string[] })?.warnings;
      setUploadResult({
        ok: true,
        msg: `${created} questions uploaded successfully`,
        warnings,
      });
      setUploadFile(null);
      loadQuestions();
    } catch (err: unknown) {
      setUploadResult({ ok: false, msg: err instanceof Error ? err.message : 'Upload failed' });
    }
    finally { setUploading(false); }
  }

  async function handleDownloadTemplate() {
    try {
      const res = await api.exams.downloadTemplate();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'question_template.docx';
      document.body.appendChild(a); a.click();
      document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { alert('Failed to download template'); }
  }

  // ---- question form ----
  function openAdd() {
    setEditQId(null);
    setQForm({ body: '', question_type: 'mcq', options: ['', '', '', ''], correct_answer: '', topic: '', difficulty: 'medium', mark: '1' });
    setShowForm(true);
  }
  function openEdit(q: Question) {
    setEditQId(q.id);
    setQForm({
      body: q.body, question_type: q.question_type,
      options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['', '', '', ''],
      correct_answer: q.correct_answer, topic: q.topic || '', difficulty: q.difficulty || 'medium', mark: String(q.mark),
    });
    setShowForm(true);
  }
  async function handleSaveQ(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        exam: id,
        body: qForm.body,
        question_type: qForm.question_type,
        options: qForm.question_type === 'mcq' ? qForm.options.filter(o => o.trim()) : null,
        correct_answer: qForm.correct_answer,
        topic: qForm.topic || null,
        difficulty: qForm.difficulty,
        mark: parseInt(qForm.mark) || 1,
      };
      if (editQId) { await api.questions.update(editQId, payload); }
      else { await api.questions.create(payload); }
      setShowForm(false);
      loadQuestions();
    } catch { alert('Failed to save question'); }
    finally { setSaving(false); }
  }
  async function deleteQ(qId: string) {
    if (!confirm('Delete this question?')) return;
    await api.questions.delete(qId);
    loadQuestions();
  }

  // ---- reorder ----
  function openReorder() {
    setReorderList([...questions]);
    setReorderMode(true);
  }

  function handleReorderDragStart(idx: number) { setDragIdx(idx); }
  function handleReorderDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const list = [...reorderList];
    const [moved] = list.splice(dragIdx, 1);
    list.splice(idx, 0, moved);
    setReorderList(list);
    setDragIdx(idx);
  }
  async function saveReorder() {
    // PATCH each question's order field sequentially
    try {
      await Promise.all(reorderList.map((q, i) => api.questions.update(q.id, { order: i + 1 } as Partial<Question>)));
      setReorderMode(false);
      loadQuestions();
    } catch { alert('Failed to save order'); }
  }

  // ---- computed stats ----
  const filteredQuestions = questions.filter(q => {
    if (typeFilter !== 'all' && q.question_type !== typeFilter) return false;
    if (diffFilter !== 'all' && q.difficulty !== diffFilter) return false;
    return true;
  });

  const mcqCount = questions.filter(q => q.question_type === 'mcq').length;
  const tfCount = questions.filter(q => q.question_type === 'true_false').length;
  const saCount = questions.filter(q => q.question_type === 'short_answer').length;
  const totalMarks = questions.reduce((a, q) => a + (q.mark || 1), 0);
  const estTime = questions.length * 1.5; // rough 1.5 min per question

  if (loading) return <div className="text-sm text-[#64748B] p-8">Loading exam…</div>;
  if (!exam) return null;

  const qs = questions.length;

  // ---- render helpers ----
  function renderBadge(label: string, colorClass: string) {
    return <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${colorClass}`}>{label}</span>;
  }

  return (
    <div>
      {/* header */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.push('/dashboard/cbt')} className="text-sm text-[#64748B] hover:text-[#0D2B55]">← Exams</button>
        <div className="h-4 w-px bg-[#DDE5F0]" />
        <h1 className="text-xl font-bold text-[#0D2B55]">{exam.title}</h1>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${exam.status === 'published' ? 'bg-blue-100 text-blue-700' : exam.status === 'draft' ? 'bg-gray-100 text-gray-600' : exam.status === 'ongoing' ? 'bg-green-100 text-green-700' : exam.status === 'completed' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{exam.status}</span>
      </div>

      {/* summary cards */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Duration', value: `${exam.duration_mins} min` },
          { label: 'Questions', value: String(qs) },
          { label: 'Total Marks', value: String(totalMarks) },
          { label: 'Pass Mark', value: `${exam.pass_mark}%` },
          { label: 'Est. Time', value: `${estTime} min` },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#DDE5F0] rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-[#0D2B55]">{s.value}</p>
            <p className="text-[10px] text-[#64748B]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* summary bar */}
      <div className="text-xs text-[#64748B] mb-4 px-1">
        {qs} questions · {mcqCount} MCQ · {tfCount} True/False · {saCount} Short Answer · Total marks: {totalMarks} · Est. time: {Math.round(estTime)} mins
      </div>

      {/* upload panel */}
      <div className="bg-white border border-[#DDE5F0] rounded-xl p-5 mb-5" ref={dropRef}>
        <h2 className="text-sm font-bold text-[#0D2B55] mb-3">📄 Upload Questions from DOCX</h2>
        <div
          onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragging ? 'border-[#1A7A4A] bg-green-50' : 'border-[#DDE5F0] hover:border-[#1A7A4A] hover:bg-[#F8FAFF]'}`}
        >
          <input ref={fileInputRef} type="file" accept=".docx" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) { setUploadFile(f); setUploadResult(null); } }} />
          {uploadFile ? (
            <p className="text-sm text-[#0D2B55] font-medium">{uploadFile.name}</p>
          ) : (
            <div>
              <p className="text-sm text-[#64748B]">Drag & drop a <strong>.docx</strong> file here, or click to browse</p>
              <p className="text-[10px] text-[#94A3B8] mt-1">Only .docx format is supported</p>
            </div>
          )}
        </div>

        {uploadFile && (
          <div className="flex items-center gap-3 mt-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs">
              <input type="checkbox" checked={replaceMode} onChange={e => setReplaceMode(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-[#DDE5F0] text-[#1A7A4A] focus:ring-[#1A7A4A]" />
              Replace existing questions
            </label>
            <div className="flex-1" />
            <button onClick={handleUpload} disabled={uploading}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D] disabled:opacity-50">
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        )}

        {uploadResult && (
          <div className={`mt-3 text-xs px-3 py-2 rounded-lg ${uploadResult.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {uploadResult.ok ? '✅ ' : '❌ '}{uploadResult.msg}
            {uploadResult.warnings && uploadResult.warnings.length > 0 && (
              <div className="mt-1 text-amber-700">
                {uploadResult.warnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}
              </div>
            )}
          </div>
        )}

        <button onClick={handleDownloadTemplate} className="mt-3 text-xs px-3 py-1.5 rounded-lg border border-[#DDE5F0] hover:bg-[#F0F4FA]">
          📥 Download Template
        </button>
      </div>

      {/* filters & actions */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {['all', ...Q_TYPES].map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-colors ${typeFilter === t ? 'bg-[#0D2B55] text-white' : 'bg-[#F0F4FA] text-[#64748B] hover:bg-[#DDE5F0]'}`}>
                {t === 'all' ? 'All' : t === 'mcq' ? 'MCQ' : t === 'true_false' ? 'True/False' : 'Short Answer'}
              </button>
            ))}
          </div>
          <div className="h-5 w-px bg-[#DDE5F0]" />
          <div className="flex gap-1">
            {['all', ...DIFFICULTIES].map(d => (
              <button key={d} onClick={() => setDiffFilter(d)}
                className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-colors ${diffFilter === d ? 'bg-[#0D2B55] text-white' : 'bg-[#F0F4FA] text-[#64748B] hover:bg-[#DDE5F0]'}`}>
                {d.charAt(0).toUpperCase() + d.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {qs > 1 && <button onClick={openReorder} className="text-xs px-3 py-1.5 rounded-lg border border-[#DDE5F0] hover:bg-[#F0F4FA]">↕ Reorder</button>}
          <button onClick={openAdd} className="text-xs px-3 py-1.5 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D]">+ Add Question</button>
        </div>
      </div>

      {/* question list */}
      <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden">
        {filteredQuestions.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#64748B]">No questions yet. Upload a .docx file or add manually.</div>
        ) : (
          <div className="divide-y divide-[#DDE5F0]">
            {filteredQuestions.map((q, i) => {
              const isExpanded = expanded.has(q.id);
              return (
                <div key={q.id} className="px-4 py-3 hover:bg-[#F8FAFF]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0 mr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#0D2B55] shrink-0">Q{i + 1}.</span>
                        <p
                          onClick={() => {
                            const s = new Set(expanded);
                            isExpanded ? s.delete(q.id) : s.add(q.id);
                            setExpanded(s);
                          }}
                          className={`text-xs text-[#0D2B55] cursor-pointer ${isExpanded ? '' : 'line-clamp-2'}`}
                          title={q.body}
                        >{q.body}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {renderBadge(typeLabel[q.question_type] || q.question_type, typeColors[q.question_type] || 'bg-gray-100 text-gray-600')}
                        {renderBadge(q.difficulty, diffColors[q.difficulty] || 'bg-gray-100 text-gray-600')}
                        <span className="text-[10px] text-[#64748B]">{q.mark} mark{q.mark > 1 ? 's' : ''}</span>
                        <span className="text-[10px] flex items-center gap-0.5 text-green-700 font-medium">
                          ✓ {q.correct_answer}
                        </span>
                        {q.topic && <span className="text-[10px] text-[#64748B]">Topic: {q.topic}</span>}
                      </div>
                      {q.question_type === 'mcq' && q.options && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {q.options.map((o, oi) => (
                            <span key={oi} className={`text-[10px] px-1.5 py-0.5 rounded ${o === q.correct_answer ? 'bg-green-100 text-green-700 font-bold' : 'bg-[#F0F4FA] text-[#64748B]'}`}>{String.fromCharCode(65 + oi)}. {o}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => openEdit(q)} className="text-[11px] px-2 py-1 rounded border border-[#DDE5F0] hover:bg-[#F0F4FA]">✏️</button>
                      <button onClick={() => deleteQ(q.id)} className="text-[11px] px-2 py-1 rounded border border-[#FEE2E2] text-[#B91C1C] hover:bg-[#FEE2E2]">🗑</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* reorder modal */}
      {reorderMode && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setReorderMode(false)}>
          <div className="bg-white rounded-2xl w-[560px] max-w-[95vw] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-base font-bold text-[#0D2B55]">Reorder Questions</h2>
              <button onClick={() => setReorderMode(false)} className="text-[#64748B] hover:text-[#0D2B55] text-lg">✕</button>
            </div>
            <p className="px-5 text-xs text-[#64748B]">Drag rows to reorder. This sets the default question order for students.</p>
            <div className="p-5 space-y-1 max-h-[50vh] overflow-y-auto">
              {reorderList.map((q, i) => (
                <div key={q.id} draggable
                  onDragStart={() => handleReorderDragStart(i)}
                  onDragOver={e => handleReorderDragOver(e, i)}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-grab active:cursor-grabbing text-xs ${dragIdx === i ? 'border-[#1A7A4A] bg-green-50' : 'border-[#DDE5F0] hover:bg-[#F8FAFF]'}`}
                >
                  <span className="text-[#64748B]">⠿</span>
                  <span className="font-bold text-[#0D2B55] shrink-0">Q{i + 1}.</span>
                  <span className="text-[#64748B] truncate">{q.body}</span>
                  <span className="ml-auto text-[10px] text-[#64748B] shrink-0">{q.mark}m</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 p-5 pt-0">
              <button onClick={() => setReorderMode(false)} className="text-sm px-4 py-2 rounded-lg border border-[#DDE5F0] bg-white hover:bg-[#F0F4FA]">Cancel</button>
              <button onClick={saveReorder} className="text-sm px-4 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D]">Save Order</button>
            </div>
          </div>
        </div>
      )}

      {/* add/edit question modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-[600px] max-w-[95vw] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-base font-bold text-[#0D2B55]">{editQId ? 'Edit Question' : 'Add Question'}</h2>
              <button onClick={() => setShowForm(false)} className="text-[#64748B] hover:text-[#0D2B55] text-lg">✕</button>
            </div>
            <form onSubmit={handleSaveQ} className="p-5 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Question body</label>
                <textarea value={qForm.body} onChange={e => setQForm({ ...qForm, body: e.target.value })} required rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Type</label>
                  <select value={qForm.question_type} onChange={e => {
                    const t = e.target.value;
                    setQForm({ ...qForm, question_type: t, correct_answer: '' });
                  }}
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] bg-white">
                    {Q_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Difficulty</label>
                  <select value={qForm.difficulty} onChange={e => setQForm({ ...qForm, difficulty: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] bg-white">
                    {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Mark</label>
                  <input type="number" value={qForm.mark} onChange={e => setQForm({ ...qForm, mark: e.target.value })} required min={1}
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Topic (optional)</label>
                <input value={qForm.topic} onChange={e => setQForm({ ...qForm, topic: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
              </div>

              {qForm.question_type === 'mcq' && (
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Options</label>
                  {qForm.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold text-[#64748B] w-5">{String.fromCharCode(65 + oi)}.</span>
                      <input value={opt} onChange={e => {
                        const opts = [...qForm.options];
                        opts[oi] = e.target.value;
                        setQForm({ ...qForm, options: opts });
                      }} placeholder={`Option ${String.fromCharCode(65 + oi)}`}
                        className="flex-1 px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
                    </div>
                  ))}
                </div>
              )}

              {qForm.question_type === 'true_false' && (
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Correct answer</label>
                  <select value={qForm.correct_answer} onChange={e => setQForm({ ...qForm, correct_answer: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] bg-white">
                    <option value="">Select</option>
                    <option value="True">True</option>
                    <option value="False">False</option>
                  </select>
                </div>
              )}

              {(qForm.question_type === 'mcq' || qForm.question_type === 'short_answer') && (
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Correct answer</label>
                  {qForm.question_type === 'mcq' ? (
                    <select value={qForm.correct_answer} onChange={e => setQForm({ ...qForm, correct_answer: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] bg-white">
                      <option value="">Select correct option</option>
                      {qForm.options.filter(o => o.trim()).map((opt, oi) => (
                        <option key={oi} value={opt}>{String.fromCharCode(65 + oi)}. {opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input value={qForm.correct_answer} onChange={e => setQForm({ ...qForm, correct_answer: e.target.value })}
                      className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="text-sm px-4 py-2 rounded-lg border border-[#DDE5F0] bg-white hover:bg-[#F0F4FA]">Cancel</button>
                <button type="submit" disabled={saving}
                  className="text-sm px-4 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D] disabled:opacity-50">
                  {saving ? 'Saving…' : editQId ? 'Update Question' : 'Add Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

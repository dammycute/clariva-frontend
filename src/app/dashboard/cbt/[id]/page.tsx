'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Exam {
  id: string; title: string; subject: string; subject_name?: string;
  class_group: string | null; class_name?: string;
  duration_mins: number; pass_mark: number; question_count: number;
  start_time: string | null; end_time: string | null;
  status: string; instructions: string;
  shuffle_questions: boolean; shuffle_options: boolean;
}

interface Question {
  id: string; exam: string; body: string; question_type: string;
  options: string[] | null; correct_answer: string;
  topic: string | null; difficulty: string; mark: number;
}

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const Q_TYPES = ['mcq', 'true_false', 'short_answer'];

export default function ExamDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editQId, setEditQId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [qForm, setQForm] = useState({
    body: '', question_type: 'mcq', options: ['', '', '', ''],
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

  if (loading) return <div className="text-sm text-[#64748B] p-8">Loading exam…</div>;
  if (!exam) return null;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => router.push('/dashboard/cbt')} className="text-sm text-[#64748B] hover:text-[#0D2B55]">← Exams</button>
        <div className="h-4 w-px bg-[#DDE5F0]" />
        <h1 className="text-xl font-bold text-[#0D2B55]">{exam.title}</h1>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${exam.status === 'published' ? 'bg-[#E8F0FA] text-[#0D2B55]' : exam.status === 'draft' ? 'bg-[#F0F4FA] text-[#64748B]' : 'bg-[#DCFCE7] text-[#1A7A4A]'}`}>{exam.status}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-5">
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#0D2B55]">{exam.duration_mins}</p>
          <p className="text-[10px] text-[#64748B]">Minutes</p>
        </div>
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#0D2B55]">{questions.length}</p>
          <p className="text-[10px] text-[#64748B]">Questions</p>
        </div>
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#0D2B55]">{questions.reduce((a, q) => a + (q.mark || 1), 0)}</p>
          <p className="text-[10px] text-[#64748B]">Total Marks</p>
        </div>
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#0D2B55]">{exam.pass_mark}%</p>
          <p className="text-[10px] text-[#64748B]">Pass Mark</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-[#0D2B55]">Questions ({questions.length})</h2>
        <button onClick={openAdd} className="text-sm px-3 py-1.5 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D]">+ Add Question</button>
      </div>

      <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden">
        {questions.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#64748B]">No questions yet. Add your first question.</div>
        ) : (
          <div className="divide-y divide-[#DDE5F0]">
            {questions.map((q, i) => (
              <div key={q.id} className="px-4 py-3 hover:bg-[#F8FAFF]">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 mr-4">
                    <p className="text-xs font-semibold text-[#0D2B55]">Q{i + 1}. {q.body}</p>
                    <div className="flex items-center gap-2.5 mt-1 text-[10px] text-[#64748B]">
                      <span className={`px-1.5 py-0.5 rounded font-bold ${q.difficulty === 'easy' ? 'bg-[#DCFCE7] text-[#1A7A4A]' : q.difficulty === 'hard' ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-[#FEF3C7] text-[#D4930A]'}`}>{q.difficulty}</span>
                      <span>{q.question_type}</span>
                      <span>{q.mark} mark{q.mark > 1 ? 's' : ''}</span>
                      <span>Answer: <strong className="text-[#1A7A4A]">{q.correct_answer}</strong></span>
                      {q.topic && <span>Topic: {q.topic}</span>}
                    </div>
                    {q.question_type === 'mcq' && q.options && (
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {q.options.map((o, oi) => (
                          <span key={oi} className={`text-[10px] px-1.5 py-0.5 rounded ${o === q.correct_answer ? 'bg-[#DCFCE7] text-[#1A7A4A] font-bold' : 'bg-[#F0F4FA] text-[#64748B]'}`}>{o}</span>
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
            ))}
          </div>
        )}
      </div>

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
                  <select value={qForm.question_type} onChange={e => setQForm({ ...qForm, question_type: e.target.value })}
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

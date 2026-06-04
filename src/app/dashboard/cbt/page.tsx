'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';

interface Exam {
  id: string; title: string; subject: string; subject_name?: string;
  class_group: string | null; class_name?: string;
  duration_mins: number; pass_mark: number; question_count: number;
  start_time: string | null; end_time: string | null;
  status: string; instructions: string;
  shuffle_questions: boolean; shuffle_options: boolean;
  time_limit_enforced?: boolean;
}

interface Subject { id: string; name: string; year_group: string | null; }
interface Class { id: string; name: string; year_group: string | null; }

const STATUS_OPTIONS = ['draft', 'published', 'ongoing', 'completed', 'archived'];

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  published: 'bg-blue-100 text-blue-700',
  ongoing: 'bg-green-100 text-green-700',
  completed: 'bg-amber-100 text-amber-700',
  archived: 'bg-red-100 text-red-700',
};

export default function CBTExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', subject: '', class_group: '', duration_mins: '30', pass_mark: '40',
    start_time: '', end_time: '', status: 'draft', instructions: '',
    shuffle_questions: false, shuffle_options: false, time_limit_enforced: true,
  });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [e, s, c] = await Promise.all([api.exams.list(), api.subjects.list(), api.classes.list()]);
    setExams(e as Exam[]);
    setSubjects(s as Subject[]);
    setClasses(c as Class[]);
    setLoading(false);
  }

  function openAdd() {
    setEditId(null);
    setForm({ title: '', subject: '', class_group: '', duration_mins: '30', pass_mark: '40', start_time: '', end_time: '', status: 'draft', instructions: '', shuffle_questions: false, shuffle_options: false, time_limit_enforced: true });
    setShowForm(true);
  }
  function openEdit(exam: Exam) {
    setEditId(exam.id);
    setForm({
      title: exam.title, subject: exam.subject, class_group: exam.class_group || '',
      duration_mins: String(exam.duration_mins), pass_mark: String(exam.pass_mark),
      start_time: exam.start_time ? exam.start_time.slice(0, 16) : '',
      end_time: exam.end_time ? exam.end_time.slice(0, 16) : '',
      status: exam.status, instructions: exam.instructions || '',
      shuffle_questions: exam.shuffle_questions, shuffle_options: exam.shuffle_options,
      time_limit_enforced: exam.time_limit_enforced ?? true,
    });
    setShowForm(true);
  }

  async function handleDuplicate(exam: Exam) {
    if (!confirm(`Duplicate "${exam.title}" including all questions?`)) return;
    try {
      await api.exams.duplicate(exam.id);
      loadAll();
    } catch { alert('Failed to duplicate exam'); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        duration_mins: parseInt(form.duration_mins),
        pass_mark: parseInt(form.pass_mark),
        start_time: form.start_time ? new Date(form.start_time).toISOString() : null,
        end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
        class_group: form.class_group || null,
      };
      if (editId) { await api.exams.update(editId, payload); }
      else { await api.exams.create(payload); }
      setShowForm(false);
      loadAll();
    } catch { alert('Failed to save exam'); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0D2B55]">CBT Examinations</h1>
          <p className="text-xs text-[#64748B] mt-0.5">{exams.length} exams · {exams.filter(e => e.status === 'published').length} published</p>
        </div>
        <button onClick={openAdd} className="text-sm px-3.5 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D]">+ New Exam</button>
      </div>

      <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-[#64748B]">Loading exams…</div>
        ) : exams.length === 0 ? (
          <div className="p-12 flex flex-col items-center text-center">
            <div className="text-4xl mb-3">💻</div>
            <h3 className="text-base font-bold text-[#0D2B55] mb-2">No exams yet</h3>
            <p className="text-xs text-[#64748B] max-w-md">Create your first exam with a question bank, set a schedule, and publish for students.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#DDE5F0]">
            {exams.map(exam => (
              <div key={exam.id} className="px-4 py-3 hover:bg-[#F8FAFF]">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/cbt/${exam.id}`} className="text-sm font-bold text-[#0D2B55] hover:underline">{exam.title}</Link>
                      {(exam.status === 'published' || exam.status === 'ongoing') && (
                        <Link href={`/dashboard/cbt/take/${exam.id}`} className="text-[10px] px-2 py-0.5 rounded bg-[#1A7A4A] text-white font-bold">Take Exam</Link>
                      )}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${statusColors[exam.status] || statusColors.draft}`}>{exam.status}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#E8F0FA] text-[#0D2B55] font-bold">{exam.question_count}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-[#64748B]">
                      <span>{exam.subject_name || exam.subject}</span>
                      <span>{exam.class_name || 'All classes'}</span>
                      <span>{exam.duration_mins} min</span>
                      <span>{exam.question_count} Qs</span>
                      <span>Pass: {exam.pass_mark}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(exam)} className="text-[11px] px-2 py-1 rounded border border-[#DDE5F0] hover:bg-[#F0F4FA]" title="Edit">✏️</button>
                    <button onClick={() => handleDuplicate(exam)} className="text-[11px] px-2 py-1 rounded border border-[#DDE5F0] hover:bg-[#F0F4FA]" title="Duplicate">📋</button>
                    <Link href={`/dashboard/cbt/${exam.id}`} className="text-[11px] px-2 py-1 rounded border border-[#DDE5F0] hover:bg-[#F0F4FA]" title="Questions">📝</Link>
                    <Link href={`/dashboard/cbt/results/${exam.id}`} className="text-[11px] px-2 py-1 rounded border border-[#DDE5F0] hover:bg-[#F0F4FA]" title="Results">📊</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl w-[560px] max-w-[95vw] max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-0">
              <h2 className="text-base font-bold text-[#0D2B55]">{editId ? 'Edit Exam' : 'New Exam'}</h2>
              <button onClick={() => setShowForm(false)} className="text-[#64748B] hover:text-[#0D2B55] text-lg">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Title</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required
                  className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Subject</label>
                  <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] bg-white">
                    <option value="">Select subject</option>
                    {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Class</label>
                  <select value={form.class_group} onChange={e => setForm({ ...form, class_group: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] bg-white">
                    <option value="">All classes</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Duration (minutes)</label>
                  <input type="number" value={form.duration_mins} onChange={e => setForm({ ...form, duration_mins: e.target.value })} required min={1}
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Pass Mark (%)</label>
                  <input type="number" value={form.pass_mark} onChange={e => setForm({ ...form, pass_mark: e.target.value })} required min={0} max={100}
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Start Time</label>
                  <input type="datetime-local" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">End Time</label>
                  <input type="datetime-local" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A] bg-white">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#64748B] uppercase mb-1">Instructions</label>
                <textarea value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={form.shuffle_questions} onChange={e => setForm({ ...form, shuffle_questions: e.target.checked })}
                    className="w-4 h-4 rounded border-[#DDE5F0] text-[#1A7A4A] focus:ring-[#1A7A4A]" />
                  Shuffle questions
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={form.shuffle_options} onChange={e => setForm({ ...form, shuffle_options: e.target.checked })}
                    className="w-4 h-4 rounded border-[#DDE5F0] text-[#1A7A4A] focus:ring-[#1A7A4A]" />
                  Shuffle options
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-sm">
                  <input type="checkbox" checked={form.time_limit_enforced} onChange={e => setForm({ ...form, time_limit_enforced: e.target.checked })}
                    className="w-4 h-4 rounded border-[#DDE5F0] text-[#1A7A4A] focus:ring-[#1A7A4A]" />
                  Enforce time limit
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="text-sm px-4 py-2 rounded-lg border border-[#DDE5F0] bg-white hover:bg-[#F0F4FA]">Cancel</button>
                <button type="submit" disabled={saving}
                  className="text-sm px-4 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D] disabled:opacity-50">
                  {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

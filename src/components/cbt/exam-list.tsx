'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { api, auth } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { TextField } from '@/components/ui/text-field';

export interface Exam {
  id: string; title: string; subject: string | null; subject_name: string | null;
  classes: string[]; class_names: string[]; class_name: string | null;
  duration_mins: number; pass_mark: number; question_count: number; total_marks: number;
  start_time: string | null; end_time: string | null;
  status: string; instructions: string | null; is_open: boolean;
  shuffle_questions: boolean; shuffle_options: boolean; time_limit_enforced: boolean;
  release_mode: 'immediate' | 'on_release'; results_released: boolean; component: string | null;
  term: string | null; academic_year: string | null;
}

interface GradingComponent { key: string; label: string; max: number; enabled?: boolean; }

/** What an exam counts as. Empty means practice only: nothing goes to the grade book. */
const COUNTS_AS = [
  { value: '', label: 'Practice only (no marks posted)' },
  { value: 'ca1', label: 'CA 1' },
  { value: 'ca2', label: 'CA 2' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'exam', label: 'Exam' },
];
const TERMS = ['1st Term', '2nd Term', '3rd Term'];

interface Subject { id: string; name: string; year_group: string | null; }
interface Class { id: string; name: string; year_group: string | null; }

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'closed', label: 'Closed' },
  { value: 'archived', label: 'Archived' },
];

/** "Live" is not stored. It is worked out from the start and end times. */
export function statusLabel(e: Pick<Exam, 'status' | 'is_open'>): { text: string; tone: string } {
  if (e.status === 'published') {
    return e.is_open ? { text: 'Live now', tone: 'text-success' } : { text: 'Published, not open', tone: 'text-brand' };
  }
  if (e.status === 'closed') return { text: 'Closed', tone: 'text-warning' };
  if (e.status === 'archived') return { text: 'Archived', tone: 'text-muted' };
  return { text: 'Draft', tone: 'text-muted' };
}

const EMPTY_FORM = {
  title: '', subject: '', classes: [] as string[], duration_mins: '30', pass_mark: '40',
  start_time: '', end_time: '', status: 'draft', instructions: '',
  component: '', term: '', academic_year: '',
  release_mode: 'on_release', shuffle_questions: false, shuffle_options: false, time_limit_enforced: true,
};

/** "Counts as CA 1 · out of 15 · 1st Term 2025/2026", or a note that nothing is posted. */
function countsAsText(exam: Exam, grading: GradingComponent[]): string {
  if (!exam.component) return 'Practice only: no marks go to the grade book';
  const comp = grading.find(g => g.key === exam.component);
  const label = comp?.label || COUNTS_AS.find(o => o.value === exam.component)?.label || exam.component;
  return [`Counts as ${label}`, comp?.max ? `out of ${comp.max}` : null,
    [exam.term, exam.academic_year].filter(Boolean).join(' ') || null].filter(Boolean).join(' · ');
}

/** The list of CBT exams, with create and edit. `base` is the portal this page lives in. */
export function ExamList({ base, ownSubjectsOnly = false }: { base: string; ownSubjectsOnly?: boolean }) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [grading, setGrading] = useState<GradingComponent[]>([]);

  useEffect(() => { void loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      // The school's score setup, so each exam can say "out of 15". The list still works without it.
      auth.me().then(me => (me.school_id ? api.gradingConfig.get(me.school_id) : null))
        .then(g => setGrading(((g as { components?: GradingComponent[] } | null)?.components) || []))
        .catch(() => {});
      const [e, s, c] = await Promise.all([
        api.exams.list(),
        ownSubjectsOnly ? api.subjects.list({ teacher_id: 'me' }) : api.subjects.list(),
        api.classes.list(),
      ]);
      setExams(e as Exam[]);
      setSubjects(s as Subject[]);
      setClasses(c as Class[]);
    } finally { setLoading(false); }
  }

  function openAdd() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(exam: Exam) {
    setEditId(exam.id);
    setForm({
      title: exam.title, subject: exam.subject || '', classes: exam.classes || [],
      duration_mins: String(exam.duration_mins), pass_mark: String(exam.pass_mark),
      start_time: exam.start_time ? exam.start_time.slice(0, 16) : '',
      end_time: exam.end_time ? exam.end_time.slice(0, 16) : '',
      status: exam.status, instructions: exam.instructions || '',
      component: exam.component || '', term: exam.term || '', academic_year: exam.academic_year || '',
      release_mode: exam.release_mode, shuffle_questions: exam.shuffle_questions,
      shuffle_options: exam.shuffle_options, time_limit_enforced: exam.time_limit_enforced,
    });
    setShowForm(true);
  }

  async function handleDuplicate(exam: Exam) {
    if (!confirm(`Copy "${exam.title}" with all its questions into a new draft?`)) return;
    try {
      await api.exams.duplicate(exam.id);
      toast.success('Copied as a draft.');
      void loadAll();
    } catch { /* the server's reason is already shown */ }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        subject: form.subject || null,
        classes: form.classes,
        duration_mins: parseInt(form.duration_mins, 10),
        pass_mark: parseInt(form.pass_mark, 10),
        start_time: form.start_time ? new Date(form.start_time).toISOString() : null,
        end_time: form.end_time ? new Date(form.end_time).toISOString() : null,
        status: form.status,
        instructions: form.instructions,
        component: form.component || null,
        term: form.component ? (form.term || null) : null,
        academic_year: form.component ? (form.academic_year || null) : null,
        release_mode: form.release_mode,
        shuffle_questions: form.shuffle_questions,
        shuffle_options: form.shuffle_options,
        time_limit_enforced: form.time_limit_enforced,
      };
      if (editId) { await api.exams.update(editId, payload as never); }
      else { await api.exams.create(payload as never); }
      setShowForm(false);
      void loadAll();
    } catch { /* the server's reason is already shown */ }
    finally { setSaving(false); }
  }

  const toggleClass = (id: string) =>
    setForm(f => ({ ...f, classes: f.classes.includes(id) ? f.classes.filter(c => c !== id) : [...f.classes, id] }));

  return (
    <div className="max-w-[1120px]">
      <header className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-ink leading-tight">CBT exams</h1>
          <p className="text-[13px] text-muted mt-1">
            {exams.length} exam{exams.length === 1 ? '' : 's'} · {exams.filter(e => e.status === 'published').length} published
          </p>
        </div>
        <Button onClick={openAdd}>New exam</Button>
      </header>

      <div className="bg-surface border border-line rounded overflow-hidden">
        {loading ? (
          <div role="status" className="p-6 space-y-3 animate-pulse">
            {[0, 1, 2].map(i => <div key={i} className="h-10 rounded bg-surface-2" />)}
          </div>
        ) : exams.length === 0 ? (
          <div className="p-10 max-w-md">
            <h2 className="text-base font-semibold text-ink mb-1">No exams yet</h2>
            <p className="text-sm text-muted">Create an exam, add questions, choose the classes, then publish it.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {exams.map(exam => {
              const st = statusLabel(exam);
              return (
                <li key={exam.id} className="px-4 py-3 flex items-start justify-between gap-4 hover:bg-surface-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Link href={`${base}/cbt/${exam.id}`} className="text-sm font-semibold text-ink hover:underline">{exam.title}</Link>
                      <span className={`text-[13px] font-medium ${st.tone}`}>{st.text}</span>
                    </div>
                    <p className="text-[13px] text-muted mt-0.5">
                      {exam.subject_name || 'No subject'} · {exam.class_name || 'No class chosen'} · {exam.duration_mins} min · {exam.question_count} questions · {exam.total_marks} marks · pass mark {exam.pass_mark}%
                    </p>
                    <p className="text-[13px] text-muted">{countsAsText(exam, grading)}</p>
                    <p className="text-[13px] text-muted">
                      {exam.release_mode === 'on_release'
                        ? (exam.results_released ? 'Results released' : 'Results held until you release them')
                        : 'Students see their score right after submitting'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-[13px]">
                    <Link href={`${base}/cbt/${exam.id}`} className="text-brand hover:underline">Questions</Link>
                    <Link href={`${base}/cbt/results/${exam.id}`} className="text-brand hover:underline">Results</Link>
                    <button onClick={() => openEdit(exam)} className="text-brand hover:underline cursor-pointer">Settings</button>
                    <button onClick={() => handleDuplicate(exam)} className="text-muted hover:text-ink hover:underline cursor-pointer">Copy</button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showForm && (
        <Modal title={editId ? 'Exam settings' : 'New exam'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave} className="p-5 space-y-4">
            <TextField id="exam-title" label="Title" value={form.title} required
              onChange={e => setForm({ ...form, title: e.target.value })} />

            <div>
              <label htmlFor="exam-subject" className="block text-sm font-medium text-ink mb-1.5">Subject</label>
              <select id="exam-subject" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} required
                className="w-full h-11 px-3 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand">
                <option value="">Choose a subject</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}{s.year_group ? ` (${s.year_group})` : ''}</option>)}
              </select>
            </div>

            <fieldset>
              <legend className="block text-sm font-medium text-ink mb-1.5">Classes this exam is for</legend>
              <div className="flex flex-wrap gap-2">
                {classes.map(c => (
                  <label key={c.id} className={`flex items-center gap-2 px-3 min-h-9 rounded border text-sm cursor-pointer ${
                    form.classes.includes(c.id) ? 'border-brand bg-brand-soft text-ink font-medium' : 'border-line text-ink hover:bg-surface-2'}`}>
                    <input type="checkbox" className="accent-brand" checked={form.classes.includes(c.id)} onChange={() => toggleClass(c.id)} />
                    {c.name}
                  </label>
                ))}
                {classes.length === 0 && <p className="text-[13px] text-muted">No classes yet. Create classes first.</p>}
              </div>
              <p className="text-[13px] text-muted mt-1.5">Only students in these classes can see and sit the exam.</p>
            </fieldset>

            <div>
              <label htmlFor="exam-counts" className="block text-sm font-medium text-ink mb-1.5">Counts as</label>
              <select id="exam-counts" value={form.component} onChange={e => setForm({ ...form, component: e.target.value })}
                className="w-full h-11 px-3 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand">
                {COUNTS_AS.map(o => {
                  const max = grading.find(g => g.key === o.value)?.max;
                  return <option key={o.value} value={o.value}>{o.label}{o.value && max ? ` (out of ${max})` : ''}</option>;
                })}
              </select>
              <p className="text-[13px] text-muted mt-1.5">
                {form.component
                  ? "When you release the results, each score goes to this part of the grade book, scaled to the school's maximum."
                  : 'Students can sit it, but no marks reach the grade book.'}
              </p>
            </div>
            {form.component && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="exam-term" className="block text-sm font-medium text-ink mb-1.5">Term</label>
                  <select id="exam-term" value={form.term} onChange={e => setForm({ ...form, term: e.target.value })}
                    className="w-full h-11 px-3 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand">
                    <option value="">Current term</option>
                    {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <TextField id="exam-year" label="Academic year" placeholder="Current year" value={form.academic_year}
                  onChange={e => setForm({ ...form, academic_year: e.target.value })} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <TextField id="exam-duration" label="Time allowed (minutes)" type="number" min={1} required value={form.duration_mins}
                onChange={e => setForm({ ...form, duration_mins: e.target.value })} />
              <TextField id="exam-pass" label="Pass mark (%)" type="number" min={0} max={100} required value={form.pass_mark}
                onChange={e => setForm({ ...form, pass_mark: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <TextField id="exam-start" label="Opens at (optional)" type="datetime-local" value={form.start_time}
                onChange={e => setForm({ ...form, start_time: e.target.value })} />
              <TextField id="exam-end" label="Closes at (optional)" type="datetime-local" value={form.end_time}
                onChange={e => setForm({ ...form, end_time: e.target.value })} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="exam-status" className="block text-sm font-medium text-ink mb-1.5">Status</label>
                <select id="exam-status" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                  className="w-full h-11 px-3 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand">
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="exam-release" className="block text-sm font-medium text-ink mb-1.5">Results</label>
                <select id="exam-release" value={form.release_mode} onChange={e => setForm({ ...form, release_mode: e.target.value })}
                  className="w-full h-11 px-3 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand">
                  <option value="on_release">Hold until I release them</option>
                  <option value="immediate">Show the score right away</option>
                </select>
              </div>
            </div>
            <p className="text-[13px] text-muted -mt-2">
              Held results also keep grades unchanged until you release them. A student always sees &ldquo;submitted&rdquo; straight away.
            </p>

            <div>
              <label htmlFor="exam-instructions" className="block text-sm font-medium text-ink mb-1.5">Instructions</label>
              <textarea id="exam-instructions" value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} rows={3}
                className="w-full px-3 py-2 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand" />
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {([['shuffle_questions', 'Shuffle questions'], ['shuffle_options', 'Shuffle options'], ['time_limit_enforced', 'Enforce the time limit']] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-brand" checked={form[key]}
                    onChange={e => setForm({ ...form, [key]: e.target.checked })} />
                  {label}
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editId ? 'Save changes' : 'Create exam'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

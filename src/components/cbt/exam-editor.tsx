'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { TextField } from '@/components/ui/text-field';
import { SummaryStrip, Stat, Panel } from '@/components/ui/summary';
import { statusLabel, type Exam } from '@/components/cbt/exam-list';

interface Question {
  id: string; exam: string; body: string; question_type: string;
  options: string[] | null; correct_answer: string; accepted_answers: string[] | null;
  topic: string | null; difficulty: string; mark: number;
}

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const Q_TYPES = [
  { value: 'mcq', label: 'Multiple choice' },
  { value: 'true_false', label: 'True or false' },
  { value: 'short_answer', label: 'Short answer' },
];
const typeLabel: Record<string, string> = { mcq: 'Multiple choice', true_false: 'True or false', short_answer: 'Short answer' };
const diffTone: Record<string, string> = { easy: 'text-success', medium: 'text-warning', hard: 'text-danger' };

const EMPTY_Q = {
  body: '', question_type: 'mcq', options: ['', '', '', ''], correct_answer: '', accepted: '',
  topic: '', difficulty: 'medium', mark: '1',
};

/** Build, upload and check the questions of one exam, then publish it. */
export function ExamEditor({ base }: { base: string }) {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attempts, setAttempts] = useState(0);
  const [loading, setLoading] = useState(true);
  const [others, setOthers] = useState<Exam[]>([]);
  const [copyFrom, setCopyFrom] = useState('');

  const [typeFilter, setTypeFilter] = useState('all');
  const [diffFilter, setDiffFilter] = useState('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [dragging, setDragging] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [replaceMode, setReplaceMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ ok: boolean; msg: string; warnings?: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [reorderMode, setReorderMode] = useState(false);
  const [reorderList, setReorderList] = useState<Question[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editQId, setEditQId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [qForm, setQForm] = useState(EMPTY_Q);
  const [busy, setBusy] = useState(false);

  const locked = attempts > 0;   // questions are the marking key once students have started

  const load = useCallback(async () => {
    const [ex, qs, ss, all] = await Promise.all([
      api.exams.get(id), api.questions.list({ exam: id }),
      api.examSessions.list({ exam: id }), api.exams.list(),
    ]);
    setExam(ex as Exam);
    setQuestions(Array.isArray(qs) ? qs as Question[] : []);
    setAttempts(Array.isArray(ss) ? ss.length : 0);
    setOthers((Array.isArray(all) ? all as Exam[] : []).filter(e => e.id !== id));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    load().catch(() => router.push(`${base}/cbt`)).finally(() => setLoading(false));
  }, [id, load, router, base]);

  // ---- exam actions ----
  async function changeStatus(status: string, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setBusy(true);
    try {
      await api.exams.update(id, { status } as never);
      toast.success(status === 'published' ? 'Published. Students in the chosen classes can now see it.' : 'Status updated.');
      await load();
    } catch { /* the server's reason is already shown */ }
    finally { setBusy(false); }
  }

  async function closeNow() {
    if (!confirm('Close this exam now? Anyone still sitting it will be submitted with the answers saved so far.')) return;
    setBusy(true);
    try {
      const res = await api.exams.close(id);
      toast.success(res.attempts_submitted ? `Closed. ${res.attempts_submitted} unfinished attempt${res.attempts_submitted > 1 ? 's were' : ' was'} submitted.` : 'Closed.');
      await load();
    } catch { /* shown */ }
    finally { setBusy(false); }
  }

  async function copyQuestions() {
    if (!copyFrom) return;
    setBusy(true);
    try {
      const res = await api.exams.copyQuestions(id, copyFrom);
      toast.success(`${res.created} question${res.created === 1 ? '' : 's'} copied.`);
      setCopyFrom('');
      await load();
    } catch { /* shown */ }
    finally { setBusy(false); }
  }

  // ---- upload ----
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.docx')) { setUploadFile(file); setUploadResult(null); }
    else setUploadResult({ ok: false, msg: 'Please drop a .docx file.' });
  }, []);

  async function handleUpload() {
    if (!uploadFile) return;
    setUploading(true); setUploadResult(null);
    try {
      const res = await api.exams.uploadQuestions(id, uploadFile, replaceMode);
      setUploadResult({ ok: true, msg: `${res.created} question${res.created === 1 ? '' : 's'} uploaded.`, warnings: res.warnings });
      setUploadFile(null);
      await load();
    } catch (err: unknown) {
      setUploadResult({ ok: false, msg: err instanceof Error ? err.message : 'Upload failed.' });
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
    } catch { toast.error('We could not download the template.'); }
  }

  // ---- question form ----
  function openAdd() { setEditQId(null); setQForm(EMPTY_Q); setShowForm(true); }
  function openEdit(q: Question) {
    setEditQId(q.id);
    setQForm({
      body: q.body, question_type: q.question_type,
      options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['', '', '', ''],
      correct_answer: q.correct_answer, accepted: (q.accepted_answers || []).join('\n'),
      topic: q.topic || '', difficulty: q.difficulty || 'medium', mark: String(q.mark),
    });
    setShowForm(true);
  }
  async function handleSaveQ(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const accepted = qForm.accepted.split('\n').map(s => s.trim()).filter(Boolean);
      const payload = {
        exam: id, body: qForm.body, question_type: qForm.question_type,
        options: qForm.question_type === 'mcq' ? qForm.options.filter(o => o.trim()) : null,
        correct_answer: qForm.correct_answer,
        accepted_answers: qForm.question_type === 'short_answer' && accepted.length ? accepted : null,
        topic: qForm.topic || null, difficulty: qForm.difficulty, mark: parseInt(qForm.mark, 10) || 1,
      };
      if (editQId) await api.questions.update(editQId, payload as never);
      else await api.questions.create(payload as never);
      setShowForm(false);
      await load();
    } catch { /* shown */ }
    finally { setSaving(false); }
  }
  async function deleteQ(qId: string) {
    if (!confirm('Delete this question?')) return;
    try { await api.questions.delete(qId); await load(); } catch { /* shown */ }
  }

  // ---- reorder ----
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
    try {
      await Promise.all(reorderList.map((q, i) => api.questions.update(q.id, { order: i + 1 } as never)));
      setReorderMode(false);
      await load();
    } catch { /* shown */ }
  }

  if (loading) return <div role="status" className="text-sm text-muted p-8">Loading exam…</div>;
  if (!exam) return null;

  const filtered = questions.filter(q =>
    (typeFilter === 'all' || q.question_type === typeFilter) && (diffFilter === 'all' || q.difficulty === diffFilter));
  const totalMarks = questions.reduce((a, q) => a + (q.mark || 1), 0);
  const counts = {
    mcq: questions.filter(q => q.question_type === 'mcq').length,
    tf: questions.filter(q => q.question_type === 'true_false').length,
    sa: questions.filter(q => q.question_type === 'short_answer').length,
  };
  const st = statusLabel(exam);

  return (
    <div className="max-w-[1120px]">
      <header className="mb-6">
        <Link href={`${base}/cbt`} className="text-[13px] text-muted hover:text-ink">&larr; All exams</Link>
        <div className="flex items-start justify-between gap-4 flex-wrap mt-2">
          <div>
            <h1 className="text-[22px] font-semibold text-ink leading-tight">{exam.title}</h1>
            <p className="text-[13px] text-muted mt-1">
              <span className={`font-medium ${st.tone}`}>{st.text}</span> · {exam.subject_name || 'No subject'} · {exam.class_name || 'No class chosen'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`${base}/cbt/results/${id}`} className="inline-flex items-center h-11 px-4 rounded border border-line bg-surface text-sm font-medium text-ink hover:bg-surface-2">Results</Link>
            {exam.status === 'draft' && <Button onClick={() => changeStatus('published')} disabled={busy}>Publish</Button>}
            {exam.status === 'published' && <Button variant="secondary" onClick={closeNow} disabled={busy}>Close exam</Button>}
            {exam.status === 'published' && !locked && (
              <Button variant="secondary" onClick={() => changeStatus('draft', 'Move this exam back to draft? Students will no longer see it.')} disabled={busy}>Back to draft</Button>
            )}
            {exam.status === 'closed' && <Button variant="secondary" onClick={() => changeStatus('archived')} disabled={busy}>Archive</Button>}
          </div>
        </div>
      </header>

      {locked && (
        <div role="note" className="mb-5 text-sm text-warning bg-warning/10 border border-warning/30 rounded px-3 py-2.5">
          {attempts} student{attempts > 1 ? 's have' : ' has'} started this exam, so questions cannot be added or removed. You can still fix a typo in a question. To change the questions, copy the exam from the exam list.
        </div>
      )}

      <SummaryStrip className="mb-6">
        <Stat label="Questions" value={questions.length} note={`${counts.mcq} multiple choice, ${counts.tf} true or false, ${counts.sa} short answer`} />
        <Stat label="Total marks" value={totalMarks} />
        <Stat label="Time allowed" value={`${exam.duration_mins} min`} />
        <Stat label="Pass mark" value={`${exam.pass_mark}%`} />
      </SummaryStrip>

      {!locked && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Panel title="Upload questions from a Word file">
            <div className="p-4 space-y-3">
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                role="button" tabIndex={0} aria-label="Choose a .docx file"
                className={`border border-dashed rounded p-5 text-center cursor-pointer ${dragging ? 'border-brand bg-brand-soft' : 'border-line-strong hover:bg-surface-2'}`}
              >
                <input ref={fileInputRef} type="file" accept=".docx" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setUploadFile(f); setUploadResult(null); } }} />
                {uploadFile
                  ? <p className="text-sm text-ink font-medium">{uploadFile.name}</p>
                  : <p className="text-sm text-muted">Drop a .docx file here, or click to choose one.</p>}
              </div>
              {uploadFile && (
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer text-[13px]">
                    <input type="checkbox" className="accent-brand" checked={replaceMode} onChange={e => setReplaceMode(e.target.checked)} />
                    Replace the questions already here
                  </label>
                  <span className="flex-1" />
                  <Button onClick={handleUpload} disabled={uploading} className="h-9">{uploading ? 'Uploading…' : 'Upload'}</Button>
                </div>
              )}
              {uploadResult && (
                <div role="status" className={`text-[13px] px-3 py-2 rounded border ${uploadResult.ok ? 'text-success bg-success/10 border-success/30' : 'text-danger bg-danger-soft border-danger/30'}`}>
                  {uploadResult.msg}
                  {uploadResult.warnings?.map((w, i) => <div key={i} className="text-warning">{w}</div>)}
                </div>
              )}
              <button onClick={handleDownloadTemplate} className="text-[13px] text-brand hover:underline cursor-pointer">Download the Word template</button>
            </div>
          </Panel>

          <Panel title="Copy questions from another exam">
            <div className="p-4 space-y-3">
              <label htmlFor="copy-from" className="block text-sm font-medium text-ink">Copy every question from</label>
              <select id="copy-from" value={copyFrom} onChange={e => setCopyFrom(e.target.value)}
                className="w-full h-11 px-3 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand">
                <option value="">Choose an exam</option>
                {others.map(o => <option key={o.id} value={o.id}>{o.title} ({o.question_count} questions)</option>)}
              </select>
              <Button variant="secondary" onClick={copyQuestions} disabled={!copyFrom || busy}>Copy questions</Button>
            </div>
          </Panel>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-1.5 flex-wrap text-[13px]">
          {[{ value: 'all', label: 'All types' }, ...Q_TYPES].map(t => (
            <button key={t.value} onClick={() => setTypeFilter(t.value)} aria-pressed={typeFilter === t.value}
              className={`px-2.5 py-1 rounded cursor-pointer ${typeFilter === t.value ? 'bg-brand text-brand-ink' : 'bg-surface-2 text-muted hover:text-ink'}`}>{t.label}</button>
          ))}
          <span className="w-px h-5 bg-line mx-1" />
          {['all', ...DIFFICULTIES].map(d => (
            <button key={d} onClick={() => setDiffFilter(d)} aria-pressed={diffFilter === d}
              className={`px-2.5 py-1 rounded cursor-pointer ${diffFilter === d ? 'bg-brand text-brand-ink' : 'bg-surface-2 text-muted hover:text-ink'}`}>
              {d === 'all' ? 'All levels' : d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {questions.length > 1 && <Button variant="secondary" className="h-9" onClick={() => { setReorderList([...questions]); setReorderMode(true); }}>Reorder</Button>}
          {!locked && <Button className="h-9" onClick={openAdd}>Add question</Button>}
        </div>
      </div>

      <div className="bg-surface border border-line rounded overflow-hidden">
        {filtered.length === 0 ? (
          <p className="p-8 text-sm text-muted">No questions yet. Upload a Word file, copy from another exam, or add one by hand.</p>
        ) : (
          <ol className="divide-y divide-line">
            {filtered.map((q, i) => {
              const open = expanded.has(q.id);
              return (
                <li key={q.id} className="px-4 py-3 hover:bg-surface-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex gap-2">
                        <span className="text-[13px] font-semibold text-ink shrink-0 tabular-nums">Q{i + 1}.</span>
                        <button
                          onClick={() => { const s = new Set(expanded); if (open) s.delete(q.id); else s.add(q.id); setExpanded(s); }}
                          aria-expanded={open}
                          className={`text-sm text-ink text-left cursor-pointer ${open ? '' : 'line-clamp-2'}`}
                        >{q.body}</button>
                      </div>
                      <p className="text-[13px] text-muted mt-1">
                        {typeLabel[q.question_type] || q.question_type} · <span className={diffTone[q.difficulty]}>{q.difficulty}</span> · {q.mark} mark{q.mark > 1 ? 's' : ''}
                        {q.topic && <> · {q.topic}</>}
                      </p>
                      <p className="text-[13px] text-success mt-0.5">Answer: {q.correct_answer}</p>
                      {q.accepted_answers && q.accepted_answers.length > 0 && (
                        <p className="text-[13px] text-muted">Also accepted: {q.accepted_answers.join(', ')}</p>
                      )}
                      {q.question_type === 'mcq' && q.options && (
                        <ul className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-[13px]">
                          {q.options.map((o, oi) => (
                            <li key={oi} className={o === q.correct_answer ? 'text-success font-medium' : 'text-muted'}>{String.fromCharCode(65 + oi)}. {o}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="flex gap-3 shrink-0 text-[13px]">
                      <button onClick={() => openEdit(q)} className="text-brand hover:underline cursor-pointer">Edit</button>
                      {!locked && <button onClick={() => deleteQ(q.id)} className="text-danger hover:underline cursor-pointer">Delete</button>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {reorderMode && (
        <Modal title="Reorder questions" onClose={() => setReorderMode(false)}>
          <p className="px-5 pt-2 text-[13px] text-muted">Drag a row to move it. This sets the default order students see.</p>
          <ul className="p-5 space-y-1 max-h-[50vh] overflow-y-auto">
            {reorderList.map((q, i) => (
              <li key={q.id} draggable
                onDragStart={() => setDragIdx(i)} onDragOver={e => handleReorderDragOver(e, i)} onDragEnd={() => setDragIdx(null)}
                className={`flex items-center gap-2 p-2 rounded border text-[13px] cursor-grab active:cursor-grabbing ${dragIdx === i ? 'border-brand bg-brand-soft' : 'border-line hover:bg-surface-2'}`}>
                <span className="font-semibold text-ink shrink-0 tabular-nums">Q{i + 1}.</span>
                <span className="text-muted truncate">{q.body}</span>
                <span className="ml-auto text-muted shrink-0">{q.mark}m</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-end gap-2 px-5 pb-5">
            <Button variant="secondary" onClick={() => setReorderMode(false)}>Cancel</Button>
            <Button onClick={saveReorder}>Save order</Button>
          </div>
        </Modal>
      )}

      {showForm && (
        <Modal title={editQId ? 'Edit question' : 'Add question'} onClose={() => setShowForm(false)} width={620}>
          <form onSubmit={handleSaveQ} className="p-5 space-y-4">
            <div>
              <label htmlFor="q-body" className="block text-sm font-medium text-ink mb-1.5">Question</label>
              <textarea id="q-body" value={qForm.body} onChange={e => setQForm({ ...qForm, body: e.target.value })} required rows={3}
                className="w-full px-3 py-2 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="q-type" className="block text-sm font-medium text-ink mb-1.5">Type</label>
                <select id="q-type" value={qForm.question_type} onChange={e => setQForm({ ...qForm, question_type: e.target.value, correct_answer: '' })}
                  className="w-full h-11 px-3 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand">
                  {Q_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="q-diff" className="block text-sm font-medium text-ink mb-1.5">Difficulty</label>
                <select id="q-diff" value={qForm.difficulty} onChange={e => setQForm({ ...qForm, difficulty: e.target.value })}
                  className="w-full h-11 px-3 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand">
                  {DIFFICULTIES.map(d => <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                </select>
              </div>
              <TextField id="q-mark" label="Marks" type="number" min={1} required value={qForm.mark} onChange={e => setQForm({ ...qForm, mark: e.target.value })} />
            </div>
            <TextField id="q-topic" label="Topic (optional)" value={qForm.topic} onChange={e => setQForm({ ...qForm, topic: e.target.value })} />

            {qForm.question_type === 'mcq' && (
              <fieldset>
                <legend className="block text-sm font-medium text-ink mb-1.5">Options</legend>
                {qForm.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2 mb-1.5">
                    <span className="text-[13px] font-semibold text-muted w-5">{String.fromCharCode(65 + oi)}.</span>
                    <input aria-label={`Option ${String.fromCharCode(65 + oi)}`} value={opt}
                      onChange={e => { const opts = [...qForm.options]; opts[oi] = e.target.value; setQForm({ ...qForm, options: opts }); }}
                      className="flex-1 h-10 px-3 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand" />
                  </div>
                ))}
              </fieldset>
            )}

            <div>
              <label htmlFor="q-answer" className="block text-sm font-medium text-ink mb-1.5">Correct answer</label>
              {qForm.question_type === 'mcq' ? (
                <select id="q-answer" value={qForm.correct_answer} onChange={e => setQForm({ ...qForm, correct_answer: e.target.value })} required
                  className="w-full h-11 px-3 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand">
                  <option value="">Choose the correct option</option>
                  {qForm.options.filter(o => o.trim()).map((opt, oi) => <option key={oi} value={opt}>{String.fromCharCode(65 + oi)}. {opt}</option>)}
                </select>
              ) : qForm.question_type === 'true_false' ? (
                <select id="q-answer" value={qForm.correct_answer} onChange={e => setQForm({ ...qForm, correct_answer: e.target.value })} required
                  className="w-full h-11 px-3 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand">
                  <option value="">Choose</option>
                  <option value="True">True</option>
                  <option value="False">False</option>
                </select>
              ) : (
                <input id="q-answer" value={qForm.correct_answer} onChange={e => setQForm({ ...qForm, correct_answer: e.target.value })} required
                  className="w-full h-11 px-3 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand" />
              )}
            </div>

            {qForm.question_type === 'short_answer' && (
              <div>
                <label htmlFor="q-accepted" className="block text-sm font-medium text-ink mb-1.5">Other answers that are also right (optional)</label>
                <textarea id="q-accepted" value={qForm.accepted} onChange={e => setQForm({ ...qForm, accepted: e.target.value })} rows={2}
                  placeholder="One answer on each line"
                  className="w-full px-3 py-2 rounded border border-line bg-surface text-sm text-ink outline-none focus:border-brand" />
                <p className="text-[13px] text-muted mt-1">Capitals and spaces are ignored. Numbers match as numbers, so 1540 and 1,540 are the same.</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editQId ? 'Update question' : 'Add question'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

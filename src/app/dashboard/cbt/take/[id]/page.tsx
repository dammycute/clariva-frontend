'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';

interface Exam {
  id: string; title: string; subject_name?: string;
  duration_mins: number; question_count: number;
  instructions: string; shuffle_questions: boolean; shuffle_options: boolean;
  pass_mark: number; status: string;
}

interface Question {
  id: string; body: string; question_type: string;
  options: string[] | null; mark: number;
}

export default function TakeExamPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; total: number; passed: boolean } | null>(null);
  const [tabWarnings, setTabWarnings] = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const ex = await api.exams.get(id) as Exam;
        if (ex.status !== 'published' && ex.status !== 'ongoing') {
          alert('This exam is not available.');
          router.push('/dashboard/cbt');
          return;
        }
        setExam(ex);
        setTimeLeft(ex.duration_mins * 60);
        const qs = await api.questions.list({ exam: id });
        let qArr = Array.isArray(qs) ? qs as Question[] : [];
        if (ex.shuffle_questions) qArr = qArr.sort(() => Math.random() - 0.5);
        if (ex.shuffle_options) qArr = qArr.map(q => ({
          ...q,
          options: q.options ? [...q.options].sort(() => Math.random() - 0.5) : null,
        }));
        setQuestions(qArr);
      } catch { router.push('/dashboard/cbt'); }
      finally { setLoading(false); }
    })();

    const handleVisibility = () => {
      if (document.hidden) setTabWarnings(w => w + 1);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id, router]);

  useEffect(() => {
    if (timeLeft <= 0 || submitted) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timerRef.current!); handleSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [timeLeft, submitted]);

  async function handleSubmit() {
    if (submitted) return;
    setSubmitted(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const payload = {
        exam: id,
        answers: answers,
        tab_switches: tabWarnings,
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      };
      const session = await api.examSessions.create(payload) as { score: number; total_marks: number; passed: boolean };
      setResult({ score: session.score, total: session.total_marks, passed: session.passed });
    } catch {
      setResult({ score: 0, total: 0, passed: false });
    }
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  if (loading) return <div className="text-sm text-[#64748B] p-8">Loading exam…</div>;
  if (result) {
    const pct = result.total > 0 ? Math.round((result.score / result.total) * 100) : 0;
    return (
      <div className="max-w-lg mx-auto mt-12">
        <div className="bg-white border border-[#DDE5F0] rounded-2xl p-8 text-center">
          <div className={`text-5xl mb-4 ${result.passed ? '' : ''}`}>{result.passed ? '🎉' : '😔'}</div>
          <h2 className="text-xl font-bold text-[#0D2B55] mb-2">{result.passed ? 'Congratulations!' : 'Not this time'}</h2>
          <p className="text-xs text-[#64748B] mb-5">{result.passed ? 'You passed the exam.' : 'You did not meet the pass mark.'}</p>
          <div className="flex items-center justify-center gap-8 mb-5">
            <div>
              <p className="text-3xl font-bold text-[#0D2B55]">{result.score}/{result.total}</p>
              <p className="text-[10px] text-[#64748B]">Score</p>
            </div>
            <div>
              <p className={`text-3xl font-bold ${pct >= (exam?.pass_mark || 40) ? 'text-[#1A7A4A]' : 'text-[#B91C1C]'}`}>{pct}%</p>
              <p className="text-[10px] text-[#64748B]">Percentage</p>
            </div>
          </div>
          <div className="h-2.5 bg-[#F0F4FA] rounded-full overflow-hidden mb-5">
            <div className={`h-full rounded-full ${pct >= (exam?.pass_mark || 40) ? 'bg-[#1A7A4A]' : 'bg-[#B91C1C]'}`} style={{ width: `${pct}%` }} />
          </div>
          <button onClick={() => router.push('/dashboard/cbt')} className="text-sm px-5 py-2.5 rounded-lg bg-[#0D2B55] text-white hover:bg-[#0A1F3D]">Back to Exams</button>
        </div>
      </div>
    );
  }

  const answered = Object.keys(answers).length;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header bar */}
      <div className="bg-white border border-[#DDE5F0] rounded-xl p-4 mb-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-base font-bold text-[#0D2B55]">{exam?.title}</h1>
          <p className="text-[10px] text-[#64748B]">{exam?.subject_name} · {answered}/{questions.length} answered</p>
        </div>
        <div className="flex items-center gap-4">
          {tabWarnings > 0 && <span className="text-[10px] text-[#D4930A] font-bold">⚠ Tab switches: {tabWarnings}</span>}
          <div className={`text-lg font-bold font-mono ${timeLeft < 120 ? 'text-[#B91C1C]' : 'text-[#0D2B55]'}`}>{formatTime(timeLeft)}</div>
          <button onClick={() => { if (confirm('Submit exam?')) handleSubmit(); }}
            className="text-sm px-4 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D]">
            Submit
          </button>
        </div>
      </div>

      {questions.map((q, i) => (
        <div key={q.id} className="bg-white border border-[#DDE5F0] rounded-xl p-4 mb-3">
          <p className="text-sm font-semibold text-[#0D2B55] mb-3">
            {i + 1}. {q.body}
            <span className="text-[10px] text-[#64748B] font-normal ml-2">({q.mark} mark{q.mark > 1 ? 's' : ''})</span>
          </p>

          {q.question_type === 'mcq' && q.options && (
            <div className="space-y-1.5">
              {q.options.map((opt, oi) => (
                <label key={oi} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                  answers[q.id] === opt ? 'border-[#1A7A4A] bg-[#DCFCE7]' : 'border-[#DDE5F0] hover:bg-[#F8FAFF]'
                }`}>
                  <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt}
                    onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                    className="w-4 h-4 text-[#1A7A4A] border-[#DDE5F0] focus:ring-[#1A7A4A]" />
                  <span>{String.fromCharCode(65 + oi)}. {opt}</span>
                </label>
              ))}
            </div>
          )}

          {q.question_type === 'true_false' && (
            <div className="flex gap-3">
              {['True', 'False'].map(v => (
                <label key={v} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border cursor-pointer text-sm transition-colors ${
                  answers[q.id] === v ? 'border-[#1A7A4A] bg-[#DCFCE7]' : 'border-[#DDE5F0] hover:bg-[#F8FAFF]'
                }`}>
                  <input type="radio" name={q.id} value={v} checked={answers[q.id] === v}
                    onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
                    className="w-4 h-4 text-[#1A7A4A]" />
                  {v}
                </label>
              ))}
            </div>
          )}

          {q.question_type === 'short_answer' && (
            <textarea value={answers[q.id] || ''} onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
              placeholder="Type your answer…" rows={2}
              className="w-full px-3 py-2 rounded-lg border border-[#DDE5F0] text-sm outline-none focus:border-[#1A7A4A]" />
          )}
        </div>
      ))}

      <div className="text-center py-4">
        <button onClick={() => { if (confirm('Submit exam?')) handleSubmit(); }}
          className="text-sm px-6 py-2.5 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D]">
          Submit Exam ({answered}/{questions.length} answered)
        </button>
      </div>
    </div>
  );
}

import Link from 'next/link';

export const metadata = { title: 'Terms of service | Clarriva' };

const SECTIONS: { title: string; body: string[] }[] = [
  {
    title: 'What Clarriva is',
    body: [
      'Clarriva is a school management service. Schools use it to manage students, staff, fees, attendance, grades, timetables and computer-based tests. Parents, guardians and students use it to see their own records.',
    ],
  },
  {
    title: 'Accounts',
    body: [
      'A school administrator creates the school and decides who gets access. You are responsible for keeping your password and access codes private. Tell your school administrator straight away if you think someone else has used your account.',
    ],
  },
  {
    title: 'School and student information',
    body: [
      'Each school owns the records it enters. Clarriva keeps each school\'s records separate from every other school\'s. A school is responsible for entering correct information and for having the right to enter it, including information about children.',
      'People only see what their role allows. A parent sees their own child\'s records. A student sees their own records. Staff see what their role needs.',
    ],
  },
  {
    title: 'Using the service properly',
    body: [
      'Do not try to see another school\'s or another person\'s records. Do not try to break, overload or bypass the security of the service. Do not use it to harass anyone or to share anything unlawful.',
    ],
  },
  {
    title: 'Changes and availability',
    body: [
      'We work to keep Clarriva available, but we cannot promise it will never be interrupted. We may change or improve the service. If these terms change in a way that matters, schools will be told.',
    ],
  },
  {
    title: 'Questions',
    body: [
      'If you are a parent, student or teacher, ask your school administrator. School administrators can contact Clarriva support.',
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-dvh bg-page">
      <main className="max-w-2xl mx-auto px-6 py-10">
        <Link href="/" className="text-lg font-semibold text-ink">Clarriva</Link>

        <h1 className="text-3xl font-semibold text-ink tracking-tight mt-10 text-balance">Terms of service</h1>

        <p role="note" className="mt-4 text-[13px] text-warning bg-warning/10 border border-warning/30 rounded px-3 py-2.5">
          Draft. These terms have not been reviewed by a lawyer. Have them checked before you rely on them.
        </p>

        <div className="mt-8 space-y-8">
          {SECTIONS.map(s => (
            <section key={s.title}>
              <h2 className="text-[15px] font-semibold text-ink mb-2">{s.title}</h2>
              <div className="space-y-3 text-sm text-ink/90 leading-relaxed max-w-[65ch]">
                {s.body.map(p => <p key={p}>{p}</p>)}
              </div>
            </section>
          ))}
        </div>

        <p className="text-[13px] text-muted mt-12 pt-6 border-t border-line">
          <Link href="/onboard" className="underline underline-offset-2 hover:text-ink">Back to setup</Link>
          {' · '}
          <Link href="/login" className="underline underline-offset-2 hover:text-ink">Sign in</Link>
        </p>
      </main>
    </div>
  );
}

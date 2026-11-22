import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Clariva: school management for Nigerian secondary schools',
  description:
    'Student records, attendance, results, fees and computer-based tests in one place. Built for JSS and SS schools in Nigeria. Exams keep working when the internet drops.',
  openGraph: {
    title: 'Clariva: run your school with clarity',
    description: 'Records, results, fees and CBT exams for Nigerian secondary schools.',
    images: [{ url: '/images/classroom-hero.jpg', width: 1600, height: 1082, alt: 'Students at their desks in a Nigerian classroom' }],
  },
};

const PEOPLE = [
  ['School admin', 'Students, classes, staff, fees and results in one place, with a log of every change.'],
  ['Teachers', 'Mark attendance, enter scores and set computer-based tests for your own subjects.'],
  ['Bursar', 'One invoice per student, payments recorded with a receipt, and a report of who still owes.'],
  ['Students', 'See results, timetable and attendance, and sit exams on a phone or a computer.'],
  ['Parents', "Check a child's report card and fees from the guardian page."],
] as const;

const STRENGTHS = [
  ['Exams that survive a bad connection',
    'Answers are saved on the device as students type. If the network drops they keep going, and everything is sent when it returns. Scores go straight into the grade book.'],
  ['Fees that add up',
    'Add Tuition and Interhouse and each student gets one invoice with both lines. Part payments are tracked, and the outstanding report can be filtered by class.'],
  ['Scores out of 100, your way',
    'CA 1, CA 2, assignment and exam, with the split your school uses, for example 10, 10, 10 and 70. Report cards follow from the scores.'],
] as const;

const STEPS = [
  'Create your school account.',
  'Add your classes and import students from a CSV file. Admission numbers are generated for you.',
  'Create accounts for staff and students, and start your term.',
] as const;

const FAQ = [
  ['Do students need their own accounts?',
    'Yes, for results and exams. The admin creates accounts for a whole class in one step, and students sign in with their admission number.'],
  ['Can we bring our existing student list?',
    'Yes. Upload a CSV file with names, class and guardian details. Each import reports any row it could not use.'],
  ['What happens if the internet drops during an exam?',
    'The student keeps answering. Answers are kept on the device and sent when the connection returns. Reloading the page does not lose them. The time limit is still enforced by the server.'],
  ['Is there an app to install?',
    'No. Clariva runs in the browser on phones and computers.'],
] as const;

const BTN = 'inline-flex items-center justify-center h-11 px-5 rounded text-sm font-medium transition-opacity';
const PRIMARY = `${BTN} bg-brand text-brand-ink hover:opacity-90`;
const SECONDARY = `${BTN} border border-line bg-surface text-ink hover:bg-surface-2`;

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-page text-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-surface focus:px-3 focus:py-2 focus:rounded">
        Skip to content
      </a>

      <header className="border-b border-line">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight">Clariva</Link>
          <nav aria-label="Main" className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-muted hover:text-ink py-3">Sign in</Link>
            <Link href="/onboard" className={`${PRIMARY} hidden sm:inline-flex`}>Set up your school</Link>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="max-w-6xl mx-auto px-5 py-12 lg:py-20 grid lg:grid-cols-[1fr_1.1fr] gap-10 lg:gap-14 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-balance leading-[1.1]">
              Run your school with clarity
            </h1>
            <p className="mt-5 text-lg text-muted max-w-[34ch] sm:max-w-[44ch] text-pretty">
              Students, attendance, results, fees and computer-based tests for Nigerian secondary schools. One system for your office, your teachers, your students and their parents.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/onboard" className={PRIMARY}>Set up your school</Link>
              <Link href="/login" className={SECONDARY}>Sign in</Link>
            </div>
            <p className="mt-4 text-[13px] text-muted">30-day trial. Your records stay separate from every other school&apos;s.</p>
          </div>
          <Image
            src="/images/classroom-hero.jpg"
            alt="Two students in white and blue uniforms share an exercise book at their desk, with a full classroom behind them"
            width={1600}
            height={1082}
            priority
            sizes="(min-width: 1024px) 560px, 100vw"
            className="w-full h-auto rounded"
          />
        </section>

        <section className="border-y border-line bg-surface">
          <div className="max-w-6xl mx-auto px-5 py-14 grid lg:grid-cols-[1fr_1.4fr] gap-8">
            <h2 className="text-2xl font-semibold tracking-tight text-balance">Most schools run on notebooks and spreadsheets</h2>
            <p className="text-muted text-pretty max-w-[60ch]">
              Scores sit in one file, fees in another notebook, attendance on paper. At the end of term someone spends days putting it together, and nobody is sure the numbers match. Clariva keeps it all in one place, so a parent, a teacher and the bursar are looking at the same record.
            </p>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-5 py-14" aria-labelledby="people">
          <h2 id="people" className="text-2xl font-semibold tracking-tight">What each person gets</h2>
          <dl className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-8">
            {PEOPLE.map(([who, what]) => (
              <div key={who} className="border-t border-line pt-4">
                <dt className="font-semibold">{who}</dt>
                <dd className="mt-1.5 text-muted text-[15px] text-pretty">{what}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="border-y border-line bg-surface" aria-labelledby="fit">
          <div className="max-w-6xl mx-auto px-5 py-14">
            <h2 id="fit" className="text-2xl font-semibold tracking-tight">Built for how Nigerian schools work</h2>
            <div className="mt-8 grid lg:grid-cols-3 gap-10">
              {STRENGTHS.map(([title, body]) => (
                <div key={title}>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-2 text-muted text-[15px] text-pretty">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-5 py-14 grid lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Your data stays yours</h2>
            <p className="mt-3 text-muted text-pretty max-w-[52ch]">
              Each school&apos;s records are kept apart from every other school. Phone numbers, guardian details and exam answers are encrypted in the database. Every change is logged with who made it. Only the right roles can change fees, scores and exams.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Start in three steps</h2>
            <ol className="mt-3 space-y-3 list-decimal pl-5 text-muted marker:text-ink marker:font-semibold">
              {STEPS.map(s => <li key={s} className="pl-1 text-pretty">{s}</li>)}
            </ol>
          </div>
        </section>

        <section className="border-t border-line bg-surface" aria-labelledby="faq">
          <div className="max-w-3xl mx-auto px-5 py-14">
            <h2 id="faq" className="text-2xl font-semibold tracking-tight">Questions</h2>
            <div className="mt-6 divide-y divide-line border-y border-line">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group py-1.5">
                  <summary className="cursor-pointer font-medium list-none flex items-center justify-between gap-4 min-h-11">
                    {q}
                    <span aria-hidden="true" className="text-muted group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="mt-2 text-muted text-[15px] text-pretty">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-[#0D2B55] text-white">
          <div className="max-w-6xl mx-auto px-5 py-14 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <h2 className="text-2xl font-semibold tracking-tight text-balance max-w-[24ch]">Try Clariva with your school this term</h2>
            <div className="flex flex-wrap gap-3">
              <Link href="/onboard" className={`${BTN} bg-white text-[#0D2B55] hover:opacity-90`}>Set up your school</Link>
              <Link href="/login" className={`${BTN} border border-white/40 text-white hover:bg-white/10`}>Sign in</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-5 py-6 flex flex-wrap items-center justify-between gap-3 text-[13px] text-muted">
          <span>Clariva</span>
          <span>
            Photo by Tosin Olowoleni on{' '}
            <a href="https://www.pexels.com/photo/african-students-focused-on-classroom-studies-34162714/" className="underline underline-offset-2 hover:text-ink">Pexels</a>
          </span>
          <nav aria-label="Footer" className="flex gap-4">
            <Link href="/terms" className="hover:text-ink py-3">Terms</Link>
            <Link href="/login" className="hover:text-ink py-3">Sign in</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

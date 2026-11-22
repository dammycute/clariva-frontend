import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight, BookOpen, Banknote, CalendarCheck, CalendarClock, Check, ClipboardList, FileSpreadsheet,
  GraduationCap, History, KeyRound, Layers, Lock, Megaphone, MessageCircle, MonitorCheck, UserCheck, Users,
} from 'lucide-react';
import { Reveal } from '@/components/landing/reveal';
import { DemoForm } from '@/components/landing/demo-form';
import { PricingCalculator } from '@/components/landing/pricing-calculator';
import { PRICE_PER_BLOCK, WHATSAPP_DISPLAY, WHATSAPP_LINK, naira, rangeFor } from '@/lib/pricing';
import { CbtIllustration, FeesIllustration, ResultsIllustration } from '@/components/landing/illustrations';

export const metadata: Metadata = {
  title: 'Clariva: school management for Nigerian secondary schools',
  description:
    'Student records, attendance, results, fees and computer-based tests in one platform. Built for JSS and SS schools in Nigeria. Exams keep working when the internet drops.',
  openGraph: {
    title: 'Clariva: run your school with clarity',
    description: 'Records, results, fees and CBT exams for Nigerian secondary schools.',
    images: [{ url: '/images/classroom-hero.jpg', width: 1600, height: 1082, alt: 'Students at their desks in a Nigerian classroom' }],
  },
};

const BEFORE = [
  [FileSpreadsheet, 'Scores in spreadsheets'],
  [BookOpen, 'Fees in notebooks'],
  [ClipboardList, 'Attendance on paper'],
] as const;

const FEATURES = [
  [Users, 'Student records', 'Profiles, classes and guardians in one place. Import a whole class from a CSV file; admission numbers are generated for you.'],
  [CalendarCheck, 'Attendance', "Mark daily attendance by class and follow each student's attendance rate."],
  [GraduationCap, 'Results and report cards', 'Enter CA and exam scores, apply your grade boundaries, and produce report cards with class position.'],
  [Banknote, 'Fees and invoices', 'One invoice per student, part payments, printable receipts and an outstanding report by class.'],
  [MonitorCheck, 'CBT exams', 'Multiple choice, true or false and short answer, marked automatically and posted to the grade book.'],
  [CalendarClock, 'Timetables', 'Class timetables that teachers and students check from their own portal.'],
  [UserCheck, 'Parent access', "Parents check a child's report card and fees from the guardian page."],
  [Megaphone, 'Announcements', 'Publish notices for the audience you choose.'],
  [KeyRound, 'Staff and roles', 'Accounts for the principal, teachers and bursar, each limited to what their role needs.'],
  [History, 'Audit log and backup', 'Every change is logged with who made it, and admins can back up school data.'],
] as const;

const TRUST = [
  [Layers, 'Separate by school', "Each school's records are kept apart from every other school's."],
  [Lock, 'Encrypted details', 'Phone numbers, guardian details and exam answers are encrypted in the database.'],
  [History, 'Every change logged', 'See who changed what, and when. Only the right roles can change fees, scores and exams.'],
] as const;

const STEPS = [
  ['Request a demo', 'Tell us about your school. We show you the platform and answer your questions.'],
  ['Add classes and students', 'Import students from a CSV file. Admission numbers are generated for you.'],
  ['Open accounts and start the term', 'Create staff and student accounts, then take attendance, set exams and raise fees.'],
] as const;

const FAQ = [
  ['Do students need their own accounts?',
    'Yes, for results and exams. The admin creates accounts for a whole class in one step, and students sign in with their admission number.'],
  ['Can we bring our existing student list?',
    'Yes. Upload a CSV file with names, class and guardian details. Each import reports any row it could not use.'],
  ['What happens if the internet drops during an exam?',
    'The student keeps answering. Answers are kept on the device and sent when the connection returns. Reloading the page does not lose them. The time limit is still enforced by the server.'],
  ['How is the price worked out?',
    `${naira(PRICE_PER_BLOCK)} per term for every block of 50 students. A school can be up to 10 students over its last block at no extra cost, so 60 students is one block and 110 is two.`],
  ['Is there an app to install?',
    'No. Clariva runs in the browser on phones and computers.'],
] as const;

const BTN = 'inline-flex items-center justify-center gap-2 h-11 px-5 rounded text-sm font-medium transition-[opacity,transform] duration-150 active:scale-[0.98]';
const PRIMARY = `${BTN} bg-brand text-brand-ink hover:opacity-90`;
const SECONDARY = `${BTN} border border-line bg-surface text-ink hover:bg-surface-2`;
const H2 = 'text-2xl sm:text-3xl font-semibold tracking-tight text-balance';

function Spotlight({ kicker, title, body, points, art, flip }: {
  kicker: string; title: string; body: string; points: readonly string[]; art: React.ReactNode; flip?: boolean;
}) {
  return (
    <div className="max-w-6xl mx-auto px-5 py-14 lg:py-20 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
      <Reveal className={flip ? 'lg:order-2' : ''}>
        <p className="text-[13px] font-semibold text-brand">{kicker}</p>
        <h3 className={`${H2} mt-2`}>{title}</h3>
        <p className="mt-4 text-muted text-pretty max-w-[52ch]">{body}</p>
        <ul className="mt-5 space-y-2.5">
          {points.map(p => (
            <li key={p} className="flex gap-2.5 text-[15px] text-ink">
              <Check size={18} className="mt-0.5 shrink-0 text-success" aria-hidden="true" /> {p}
            </li>
          ))}
        </ul>
      </Reveal>
      <Reveal delay={120}>{art}</Reveal>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-page text-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-surface focus:px-3 focus:py-2 focus:rounded">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-page">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-semibold tracking-tight">Clariva</Link>
          <nav aria-label="Main" className="flex items-center gap-5">
            <a href="#features" className="hidden md:block text-sm text-muted hover:text-ink py-3">Features</a>
            <a href="#start" className="hidden md:block text-sm text-muted hover:text-ink py-3">How it works</a>
            <a href="#pricing" className="hidden md:block text-sm text-muted hover:text-ink py-3">Pricing</a>
            <a href="#faq" className="hidden md:block text-sm text-muted hover:text-ink py-3">Questions</a>
            <Link href="/login" className="text-sm text-muted hover:text-ink py-3">Sign in</Link>
            <a href="#demo" className={`${PRIMARY} hidden sm:inline-flex`}>Request a demo</a>
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="max-w-6xl mx-auto px-5 py-12 lg:py-20 grid lg:grid-cols-[1fr_1.1fr] gap-12 lg:gap-14 items-center">
          <div>
            <p className="rise inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1 text-[13px] text-muted">
              <span className="size-1.5 rounded-full bg-success" aria-hidden="true" /> Built for JSS and SS schools in Nigeria
            </p>
            <h1 className="rise mt-5 text-4xl sm:text-5xl lg:text-[3.4rem] font-semibold tracking-tight text-balance leading-[1.08]" style={{ '--d': '80ms' } as React.CSSProperties}>
              Run your school with clarity
            </h1>
            <p className="rise mt-5 text-lg text-muted max-w-[46ch] text-pretty" style={{ '--d': '160ms' } as React.CSSProperties}>
              Clariva brings student records, attendance, results, fees and computer-based tests into one secure platform, so your office, teachers, students and parents work from the same record.
            </p>
            <div className="rise mt-8 flex flex-wrap gap-3" style={{ '--d': '240ms' } as React.CSSProperties}>
              <a href="#demo" className={PRIMARY}>Request a demo <ArrowRight size={16} aria-hidden="true" /></a>
              <a href="#pricing" className={SECONDARY}>See pricing</a>
            </div>
            <p className="rise mt-4 text-[13px] text-muted" style={{ '--d': '320ms' } as React.CSSProperties}>From {naira(PRICE_PER_BLOCK)} per term for every 50 students. Your records stay separate from every other school&apos;s.</p>
          </div>

          <div className="rise relative" style={{ '--d': '200ms' } as React.CSSProperties}>
            <Image
              src="/images/classroom-hero.jpg"
              alt="Two students in white and blue uniforms share an exercise book at their desk, with a full classroom behind them"
              width={1600}
              height={1082}
              priority
              sizes="(min-width: 1024px) 560px, 100vw"
              className="w-full h-auto rounded"
            />
            <div className="float-slow absolute left-3 bottom-3 sm:-left-5 sm:bottom-8 flex items-center gap-2 rounded border border-line bg-surface px-3 py-2 text-[13px] font-medium text-ink">
              <Check size={16} className="text-success" aria-hidden="true" /> All answers saved
            </div>
            <div className="float-slow absolute right-3 top-3 sm:-right-4 sm:top-8 flex items-center gap-2 rounded border border-line bg-surface px-3 py-2 text-[13px] font-medium text-ink [animation-delay:-3s]">
              <GraduationCap size={16} className="text-brand" aria-hidden="true" /> Report card ready
            </div>
          </div>
        </section>

        <section className="border-y border-line bg-surface">
          <div className="max-w-6xl mx-auto px-5 py-12 grid lg:grid-cols-[1fr_1.3fr] gap-8 items-center">
            <Reveal><h2 className={H2}>Most schools run on notebooks and spreadsheets</h2></Reveal>
            <Reveal delay={100}>
              <ul className="grid sm:grid-cols-3 gap-3">
                {BEFORE.map(([Icon, text]) => (
                  <li key={text} className="flex items-center gap-3 rounded border border-line bg-page px-4 py-3.5 text-[15px] text-ink">
                    <Icon size={20} className="shrink-0 text-muted" aria-hidden="true" /> {text}
                  </li>
                ))}
              </ul>
              <p className="mt-4 text-muted text-[15px] text-pretty">At the end of term someone spends days putting it together, and nobody is sure the numbers match. Clariva keeps it in one place.</p>
            </Reveal>
          </div>
        </section>

        <section id="features" className="max-w-6xl mx-auto px-5 py-16 lg:py-20 scroll-mt-16" aria-labelledby="features-title">
          <Reveal className="max-w-2xl">
            <h2 id="features-title" className={H2}>Everything your school runs on, in one platform</h2>
            <p className="mt-3 text-muted text-pretty">Each person signs in to a portal built for their role: admin, principal, teacher, bursar, student and parent.</p>
          </Reveal>
          <ul className="mt-10 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(([Icon, title, body], i) => (
              <li key={title}>
                <Reveal delay={(i % 3) * 80} className="h-full">
                  <div className="h-full rounded border border-line bg-surface p-5 transition-[border-color,transform] duration-200 hover:border-brand/50 hover:-translate-y-0.5">
                    <Icon size={24} strokeWidth={1.75} className="text-brand" aria-hidden="true" />
                    <h3 className="mt-4 font-semibold">{title}</h3>
                    <p className="mt-1.5 text-muted text-[15px] text-pretty">{body}</p>
                  </div>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-y border-line bg-surface">
          <Spotlight
            kicker="Computer-based tests"
            title="Exams that survive a bad connection"
            body="Answers are saved on the device as students type. If the network drops they keep going, and everything is sent when it returns."
            points={['Reload the page and nothing is lost', 'The time limit is enforced by the server', 'Scores post straight into the grade book']}
            art={<CbtIllustration />}
          />
        </section>
        <Spotlight
          flip
          kicker="Fees"
          title="Fees that add up on one invoice"
          body="Add Tuition and Interhouse and each student gets a single invoice with both lines, instead of a pile of separate bills."
          points={['Part payments and printable receipts', 'Outstanding report, filtered by class', 'New students are billed as soon as they join']}
          art={<FeesIllustration />}
        />
        <section className="border-y border-line bg-surface">
          <Spotlight
            kicker="Results"
            title="Scores out of 100, your way"
            body="CA 1, CA 2, assignment and exam, with the split your school uses. Report cards follow from the scores."
            points={['You choose each component and its maximum', 'Your own grade boundaries', 'Class position on every report card']}
            art={<ResultsIllustration />}
          />
        </section>

        <section className="max-w-6xl mx-auto px-5 py-16 lg:py-20" aria-labelledby="trust-title">
          <Reveal><h2 id="trust-title" className={H2}>Your data stays yours</h2></Reveal>
          <ul className="mt-8 grid md:grid-cols-3 gap-8">
            {TRUST.map(([Icon, title, body], i) => (
              <li key={title}>
                <Reveal delay={i * 90}>
                  <Icon size={22} strokeWidth={1.75} className="text-brand" aria-hidden="true" />
                  <h3 className="mt-3 font-semibold">{title}</h3>
                  <p className="mt-1.5 text-muted text-[15px] text-pretty">{body}</p>
                </Reveal>
              </li>
            ))}
          </ul>
        </section>

        <section id="start" className="border-y border-line bg-surface scroll-mt-16" aria-labelledby="start-title">
          <div className="max-w-6xl mx-auto px-5 py-16 lg:py-20">
            <Reveal><h2 id="start-title" className={H2}>Start in three steps</h2></Reveal>
            <ol className="mt-10 grid md:grid-cols-3 gap-6">
              {STEPS.map(([title, body], i) => (
                <li key={title}>
                  <Reveal delay={i * 100} className="h-full">
                    <div className="h-full rounded border border-line bg-page p-6">
                      <span className="font-mono text-sm font-semibold text-brand">0{i + 1}</span>
                      <h3 className="mt-3 font-semibold">{title}</h3>
                      <p className="mt-1.5 text-muted text-[15px] text-pretty">{body}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="faq" className="scroll-mt-16" aria-labelledby="faq-title">
          <div className="max-w-3xl mx-auto px-5 py-16 lg:py-20">
            <h2 id="faq-title" className={H2}>Questions</h2>
            <div className="mt-6 divide-y divide-line border-y border-line">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group py-1.5">
                  <summary className="cursor-pointer font-medium list-none flex items-center justify-between gap-4 min-h-11">
                    {q}
                    <span aria-hidden="true" className="text-muted text-xl leading-none group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="pb-3 text-muted text-[15px] text-pretty">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="border-y border-line bg-surface scroll-mt-16" aria-labelledby="pricing-title">
          <div className="max-w-6xl mx-auto px-5 py-16 lg:py-20 grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <Reveal>
              <h2 id="pricing-title" className={H2}>Simple pricing that grows with your school</h2>
              <p className="mt-3 text-muted text-pretty max-w-[52ch]">
                {naira(PRICE_PER_BLOCK)} per term for every block of 50 students. Every feature is included. A school can be up to 10 students over its last block at no extra cost.
              </p>
              <table className="mt-6 w-full max-w-md text-[15px]">
                <caption className="sr-only">Price per term by number of students</caption>
                <thead><tr className="text-left text-[13px] text-muted"><th scope="col" className="py-2 font-medium">Students</th><th scope="col" className="py-2 text-right font-medium">Per term</th></tr></thead>
                <tbody className="divide-y divide-line border-y border-line">
                  {[1, 2, 3].map(b => {
                    const [from, to] = rangeFor(b);
                    return <tr key={b}><td className="py-3 text-ink">{from} to {to}</td><td className="py-3 text-right font-semibold tabular-nums text-ink">{naira(b * PRICE_PER_BLOCK)}</td></tr>;
                  })}
                  <tr><td className="py-3 text-muted">More than 160</td><td className="py-3 text-right text-muted">{naira(PRICE_PER_BLOCK)} for each extra 50</td></tr>
                </tbody>
              </table>
            </Reveal>
            <Reveal delay={120}><PricingCalculator /></Reveal>
          </div>
        </section>

        <section id="demo" className="bg-[#0D2B55] scroll-mt-16" aria-labelledby="demo-title">
          <div className="max-w-6xl mx-auto px-5 py-16 lg:py-20 grid lg:grid-cols-[1fr_1.3fr] gap-10 lg:gap-16 items-start">
            <Reveal className="text-white">
              <h2 id="demo-title" className="text-2xl sm:text-3xl font-semibold tracking-tight text-balance">See Clariva running for a school like yours</h2>
              <p className="mt-4 text-white/80 text-pretty max-w-[44ch]">Tell us a little about your school. We will show you the platform and answer your questions, with no obligation.</p>
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded border border-white/40 px-4 h-11 text-sm font-medium hover:bg-white/10">
                <MessageCircle size={16} aria-hidden="true" /> WhatsApp {WHATSAPP_DISPLAY}
              </a>
            </Reveal>
            <Reveal delay={120}><DemoForm /></Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-5 py-6 grid gap-3 sm:grid-cols-3 sm:items-center text-[13px] text-muted">
          <span>© Clariva</span>
          <span className="sm:text-center">
            Powered by{' '}
            <a href="https://www.studio8six.com" target="_blank" rel="noopener noreferrer" className="font-medium text-ink underline underline-offset-2 hover:opacity-80">Studio8six</a>
          </span>
          <nav aria-label="Footer" className="flex gap-4 sm:justify-end">
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-ink py-3">WhatsApp</a>
            <Link href="/terms" className="hover:text-ink py-3">Terms</Link>
            <Link href="/login" className="hover:text-ink py-3">Sign in</Link>
          </nav>
        </div>
        <p className="max-w-6xl mx-auto px-5 pb-5 text-xs text-muted">
          Photo by Tosin Olowoleni on{' '}
          <a href="https://www.pexels.com/photo/african-students-focused-on-classroom-studies-34162714/" className="underline underline-offset-2 hover:text-ink">Pexels</a>.
        </p>
      </footer>
    </div>
  );
}

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
import { CbtIllustration, FeesIllustration, ResultsIllustration } from '@/components/landing/illustrations';
import { BLOCK_SIZE, PRICE_PER_BLOCK, WHATSAPP_DISPLAY, WHATSAPP_LINK, naira, rangeFor } from '@/lib/pricing';

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

// Full class names, so Tailwind can see them.
const TINTS = ['bg-[var(--tint-sky)]', 'bg-[var(--tint-mint)]', 'bg-[var(--tint-gold)]', 'bg-[var(--tint-peach)]', 'bg-[var(--tint-lilac)]'] as const;

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
    `${naira(PRICE_PER_BLOCK)} per term for every block of ${BLOCK_SIZE} students. Students are counted in whole blocks: ${BLOCK_SIZE} students is one block, ${BLOCK_SIZE + 1} is two.`],
  ['Is there an app to install?',
    'No. Clariva runs in the browser on phones and computers.'],
] as const;

const BTN = 'inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full text-[15px] font-medium transition-[opacity,transform,background-color] duration-150 active:scale-[0.98]';
const PRIMARY = `${BTN} bg-ink text-page hover:opacity-85`;
const SECONDARY = `${BTN} border border-ink/20 bg-surface text-ink hover:bg-surface-2`;
const H2 = 'font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-balance leading-[1.1]';
const TILE = (i: number) => TINTS[i % TINTS.length];

function Spotlight({ kicker, title, body, points, art, flip, tint }: {
  kicker: string; title: string; body: string; points: readonly string[]; art: React.ReactNode; flip?: boolean; tint: number;
}) {
  return (
    <div className="max-w-6xl mx-auto px-5 py-16 lg:py-24 grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
      <Reveal className={flip ? 'lg:order-2' : ''}>
        <p className={`inline-block rounded-full px-3 py-1 text-[13px] font-medium text-ink ${TILE(tint)}`}>{kicker}</p>
        <h3 className={`${H2} mt-4`}>{title}</h3>
        <p className="mt-4 text-muted text-lg text-pretty max-w-[48ch]">{body}</p>
        <ul className="mt-6 space-y-3">
          {points.map(p => (
            <li key={p} className="flex gap-3 text-[15px] text-ink">
              <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${TILE(tint)}`}><Check size={13} aria-hidden="true" /></span> {p}
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
    <div className="landing min-h-dvh text-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-surface focus:px-3 focus:py-2 focus:rounded">
        Skip to content
      </a>

      <header className="sticky top-0 z-40 border-b border-line bg-page/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-5 h-[72px] flex items-center justify-between gap-6">
          <Link href="/" className="font-display text-2xl font-semibold tracking-tight">Clariva</Link>
          <nav aria-label="Main" className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[15px] text-muted hover:text-ink py-3">Features</a>
            <a href="#start" className="text-[15px] text-muted hover:text-ink py-3">How it works</a>
            <a href="#pricing" className="text-[15px] text-muted hover:text-ink py-3">Pricing</a>
            <a href="#faq" className="text-[15px] text-muted hover:text-ink py-3">Questions</a>
          </nav>
          <div className="flex items-center gap-2.5">
            <Link href="/login" className={`${SECONDARY} !h-10 !px-4 !text-sm`}>Sign in</Link>
            <a href="#demo" className={`${PRIMARY} !h-10 !px-4 !text-sm`}>Request a demo</a>
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="hero-glow" aria-hidden="true" />
          <div className="relative z-10 max-w-6xl mx-auto px-5 pt-14 pb-16 lg:pt-24 lg:pb-24 grid lg:grid-cols-[1.05fr_1fr] gap-14 lg:gap-12 items-center">
            <div>
              <p className="rise inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] text-muted">
                <span className="size-1.5 rounded-full bg-success" aria-hidden="true" /> Built for JSS and SS schools in Nigeria
              </p>
              <h1 className="rise mt-6 font-display text-[2.8rem] sm:text-6xl lg:text-7xl font-semibold tracking-tight text-balance leading-[1.04]" style={{ '--d': '80ms' } as React.CSSProperties}>
                Run your school with{' '}
                <span className="relative inline-block">
                  clarity
                  <svg className="scribble absolute left-0 -bottom-1 h-3 w-full text-[#D4930A]" viewBox="0 0 200 12" fill="none" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M2 8 C 40 2, 80 12, 120 5 S 180 4, 198 7" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
                  </svg>
                </span>
              </h1>
              <p className="rise mt-6 text-lg sm:text-xl text-muted max-w-[44ch] text-pretty" style={{ '--d': '160ms' } as React.CSSProperties}>
                Student records, attendance, results, fees and computer-based tests in one secure platform, so your office, teachers, students and parents work from the same record.
              </p>
              <div className="rise mt-9 flex flex-wrap gap-3" style={{ '--d': '240ms' } as React.CSSProperties}>
                <a href="#demo" className={PRIMARY}>Request a demo <ArrowRight size={17} aria-hidden="true" /></a>
                <a href="#pricing" className={SECONDARY}>See pricing</a>
              </div>
              <p className="rise mt-5 text-sm text-muted" style={{ '--d': '320ms' } as React.CSSProperties}>From {naira(PRICE_PER_BLOCK)} per term for every {BLOCK_SIZE} students.</p>
            </div>

            <div className="rise relative" style={{ '--d': '200ms' } as React.CSSProperties}>
              <div className="rounded-[28px] border border-line bg-surface p-2.5 shadow-[0_30px_60px_-30px_rgba(13,43,85,0.35)]">
                <Image
                  src="/images/classroom-hero.jpg"
                  alt="Two students in white and blue uniforms share an exercise book at their desk, with a full classroom behind them"
                  width={1600}
                  height={1082}
                  priority
                  sizes="(min-width: 1024px) 520px, 100vw"
                  className="w-full h-auto rounded-[20px]"
                />
              </div>
              <div className="float-slow absolute left-3 bottom-8 sm:-left-7 sm:bottom-12 flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-medium shadow-[0_12px_30px_-12px_rgba(13,43,85,0.3)]">
                <span className="grid size-7 place-items-center rounded-full bg-[var(--tint-mint)]"><Check size={15} className="text-success" aria-hidden="true" /></span> All answers saved
              </div>
              <div className="float-slow absolute right-3 top-6 sm:-right-5 sm:top-12 flex items-center gap-2.5 rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-medium shadow-[0_12px_30px_-12px_rgba(13,43,85,0.3)] [animation-delay:-3s]">
                <span className="grid size-7 place-items-center rounded-full bg-[var(--tint-sky)]"><GraduationCap size={15} className="text-brand" aria-hidden="true" /></span> Report card ready
              </div>
            </div>
          </div>
        </section>

        {/* Scrolling list of what is covered */}
        <section aria-label="What Clariva covers" className="border-y border-line bg-surface overflow-hidden">
          <div className="marquee-mask py-5">
            <ul className="marquee flex w-max gap-10 text-[15px] text-muted">
              {[0, 1].map(copy => FEATURES.map(([Icon, title]) => (
                <li key={`${copy}-${title}`} aria-hidden={copy === 1 ? 'true' : undefined} className={`flex items-center gap-2.5 whitespace-nowrap ${copy === 1 ? 'marquee-dup' : ''}`}>
                  <Icon size={18} strokeWidth={1.75} className="text-brand" aria-hidden="true" /> {title}
                </li>
              )))}
            </ul>
          </div>
        </section>

        {/* The problem */}
        <section className="max-w-6xl mx-auto px-5 py-16 lg:py-24 grid lg:grid-cols-[1fr_1.2fr] gap-10 items-center">
          <Reveal><h2 className={H2}>Most schools still run on notebooks and spreadsheets</h2></Reveal>
          <Reveal delay={100}>
            <ul className="grid sm:grid-cols-3 gap-3">
              {BEFORE.map(([Icon, text], i) => (
                <li key={text} className="rounded-2xl border border-line bg-surface p-5">
                  <span className={`grid size-10 place-items-center rounded-xl ${TILE(i + 3)}`}><Icon size={20} className="text-ink" aria-hidden="true" /></span>
                  <p className="mt-4 text-[15px] font-medium text-ink">{text}</p>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-muted text-pretty">At the end of term someone spends days putting it together, and nobody is sure the numbers match. Clariva keeps it in one place.</p>
          </Reveal>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-line bg-surface-2/60 scroll-mt-20" aria-labelledby="features-title">
          <div className="max-w-6xl mx-auto px-5 py-16 lg:py-24">
            <Reveal className="max-w-2xl">
              <h2 id="features-title" className={H2}>Everything your school runs on, in one platform</h2>
              <p className="mt-4 text-muted text-lg text-pretty">Each person signs in to a portal built for their role: admin, principal, teacher, bursar, student and parent.</p>
            </Reveal>
            <ul className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {FEATURES.map(([Icon, title, body], i) => (
                <li key={title}>
                  <Reveal delay={(i % 3) * 80} className="h-full">
                    <div className="h-full rounded-3xl border border-line bg-surface p-6 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgba(13,43,85,0.35)]">
                      <span className={`grid size-12 place-items-center rounded-2xl ${TILE(i)}`}><Icon size={22} strokeWidth={1.75} className="text-ink" aria-hidden="true" /></span>
                      <h3 className="mt-5 text-lg font-semibold">{title}</h3>
                      <p className="mt-2 text-muted text-[15px] text-pretty">{body}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Spotlights with product windows */}
        <Spotlight
          tint={0}
          kicker="Computer-based tests"
          title="Exams that survive a bad connection"
          body="Answers are saved on the device as students type. If the network drops they keep going, and everything is sent when it returns."
          points={['Reload the page and nothing is lost', 'The time limit is enforced by the server', 'Scores post straight into the grade book']}
          art={<CbtIllustration />}
        />
        <div className="border-y border-line bg-surface-2/60">
          <Spotlight
            flip
            tint={2}
            kicker="Fees"
            title="Fees that add up on one invoice"
            body="Add Tuition and Interhouse and each student gets a single invoice with both lines, instead of a pile of separate bills."
            points={['Part payments and printable receipts', 'Outstanding report, filtered by class', 'New students are billed as soon as they join']}
            art={<FeesIllustration />}
          />
        </div>
        <Spotlight
          tint={1}
          kicker="Results"
          title="Scores out of 100, your way"
          body="CA 1, CA 2, assignment and exam, with the split your school uses. Report cards follow from the scores."
          points={['You choose each component and its maximum', 'Your own grade boundaries', 'Class position on every report card']}
          art={<ResultsIllustration />}
        />

        {/* Trust */}
        <section className="border-y border-line bg-surface" aria-labelledby="trust-title">
          <div className="max-w-6xl mx-auto px-5 py-16 lg:py-24">
            <Reveal><h2 id="trust-title" className={H2}>Your data stays yours</h2></Reveal>
            <ul className="mt-10 grid md:grid-cols-3 gap-4">
              {TRUST.map(([Icon, title, body], i) => (
                <li key={title}>
                  <Reveal delay={i * 90} className="h-full">
                    <div className="h-full rounded-3xl bg-page border border-line p-6">
                      <span className={`grid size-11 place-items-center rounded-2xl ${TILE(i + 1)}`}><Icon size={20} strokeWidth={1.75} className="text-ink" aria-hidden="true" /></span>
                      <h3 className="mt-4 font-semibold text-lg">{title}</h3>
                      <p className="mt-2 text-muted text-[15px] text-pretty">{body}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How it works */}
        <section id="start" className="scroll-mt-20" aria-labelledby="start-title">
          <div className="max-w-6xl mx-auto px-5 py-16 lg:py-24 grid lg:grid-cols-[1fr_1.2fr] gap-12 lg:gap-20">
            <Reveal>
              <h2 id="start-title" className={H2}>From first call to first term in three steps</h2>
              <p className="mt-4 text-muted text-lg text-pretty max-w-[40ch]">Bring your classes and students over from a spreadsheet, then run the term from one place.</p>
            </Reveal>
            <ol>
              {STEPS.map(([title, body], i) => (
                <li key={title} className="relative flex gap-5 pb-10 last:pb-0">
                  {i < STEPS.length - 1 && <span className="dotted-v absolute left-[19px] top-11 bottom-1 w-px" aria-hidden="true" />}
                  <Reveal delay={i * 100} className="flex gap-5">
                    <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full bg-ink font-display text-lg font-semibold text-page">{i + 1}</span>
                    <div className="pt-1.5">
                      <h3 className="font-semibold text-lg">{title}</h3>
                      <p className="mt-1.5 text-muted text-[15px] text-pretty">{body}</p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-y border-line bg-surface-2/60 scroll-mt-20" aria-labelledby="pricing-title">
          <div className="max-w-6xl mx-auto px-5 py-16 lg:py-24">
            <Reveal className="text-center max-w-2xl mx-auto">
              <h2 id="pricing-title" className={H2}>Simple pricing that grows with your school</h2>
              <p className="mt-4 text-muted text-lg text-pretty">{naira(PRICE_PER_BLOCK)} per term for every {BLOCK_SIZE} students.</p>
            </Reveal>
            <div className="mt-12 grid lg:grid-cols-2 gap-5 items-stretch">
              <Reveal className="h-full">
                <div className="h-full rounded-3xl bg-[#0D2B55] p-7 sm:p-9 text-white">
                  <p className="text-sm text-white/70">Per term</p>
                  <p className="mt-2 font-display text-6xl font-semibold tracking-tight">{naira(PRICE_PER_BLOCK)}</p>
                  <p className="mt-1 text-white/80">for every {BLOCK_SIZE} students</p>
                  <table className="mt-8 w-full text-[15px]">
                    <caption className="sr-only">Price per term by number of students</caption>
                    <tbody className="divide-y divide-white/15 border-y border-white/15">
                      {[1, 2, 3].map(b => {
                        const [from, to] = rangeFor(b);
                        return <tr key={b}><td className="py-3 text-white/85">{from} to {to} students</td><td className="py-3 text-right font-semibold tabular-nums">{naira(b * PRICE_PER_BLOCK)}</td></tr>;
                      })}
                      <tr><td className="py-3 text-white/70">More than {3 * BLOCK_SIZE}</td><td className="py-3 text-right text-white/70">{naira(PRICE_PER_BLOCK)} for each extra {BLOCK_SIZE}</td></tr>
                    </tbody>
                  </table>
                  <a href="#demo" className={`${BTN} mt-8 w-full bg-white text-[#0D2B55] hover:opacity-90`}>Request a demo</a>
                </div>
              </Reveal>
              <Reveal delay={120} className="h-full"><PricingCalculator /></Reveal>
            </div>
          </div>
        </section>

        {/* Questions */}
        <section id="faq" className="scroll-mt-20" aria-labelledby="faq-title">
          <div className="max-w-3xl mx-auto px-5 py-16 lg:py-24">
            <h2 id="faq-title" className={`${H2} text-center`}>Questions</h2>
            <div className="mt-10 space-y-3">
              {FAQ.map(([q, a]) => (
                <details key={q} className="group rounded-2xl border border-line bg-surface px-5 py-1.5">
                  <summary className="cursor-pointer font-medium list-none flex items-center justify-between gap-4 min-h-12">
                    {q}
                    <span aria-hidden="true" className="grid size-7 shrink-0 place-items-center rounded-full bg-surface-2 text-lg leading-none text-muted transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="pb-4 text-muted text-[15px] text-pretty">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Demo */}
        <section id="demo" className="px-3 sm:px-5 pb-16 scroll-mt-20" aria-labelledby="demo-title">
          <div className="max-w-6xl mx-auto rounded-[32px] bg-[#0D2B55] px-5 sm:px-10 py-14 lg:py-20 grid lg:grid-cols-[1fr_1.25fr] gap-10 lg:gap-16 items-start">
            <Reveal className="text-white">
              <h2 id="demo-title" className="font-display text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-balance leading-[1.1]">See Clariva running for a school like yours</h2>
              <p className="mt-5 text-white/80 text-lg text-pretty max-w-[40ch]">Tell us a little about your school. We will show you the platform and answer your questions, with no obligation.</p>
              <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/40 px-5 h-12 text-[15px] font-medium hover:bg-white/10">
                <MessageCircle size={17} aria-hidden="true" /> WhatsApp {WHATSAPP_DISPLAY}
              </a>
            </Reveal>
            <Reveal delay={120}><DemoForm /></Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="max-w-6xl mx-auto px-5 py-8 grid gap-4 sm:grid-cols-3 sm:items-center text-[13px] text-muted">
          <span className="font-display text-lg font-semibold text-ink">Clariva</span>
          <span className="sm:text-center">
            Powered by{' '}
            <a href="https://www.studio8six.com" target="_blank" rel="noopener noreferrer" className="font-medium text-ink underline underline-offset-2 hover:opacity-80">Studio8six</a>
          </span>
          <nav aria-label="Footer" className="flex gap-5 sm:justify-end">
            <a href={WHATSAPP_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-ink py-3">WhatsApp</a>
            <Link href="/terms" className="hover:text-ink py-3">Terms</Link>
            <Link href="/login" className="hover:text-ink py-3">Sign in</Link>
          </nav>
        </div>
        <p className="max-w-6xl mx-auto px-5 pb-6 text-xs text-muted">
          © Clariva. Photo by Tosin Olowoleni on{' '}
          <a href="https://www.pexels.com/photo/african-students-focused-on-classroom-studies-34162714/" className="underline underline-offset-2 hover:text-ink">Pexels</a>.
        </p>
      </footer>
    </div>
  );
}

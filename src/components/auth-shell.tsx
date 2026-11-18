import Link from 'next/link';

/**
 * Shared frame for sign-in, onboarding and guardian pages: a flat navy column
 * on large screens and a single scrolling content column everywhere.
 */
export function AuthShell({
  children,
  sideLink,
  aside,
  width = 'max-w-[400px]',
}: {
  children: React.ReactNode;
  /** Optional quiet link at the foot of the navy column. */
  sideLink?: { href: string; label: string };
  /** Replaces the default one-line description in the navy column. */
  aside?: React.ReactNode;
  width?: string;
}) {
  return (
    <div className="min-h-dvh flex bg-page">
      <aside className="hidden lg:flex lg:w-[400px] shrink-0 flex-col justify-between p-10 bg-[#0D2B55] text-white">
        <Link href="/" className="text-2xl font-semibold tracking-tight w-fit">Clariva</Link>
        {aside ?? (
          <p className="text-lg leading-relaxed text-white/85 max-w-[300px] text-pretty">
            School management for fees, attendance, grades and CBT exams.
          </p>
        )}
        {sideLink ? (
          <Link href={sideLink.href} className="text-sm text-white/70 underline underline-offset-4 hover:text-white w-fit">
            {sideLink.label}
          </Link>
        ) : <span />}
      </aside>

      <main className="flex-1 flex justify-center px-6 py-10 lg:px-10 lg:py-16">
        <div className={`w-full ${width} self-start lg:self-center`}>
          <Link href="/" className="lg:hidden block text-xl font-semibold text-ink mb-8 w-fit">Clariva</Link>
          {children}
        </div>
      </main>
    </div>
  );
}

/** Inline error banner used under forms. Announced to screen readers. */
export function FormError({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div role="alert" className="text-[13px] text-danger bg-danger-soft border border-danger/30 rounded px-3 py-2.5">
      {children}
    </div>
  );
}

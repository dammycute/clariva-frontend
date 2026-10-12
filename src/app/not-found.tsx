import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-dvh flex items-center bg-page px-6">
      <div className="w-full max-w-[420px] mx-auto">
        <p className="text-sm text-muted tabular-nums">Error 404</p>
        <h1 className="text-2xl font-semibold text-ink tracking-tight mt-1 text-balance">We couldn&apos;t find that page</h1>
        <p className="text-sm text-muted mt-2 text-pretty">
          The address may be mistyped, or the page may have moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center h-11 px-4 mt-6 rounded bg-brand text-brand-ink text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-[opacity,transform] duration-150"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}

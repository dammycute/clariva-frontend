export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="min-h-dvh flex items-center justify-center">
      <div className="w-40 space-y-2 animate-pulse" aria-hidden="true">
        <div className="h-2 rounded bg-line" />
        <div className="h-2 rounded bg-line w-2/3" />
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}

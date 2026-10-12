export default function Loading() {
  return (
    <div
      role="status"
      aria-label="Loading"
      className="flex items-center justify-center min-h-dvh"
    >
      <div className="w-10 h-10 border-4 border-line border-t-brand rounded-full animate-spin" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

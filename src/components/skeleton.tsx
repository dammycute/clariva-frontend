export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden">
      <div className="p-4 space-y-3">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-4">
            {Array.from({ length: cols }).map((_, c) => (
              <div key={c} className="h-4 bg-[#F0F4FA] rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-[#DDE5F0] rounded-xl p-4 space-y-2">
          <div className="h-3 bg-[#F0F4FA] rounded animate-pulse w-1/2" />
          <div className="h-6 bg-[#F0F4FA] rounded animate-pulse w-1/3" />
        </div>
      ))}
    </div>
  );
}

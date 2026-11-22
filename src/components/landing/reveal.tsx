'use client';

import { useEffect, useRef, useState } from 'react';

/** Fades its children up the first time they scroll into view. Shows at once if motion is reduced. */
export function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setShown(true); io.disconnect(); }
    }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`reveal ${shown ? 'reveal-in' : ''} ${className}`}>
      {children}
    </div>
  );
}

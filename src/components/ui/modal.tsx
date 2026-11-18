'use client';

import { useEffect, useRef, useId } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A dialog that closes on Escape or a click outside, keeps keyboard focus inside while
 * open, and gives focus back to whatever opened it.
 */
export function Modal({
  title, onClose, children, width = 560,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const first = panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first || panel)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
      if (e.key !== 'Tab' || !panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) { e.preventDefault(); lastItem.focus(); }
      else if (!e.shiftKey && document.activeElement === lastItem) { e.preventDefault(); firstItem.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); opener?.focus?.(); };
    // onClose changes every render in most callers; the listener only needs the latest one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onMouseDown={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onMouseDown={e => e.stopPropagation()}
        style={{ width }}
        className="bg-surface border border-line rounded max-w-full max-h-[90vh] overflow-y-auto outline-none"
      >
        <div className="flex items-center justify-between px-5 pt-5">
          <h2 id={titleId} className="text-base font-semibold text-ink">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-muted hover:text-ink text-sm px-2 py-1 cursor-pointer">Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

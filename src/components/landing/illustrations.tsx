import { Check, Timer, WifiOff } from 'lucide-react';

/* Flat product illustrations for the landing page. The names and amounts are samples, not real records.
   They use the app's own colour tokens, so they follow light and dark mode. */

const PANEL = 'rounded border border-line bg-surface-2 p-5 sm:p-8';
const CARD = 'rounded border border-line bg-surface p-4 sm:p-5 text-left text-[13px]';

/** Exam screen. The status line loops between "saved" and "no connection, kept on this device". */
export function CbtIllustration() {
  return (
    <div className={PANEL} role="img" aria-label="Illustration of an exam screen that keeps saving answers on the device when the connection drops">
      <div className={CARD}>
        <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
          <div>
            <p className="font-semibold text-ink">Mathematics CA 1</p>
            <p className="text-muted text-xs">JSS1</p>
          </div>
          <span className="inline-flex items-center gap-1.5 font-mono font-semibold text-ink"><Timer size={15} aria-hidden="true" /> 24:18</span>
        </div>
        <p className="mt-4 text-xs text-muted">Question 7 of 20 · 2 marks</p>
        <p className="mt-1 font-medium text-ink text-sm">Write 3/5 as a decimal.</p>
        <ul className="mt-3 space-y-2">
          {[['A', '0.35', false], ['B', '0.6', true], ['C', '0.8', false]].map(([k, v, on]) => (
            <li key={String(k)} className={`flex items-center gap-2.5 rounded border px-3 py-2.5 ${on ? 'border-brand bg-brand-soft font-medium text-ink' : 'border-line text-ink'}`}>
              <span className="font-semibold">{k}.</span> {v}
            </li>
          ))}
        </ul>
        <div className="relative mt-4 h-7">
          <span className="anim-status-a absolute inset-0 inline-flex items-center gap-1.5 text-success font-medium"><Check size={15} aria-hidden="true" /> All answers saved</span>
          <span className="anim-status-b absolute inset-0 inline-flex items-center gap-1.5 text-warning font-medium"><WifiOff size={15} aria-hidden="true" /> No connection. Kept on this device</span>
        </div>
      </div>
    </div>
  );
}

/** Invoice. A second fee drops in and the total changes, to show fees adding up on one invoice. */
export function FeesIllustration() {
  return (
    <div className={PANEL} role="img" aria-label="Illustration of one invoice with Tuition and Interhouse fees added up to a single total">
      <div className={CARD}>
        <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
          <div>
            <p className="font-semibold text-ink">Amaka Eze</p>
            <p className="text-muted text-xs">JSS1A · First term</p>
          </div>
          <span className="rounded px-2 py-0.5 text-xs font-semibold bg-danger-soft text-danger">Unpaid</span>
        </div>
        <ul className="mt-3 divide-y divide-line">
          <li className="flex justify-between py-2.5"><span className="text-ink">Tuition fee</span><span className="tabular-nums text-ink">₦79,400</span></li>
          <li className="anim-line flex justify-between py-2.5"><span className="text-ink">Interhouse sports</span><span className="tabular-nums text-ink">₦2,000</span></li>
        </ul>
        <div className="flex justify-between items-center border-t border-line pt-3 font-semibold text-ink">
          <span>Total</span>
          <span className="relative h-5 w-24 text-right tabular-nums">
            <span className="anim-total-a absolute right-0">₦79,400</span>
            <span className="anim-total-b absolute right-0">₦81,400</span>
          </span>
        </div>
        <p className="mt-3 text-xs text-muted">One invoice per student. Part payments are tracked against it.</p>
      </div>
    </div>
  );
}

/** Report card. The bars fill in when the card scrolls into view. */
export function ResultsIllustration() {
  const rows = [['CA 1', 14, 15], ['CA 2', 13, 15], ['Assignment', 9, 10], ['Exam', 51, 60]] as const;
  return (
    <div className={PANEL} role="img" aria-label="Illustration of a report card with CA, assignment and exam scores adding up to 87 out of 100">
      <div className={CARD}>
        <div className="flex items-center justify-between gap-3 border-b border-line pb-3">
          <div>
            <p className="font-semibold text-ink">Mathematics</p>
            <p className="text-muted text-xs">JSS1A · First term</p>
          </div>
          <span className="rounded px-2 py-0.5 text-xs font-semibold bg-success/10 text-success">A1</span>
        </div>
        <ul className="mt-3 space-y-3">
          {rows.map(([label, got, max]) => (
            <li key={label}>
              <div className="flex justify-between text-ink"><span>{label}</span><span className="tabular-nums text-muted">{got} / {max}</span></div>
              <div className="mt-1.5 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                <div className="bar h-full rounded-full bg-brand" style={{ width: `${(got / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between border-t border-line pt-3 font-semibold text-ink">
          <span>Total</span><span className="tabular-nums">87 / 100</span>
        </div>
      </div>
    </div>
  );
}

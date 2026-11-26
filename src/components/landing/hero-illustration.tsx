import { Check, Timer } from 'lucide-react';
import { Window } from '@/components/landing/illustrations';

const DAYS = [['Mon', 62], ['Tue', 80], ['Wed', 74], ['Thu', 91], ['Fri', 88]] as const;
const STATS = [['Students', '240'], ['Present today', '94%'], ['Fees collected', '₦8.4m']] as const;
const ACTIVITY = [['JSS1A attendance marked', '8:05'], ['Maths CA 1 posted to grades', '9:40']] as const;
const OPTIONS = [['A', '0.35', false], ['B', '0.6', true], ['C', '0.8', false]] as const;

/** The hero: the school dashboard in an app window, with a student's phone mid-exam on top. Sample figures. */
export function HeroIllustration() {
  return (
    <div className="relative pb-24 sm:pb-32">
      <Window url="clarriva.com/dashboard" label="Illustration of the Clariva school dashboard with student numbers, attendance, fees collected and recent activity, and a phone showing a student sitting an exam">
        <div className="grid grid-cols-3 gap-2.5">
          {STATS.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-line bg-surface p-3">
              <p className="text-[11px] text-muted">{label}</p>
              <p className="mt-1 font-display text-xl sm:text-2xl font-semibold text-ink tabular-nums">{value}</p>
            </div>
          ))}
        </div>
        <div className="mt-2.5 grid grid-cols-5 gap-2.5">
          <div className="col-span-3 rounded-xl border border-line bg-surface p-3">
            <p className="text-[11px] text-muted">Attendance this week</p>
            <div className="mt-3 flex h-20 items-end gap-2.5">
              {DAYS.map(([d, v], i) => (
                <div key={d} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <div className="bar-up w-full rounded-md bg-brand" style={{ height: `${v}%`, '--i': i } as React.CSSProperties} />
                  <span className="text-[10px] text-muted">{d}</span>
                </div>
              ))}
            </div>
          </div>
          <ul className="col-span-2 space-y-2.5 rounded-xl border border-line bg-surface p-3">
            {ACTIVITY.map(([what, when]) => (
              <li key={what} className="text-[11px] leading-snug text-ink">
                <span className="block font-medium">{what}</span><span className="text-muted">{when}</span>
              </li>
            ))}
          </ul>
        </div>
      </Window>

      <div aria-hidden="true" className="float-slow absolute bottom-0 right-2 sm:-right-5 w-[136px] sm:w-[172px] rounded-[26px] border-[5px] border-ink bg-surface p-2.5 shadow-[0_24px_50px_-20px_rgba(13,43,85,0.45)]">
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-line" />
        <div className="flex items-center justify-between text-[10px]">
          <span className="font-semibold text-ink">Maths CA 1</span>
          <span className="inline-flex items-center gap-1 font-mono font-semibold text-ink"><Timer size={10} /> 24:18</span>
        </div>
        <p className="mt-2 text-[10px] font-medium text-ink">Write 3/5 as a decimal.</p>
        <ul className="mt-1.5 space-y-1 text-[10px]">
          {OPTIONS.map(([k, v, on]) => (
            <li key={k} className={`rounded-md border px-2 py-1 ${on ? 'border-brand bg-brand-soft font-medium text-ink' : 'border-line text-ink'}`}>{k}. {v}</li>
          ))}
        </ul>
        <p className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-success"><Check size={10} /> All answers saved</p>
      </div>
    </div>
  );
}

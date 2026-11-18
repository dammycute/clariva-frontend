'use client';

import { useEffect, useState } from 'react';
import { applyTheme, readThemeChoice, type ThemeChoice } from '@/lib/theme';
import { cn } from '@/lib/utils';

const OPTIONS: { value: ThemeChoice; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

/** Light / Dark / System. "System" follows the device and updates if the device changes. */
export function ThemeSwitch() {
  const [choice, setChoice] = useState<ThemeChoice>('system');

  useEffect(() => { setChoice(readThemeChoice()); }, []);

  // While on "System", follow the device if it switches.
  useEffect(() => {
    if (choice !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [choice]);

  const pick = (value: ThemeChoice) => { setChoice(value); applyTheme(value); };

  return (
    <div role="radiogroup" aria-label="Colour theme" className="flex rounded border border-line p-0.5 text-xs">
      {OPTIONS.map(o => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={choice === o.value}
          onClick={() => pick(o.value)}
          className={cn(
            'flex-1 h-7 rounded-[3px] cursor-pointer transition-colors',
            choice === o.value ? 'bg-brand-soft text-brand font-medium' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type TextFieldProps = Omit<React.ComponentProps<'input'>, 'id'> & {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  /** Rendered inside the input on the right (e.g. a show/hide button). */
  trailing?: React.ReactNode;
};

/** Label above, hint and error below, wired up with aria-describedby. */
export function TextField({ id, label, hint, error, trailing, className, ...props }: TextFieldProps) {
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink mb-1.5">{label}</label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            'w-full h-11 px-3 rounded border bg-surface text-sm text-ink outline-none transition-colors',
            'placeholder:text-muted/70 focus:border-brand focus:ring-1 focus:ring-brand',
            error ? 'border-danger' : 'border-line',
            trailing && 'pr-16',
            className,
          )}
          {...props}
        />
        {trailing}
      </div>
      {hint && !error && <p id={`${id}-hint`} className="text-[13px] text-muted mt-1.5">{hint}</p>}
      {error && <p id={`${id}-error`} className="text-[13px] text-danger mt-1.5">{error}</p>}
    </div>
  );
}

/** Password input with a Show / Hide toggle. */
export function PasswordField(props: Omit<TextFieldProps, 'type' | 'trailing'>) {
  const [shown, setShown] = React.useState(false);
  return (
    <TextField
      {...props}
      type={shown ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setShown(v => !v)}
          aria-pressed={shown}
          aria-controls={props.id}
          className="absolute right-0 top-0 h-11 px-3 text-xs text-muted hover:text-ink cursor-pointer"
        >
          {shown ? 'Hide' : 'Show'}
        </button>
      }
    />
  );
}

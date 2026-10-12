import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-brand-ink hover:opacity-90',
  secondary: 'border border-line bg-surface text-ink hover:bg-surface-2',
  ghost: 'text-muted hover:text-ink',
};

export function Button({
  variant = 'primary',
  className,
  type = 'button',
  ...props
}: React.ComponentProps<'button'> & { variant?: Variant }) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 h-11 px-4 rounded text-sm font-medium cursor-pointer',
        'transition-[background-color,opacity,transform] duration-150 active:scale-[0.98]',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'new' | 'sale' | 'muted' | 'leaf' | 'dark' | 'outline';

/** Small labels on cards and product pages. Text always carries the meaning, colour supports it. */
const TONES: Record<BadgeTone, string> = {
  new: 'bg-gold-100 text-gold-800',
  sale: 'bg-danger-soft text-danger',
  muted: 'bg-surface-muted text-fg-muted',
  leaf: 'bg-success-soft text-success',
  dark: 'bg-surface-inverse text-fg-inverse',
  outline: 'border border-line-strong/50 bg-surface/80 text-fg-muted',
};

export function Badge({
  tone = 'muted',
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-micro leading-5 tracking-[0.06em] uppercase',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

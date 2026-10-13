import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'new' | 'sale' | 'muted' | 'leaf' | 'dark';

const TONES: Record<BadgeTone, string> = {
  new: 'bg-gold-100 text-gold-800',
  sale: 'bg-danger-100 text-danger-700',
  muted: 'bg-sage-200 text-ink-700',
  leaf: 'bg-leaf-100 text-leaf-600',
  dark: 'bg-forest-900 text-ivory-50',
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
        'inline-flex items-center rounded-full px-2.5 py-1 text-[0.68rem] font-bold tracking-[0.08em] uppercase',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

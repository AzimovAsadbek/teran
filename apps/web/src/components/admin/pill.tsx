import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type Tone = 'gold' | 'leaf' | 'dark' | 'muted' | 'danger' | 'blue';

const TONES: Record<Tone, string> = {
  gold: 'bg-warning-soft text-warning',
  leaf: 'bg-success-soft text-success',
  dark: 'bg-surface-inverse text-fg-inverse',
  muted: 'bg-surface-sunken text-fg-muted',
  danger: 'bg-danger-soft text-danger',
  blue: 'bg-info-soft text-info',
};

/** Status label: a dot and text (the colour supports the word, never replaces it). */
export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-semibold whitespace-nowrap',
        TONES[tone],
      )}
    >
      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {children}
    </span>
  );
}

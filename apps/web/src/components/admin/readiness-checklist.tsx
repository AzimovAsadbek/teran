'use client';

import type { Readiness, ReadinessItem } from '@teran/contracts';
import { AlertCircle, CheckCircle2, Circle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/cn';

/**
 * What an item still needs before it can be published (required) and what would make it better
 * (recommended), as last saved. Each item jumps to the part of the form where it is filled in.
 */
export function ReadinessChecklist({
  readiness,
  sections,
  className,
}: {
  readiness: Readiness;
  /** Readiness field → the id of the form section holding it. */
  sections: Partial<Record<string, string>>;
  className?: string;
}) {
  const t = useTranslations('Admin');
  const missing = readiness.items.filter((item) => item.required && !item.ok);
  const required = readiness.items.filter((item) => item.required);
  const recommended = readiness.items.filter((item) => !item.required);

  const jump = (item: ReadinessItem) => {
    const id = item.field ? sections[item.field] : undefined;
    // Pages visited before stay in the document, hidden, with the same section ids: the one on
    // screen is the one that has a box.
    const target = id
      ? Array.from(document.querySelectorAll<HTMLElement>(`[id="${id}"]`)).find(
          (element) => element.getClientRects().length > 0,
        )
      : undefined;
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const field = target.querySelector<HTMLElement>(
      'input:not([type=hidden]):not([disabled]), textarea, select, button',
    );
    field?.focus({ preventScroll: true });
  };

  const row = (item: ReadinessItem) => {
    const target = item.field ? sections[item.field] : undefined;
    const label = t(`readiness.codes.${item.code}`);
    return (
      <li key={`${item.code}-${item.required}`} className="flex items-start gap-2.5 py-1.5">
        {item.ok ? (
          <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-success" />
        ) : item.required ? (
          <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
        ) : (
          <Circle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-fg-subtle" />
        )}
        <span className="min-w-0 flex-1 text-body-sm">
          <span className={cn(item.ok ? 'text-fg-muted' : 'font-medium text-fg')}>{label}</span>
          <span className="sr-only">
            {' — '}
            {item.ok
              ? t('readiness.done')
              : item.required
                ? t('readiness.missing')
                : t('readiness.optional')}
          </span>
          {item.detail && item.detail.length > 0 ? (
            <span className="block text-caption text-fg-subtle">{item.detail.join(', ')}</span>
          ) : null}
        </span>
        {!item.ok && target ? (
          <button
            type="button"
            onClick={() => jump(item)}
            className="shrink-0 rounded-control px-1.5 text-caption font-semibold text-fg underline-offset-2 hover:underline"
          >
            {t('readiness.goTo')}
          </button>
        ) : null}
      </li>
    );
  };

  return (
    <section
      aria-labelledby="readiness-title"
      className={cn('rounded-card border border-line bg-surface p-5', className)}
    >
      <h2 id="readiness-title" className="text-body-lg font-semibold text-fg">
        {t('readiness.title')}
      </h2>
      <p
        role="status"
        className={cn(
          'mt-2 rounded-control px-3 py-2 text-body-sm font-medium',
          readiness.ready ? 'bg-success-soft text-success' : 'bg-warning-soft text-warning',
        )}
      >
        {readiness.ready
          ? t('readiness.ready')
          : t('readiness.notReady', { count: missing.length })}
      </p>
      <h3 className="mt-4 text-caption font-semibold tracking-wide text-fg-subtle uppercase">
        {t('readiness.required')}
      </h3>
      <ul className="mt-1">{required.map(row)}</ul>
      {recommended.length > 0 ? (
        <>
          <h3 className="mt-3 text-caption font-semibold tracking-wide text-fg-subtle uppercase">
            {t('readiness.recommended')}
          </h3>
          <ul className="mt-1">{recommended.map(row)}</ul>
        </>
      ) : null}
      <p className="mt-3 text-caption text-fg-subtle">{t('readiness.savedState')}</p>
    </section>
  );
}

'use client';

import { ArrowRight, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useId, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';

const DELAY_MS = 20_000;
const REMEMBER_DAYS = 10;
/**
 * Pages where the visitor is doing something (choosing a tea, ordering, paying, writing to TERAN):
 * the card would cover the form or pull them away, so it waits for a browsing page.
 */
const TASK_PATHS = [
  '/contact',
  '/wholesale',
  '/products/',
  '/cart',
  '/checkout',
  '/account',
  '/orders',
];

/**
 * The reference's small offer card in the lower left corner: it comes up 20 seconds into a visit
 * (fading in as it rises 6 px), with a heading, a line and an underlined link; closing it, with
 * its button or Escape, or following its link keeps it away for ten days in this browser. Never on
 * the home page, whose first view and teas already say the same, nor where a visitor is busy with a task
 * (TASK_PATHS); on phones it stands above the floating contact button instead of under it.
 */
export function PromoPopup({
  storageKey,
  heading,
  text,
  href,
  cta,
}: {
  storageKey: string;
  heading: string;
  text: string;
  href: string;
  cta: string;
}) {
  const t = useTranslations('Common');
  const headingId = useId();
  const pathname = usePathname();
  const quiet = pathname === '/' || TASK_PATHS.some((path) => pathname.startsWith(path));
  const [open, setOpen] = useState(false);

  const dismiss = useCallback(() => {
    setOpen(false);
    try {
      window.localStorage.setItem(storageKey, String(Date.now()));
    } catch {
      // Without storage the card simply comes back on a later visit.
    }
  }, [storageKey]);

  useEffect(() => {
    if (quiet) return;
    try {
      const stamp = Number(window.localStorage.getItem(storageKey));
      if (stamp && Date.now() - stamp < REMEMBER_DAYS * 86_400_000) return;
    } catch {
      // Unreadable storage: show the card as for a first visit.
    }
    const timer = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [storageKey, quiet]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, dismiss]);

  if (!open || quiet) return null;
  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={headingId}
      className="promo-popup fixed inset-x-4 bottom-[5.25rem] z-[55] rounded-[0.75rem] bg-[#008484] p-6 text-white shadow-[0_8px_30px_rgb(0_0_0_/_18%)] min-[46.875rem]:inset-x-auto min-[46.875rem]:bottom-6 min-[46.875rem]:left-6 min-[46.875rem]:w-[21.25rem] print:hidden"
    >
      <button
        type="button"
        aria-label={t('close')}
        onClick={dismiss}
        className="absolute top-4 right-4 flex h-6 w-6 items-center justify-center after:absolute after:-inset-2.5"
      >
        <X aria-hidden className="h-4 w-4" strokeWidth={2} />
      </button>
      <p
        id={headingId}
        className="pr-8 font-headline text-[1.75rem] leading-[1.8125rem] [--headline-weight:600]"
      >
        {heading}
      </p>
      <p className="mt-3 text-[0.875rem] leading-[1.125rem] font-medium">{text}</p>
      <Link
        href={href}
        onClick={dismiss}
        className="rule-hover mt-5 inline-flex items-center gap-2 text-[0.9375rem] leading-5 font-medium underline-offset-4"
      >
        {cta}
        <ArrowRight aria-hidden className="h-[1.125rem] w-[1.125rem]" strokeWidth={1.5} />
      </Link>
    </div>
  );
}

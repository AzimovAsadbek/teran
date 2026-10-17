'use client';

import type { Locale } from '@teran/contracts';
import { ChevronDown, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { Suspense, useEffect, useId, useRef, useState } from 'react';
import { Link, usePathname } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { cn } from '@/lib/cn';
import { LanguageFlag } from './flags';

type Tone = 'dark' | 'light';
type Placement = 'down' | 'up';

/**
 * The reference's language selector with each language's flag (the owner's request): the current
 * language's flag and code (underlined while pointed at) and a caret, opening a white panel of
 * pill-shaped choices — flag, name and code — the current one in teal. The choices are plain links
 * to the same page in each language (crawlable, and each declares the language it leads to).
 * Escape, the close button or a click outside closes the panel.
 */
function LanguageMenu({
  pathname,
  tone,
  placement,
  className,
}: {
  pathname: string;
  tone: Tone;
  placement: Placement;
  className?: string;
}) {
  const t = useTranslations('Language');
  const tc = useTranslations('Common');
  const current = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    // The caller places the selector (className); the inner box anchors the panel.
    <div className={cn('items-center', className ?? 'flex')}>
      <div ref={rootRef} className="relative flex items-center">
        <button
          ref={buttonRef}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
          className={cn(
            'group flex min-h-8 cursor-pointer items-center gap-1.5 text-[0.9375rem] leading-none font-semibold tracking-[0.034em]',
            tone === 'dark' ? 'text-ivory-50' : 'text-fg',
          )}
        >
          <LanguageFlag locale={current} className="h-[0.9375rem] w-[1.375rem]" />
          <span className="sr-only">{t('change')}</span>
          <span className="underline decoration-transparent decoration-2 underline-offset-[5px] transition-[text-decoration-color] duration-200 ease-[ease] group-hover:decoration-current group-focus-visible:decoration-current">
            {t(`short.${current}`)}
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              'h-3.5 w-3.5 -translate-y-0.5 transition-transform duration-200',
              open && 'rotate-180',
            )}
            strokeWidth={2}
          />
        </button>
        {open ? (
          <div
            id={panelId}
            className={cn(
              'absolute right-0 z-50 min-w-[12.5rem] rounded-[1.25rem] bg-surface p-4 text-fg shadow-[0_2px_6px_rgb(0_0_0_/_8%),0_12px_32px_rgb(0_0_0_/_14%)] [&_:focus-visible]:outline-focus',
              placement === 'up' ? 'bottom-[calc(100%+0.875rem)]' : 'top-[calc(100%+0.875rem)]',
            )}
          >
            <span
              aria-hidden
              className={cn(
                'absolute right-[1.375rem] h-3.5 w-3.5 rotate-45 bg-surface',
                placement === 'up' ? '-bottom-[0.4375rem]' : '-top-[0.4375rem]',
              )}
            />
            <div className="relative mb-3 flex items-center justify-between gap-4">
              <span className="text-[0.9375rem] leading-none font-semibold tracking-[0.01em]">
                {t('label')}
              </span>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  buttonRef.current?.focus();
                }}
                aria-label={tc('close')}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-ivory-100 transition-colors duration-200 hover:bg-[#e6e6e6]"
              >
                <X aria-hidden className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
            <ul className="relative flex flex-col gap-2">
              {routing.locales.map((locale: Locale) => (
                <li key={locale}>
                  <Link
                    href={pathname}
                    locale={locale}
                    hrefLang={locale}
                    lang={locale}
                    aria-current={locale === current ? 'true' : undefined}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex w-full items-center justify-between gap-4 rounded-full bg-ivory-100 px-[1.125rem] py-3 text-[0.9375rem] leading-6 tracking-[0.01em] whitespace-nowrap transition-colors duration-200 hover:bg-[#e6e6e6]',
                      locale === current ? 'font-semibold text-forest-800' : 'font-medium text-fg',
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <LanguageFlag locale={locale} />
                      {/* Each language's name in its own script (the system font: no extra files). */}
                      <span className="font-[family-name:system-ui]">{t(`names.${locale}`)}</span>
                    </span>
                    <span aria-hidden className="text-[0.8125rem] font-semibold opacity-70">
                      {t(`short.${locale}`)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CurrentPageLanguageMenu(props: { tone: Tone; placement: Placement; className?: string }) {
  const pathname = usePathname();
  return <LanguageMenu pathname={pathname} {...props} />;
}

/**
 * Switches language while staying on the same page. The current path is URL data, so on dynamic
 * routes it streams in; until then the choices point to each language's home page.
 */
export function LanguageSwitcherSlot({
  tone = 'dark',
  placement = 'down',
  className,
}: {
  tone?: Tone;
  placement?: Placement;
  className?: string;
}) {
  return (
    <Suspense
      fallback={
        <LanguageMenu pathname="/" tone={tone} placement={placement} className={className} />
      }
    >
      <CurrentPageLanguageMenu tone={tone} placement={placement} className={className} />
    </Suspense>
  );
}

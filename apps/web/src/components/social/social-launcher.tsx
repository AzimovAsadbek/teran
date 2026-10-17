'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import type { SocialLink } from '@/lib/contact';
import { cn } from '@/lib/cn';
import { NETWORK_NAMES, SocialIcon } from './social-icon';

/**
 * TERAN's networks in the lower right corner, above the chat: a teal disc with three lines that
 * opens the networks entered in the admin area (Telegram, WhatsApp, Instagram, YouTube) as a
 * column of their own marks and names rising from it, each opening the network in a new tab. The
 * lines turn into a cross while it is open; Escape, a click elsewhere or following a link closes
 * it, and Escape gives focus back to the disc. It steps aside while the chat window is open (the
 * window covers the corner).
 */
export function SocialLauncher({ links, hidden }: { links: SocialLink[]; hidden: boolean }) {
  const t = useTranslations('Chat');
  const tc = useTranslations('Common');
  const [open, setOpen] = useState(false);
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const shown = open && !hidden;

  useEffect(() => {
    if (!shown) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [shown]);

  if (links.length === 0) return null;
  return (
    // Centred over the chat's disc (50 px on phones, 60 px from 640 px), 16 px / 14 px above it.
    <div
      ref={rootRef}
      hidden={hidden}
      className="fixed right-5 bottom-[5.375rem] z-[60] sm:right-[2.125rem] sm:bottom-[6.25rem] print:hidden"
    >
      {shown ? (
        <ul
          id={listId}
          aria-label={t('socialTitle')}
          className="absolute right-[0.1875rem] bottom-full mb-3 flex flex-col items-end gap-2.5 sm:right-1"
        >
          {links.map((link, index) => (
            <li
              key={link.href}
              className="social-launcher-item"
              // The one nearest the disc comes first.
              style={{ '--i': links.length - 1 - index } as CSSProperties}
            >
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setOpen(false)}
                className="group flex items-center gap-2.5 focus-visible:outline-none"
              >
                <span className="rounded-full bg-white px-3.5 py-1.5 text-[0.875rem] leading-5 font-semibold whitespace-nowrap text-[#121212] shadow-[0_2px_8px_rgb(22_22_22_/_18%)] group-hover:underline group-hover:underline-offset-[3px] group-focus-visible:outline-2 group-focus-visible:outline-offset-2 group-focus-visible:outline-[#107e84] group-focus-visible:outline-solid">
                  {NETWORK_NAMES[link.network]}
                  {link.handle ? (
                    <span className="font-medium text-[#121212]/70"> {link.handle}</span>
                  ) : null}
                  <span className="sr-only"> ({tc('opensInNewTab')})</span>
                </span>
                <span className="flex h-11 w-11 items-center justify-center rounded-full shadow-[0_2px_8px_rgb(22_22_22_/_18%)] transition-transform duration-200 group-hover:scale-105">
                  <SocialIcon network={link.network} className="h-11 w-11" />
                </span>
              </a>
            </li>
          ))}
        </ul>
      ) : null}
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={shown}
        aria-controls={shown ? listId : undefined}
        aria-label={shown ? t('socialClose') : t('socialOpen')}
        onClick={() => setOpen((current) => !current)}
        className="flex h-[3.125rem] w-[3.125rem] items-center justify-center rounded-full bg-[#107e84] text-white shadow-[0_2px_4px_rgb(22_22_22_/_16%)] transition-[transform,background-color] duration-200 ease-[ease] hover:scale-105 hover:bg-[#0b5a5e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#107e84] focus-visible:outline-solid sm:h-[3.25rem] sm:w-[3.25rem]"
      >
        <Burger open={shown} />
      </button>
    </div>
  );
}

/** Three lines that fold into a cross while the networks are open. */
function Burger({ open }: { open: boolean }) {
  const line =
    'absolute left-0 h-0.5 w-full rounded-full bg-current transition-[transform,opacity] duration-200';
  return (
    <span aria-hidden className="relative block h-3.5 w-5">
      <span className={cn(line, 'top-0', open && 'translate-y-1.5 rotate-45')} />
      <span className={cn(line, 'top-1.5', open && 'opacity-0')} />
      <span className={cn(line, 'top-3', open && '-translate-y-1.5 -rotate-45')} />
    </span>
  );
}

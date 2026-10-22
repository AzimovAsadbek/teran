'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import type { SocialLink } from '@/lib/contact';
import { cn } from '@/lib/cn';
import { useFloatingPlace } from '@/lib/floating';
import { NETWORK_NAMES, SocialIcon } from './social-icon';

/**
 * TERAN's networks in the lower right corner, above the chat (components/chat/chat-widget.tsx):
 * a teal disc showing four small marks — Instagram, a play button, a paper plane and a phone (the
 * owner's "social mix") — that opens the networks entered in the admin area (Telegram, WhatsApp,
 * Instagram, YouTube) as a column of their own marks and names rising from it, each opening the
 * network in a new tab. The marks give way to a cross while it is open; Escape, a click elsewhere
 * or following a link closes it, and Escape gives focus back to the disc. It steps aside while the
 * chat window is open (the window covers the corner).
 */
export function SocialLauncher({ links, hidden }: { links: SocialLink[]; hidden: boolean }) {
  const t = useTranslations('Social');
  const tc = useTranslations('Common');
  const [open, setOpen] = useState(false);
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // It steps aside for an action or a form in its corner, and rises above a sticky bar.
  const place = useFloatingPlace();
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
      className={cn(
        'fixed right-5 bottom-[5.375rem] z-[60] transition-[opacity,translate] duration-300 ease-[var(--ease-standard)] sm:right-[2.125rem] sm:bottom-[6.25rem] print:hidden',
        place === 'yield' && !shown && 'pointer-events-none translate-y-2 opacity-0',
        place === 'raised' && '-translate-y-[4.75rem]',
      )}
    >
      {shown ? (
        <ul
          id={listId}
          aria-label={t('title')}
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
        aria-label={shown ? t('close') : t('open')}
        onClick={() => setOpen((current) => !current)}
        className="flex h-[3.125rem] w-[3.125rem] items-center justify-center rounded-full bg-[#107e84] text-white shadow-[0_2px_4px_rgb(22_22_22_/_16%)] transition-[transform,background-color] duration-200 ease-[ease] hover:scale-105 hover:bg-[#0b5a5e] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#107e84] focus-visible:outline-solid sm:h-[3.25rem] sm:w-[3.25rem]"
      >
        <SocialMix open={shown} />
      </button>
    </div>
  );
}

/**
 * The disc's mark: four line icons two by two — Instagram, play, a paper plane, a phone — drawn
 * from lucide's shapes at a 1.6 px line; while the networks are open they turn away and a cross
 * turns in.
 */
function SocialMix({ open }: { open: boolean }) {
  const mini = (x: number, y: number) => `translate(${x} ${y}) scale(0.5)`;
  return (
    <span aria-hidden className="relative block h-[1.875rem] w-[1.875rem]">
      <svg
        viewBox="0 0 30 30"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn(
          'absolute inset-0 h-full w-full transition-[transform,opacity] duration-200 ease-[ease]',
          open ? 'scale-50 rotate-45 opacity-0' : 'opacity-100',
        )}
      >
        {/* Instagram */}
        <g transform={mini(1, 1)}>
          <rect x="2" y="2" width="20" height="20" rx="5.5" vectorEffect="non-scaling-stroke" />
          <circle cx="12" cy="12" r="4.4" vectorEffect="non-scaling-stroke" />
          <circle cx="17.6" cy="6.4" r="0.9" fill="currentColor" stroke="none" />
        </g>
        {/* Play */}
        <g transform={mini(17, 1)}>
          <path d="M6.5 3.8 20 12 6.5 20.2z" vectorEffect="non-scaling-stroke" />
        </g>
        {/* Paper plane */}
        <g transform={mini(1, 17)}>
          <path d="M3 11 22 2l-9 19-2-8z" vectorEffect="non-scaling-stroke" />
        </g>
        {/* Phone */}
        <g transform={mini(17, 17)}>
          <path
            d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </svg>
      <svg
        viewBox="0 0 30 30"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        className={cn(
          'absolute inset-0 h-full w-full transition-[transform,opacity] duration-200 ease-[ease]',
          open ? 'opacity-100' : '-rotate-45 scale-50 opacity-0',
        )}
      >
        <path d="M9 9l12 12M21 9 9 21" />
      </svg>
    </span>
  );
}

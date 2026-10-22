'use client';

import { useTranslations } from 'next-intl';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { SocialLauncher } from '@/components/social/social-launcher';
import { cn } from '@/lib/cn';
import type { SocialLink } from '@/lib/contact';
import { useFloatingPlace } from '@/lib/floating';
import type { ChatChannel } from './chat-types';

// The window is fetched when first wanted (pointed at, focused, or once the page has settled), so
// the disc costs pages almost nothing.
const ChatPanel = lazy(() => import('./chat-panel'));

/**
 * The chat in the lower right corner, back as it was before the advisor left (ADR-054): a light
 * disc with a teal speech bubble that opens TERAN's chat window in its place — a greeting, quick
 * answers (delivery, ordering, business) and a message to TERAN, which arrives with the contact
 * page's messages. TERAN's networks have their own disc above it (SocialLauncher), which steps
 * aside while the window is open. Closing the window, with its button or Escape, brings the disc
 * back with focus on it. Like the networks' disc, it makes way for an action or a form in its
 * corner and rises above a sticky bar (lib/floating).
 */
export function ChatWidget({
  channels,
  socials,
}: {
  channels: ChatChannel[];
  socials: SocialLink[];
}) {
  const t = useTranslations('Chat');
  const [open, setOpen] = useState(false);
  const [wanted, setWanted] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  const place = useFloatingPlace();

  useEffect(() => {
    const idle = window.setTimeout(() => setWanted(true), 6000);
    return () => window.clearTimeout(idle);
  }, []);

  useEffect(() => {
    if (wasOpen.current && !open) launcherRef.current?.focus();
    wasOpen.current = open;
  }, [open]);

  return (
    <>
      <SocialLauncher links={socials} hidden={open} />
      <button
        ref={launcherRef}
        type="button"
        hidden={open}
        aria-label={t('open')}
        aria-haspopup="dialog"
        onClick={() => {
          setWanted(true);
          setOpen(true);
        }}
        onPointerEnter={() => setWanted(true)}
        onFocus={() => setWanted(true)}
        className={cn(
          // 50 px on phones, 60 px from 640 px; 20 px in from the corner, then 30 px and 26 px.
          'fixed right-5 bottom-5 z-[60] flex h-[3.125rem] w-[3.125rem] items-center justify-center rounded-full bg-[radial-gradient(circle_at_50%_40%,#ffffff_0%,#f1f9f9_58%,#dcefef_100%)] shadow-[0_2px_4px_rgb(22_22_22_/_16%)] transition-[scale,opacity,translate] duration-200 ease-[ease] hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#107e84] focus-visible:outline-solid sm:right-[1.875rem] sm:bottom-[1.625rem] sm:h-[3.75rem] sm:w-[3.75rem] print:hidden',
          place === 'yield' && 'pointer-events-none translate-y-2 opacity-0',
          place === 'raised' && '-translate-y-[4.75rem]',
        )}
      >
        <ChatBubble className="h-7 w-7 sm:h-8 sm:w-8" />
      </button>
      {wanted ? (
        <Suspense fallback={null}>
          <ChatPanel open={open} channels={channels} onClose={() => setOpen(false)} />
        </Suspense>
      ) : null}
    </>
  );
}

/** A teal speech bubble with three dots. */
function ChatBubble({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden className={className}>
      <path
        fill="#14a3a3"
        d="M16 3C8.8 3 3 8.4 3 15.1c0 2.7.9 5.2 2.5 7.2L4.2 28c-.1.6.5 1 1 .7l5.1-2.6c1.7.7 3.6 1.1 5.7 1.1 7.2 0 13-5.4 13-12.1S23.2 3 16 3Z"
      />
      <circle cx="10.6" cy="15.3" r="1.7" fill="#fff" />
      <circle cx="16" cy="15.3" r="1.7" fill="#fff" />
      <circle cx="21.4" cy="15.3" r="1.7" fill="#fff" />
    </svg>
  );
}

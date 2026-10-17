'use client';

import { useTranslations } from 'next-intl';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { SocialLauncher } from '@/components/social/social-launcher';
import type { SocialLink } from '@/lib/contact';
import { OPEN_CHAT_EVENT, type ChatChannel } from './chat-types';

// The conversation window is fetched when first wanted (pointed at, or the page has settled), so
// the launcher costs pages almost nothing.
const ChatPanel = lazy(() => import('./chat-panel'));

/**
 * The reference's chat in the lower right corner: a light disc with a teal speech bubble; it opens
 * the conversation window in its place (TERAN's advisor, its delivery answer and its contacts).
 * Other controls open it with OPEN_CHAT_EVENT. Closing the window, with its button or Escape,
 * brings the disc back and focus to whatever opened it. TERAN's networks have their own disc
 * above it (SocialLauncher), which steps aside while the window is open.
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
  const opener = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    const idle = window.setTimeout(() => setWanted(true), 6000);
    return () => window.clearTimeout(idle);
  }, []);

  useEffect(() => {
    const openFromPage = () => {
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setWanted(true);
      setOpen(true);
    };
    window.addEventListener(OPEN_CHAT_EVENT, openFromPage);
    return () => window.removeEventListener(OPEN_CHAT_EVENT, openFromPage);
  }, []);

  useEffect(() => {
    if (wasOpen.current && !open) {
      const target = opener.current?.isConnected ? opener.current : launcherRef.current;
      opener.current = null;
      target?.focus();
    }
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
        className="fixed right-5 bottom-5 z-[60] flex h-[3.125rem] w-[3.125rem] items-center justify-center rounded-full bg-[radial-gradient(circle_at_50%_40%,#ffffff_0%,#f1f9f9_58%,#dcefef_100%)] shadow-[0_2px_4px_rgb(22_22_22_/_16%)] transition-transform duration-200 ease-[ease] hover:scale-105 sm:right-[1.875rem] sm:bottom-[1.625rem] sm:h-[3.75rem] sm:w-[3.75rem] print:hidden"
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

/** A teal speech bubble with three dots, as the reference's launcher. */
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

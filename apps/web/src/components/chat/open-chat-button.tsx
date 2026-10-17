'use client';

import type { ReactNode } from 'react';
import { OPEN_CHAT_EVENT } from './chat-types';

/** A button elsewhere on the page that opens the chat in the lower right corner. */
export function OpenChatButton({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      onClick={() => window.dispatchEvent(new Event(OPEN_CHAT_EVENT))}
      className={className}
    >
      {children}
    </button>
  );
}

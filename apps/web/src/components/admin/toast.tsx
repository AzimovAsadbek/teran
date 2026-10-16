'use client';

import { CircleCheck, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useSyncExternalStore } from 'react';

/*
 * Confirmation after an admin action ("Saved", "Status changed"), shown at the top of the screen
 * so it is seen wherever the button was. The admin shell lives in the layout, so a message
 * survives the page refresh or navigation that follows the action.
 */

interface Toast {
  id: number;
  message: string;
}

let current: Toast | null = null;
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** Shows a short confirmation; a newer one replaces the previous. */
export function notify(message: string): void {
  current = { id: nextId++, message };
  emit();
}

function dismiss(id: number) {
  if (current?.id !== id) return;
  current = null;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const VISIBLE_MS = 5000;

export function AdminToaster() {
  const tc = useTranslations('Common');
  const toast = useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => dismiss(toast.id), VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <div
      role="status"
      aria-live="polite"
      // Top of the screen: forms keep their save bar at the bottom.
      className="pointer-events-none fixed inset-x-0 top-16 z-40 flex justify-center px-4 lg:top-4"
    >
      {toast ? (
        <p
          key={toast.id}
          className="pointer-events-auto flex max-w-lg items-center gap-3 rounded-control bg-surface-inverse py-2 pr-2 pl-4 text-body-sm font-medium text-fg-inverse shadow-overlay motion-safe:animate-pop-in"
        >
          <CircleCheck aria-hidden className="h-4 w-4 shrink-0 text-gold-300" />
          <span className="min-w-0 flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-control text-fg-inverse/80 hover:bg-fg-inverse/10 hover:text-fg-inverse focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300"
          >
            <X aria-hidden className="h-4 w-4" />
            <span className="sr-only">{tc('close')}</span>
          </button>
        </p>
      ) : null}
    </div>
  );
}

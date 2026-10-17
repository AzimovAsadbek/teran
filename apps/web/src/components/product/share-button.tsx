'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

/**
 * The reference's "Share" under the product's column: the device's share sheet where there is
 * one, otherwise the page's address is copied and the label says so for a moment.
 */
export function ShareButton({ title }: { title: string }) {
  const t = useTranslations('Product');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function share() {
    const url = window.location.href;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Without clipboard access the address bar still holds the link.
    }
  }

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => void share()}
        className="inline-flex min-h-11 cursor-pointer items-center"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-[#107e84]">
          <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="18" cy="5.5" r="2.6" />
            <circle cx="6" cy="12" r="2.6" />
            <circle cx="18" cy="18.5" r="2.6" />
            <path d="m8.3 10.8 7.4-4M8.3 13.2l7.4 4" />
          </g>
        </svg>
        <span aria-live="polite" className="ps-2 text-[1rem] leading-6 font-medium text-fg">
          {copied ? t('linkCopied') : t('share')}
        </span>
      </button>
    </div>
  );
}

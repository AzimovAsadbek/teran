'use client';

import { CircleCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';

/** Replaces a submitted form; takes focus so screen-reader and keyboard users land on the result. */
export function FormSuccess({ onReset }: { onReset: () => void }) {
  const t = useTranslations('Forms');
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div
      role="status"
      className="rounded-panel border border-success/20 bg-success-soft/60 px-6 py-10 text-center"
    >
      <CircleCheck aria-hidden className="mx-auto h-10 w-10 text-success" />
      <h3
        ref={headingRef}
        tabIndex={-1}
        className="mt-4 text-display-sm text-forest-900 outline-none"
      >
        {t('successTitle')}
      </h3>
      <p className="mt-2 text-body text-fg-muted">{t('successText')}</p>
      <Button variant="secondary" className="mt-6" onClick={onReset}>
        {t('sendAnother')}
      </Button>
    </div>
  );
}

/** Hidden from people and assistive technology; simple bots fill it in (the API discards those). */
export function Honeypot() {
  return (
    <input
      type="text"
      name="website"
      tabIndex={-1}
      autoComplete="off"
      aria-hidden
      className="hidden"
    />
  );
}

export function honeypotValue(form: HTMLFormElement): string | undefined {
  const value = new FormData(form).get('website');
  return typeof value === 'string' && value ? value : undefined;
}

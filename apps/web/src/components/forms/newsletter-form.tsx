'use client';

import { newsletterSubscribeSchema } from '@teran/contracts';
import { CheckCircle2, CircleAlert } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { inputClasses } from '@/components/ui/field';
import { Link } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { cn } from '@/lib/cn';
import { useApiErrorMessage } from '@/lib/use-api-error-message';

export function NewsletterForm({
  tone = 'dark',
  source = 'footer',
}: {
  tone?: 'dark' | 'light';
  source?: string;
}) {
  const t = useTranslations('Newsletter');
  const tv = useTranslations('Validation');
  const locale = useLocale();
  const id = useId();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<ApiError | null>(null);
  const apiErrorMessage = useApiErrorMessage(apiError);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const website = new FormData(event.currentTarget).get('website');
    const parsed = newsletterSubscribeSchema.safeParse({
      email,
      locale,
      source,
      website: typeof website === 'string' && website ? website : undefined,
    });
    if (!parsed.success) {
      setFieldError(tv('invalid_email'));
      return;
    }
    setFieldError(null);
    setApiError(null);
    setState('sending');
    try {
      await apiRequest('/newsletter/subscribe', { method: 'POST', body: parsed.data });
      setState('done');
    } catch (error) {
      setApiError(error instanceof ApiError ? error : new ApiError(0, null));
      setState('idle');
    }
  }

  if (state === 'done') {
    return (
      <p
        role="status"
        className={cn(
          'flex items-center gap-2 text-body font-medium',
          tone === 'dark' ? 'text-accent-on-inverse' : 'text-success',
        )}
      >
        <CheckCircle2 aria-hidden className="h-5 w-5" /> {t('success')}
      </p>
    );
  }

  const describedBy = [fieldError ? `${id}-error` : null, `${id}-consent`]
    .filter(Boolean)
    .join(' ');
  const dark = tone === 'dark';

  return (
    <form onSubmit={onSubmit} noValidate>
      <label
        htmlFor={`${id}-email`}
        className={cn('block text-label', dark ? 'text-ivory-50' : 'text-fg')}
      >
        {t('emailLabel')}
      </label>
      <div className="mt-2 flex flex-col gap-2.5 sm:flex-row">
        <input
          id={`${id}-email`}
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t('placeholder')}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={describedBy}
          className={
            dark
              ? 'h-13 w-full min-w-0 rounded-control border border-ivory-50/45 bg-ivory-50/[0.06] px-4 text-body text-ivory-50 outline-none transition-[border-color,box-shadow] duration-150 placeholder:text-ivory-100/55 hover:border-ivory-50/70 focus:border-gold-300 focus:ring-[3px] focus:ring-gold-300/20 sm:flex-1'
              : inputClasses({ invalid: Boolean(fieldError), size: 'lg', className: 'sm:flex-1' })
          }
        />
        {/* Honeypot: hidden from people and assistive technology; bots fill it in. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="hidden"
        />
        <Button
          type="submit"
          size="lg"
          variant={dark ? 'accent' : 'primary'}
          loading={state === 'sending'}
        >
          {state === 'sending' ? t('submitting') : t('submit')}
        </Button>
      </div>
      {fieldError ? (
        <p
          id={`${id}-error`}
          className={cn(
            'mt-2 flex items-center gap-1.5 text-helper font-medium',
            dark ? 'text-gold-300' : 'text-danger',
          )}
        >
          <CircleAlert aria-hidden className="h-4 w-4 shrink-0" />
          {fieldError}
        </p>
      ) : null}
      {apiErrorMessage ? (
        <p
          role="alert"
          className={cn('mt-2 text-helper font-medium', dark ? 'text-gold-300' : 'text-danger')}
        >
          {apiErrorMessage}
        </p>
      ) : null}
      <p
        id={`${id}-consent`}
        className={cn('mt-3 text-helper', dark ? 'text-ivory-100/70' : 'text-fg-subtle')}
      >
        {t.rich('consent', {
          privacy: (chunks) => (
            <Link href="/privacy" className="underline underline-offset-2">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </form>
  );
}

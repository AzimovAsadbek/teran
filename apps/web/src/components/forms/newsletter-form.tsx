'use client';

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
    // Loaded on submit: the form sits in every page's footer, and the shared schemas (with Zod)
    // would otherwise be part of every page's first JavaScript.
    const { newsletterSubscribeSchema } = await import('@teran/contracts');
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
          tone === 'dark' ? 'text-ivory-50' : 'text-success',
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
    <form method="post" onSubmit={onSubmit} noValidate>
      <label
        htmlFor={`${id}-email`}
        className={cn('block text-label', dark ? 'sr-only' : 'text-fg')}
      >
        {t('emailLabel')}
      </label>
      <div className={cn(dark ? 'flex flex-row gap-2' : 'mt-2 flex flex-col gap-2.5 sm:flex-row')}>
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
              ? // The reference's footer field: a white pill, 244 px wide from 990 px.
                'h-11 w-full min-w-0 flex-[1_1_auto] rounded-full border border-ivory-50 bg-ivory-50 px-[1.0625rem] pt-[0.3125rem] text-[0.9375rem] font-medium text-black outline-none placeholder:text-black/55 focus:border-[#008484] focus:ring-2 focus:ring-[#008484] min-[61.875rem]:h-12 min-[61.875rem]:flex-[0_1_15.25rem]'
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
        {dark ? (
          // The reference's outlined pill beside the field.
          <button
            type="submit"
            disabled={state === 'sending'}
            aria-busy={state === 'sending' || undefined}
            className="outline-hover inline-flex h-11 flex-none items-center justify-center rounded-full border border-ivory-50 px-[1.5625rem] pt-[0.1875rem] text-[0.875rem] leading-[1.3125rem] font-medium text-ivory-50 disabled:opacity-70 min-[61.875rem]:h-12 min-[61.875rem]:px-[2.0625rem] min-[61.875rem]:pt-1 min-[61.875rem]:text-[1rem] min-[61.875rem]:leading-6"
          >
            {state === 'sending' ? t('submitting') : t('submit')}
          </button>
        ) : (
          <Button type="submit" size="lg" variant="primary" loading={state === 'sending'}>
            {state === 'sending' ? t('submitting') : t('submit')}
          </Button>
        )}
      </div>
      {fieldError ? (
        <p
          id={`${id}-error`}
          className={cn(
            'mt-2 flex items-center gap-1.5 text-helper font-medium',
            dark ? 'text-ivory-50' : 'text-danger',
          )}
        >
          <CircleAlert aria-hidden className="h-4 w-4 shrink-0" />
          {fieldError}
        </p>
      ) : null}
      {apiErrorMessage ? (
        <p
          role="alert"
          className={cn('mt-2 text-helper font-medium', dark ? 'text-ivory-50' : 'text-danger')}
        >
          {apiErrorMessage}
        </p>
      ) : null}
      {dark ? (
        // The footer's form shows no line under it, as the reference's (the privacy policy is
        // linked in the footer's last row); the consent is still read out with the field.
        <p id={`${id}-consent`} className="sr-only">
          {t.rich('consent', { privacy: (chunks) => chunks })}
        </p>
      ) : (
        <p id={`${id}-consent`} className="mt-3 text-helper text-fg-subtle">
          {t.rich('consent', {
            privacy: (chunks) => (
              <Link href="/privacy" className="underline underline-offset-2">
                {chunks}
              </Link>
            ),
          })}
        </p>
      )}
    </form>
  );
}

'use client';

import { newsletterSubscribeSchema } from '@teran/contracts';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useId, useState, type FormEvent } from 'react';
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
          'flex items-center gap-2 font-medium',
          tone === 'dark' ? 'text-gold-300' : 'text-leaf-600',
        )}
      >
        <CheckCircle2 aria-hidden className="h-5 w-5" /> {t('success')}
      </p>
    );
  }

  const describedBy = [fieldError ? `${id}-error` : null, `${id}-consent`]
    .filter(Boolean)
    .join(' ');

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-3">
      <label
        htmlFor={`${id}-email`}
        className={cn(
          'text-sm font-semibold',
          tone === 'dark' ? 'text-ivory-50' : 'text-forest-900',
        )}
      >
        {t('emailLabel')}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
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
          className={cn(
            'h-12 flex-1 rounded-full border px-5 text-base outline-none transition-colors',
            tone === 'dark'
              ? 'border-ivory-50/30 bg-ivory-50/10 text-ivory-50 placeholder:text-ivory-100/60 focus:border-gold-300'
              : 'border-sage-500 bg-white text-ink-900 placeholder:text-ink-500 focus:border-forest-700',
          )}
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
        <button
          type="submit"
          disabled={state === 'sending'}
          className={cn(
            'inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition-colors',
            tone === 'dark'
              ? 'bg-gold-500 text-forest-950 hover:bg-gold-400'
              : 'bg-forest-900 text-ivory-50 hover:bg-forest-800',
          )}
        >
          {state === 'sending' ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
          {state === 'sending' ? t('submitting') : t('submit')}
        </button>
      </div>
      {fieldError ? (
        <p
          id={`${id}-error`}
          className={cn('text-sm', tone === 'dark' ? 'text-gold-300' : 'text-danger-700')}
        >
          {fieldError}
        </p>
      ) : null}
      {apiErrorMessage ? (
        <p
          role="alert"
          className={cn('text-sm', tone === 'dark' ? 'text-gold-300' : 'text-danger-700')}
        >
          {apiErrorMessage}
        </p>
      ) : null}
      <p
        id={`${id}-consent`}
        className={cn(
          'text-xs leading-relaxed',
          tone === 'dark' ? 'text-ivory-100/75' : 'text-ink-500',
        )}
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

'use client';

import type { ChallengeDto, TelegramChallengeStatus } from '@teran/contracts';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Button, buttonClasses } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { ApiError } from '@/lib/api/errors';
import { ApiAlert } from './auth-forms';

export function identityError(error: unknown) {
  if (!(error instanceof ApiError)) return 'network';
  if (error.status === 429) return 'limited';
  if (error.status === 401 || error.status === 403) return 'reauth';
  if (error.status === 409)
    return error.body?.details?.reason === 'last_method' ? 'lastMethod' : 'conflict';
  if (error.status === 503) return 'unavailable';
  if (error.code === 'VALIDATION_FAILED') return 'fields';
  if (error.status === 400 || error.status === 404) return 'invalid';
  return 'network';
}
export type IdentityError = ReturnType<typeof identityError>;
export function IdentityNotice({ error }: { error: IdentityError | null }) {
  const t = useTranslations('Account.identity');
  return (
    <>
      <ApiAlert message={error ? t(error) : null} />
      {error === 'reauth' && (
        <Link
          href="/account/login?reauth=1&next=%2Faccount%2Fsecurity"
          className="font-semibold text-brand underline"
        >
          {t('signAgain')}
        </Link>
      )}
    </>
  );
}

export function VerificationCode({
  challenge,
  onResend,
  onBack,
  onSuccess,
  destination,
  phoneProof = false,
}: {
  challenge: ChallengeDto;
  onResend: () => Promise<void>;
  onBack: () => void;
  onSuccess: () => void;
  destination?: string;
  phoneProof?: boolean;
}) {
  const t = useTranslations('Account.identity');
  const [code, setCode] = useState('');
  const [error, setError] = useState<IdentityError | null>(null);
  const [busy, setBusy] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const [telegramState, setTelegramState] = useState<TelegramChallengeStatus['state']>('waiting');
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  useEffect(() => {
    if (!challenge.telegramUrl) input.current?.focus();
    const interval = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [challenge.id, challenge.telegramUrl]);
  const seconds = Math.max(0, Math.ceil((Date.parse(challenge.expiresAt) - clock) / 1000));
  const wait = Math.max(0, Math.ceil((Date.parse(challenge.resendAt) - clock) / 1000));
  useEffect(() => {
    if (!challenge.telegramUrl) return;
    const controller = new AbortController();
    let timer: number;
    const expires = Date.parse(challenge.expiresAt);
    async function check() {
      if (controller.signal.aborted || Date.now() >= expires) return;
      if (document.visibilityState === 'visible') {
        try {
          const status = await apiRequest<TelegramChallengeStatus>(
            '/auth/verification/' + challenge.id + '/telegram-status',
            { signal: controller.signal },
          );
          if (controller.signal.aborted) return;
          setTelegramState(status.state);
          if (status.state === 'ended') return;
        } catch {
          // A temporary connection loss still allows the customer to enter the code.
        }
      }
      if (!controller.signal.aborted) timer = window.setTimeout(check, 5000);
    }
    void check();
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [challenge.id, challenge.telegramUrl, challenge.expiresAt]);
  const ended = !!challenge.telegramUrl && telegramState === 'ended';
  async function confirm(e: FormEvent) {
    e.preventDefault();
    if (busy || ended || code.length !== 6 || seconds === 0) return;
    setBusy(true);
    setError(null);
    try {
      await apiRequest('/auth/verification/confirm', {
        method: 'POST',
        body: { id: challenge.id, code },
      });
      onSuccess();
    } catch (problem) {
      setError(identityError(problem));
      input.current?.focus();
      input.current?.select();
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    if (busy || wait) return;
    setBusy(true);
    setError(null);
    try {
      await onResend();
    } catch (problem) {
      setError(identityError(problem));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={confirm} className="space-y-5">
      <div>
        <h2 className="font-heading text-2xl text-fg">{t('codeTitle')}</h2>
        <p className="mt-2 break-words text-body-sm text-fg-muted">
          {challenge.telegramUrl
            ? t(phoneProof ? 'tgContact' : 'tgInstruction')
            : t('sent', { email: destination ?? '' })}
        </p>
      </div>
      {challenge.telegramUrl && (
        <div className="space-y-2">
          {!ended && (
            <a
              className={buttonClasses('secondary')}
              href={challenge.telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('openBot')}
            </a>
          )}
          <p role="status" className="text-body-sm text-fg-muted">
            {t(ended ? 'tgEnded' : telegramState === 'opened' ? 'tgOpened' : 'tgWaiting')}
          </p>
        </div>
      )}
      <div>
        <label className="mb-2 block text-body-sm font-semibold" htmlFor={id}>
          {t('code')}
        </label>
        <div className="relative max-w-80">
          <input
            ref={input}
            id={id}
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            dir="ltr"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
              setError(null);
            }}
            onPaste={(e) => {
              const pasted = e.clipboardData.getData('text').replace(/\D/g, '');
              if (pasted.length === 6) {
                e.preventDefault();
                setCode(pasted);
                setError(null);
              }
            }}
            aria-invalid={!!error || !seconds}
            aria-describedby={id + '-time'}
            className="peer absolute inset-0 z-10 h-full w-full cursor-text rounded-lg opacity-0"
          />
          <div
            aria-hidden="true"
            className="grid grid-cols-6 gap-2 rounded-lg peer-focus-visible:ring-2 peer-focus-visible:ring-brand peer-focus-visible:ring-offset-4"
          >
            {Array.from({ length: 6 }, (_, i) => (
              <span
                key={i}
                className={
                  'grid aspect-[4/5] place-items-center rounded-lg border bg-surface text-2xl font-semibold tabular-nums ' +
                  (i === code.length ? 'border-brand' : 'border-line')
                }
              >
                {code[i] ?? '·'}
              </span>
            ))}
          </div>
        </div>
        <p id={id + '-time'} className="mt-3 text-body-sm text-fg-muted">
          {seconds
            ? t('expires', {
                time: Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0'),
              })
            : t('expired')}
        </p>
      </div>
      <IdentityNotice error={error} />
      <Button
        type="submit"
        size="lg"
        className="w-full"
        loading={busy}
        disabled={ended || code.length !== 6 || !seconds}
      >
        {t('verify')}
      </Button>
      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="link" disabled={busy} onClick={onBack}>
          {t('back')}
        </Button>
        <Button variant="link" disabled={busy || wait > 0} onClick={resend}>
          {wait ? t('resendIn', { seconds: wait }) : t('resend')}
        </Button>
      </div>
    </form>
  );
}

'use client';

import {
  type ChallengeDto,
  type AuthFeaturesDto,
  type ConnectedMethodsDto,
  type Locale,
  type VerificationStart,
} from '@teran/contracts';
import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { beginGoogle, GoogleButton } from './identity-form';
import {
  IdentityNotice,
  VerificationCode,
  identityError,
  type IdentityError,
} from './verification-code';

export function IdentitySettings({
  methods,
  features,
  phone,
  callbackError,
}: {
  methods: ConnectedMethodsDto;
  features: AuthFeaturesDto | null;
  phone: string | null;
  callbackError?: string;
}) {
  const t = useTranslations('Account.identity'),
    ta = useTranslations('Account');
  const locale = useLocale() as Locale,
    router = useRouter();
  const [email, setEmail] = useState(methods.email ?? ''),
    [number, setNumber] = useState(phone ?? '');
  const [request, setRequest] = useState<VerificationStart | null>(null),
    [challenge, setChallenge] = useState<ChallengeDto | null>(null);
  const [error, setError] = useState<IdentityError | null>(
    callbackError ? (callbackError === 'link' ? 'conflict' : 'invalid') : null,
  );
  const [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  async function act(fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await fn();
    } catch (e) {
      setError(identityError(e));
    } finally {
      setBusy(false);
    }
  }
  async function start(body: VerificationStart) {
    const c = await apiRequest<ChallengeDto>('/auth/verification/start', { method: 'POST', body });
    setRequest(body);
    setChallenge(c);
  }
  function success() {
    setSaved(true);
    setChallenge(null);
    router.refresh();
  }
  function disconnect(provider: 'GOOGLE' | 'TELEGRAM') {
    void act(async () => {
      await apiRequest('/auth/connections/' + provider, { method: 'DELETE' });
      success();
    });
  }
  if (challenge && request)
    return (
      <VerificationCode
        key={challenge.id}
        challenge={challenge}
        destination={email}
        phoneProof={request.purpose === 'PHONE_CHANGE'}
        onResend={() => start(request)}
        onBack={() => setChallenge(null)}
        onSuccess={success}
      />
    );
  return (
    <div className="space-y-5">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void act(() => start({ purpose: 'EMAIL_CHANGE', channel: 'EMAIL', email, locale }));
        }}
      >
        <TextField
          label={ta('email')}
          value={email}
          name="verifiedEmail"
          type="email"
          autoComplete="email"
          required
          readOnly={!features?.emailOtp}
          onChange={(e) => setEmail(e.target.value)}
          hint={methods.emailVerified ? t('verified') : t('unverified')}
        />
        {features?.emailOtp && (
          <Button type="submit" variant="secondary" disabled={busy}>
            {t('verifyEmail')}
          </Button>
        )}
      </form>
      <form
        className="space-y-3 border-t border-line pt-5"
        onSubmit={(e) => {
          e.preventDefault();
          void act(() =>
            start({ purpose: 'PHONE_CHANGE', channel: 'TELEGRAM', phone: number, locale }),
          );
        }}
      >
        <TextField
          label={ta('phone')}
          value={number}
          name="verifiedPhone"
          type="tel"
          autoComplete="tel"
          required
          readOnly={!features?.telegram}
          onChange={(e) => setNumber(e.target.value)}
          hint={methods.phoneVerified ? t('verified') : t('unverified')}
        />
        {features?.telegram && (
          <Button type="submit" variant="secondary" disabled={busy}>
            {t('verifyPhone')}
          </Button>
        )}
      </form>
      {(features?.telegram || methods.telegram) && (
        <div className="border-t border-line pt-4">
          {methods.telegram ? (
            <Button variant="secondary" disabled={busy} onClick={() => disconnect('TELEGRAM')}>
              {t('disconnectTelegram')}
            </Button>
          ) : (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() =>
                void act(() => start({ purpose: 'LINK', channel: 'TELEGRAM', locale }))
              }
            >
              {t('connectTelegram')}
            </Button>
          )}
        </div>
      )}
      {(features?.google || methods.google) && (
        <div className="border-t border-line pt-4">
          {methods.google ? (
            <Button variant="secondary" disabled={busy} onClick={() => disconnect('GOOGLE')}>
              {t('disconnectGoogle')}
            </Button>
          ) : (
            <GoogleButton
              disabled={busy}
              onClick={() => void act(() => beginGoogle('LINK', locale, '/account/security'))}
            />
          )}
        </div>
      )}
      {saved && (
        <p role="status" className="font-semibold text-brand">
          {ta('saved')}
        </p>
      )}
      <IdentityNotice error={error} />
    </div>
  );
}

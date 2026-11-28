'use client';

import {
  personalInfoSchema,
  type AuthFeaturesDto,
  type Locale,
  type ChallengeDto,
  type VerificationStart,
} from '@teran/contracts';
import { Check, Mail, Send } from 'lucide-react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/field';
import { apiRequest } from '@/lib/api/client';
import { LoginForm, useSignedIn } from './auth-forms';
import {
  VerificationCode,
  IdentityNotice,
  identityError,
  type IdentityError,
} from './verification-code';

const blank = { firstName: '', lastName: '', email: '', phone: '' };
type Profile = typeof blank;
export function GoogleButton({
  onClick,
  disabled = false,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  const t = useTranslations('Account.identity');
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-neutral-400 bg-white px-5 text-base font-medium text-neutral-800 hover:bg-neutral-50 disabled:opacity-50"
    >
      <Image src="/brand/google-signin.svg" alt="" width={20} height={20} />
      {t('google')}
    </button>
  );
}
export async function beginGoogle(purpose: 'LOGIN' | 'LINK', locale: Locale, next: string) {
  const { url } = await apiRequest<{ url: string }>('/auth/google/start', {
    method: 'POST',
    body: { purpose, locale, next },
  });
  window.location.assign(url);
}
export function IdentityForm({
  mode,
  features,
  next,
  googleId,
  googleProfile,
  callbackError,
}: {
  mode: 'login' | 'register';
  features: AuthFeaturesDto | null;
  next: string;
  googleId?: string;
  googleProfile?: Partial<Profile>;
  callbackError?: string;
}) {
  const t = useTranslations('Account.identity'),
    ta = useTranslations('Account');
  const locale = useLocale() as Locale;
  const signedIn = useSignedIn(next);
  const register = mode === 'register';
  const [profile, setProfile] = useState<Profile>({ ...blank, ...googleProfile });
  const [stage, setStage] = useState<'personal' | 'methods' | 'email' | 'code' | 'done'>(
    register ? 'personal' : 'methods',
  );
  const [challenge, setChallenge] = useState<ChallengeDto | null>(null);
  const [request, setRequest] = useState<VerificationStart | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<IdentityError | null>(
    callbackError ? (callbackError === 'link' ? 'conflict' : 'invalid') : null,
  );
  const [fields, setFields] = useState<string[]>([]);
  const alternatives = !!(features?.google || features?.telegram || features?.emailOtp);
  useEffect(() => {
    if (stage !== 'done') return;
    const timer = window.setTimeout(signedIn, 850);
    return () => window.clearTimeout(timer);
  }, [stage, signedIn]);
  async function act(task: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await task();
    } catch (problem) {
      setError(identityError(problem));
    } finally {
      setBusy(false);
    }
  }
  async function start(body: VerificationStart) {
    const result = await apiRequest<ChallengeDto>('/auth/verification/start', {
      method: 'POST',
      body,
    });
    setRequest(body);
    setChallenge(result);
    setStage('code');
  }
  function choose(channel: 'EMAIL' | 'TELEGRAM') {
    if (!register && channel === 'EMAIL') {
      setStage('email');
      setError(null);
      return;
    }
    const body: VerificationStart = register
      ? { purpose: 'REGISTER', channel, profile, locale }
      : { purpose: 'LOGIN', channel: 'TELEGRAM', locale };
    void act(() => start(body));
  }
  function details(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = personalInfoSchema.safeParse(profile);
    if (!parsed.success) {
      setFields(parsed.error.issues.map((i) => String(i.path[0])));
      return;
    }
    setProfile(parsed.data);
    setFields([]);
    if (googleId) {
      void act(async () => {
        await apiRequest('/auth/google/profile/' + googleId, { method: 'POST', body: parsed.data });
        setStage('done');
      });
    } else setStage('methods');
  }
  function field(key: keyof Profile) {
    const email = key === 'email',
      phone = key === 'phone';
    return (
      <TextField
        key={key}
        label={ta(key)}
        name={key}
        value={profile[key]}
        required
        type={email ? 'email' : phone ? 'tel' : 'text'}
        autoComplete={
          { email: 'email', phone: 'tel', firstName: 'given-name', lastName: 'family-name' }[key]
        }
        readOnly={email && !!googleId}
        maxLength={phone ? 25 : email ? 254 : 60}
        placeholder={phone ? '+998 90 123 45 67' : undefined}
        error={fields.includes(key) ? t('fields') : undefined}
        onChange={(e) => {
          setProfile({ ...profile, [key]: e.target.value });
          setFields(fields.filter((f) => f !== key));
        }}
      />
    );
  }
  const step = stage === 'personal' ? 1 : stage === 'code' ? 3 : stage === 'done' ? 4 : 2;
  const emailMethod = features?.emailOtp && (
    <Button
      variant="secondary"
      className="w-full"
      size="lg"
      disabled={busy}
      onClick={() => choose('EMAIL')}
    >
      <Mail size={19} aria-hidden />
      {t('emailCode')}
    </Button>
  );
  return (
    <div className="space-y-5">
      {register && (
        <div
          aria-label={t('step', { step })}
          className="space-y-2 text-body-sm font-semibold text-brand"
        >
          <p>{t('step', { step })}</p>
          <div aria-hidden="true" className="flex gap-1.5">
            {[1, 2, 3, 4].map((n) => (
              <span
                key={n}
                className={'h-1 flex-1 rounded-full ' + (n <= step ? 'bg-brand' : 'bg-line')}
              />
            ))}
          </div>
        </div>
      )}
      {stage === 'personal' && (
        <form onSubmit={details} className="space-y-4">
          <h2 className="font-heading text-2xl">{t('personal')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {field('firstName')}
            {field('lastName')}
          </div>
          {field('email')}
          {field('phone')}
          <Button type="submit" className="w-full" size="lg" loading={busy}>
            {googleId ? t('finish') : t('next')}
          </Button>
        </form>
      )}
      {!register && stage === 'methods' && (
        <LoginForm
          next={next}
          forgotPasswordHref={features?.passwordReset ? '/account/forgot-password' : null}
        />
      )}
      {stage === 'methods' && (alternatives || register) && (
        <div className="space-y-3">
          {alternatives && (
            <h2
              className={
                register
                  ? 'font-heading text-2xl'
                  : 'mb-4 flex items-center gap-3 text-body-sm font-medium text-fg-muted before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line'
              }
            >
              {t(register ? 'selectVerify' : 'otherMethods')}
            </h2>
          )}
          {register && emailMethod}
          {features?.telegram && (
            <Button
              variant="secondary"
              className="w-full"
              size="lg"
              disabled={busy}
              onClick={() => choose('TELEGRAM')}
            >
              <Send size={19} aria-hidden />
              {t('telegramCode')}
            </Button>
          )}
          {features?.google && (
            <GoogleButton
              disabled={busy}
              onClick={() => void act(() => beginGoogle('LOGIN', locale, next))}
            />
          )}
          {!register && emailMethod}
          {register && (
            <Button
              variant="link"
              onClick={() => {
                setStage('personal');
                setError(null);
              }}
            >
              {t('editDetails')}
            </Button>
          )}
        </div>
      )}
      {stage === 'personal' && features?.google && !googleId && (
        <GoogleButton
          disabled={busy}
          onClick={() => void act(() => beginGoogle('LOGIN', locale, next))}
        />
      )}
      {stage === 'email' && (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void act(() =>
              start({ purpose: 'LOGIN', channel: 'EMAIL', email: profile.email, locale }),
            );
          }}
        >
          {field('email')}
          <Button className="w-full" size="lg" type="submit" loading={busy}>
            {t('send')}
          </Button>
          <Button
            variant="link"
            onClick={() => {
              setStage('methods');
              setError(null);
            }}
          >
            {t('back')}
          </Button>
        </form>
      )}
      {stage === 'code' && challenge && request && (
        <VerificationCode
          key={challenge.id}
          challenge={challenge}
          destination={profile.email}
          onResend={() => start(request)}
          onBack={() => {
            setStage(register ? 'personal' : 'methods');
            setError(null);
          }}
          onSuccess={() => setStage('done')}
        />
      )}
      {stage === 'done' && (
        <div role="status" className="space-y-4">
          <Check className="text-brand" aria-hidden />
          <h2 className="font-heading text-2xl">{t('success')}</h2>
          <Button onClick={signedIn}>{t('next')}</Button>
        </div>
      )}
      <IdentityNotice error={error} />
    </div>
  );
}

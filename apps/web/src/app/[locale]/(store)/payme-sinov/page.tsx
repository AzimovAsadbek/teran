import { randomUUID } from 'node:crypto';
import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { getLocale, getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { ButtonLink, buttonClasses } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { Skeleton } from '@/components/ui/skeleton';
import { getPathname } from '@/i18n/navigation';
import { currentUser, requireUser } from '@/lib/account';
import {
  PAYME_TRIAL_PATH,
  paymeTrialEnabled,
  paymeTrialReceipt,
  startPaymeTrial,
} from '@/lib/payme-trial';

const COOKIE = 'teran_payme_trial';
const NONCE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'PaymeTrial' });
  return { title: t('title'), robots: { index: false, follow: false }, referrer: 'no-referrer' };
}

async function openTrial(nonce: string) {
  'use server';
  if (!paymeTrialEnabled() || !NONCE.test(nonce)) notFound();
  const locale = await getLocale();
  const user = await requireUser(locale, PAYME_TRIAL_PATH);
  const path = getPathname({ locale, href: PAYME_TRIAL_PATH });
  const trial = await startPaymeTrial(user.id, nonce, locale).catch(() => null);
  if (!trial) redirect(path + '?retry=' + nonce);
  (await cookies()).set(COOKIE, [user.id, nonce, trial.token].join('.'), {
    path,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 86400,
  });
  redirect(trial.checkout);
}

async function Trial({ searchParams }: Pick<PageProps<'/[locale]/payme-sinov'>, 'searchParams'>) {
  await connection();
  if (!paymeTrialEnabled()) notFound();
  const [t, orderText, user, locale, query, jar] = await Promise.all([
    getTranslations('PaymeTrial'),
    getTranslations('Checkout'),
    currentUser(),
    getLocale(),
    searchParams,
    cookies(),
  ]);
  const path = getPathname({ locale, href: PAYME_TRIAL_PATH });
  const [owner, lastNonce, lastToken] = (jar.get(COOKIE)?.value ?? '').split('.');
  const returnToken =
    typeof query.receipt === 'string' && /^[A-Za-z0-9_-]{20,200}$/.test(query.receipt)
      ? query.receipt
      : undefined;
  const token = returnToken ?? (user && user.id === owner ? lastToken : undefined);
  const receipt = token && user ? await paymeTrialReceipt(token).catch(() => null) : null;
  const retry = typeof query.retry === 'string' && NONCE.test(query.retry) ? query.retry : null;
  const pending =
    receipt?.awaitingPayment &&
    user?.id === owner &&
    token === lastToken &&
    lastNonce &&
    NONCE.test(lastNonce)
      ? lastNonce
      : null;
  const next = returnToken ? PAYME_TRIAL_PATH + '?receipt=' + returnToken : PAYME_TRIAL_PATH;
  return (
    <section className="container-page py-section-sm">
      <div className="max-w-xl">
        <h1 className="text-display-md text-fg">{t('title')}</h1>
        <p className="mt-4 text-body-lg text-fg-muted">{t('intro')}</p>
        {retry || (user && token && !receipt) ? (
          <Notice className="mt-5" tone="warning" role="alert">
            {t('unavailable')}
          </Notice>
        ) : null}
        {receipt ? (
          <div className="mt-6 rounded-panel border border-line p-5" role="status">
            <p className="font-semibold">{t('order', { number: receipt.orderNumber })}</p>
            <p className="mt-1">{orderText(`paymentStatuses.${receipt.paymentStatus}`)}</p>
            <a
              href={path + '?receipt=' + encodeURIComponent(token!)}
              className="mt-3 inline-block text-brand underline"
            >
              {t('refresh')}
            </a>
          </div>
        ) : null}
        {user ? (
          <form action={openTrial.bind(null, retry ?? pending ?? randomUUID())} className="mt-6">
            <button className={buttonClasses()} type="submit">
              {t('open')}
            </button>
          </form>
        ) : (
          <ButtonLink className="mt-6" href={'/account/login?next=' + encodeURIComponent(next)}>
            {t('login')}
          </ButtonLink>
        )}
      </div>
    </section>
  );
}

export default function PaymeTrialPage({ searchParams }: PageProps<'/[locale]/payme-sinov'>) {
  return (
    <Suspense fallback={<Skeleton className="container-page my-12 h-36" />}>
      <Trial searchParams={searchParams} />
    </Suspense>
  );
}

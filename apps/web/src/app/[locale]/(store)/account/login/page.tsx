import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { AuthCard, AuthCardSkeleton } from '@/components/account/auth-card';
import { LoginForm } from '@/components/account/auth-forms';
import { Link, getPathname } from '@/i18n/navigation';
import { currentUser } from '@/lib/account';
import { getAuthFeatures } from '@/lib/data/content';
import { safeNextPath } from '@/lib/safe-next';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Account' });
  return pageMetadata({ title: t('loginTitle'), href: '/account/login', locale, noIndex: true });
}

async function Login({ searchParams }: Pick<PageProps<'/[locale]/account/login'>, 'searchParams'>) {
  const [query, locale, t] = await Promise.all([
    searchParams,
    rootParams.locale() as Promise<Locale>,
    getTranslations('Account'),
  ]);
  const next = safeNextPath(query.next);
  const [user, features] = await Promise.all([currentUser(), getAuthFeatures().catch(() => null)]);
  if (user) redirect(getPathname({ href: next, locale }));

  const registerHref =
    next === '/account'
      ? '/account/register'
      : `/account/register?next=${encodeURIComponent(next)}`;
  return (
    <AuthCard
      title={t('loginTitle')}
      intro={t('guestNote')}
      footer={
        <>
          {features?.passwordReset ? (
            <p>
              <Link
                href="/account/forgot-password"
                className="font-semibold text-forest-900 underline-offset-4 hover:underline"
              >
                {t('forgotPassword')}
              </Link>
            </p>
          ) : null}
          {features?.registration !== false ? (
            <p>
              {t('noAccount')}{' '}
              <Link
                href={registerHref}
                className="font-semibold text-forest-900 underline-offset-4 hover:underline"
              >
                {t('register')}
              </Link>
            </p>
          ) : null}
        </>
      }
    >
      <LoginForm next={next} />
    </AuthCard>
  );
}

export default function LoginPage({ searchParams }: PageProps<'/[locale]/account/login'>) {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <Login searchParams={searchParams} />
    </Suspense>
  );
}

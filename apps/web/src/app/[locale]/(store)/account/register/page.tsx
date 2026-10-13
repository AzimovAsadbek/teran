import type { CurrentUserDto, Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { AuthCard, AuthCardSkeleton } from '@/components/account/auth-card';
import { RegisterForm } from '@/components/account/auth-forms';
import { ButtonLink } from '@/components/ui/button';
import { Link, getPathname } from '@/i18n/navigation';
import { apiGetAsVisitor } from '@/lib/api/server';
import { getAuthFeatures } from '@/lib/data/content';
import { safeNextPath } from '@/lib/safe-next';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Account' });
  return pageMetadata({
    title: t('registerTitle'),
    href: '/account/register',
    locale,
    noIndex: true,
  });
}

async function Register({
  searchParams,
}: Pick<PageProps<'/[locale]/account/register'>, 'searchParams'>) {
  const [query, locale, t, tc] = await Promise.all([
    searchParams,
    rootParams.locale() as Promise<Locale>,
    getTranslations('Account'),
    getTranslations('Cart'),
  ]);
  const next = safeNextPath(query.next);
  const [user, features] = await Promise.all([
    apiGetAsVisitor<CurrentUserDto>('/auth/me').catch(() => null),
    getAuthFeatures().catch(() => null),
  ]);
  if (user) redirect(getPathname({ href: next, locale }));

  const loginHref =
    next === '/account' ? '/account/login' : `/account/login?next=${encodeURIComponent(next)}`;
  if (features?.registration === false) {
    return (
      <AuthCard title={t('registerTitle')}>
        <p className="text-center text-ink-700">{t('registrationClosed')}</p>
        <div className="mt-6 flex justify-center">
          <ButtonLink href="/catalog">{tc('startShopping')}</ButtonLink>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t('registerTitle')}
      intro={t('guestNote')}
      footer={
        <p>
          {t('haveAccount')}{' '}
          <Link
            href={loginHref}
            className="font-semibold text-forest-900 underline-offset-4 hover:underline"
          >
            {t('login')}
          </Link>
        </p>
      }
    >
      <RegisterForm next={next} />
    </AuthCard>
  );
}

export default function RegisterPage({ searchParams }: PageProps<'/[locale]/account/register'>) {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <Register searchParams={searchParams} />
    </Suspense>
  );
}

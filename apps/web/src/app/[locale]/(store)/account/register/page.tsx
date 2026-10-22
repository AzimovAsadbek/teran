import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { AuthCard, AuthCardSkeleton } from '@/components/account/auth-card';
import { RegisterForm } from '@/components/account/auth-forms';
import { AuthTeaPanel } from '@/components/account/auth-tea-panel';
import { ButtonLink } from '@/components/ui/button';
import { getPathname } from '@/i18n/navigation';
import { currentUser } from '@/lib/account';
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
  const [user, features] = await Promise.all([currentUser(), getAuthFeatures().catch(() => null)]);
  if (user) redirect(getPathname({ href: next, locale }));

  const loginHref =
    next === '/account' ? '/account/login' : `/account/login?next=${encodeURIComponent(next)}`;
  if (features?.registration === false) {
    return (
      <AuthCard title={t('registerTitle')} aside={<AuthTeaPanel pick={3} />}>
        <p className="text-fg-muted">{t('registrationClosed')}</p>
        <ButtonLink href="/catalog" className="mt-6">
          {tc('startShopping')}
        </ButtonLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t('registerTitle')}
      intro={t('guestNote')}
      aside={<AuthTeaPanel pick={3} />}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <p>{t('haveAccount')}</p>
          <ButtonLink href={loginHref} variant="secondary">
            {t('login')}
          </ButtonLink>
        </div>
      }
    >
      <RegisterForm next={next} />
    </AuthCard>
  );
}

export default function RegisterPage({ searchParams }: PageProps<'/[locale]/account/register'>) {
  return (
    <Suspense fallback={<AuthCardSkeleton aside />}>
      <Register searchParams={searchParams} />
    </Suspense>
  );
}

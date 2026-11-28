import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { AuthCard, AuthCardSkeleton } from '@/components/account/auth-card';
import { IdentityForm } from '@/components/account/identity-form';
import { apiGetAsVisitor } from '@/lib/api/server';
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

  const googleId =
    typeof query.google === 'string' && /^[a-f0-9-]{36}$/.test(query.google)
      ? query.google
      : undefined;
  const googleProfile = googleId
    ? await apiGetAsVisitor<{ firstName: string; lastName: string; email: string }>(
        '/auth/google/profile/' + googleId,
      ).catch(() => null)
    : null;
  const loginHref =
    next === '/account' ? '/account/login' : `/account/login?next=${encodeURIComponent(next)}`;
  if (!features?.registration) {
    return (
      <AuthCard
        title={t('registerTitle')}
        aside={next === '/checkout' ? undefined : <AuthTeaPanel pick={3} />}
      >
        <p className="text-fg-muted">{t('registrationClosed')}</p>
        <ButtonLink href={next === '/checkout' ? loginHref : '/catalog'} className="mt-6">
          {next === '/checkout' ? t('login') : tc('startShopping')}
        </ButtonLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t('registerTitle')}
      intro={next === '/checkout' ? t('checkoutLoginNote') : t('guestNote')}
      aside={next === '/checkout' ? undefined : <AuthTeaPanel pick={3} />}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <p>{t('haveAccount')}</p>
          <ButtonLink href={loginHref} variant="secondary">
            {t('login')}
          </ButtonLink>
        </div>
      }
    >
      <IdentityForm
        mode="register"
        next={next}
        features={features}
        googleId={googleProfile ? googleId : undefined}
        googleProfile={googleProfile ?? undefined}
        callbackError={googleId && !googleProfile ? 'invalid' : undefined}
      />
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

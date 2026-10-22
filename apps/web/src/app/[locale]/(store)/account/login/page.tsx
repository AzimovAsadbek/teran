import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { AuthCard, AuthCardSkeleton } from '@/components/account/auth-card';
import { LoginForm } from '@/components/account/auth-forms';
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
  // Staff coming from the administration see where they are signing in to (no sign-up offer).
  const staff = next === '/admin' || next.startsWith('/admin/');
  return (
    <AuthCard
      title={staff ? t('staffLoginTitle') : t('loginTitle')}
      intro={staff ? t('staffLoginIntro') : t('guestNote')}
      aside={<AuthTeaPanel pick={1} />}
      footer={
        !staff && features?.registration !== false ? (
          <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <p>{t('noAccount')}</p>
            <ButtonLink href={registerHref} variant="secondary">
              {t('register')}
            </ButtonLink>
          </div>
        ) : undefined
      }
    >
      <LoginForm
        next={next}
        forgotPasswordHref={features?.passwordReset ? '/account/forgot-password' : null}
      />
    </AuthCard>
  );
}

export default function LoginPage({ searchParams }: PageProps<'/[locale]/account/login'>) {
  return (
    <Suspense fallback={<AuthCardSkeleton aside />}>
      <Login searchParams={searchParams} />
    </Suspense>
  );
}

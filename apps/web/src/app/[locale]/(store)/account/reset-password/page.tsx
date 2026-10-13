import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { AuthCard, AuthCardSkeleton } from '@/components/account/auth-card';
import { ResetPasswordForm } from '@/components/account/auth-forms';
import { Link } from '@/i18n/navigation';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Account' });
  return {
    title: t('resetTitle'),
    robots: { index: false, follow: false },
    // The URL carries the one-time reset token: never send it to another site as a Referer.
    referrer: 'no-referrer',
  };
}

async function ResetPassword({
  searchParams,
}: Pick<PageProps<'/[locale]/account/reset-password'>, 'searchParams'>) {
  const [query, t] = await Promise.all([searchParams, getTranslations('Account')]);
  const token = typeof query.token === 'string' && query.token.length >= 20 ? query.token : null;

  return (
    <AuthCard
      title={t('resetTitle')}
      footer={
        <p>
          <Link
            href="/account/forgot-password"
            className="font-semibold text-forest-900 underline-offset-4 hover:underline"
          >
            {t('forgotPassword')}
          </Link>
        </p>
      }
    >
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-center text-ink-700">{t('resetMissingToken')}</p>
      )}
    </AuthCard>
  );
}

export default function ResetPasswordPage({
  searchParams,
}: PageProps<'/[locale]/account/reset-password'>) {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <ResetPassword searchParams={searchParams} />
    </Suspense>
  );
}

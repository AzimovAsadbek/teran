import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { AuthCard, AuthCardSkeleton } from '@/components/account/auth-card';
import { ResetPasswordForm } from '@/components/account/auth-forms';
import { ButtonLink } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
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
        token ? (
          <p>
            <Link
              href="/account/forgot-password"
              className="font-semibold text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand"
            >
              {t('forgotPassword')}
            </Link>
          </p>
        ) : undefined
      }
    >
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        // A link without its token: say so as a warning, and offer the way to a new one.
        <div className="space-y-6">
          <Notice tone="warning">{t('resetMissingToken')}</Notice>
          <ButtonLink href="/account/forgot-password" size="lg" className="w-full">
            {t('forgotPassword')}
          </ButtonLink>
        </div>
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

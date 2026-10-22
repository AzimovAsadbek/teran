import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { AuthCard, AuthCardSkeleton } from '@/components/account/auth-card';
import { ForgotPasswordForm } from '@/components/account/auth-forms';
import { AuthTeaPanel } from '@/components/account/auth-tea-panel';
import { ButtonLink } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { getAuthFeatures } from '@/lib/data/content';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Account' });
  return pageMetadata({
    title: t('forgotTitle'),
    href: '/account/forgot-password',
    locale,
    noIndex: true,
  });
}

async function ForgotPassword() {
  await connection();
  const t = await getTranslations('Account');
  const tn = await getTranslations('Nav');
  const features = await getAuthFeatures().catch(() => null);
  const footer = (
    <p>
      <Link
        href="/account/login"
        className="font-semibold text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand"
      >
        {t('login')}
      </Link>
    </p>
  );

  // Without outgoing e-mail a reset link could never arrive, so the form is not offered.
  if (!features?.passwordReset) {
    return (
      <AuthCard title={t('forgotTitle')} footer={footer} aside={<AuthTeaPanel pick={2} />}>
        <p className="text-fg-muted">{t('resetUnavailable')}</p>
        <ButtonLink href="/contact" className="mt-6">
          {tn('contact')}
        </ButtonLink>
      </AuthCard>
    );
  }
  return (
    <AuthCard
      title={t('forgotTitle')}
      intro={t('forgotText')}
      footer={footer}
      aside={<AuthTeaPanel pick={2} />}
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<AuthCardSkeleton aside />}>
      <ForgotPassword />
    </Suspense>
  );
}

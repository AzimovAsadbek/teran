import type { AccountSessionDto, Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { ChangePasswordForm } from '@/components/account/account-forms';
import { AccountPageHeader, AccountPanel } from '@/components/account/account-ui';
import { SessionsPanel } from '@/components/account/security-forms';
import { Notice } from '@/components/ui/notice';
import { Skeleton } from '@/components/ui/skeleton';
import { requireUser } from '@/lib/account';
import { apiGetAsVisitor } from '@/lib/api/server';
import { getAuthFeatures } from '@/lib/data/content';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Account' });
  return pageMetadata({ title: t('security'), href: '/account/security', locale, noIndex: true });
}

async function Security() {
  const locale = (await rootParams.locale()) as Locale;
  const [t, tc] = await Promise.all([getTranslations('Account'), getTranslations('Checkout')]);
  await requireUser(locale, '/account/security');
  const [sessions, features] = await Promise.all([
    apiGetAsVisitor<AccountSessionDto[]>('/account/sessions').catch(() => null),
    getAuthFeatures().catch(() => null),
  ]);

  return (
    <div className="space-y-6">
      <AccountPageHeader title={t('security')} />
      <AccountPanel title={t('changePassword')} text={t('passwordText')}>
        <ChangePasswordForm />
        {/* Only say that reset by e-mail works when the API reports that e-mail is configured. */}
        <p className="mt-5 text-body-sm text-fg-subtle">
          {features?.passwordReset ? t('resetAvailable') : t('resetNotAvailable')}
        </p>
      </AccountPanel>
      <AccountPanel title={t('sessionsTitle')} text={t('sessionsText')}>
        {sessions ? (
          <SessionsPanel sessions={sessions} />
        ) : (
          <Notice tone="danger" role="alert">
            {tc('loadError')}
          </Notice>
        )}
      </AccountPanel>
    </div>
  );
}

export default function SecurityPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6" aria-hidden>
          <Skeleton className="h-12 w-1/2" />
          <Skeleton className="h-72 rounded-panel" />
          <Skeleton className="h-60 rounded-panel" />
        </div>
      }
    >
      <Security />
    </Suspense>
  );
}

import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { AuthCard, AuthCardSkeleton } from '@/components/account/auth-card';
import { UnsubscribeForm } from '@/components/forms/unsubscribe-form';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Newsletter' });
  return {
    title: t('unsubscribeTitle'),
    robots: { index: false, follow: false },
    // The URL carries the subscriber's token: never send it to another site as a Referer.
    referrer: 'no-referrer',
  };
}

async function Unsubscribe({
  searchParams,
}: Pick<PageProps<'/[locale]/newsletter/unsubscribe'>, 'searchParams'>) {
  const [query, t] = await Promise.all([searchParams, getTranslations('Newsletter')]);
  const id = typeof query.id === 'string' ? query.id : null;
  const token = typeof query.token === 'string' ? query.token : null;
  return (
    <AuthCard title={t('unsubscribeTitle')} intro={id && token ? t('unsubscribeText') : undefined}>
      {id && token ? (
        <UnsubscribeForm id={id} token={token} />
      ) : (
        <p className="text-center text-ink-700">{t('unsubscribeInvalid')}</p>
      )}
    </AuthCard>
  );
}

export default function UnsubscribePage({
  searchParams,
}: PageProps<'/[locale]/newsletter/unsubscribe'>) {
  return (
    <Suspense fallback={<AuthCardSkeleton />}>
      <Unsubscribe searchParams={searchParams} />
    </Suspense>
  );
}

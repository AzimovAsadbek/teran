import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { AuthCard, AuthCardSkeleton } from '@/components/account/auth-card';
import { UnsubscribeForm } from '@/components/forms/unsubscribe-form';
import { ButtonLink } from '@/components/ui/button';
import { Notice } from '@/components/ui/notice';
import { ClientMessages } from '@/i18n/client-messages';

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
  const [query, t, th] = await Promise.all([
    searchParams,
    getTranslations('Newsletter'),
    getTranslations('Help'),
  ]);
  const id = typeof query.id === 'string' ? query.id : null;
  const token = typeof query.token === 'string' ? query.token : null;
  return (
    <AuthCard title={t('unsubscribeTitle')} intro={id && token ? t('unsubscribeText') : undefined}>
      {id && token ? (
        <ClientMessages pick={['Validation.fixErrors']}>
          <UnsubscribeForm id={id} token={token} />
        </ClientMessages>
      ) : (
        // A link without its id or token: say so as a warning, and offer the way to write.
        <div className="space-y-6">
          <Notice tone="warning">{t('unsubscribeInvalid')}</Notice>
          <ButtonLink href="/contact" size="lg" className="w-full">
            {th('contactTitle')}
          </ButtonLink>
        </div>
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

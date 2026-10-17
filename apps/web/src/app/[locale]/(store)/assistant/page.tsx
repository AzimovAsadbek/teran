import type { Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { AssistantChat } from '@/components/assistant/assistant-chat';
import { PageHeader } from '@/components/content/page-header';
import { pickMessages, STORE_CLIENT_NAMESPACES, type Messages } from '@/i18n/messages';
import { getAssistantStatus } from '@/lib/data/content';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Assistant' });
  return pageMetadata({
    title: t('metaTitle'),
    description: t('metaDescription'),
    href: '/assistant',
    locale,
  });
}

async function Chat() {
  await connection();
  const [status, messages] = await Promise.all([
    getAssistantStatus().catch(() => null),
    getMessages() as Promise<Messages>,
  ]);
  // The advisor's own texts reach the browser on this page only.
  return (
    <NextIntlClientProvider
      messages={pickMessages(messages, [...STORE_CLIENT_NAMESPACES, 'Assistant'])}
    >
      <AssistantChat initialMode={status?.mode ?? 'basic'} />
    </NextIntlClientProvider>
  );
}

/**
 * The product advisor: shoppers describe what they want in their own words and get products from
 * the live catalogue with the recorded facts that make them fit. It recommends only; ordering
 * stays in the store.
 */
export default async function AssistantPage() {
  const t = await getTranslations('Assistant');
  return (
    <>
      <PageHeader title={t('title')} intro={t('intro')} />
      <div className="container-page pt-10 pb-section">
        {/* The same height as the advisor's first view, so nothing below it moves when it arrives. */}
        <Suspense fallback={<div aria-hidden className="mx-auto min-h-[27rem] max-w-3xl" />}>
          <Chat />
        </Suspense>
      </div>
    </>
  );
}

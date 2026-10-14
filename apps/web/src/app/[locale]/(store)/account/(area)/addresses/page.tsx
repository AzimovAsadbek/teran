import type { AddressDto, Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { AddressBook } from '@/components/account/address-book';
import { AccountPageHeader } from '@/components/account/account-ui';
import { Notice } from '@/components/ui/notice';
import { Skeleton } from '@/components/ui/skeleton';
import { requireUser } from '@/lib/account';
import { apiGetAsVisitor } from '@/lib/api/server';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Account' });
  return pageMetadata({ title: t('addresses'), href: '/account/addresses', locale, noIndex: true });
}

async function Addresses() {
  const locale = (await rootParams.locale()) as Locale;
  const [t, tc] = await Promise.all([getTranslations('Account'), getTranslations('Checkout')]);
  await requireUser(locale, '/account/addresses');
  const addresses = await apiGetAsVisitor<AddressDto[]>('/account/addresses').catch(() => null);
  return (
    <div className="space-y-6">
      <AccountPageHeader title={t('addresses')} text={t('addressesText')} />
      {addresses ? (
        <AddressBook initial={addresses} />
      ) : (
        <Notice tone="danger" role="alert">
          {tc('loadError')}
        </Notice>
      )}
    </div>
  );
}

export default function AddressesPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6" aria-hidden>
          <Skeleton className="h-12 w-1/2" />
          <div className="grid gap-3 md:grid-cols-2">
            <Skeleton className="h-44 rounded-card" />
            <Skeleton className="h-44 rounded-card" />
          </div>
        </div>
      }
    >
      <Addresses />
    </Suspense>
  );
}

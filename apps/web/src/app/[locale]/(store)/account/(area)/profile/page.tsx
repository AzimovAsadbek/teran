import type { AccountProfileDto, Locale } from '@teran/contracts';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { Suspense } from 'react';
import { ProfileForm } from '@/components/account/account-forms';
import { AccountPageHeader, AccountPanel } from '@/components/account/account-ui';
import { ButtonLink } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { requireUser } from '@/lib/account';
import { apiGetAsVisitor } from '@/lib/api/server';
import { formatDate } from '@/lib/format';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Account' });
  return pageMetadata({ title: t('profile'), href: '/account/profile', locale, noIndex: true });
}

async function Profile() {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations('Account');
  const user = await requireUser(locale, '/account/profile');
  const profile = await apiGetAsVisitor<AccountProfileDto>('/account/profile').catch(() => null);

  return (
    <div className="space-y-6">
      <AccountPageHeader
        title={t('profile')}
        text={
          profile
            ? `${t('accountStatus')}: ${t('statusActive')} · ${t('memberSince', {
                date: formatDate(profile.memberSince, locale),
              })}`
            : undefined
        }
      />
      <AccountPanel title={t('profile')} text={t('profileText')}>
        <ProfileForm user={user} />
      </AccountPanel>
      <ButtonLink href="/account/security" variant="secondary">
        {t('identity.manage')}
      </ButtonLink>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6" aria-hidden>
          <Skeleton className="h-12 w-1/2" />
          <Skeleton className="h-80 rounded-panel" />
          <Skeleton className="h-60 rounded-panel" />
        </div>
      }
    >
      <Profile />
    </Suspense>
  );
}

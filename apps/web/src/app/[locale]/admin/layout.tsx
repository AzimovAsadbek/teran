import { isStaffRole, type CurrentUserDto, type Locale } from '@teran/contracts';
import { ShieldAlert } from 'lucide-react';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { Suspense, type ReactNode } from 'react';
import { AdminShell } from '@/components/admin/admin-shell';
import { ButtonLink } from '@/components/ui/button';
import { pickMessages, type Messages } from '@/i18n/messages';
import { getPathname } from '@/i18n/navigation';
import { apiGetAsVisitor } from '@/lib/api/server';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return {
    title: { default: t('metaTitle'), template: `%s — ${t('brand')}` },
    robots: { index: false, follow: false },
  };
}

/** Namespaces the admin's client components read. */
const CLIENT_NAMESPACES = [
  'Admin',
  'Common',
  'Validation',
  'Errors',
  'Checkout',
  'Catalog',
  'Product',
  'Language',
  'Account',
  'Wholesale',
] as const satisfies readonly (keyof Messages)[];

async function Forbidden() {
  const t = await getTranslations('Admin');
  return (
    <div className="flex min-h-dvh items-center justify-center bg-ivory-100 px-4">
      <div className="max-w-md rounded-[var(--radius-panel)] bg-white p-8 text-center shadow-soft">
        <ShieldAlert aria-hidden className="mx-auto h-10 w-10 text-gold-700" />
        <h1 className="mt-4 font-display text-3xl font-semibold text-forest-900">
          {t('access.forbiddenTitle')}
        </h1>
        <p className="mt-2 text-ink-700">{t('access.forbiddenText')}</p>
        <ButtonLink href="/" variant="secondary" className="mt-6">
          {t('nav.viewStore')}
        </ButtonLink>
      </div>
    </div>
  );
}

/**
 * Server-side gate: no staff session, no admin. The API enforces the same roles on every request,
 * so this only decides what to render; it is not the security boundary.
 */
async function AdminGate({ children }: { children: ReactNode }) {
  const locale = (await rootParams.locale()) as Locale;
  const user = await apiGetAsVisitor<CurrentUserDto>('/auth/me').catch(() => null);
  if (!user) redirect(getPathname({ href: '/account/login?next=/admin', locale }));
  if (!isStaffRole(user.role)) return <Forbidden />;
  return <AdminShell user={user}>{children}</AdminShell>;
}

function AdminSkeleton() {
  return (
    <div className="min-h-dvh bg-ivory-50 lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]" aria-hidden>
      <div className="hidden border-r border-ivory-200 bg-white lg:block" />
      <div className="mx-auto w-full max-w-7xl space-y-4 px-4 py-10 sm:px-8">
        <div className="h-10 w-64 animate-pulse rounded-xl bg-ivory-200 motion-reduce:animate-none" />
        <div className="h-64 animate-pulse rounded-[var(--radius-panel)] bg-white motion-reduce:animate-none" />
      </div>
    </div>
  );
}

export default async function AdminLayout({ children }: LayoutProps<'/[locale]/admin'>) {
  const messages = (await getMessages()) as Messages;
  return (
    <NextIntlClientProvider messages={pickMessages(messages, CLIENT_NAMESPACES)}>
      <Suspense fallback={<AdminSkeleton />}>
        <AdminGate>{children}</AdminGate>
      </Suspense>
    </NextIntlClientProvider>
  );
}

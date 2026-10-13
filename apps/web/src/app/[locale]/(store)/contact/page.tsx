import type { Locale, PublicSettingsDto } from '@teran/contracts';
import { AtSign, Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense, type ReactNode } from 'react';
import { PageHeader } from '@/components/content/page-header';
import { ContactForm } from '@/components/forms/contact-form';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from '@/i18n/navigation';
import { getPublicSettings } from '@/lib/data/content';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Pages' });
  return pageMetadata({
    title: t('contactTitle'),
    description: t('contactDescription'),
    href: '/contact',
    locale,
  });
}

function Channel({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <span
        aria-hidden
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-leaf-100 text-forest-900"
      >
        {icon}
      </span>
      <div>
        <dt className="text-sm text-ink-500">{label}</dt>
        <dd className="mt-0.5 font-semibold break-words text-forest-900">{children}</dd>
      </div>
    </div>
  );
}

/** Only channels TERAN has configured are shown; nothing is invented when settings are empty. */
async function ContactChannels() {
  await connection();
  const locale = await getLocale();
  const t = await getTranslations('Pages');
  const settings: PublicSettingsDto | null = await getPublicSettings(locale).catch(() => null);
  const contact = settings?.contact;
  if (!contact || !Object.values(contact).some(Boolean)) return null;
  const link = 'underline-offset-4 hover:underline';

  return (
    <section
      aria-labelledby="channels-title"
      className="rounded-[var(--radius-panel)] bg-white p-6 shadow-soft sm:p-8"
    >
      <h2 id="channels-title" className="font-display text-2xl font-semibold text-forest-900">
        {t('channelsTitle')}
      </h2>
      <dl className="mt-6 space-y-5">
        {contact.phone ? (
          <Channel icon={<Phone className="h-5 w-5" />} label={t('channels.phone')}>
            <a href={`tel:${contact.phone.replace(/[^+\d]/g, '')}`} className={link}>
              {contact.phone}
            </a>
          </Channel>
        ) : null}
        {contact.email ? (
          <Channel icon={<Mail className="h-5 w-5" />} label={t('channels.email')}>
            <a href={`mailto:${contact.email}`} className={link}>
              {contact.email}
            </a>
          </Channel>
        ) : null}
        {contact.telegram ? (
          <Channel icon={<MessageCircle className="h-5 w-5" />} label={t('channels.telegram')}>
            <a
              href={`https://t.me/${contact.telegram}`}
              rel="noopener noreferrer"
              target="_blank"
              className={link}
            >
              @{contact.telegram}
            </a>
          </Channel>
        ) : null}
        {contact.instagram ? (
          <Channel icon={<AtSign className="h-5 w-5" />} label={t('channels.instagram')}>
            <a
              href={`https://www.instagram.com/${contact.instagram}/`}
              rel="noopener noreferrer"
              target="_blank"
              className={link}
            >
              @{contact.instagram}
            </a>
          </Channel>
        ) : null}
        {contact.address ? (
          <Channel icon={<MapPin className="h-5 w-5" />} label={t('channels.address')}>
            <span className="font-normal whitespace-pre-line text-ink-900">{contact.address}</span>
          </Channel>
        ) : null}
        {contact.workingHours ? (
          <Channel icon={<Clock className="h-5 w-5" />} label={t('channels.workingHours')}>
            <span className="font-normal whitespace-pre-line text-ink-900">
              {contact.workingHours}
            </span>
          </Channel>
        ) : null}
      </dl>
    </section>
  );
}

export default async function ContactPage() {
  const t = await getTranslations('Pages');
  const tn = await getTranslations('Nav');

  return (
    <>
      <PageHeader
        eyebrow={tn('contact')}
        title={t('contactTitle')}
        intro={t('contactDescription')}
        illustration="mint"
      />
      <div className="container-page grid grid-cols-1 gap-10 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-16">
        <section
          aria-labelledby="message-title"
          className="rounded-[var(--radius-panel)] bg-white p-6 sm:p-10"
        >
          <h2 id="message-title" className="font-display text-3xl font-semibold text-forest-900">
            {t('messageTitle')}
          </h2>
          <p className="mt-2 text-ink-700">
            {t.rich('businessLink', {
              link: (chunks) => (
                <Link
                  href="/wholesale"
                  className="font-semibold text-forest-900 underline underline-offset-2"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
          <div className="mt-8">
            <ContactForm />
          </div>
        </section>
        <aside className="space-y-6 lg:sticky lg:top-28">
          <Suspense fallback={<Skeleton className="h-64 rounded-[var(--radius-panel)]" />}>
            <ContactChannels />
          </Suspense>
          <div className="rounded-[var(--radius-panel)] bg-ivory-100 p-6 sm:p-8">
            <h2 className="font-display text-2xl font-semibold text-forest-900">{tn('faq')}</h2>
            <p className="mt-2 text-ink-700">{t('faqDescription')}</p>
            <Link
              href="/faq"
              className="mt-4 inline-block font-semibold text-forest-900 underline-offset-4 hover:underline"
            >
              {t('faqTitle')} →
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}

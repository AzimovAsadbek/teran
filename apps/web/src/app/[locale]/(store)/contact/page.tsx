import type { Locale, PublicSettingsDto } from '@teran/contracts';
import { ArrowRight, AtSign, Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
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
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-forest-900 [&_svg]:h-[1.125rem] [&_svg]:w-[1.125rem]"
      >
        {icon}
      </span>
      <div>
        <dt className="text-body-sm text-fg-subtle">{label}</dt>
        <dd className="mt-0.5 text-body font-semibold break-words text-fg">{children}</dd>
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
      className="rounded-panel border border-line bg-surface p-6 sm:p-8"
    >
      <h2 id="channels-title" className="text-display-sm text-forest-900">
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
            <span className="font-normal whitespace-pre-line text-fg">{contact.address}</span>
          </Channel>
        ) : null}
        {contact.workingHours ? (
          <Channel icon={<Clock className="h-5 w-5" />} label={t('channels.workingHours')}>
            <span className="font-normal whitespace-pre-line text-fg">{contact.workingHours}</span>
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
      <div className="container-page grid grid-cols-1 gap-8 py-section-sm lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start lg:gap-12">
        <section
          aria-labelledby="message-title"
          className="rounded-panel border border-line bg-surface p-6 sm:p-10"
        >
          <h2 id="message-title" className="text-display-sm text-forest-900">
            {t('messageTitle')}
          </h2>
          <p className="mt-2 text-body text-fg-muted">
            {t.rich('businessLink', {
              link: (chunks) => (
                <Link
                  href="/wholesale"
                  className="font-semibold text-brand underline decoration-brand/40 underline-offset-4 hover:decoration-brand"
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
        <aside className="space-y-5 lg:sticky lg:top-24">
          <Suspense fallback={<Skeleton className="h-64 rounded-panel" />}>
            <ContactChannels />
          </Suspense>
          <div className="rounded-panel bg-surface-muted p-6 sm:p-8">
            <h2 className="text-display-sm text-forest-900">{tn('faq')}</h2>
            <p className="mt-2 text-body text-fg-muted">{t('faqDescription')}</p>
            <Link
              href="/faq"
              className="group mt-4 inline-flex items-center gap-1.5 text-button text-brand underline-offset-4 hover:underline"
            >
              {t('faqTitle')}
              <ArrowRight
                aria-hidden
                className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
              />
            </Link>
          </div>
        </aside>
      </div>
    </>
  );
}

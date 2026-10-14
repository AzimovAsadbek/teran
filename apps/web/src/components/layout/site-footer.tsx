import { formatUzPhone } from '@teran/contracts';
import { Mail, MapPin, Phone, Send } from 'lucide-react';
import { cacheLife } from 'next/cache';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { Suspense, type ReactNode } from 'react';
import { LogoPlate } from '@/components/brand/logo';
import { NewsletterForm } from '@/components/forms/newsletter-form';
import { Link } from '@/i18n/navigation';
import { getCategories } from '@/lib/data/catalog';
import { getPublicSettings } from '@/lib/data/content';
import { LanguageSwitcherSlot } from './language-switcher';

/** The year, cached for a day (reading the clock directly would make every page dynamic). */
export async function CurrentYear() {
  'use cache';
  cacheLife('days');
  return <>{new Date().getFullYear()}</>;
}

const linkClass =
  'text-ivory-100/85 underline-offset-4 transition-colors hover:text-ivory-50 hover:underline';

async function ShopLinks() {
  await connection();
  const locale = await getLocale();
  const categories = await getCategories(locale).catch(() => []);
  return (
    <>
      {categories.slice(0, 6).map((category) => (
        <li key={category.slug}>
          <Link href={`/catalog/${category.slug}`} className={linkClass}>
            {category.name}
          </Link>
        </li>
      ))}
    </>
  );
}

/** Contact channels appear only once TERAN has entered verified details in the admin. */
async function ContactChannels() {
  await connection();
  const locale = await getLocale();
  const t = await getTranslations('Footer');
  const settings = await getPublicSettings(locale).catch(() => null);
  const contact = settings?.contact;
  if (!contact || !(contact.phone || contact.email || contact.telegram || contact.address))
    return null;

  return (
    <div className="mt-8 text-body-sm">
      <p className="text-eyebrow text-accent-on-inverse">{t('contactUs')}</p>
      <ul className="mt-4 space-y-2.5">
        {contact.phone ? (
          <li>
            <a
              href={`tel:${contact.phone.replace(/\s/g, '')}`}
              className={`${linkClass} inline-flex items-center gap-2`}
            >
              <Phone aria-hidden className="h-4 w-4 text-accent-on-inverse" />
              {formatUzPhone(contact.phone)}
            </a>
          </li>
        ) : null}
        {contact.email ? (
          <li>
            <a
              href={`mailto:${contact.email}`}
              className={`${linkClass} inline-flex items-center gap-2`}
            >
              <Mail aria-hidden className="h-4 w-4 text-accent-on-inverse" />
              {contact.email}
            </a>
          </li>
        ) : null}
        {contact.telegram ? (
          <li>
            <a
              href={`https://t.me/${contact.telegram}`}
              rel="noopener noreferrer"
              target="_blank"
              className={`${linkClass} inline-flex items-center gap-2`}
            >
              <Send aria-hidden className="h-4 w-4 text-accent-on-inverse" />@{contact.telegram}
            </a>
          </li>
        ) : null}
        {contact.address ? (
          <li className="inline-flex items-start gap-2 text-ivory-100/85">
            <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-on-inverse" />
            {contact.address}
          </li>
        ) : null}
      </ul>
    </div>
  );
}

function LinkGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <nav aria-label={title}>
      <p className="text-eyebrow text-accent-on-inverse">{title}</p>
      <ul className="mt-4 space-y-2.5 text-body-sm">{children}</ul>
    </nav>
  );
}

export async function SiteFooter() {
  const t = await getTranslations('Footer');
  const tn = await getTranslations('Nav');
  const tl = await getTranslations('Newsletter');

  return (
    <footer className="on-dark mt-auto bg-surface-inverse-deep text-ivory-100">
      <div className="rule-gold opacity-50" />
      <div className="container-page grid grid-cols-1 gap-12 py-14 lg:grid-cols-12 lg:py-16">
        <div className="lg:col-span-4">
          <LogoPlate className="px-5 py-4" logoClassName="w-32" />
          <p className="mt-6 max-w-xs text-display-xs text-ivory-50">{t('tagline')}</p>
          <Suspense fallback={null}>
            <ContactChannels />
          </Suspense>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:col-span-7 lg:col-start-6">
          <LinkGroup title={t('shop')}>
            <li>
              <Link href="/catalog" className={linkClass}>
                {tn('allTeas')}
              </Link>
            </li>
            <Suspense fallback={null}>
              <ShopLinks />
            </Suspense>
          </LinkGroup>
          <LinkGroup title={t('company')}>
            <li>
              <Link href="/about" className={linkClass}>
                {tn('about')}
              </Link>
            </li>
            <li>
              <Link href="/journal" className={linkClass}>
                {tn('journal')}
              </Link>
            </li>
            <li>
              <Link href="/wholesale" className={linkClass}>
                {tn('wholesale')}
              </Link>
            </li>
            <li>
              <Link href="/contact" className={linkClass}>
                {tn('contact')}
              </Link>
            </li>
          </LinkGroup>
          <LinkGroup title={t('help')}>
            <li>
              <Link href="/faq" className={linkClass}>
                {tn('faq')}
              </Link>
            </li>
            <li>
              <Link href="/delivery" className={linkClass}>
                {tn('delivery')}
              </Link>
            </li>
            <li>
              <Link href="/returns" className={linkClass}>
                {t('returns')}
              </Link>
            </li>
            <li>
              <Link href="/account" className={linkClass}>
                {tn('account')}
              </Link>
            </li>
          </LinkGroup>
        </div>
      </div>

      <div className="border-t border-line-inverse">
        <div className="container-page grid gap-6 py-10 lg:grid-cols-12 lg:items-start">
          <div className="lg:col-span-4">
            <p className="text-display-sm text-ivory-50">{tl('title')}</p>
            <p className="mt-2 max-w-sm text-body-sm text-ivory-100/80">{tl('text')}</p>
          </div>
          <div className="lg:col-span-7 lg:col-start-6">
            <NewsletterForm />
          </div>
        </div>
      </div>

      <div className="border-t border-line-inverse">
        <div className="container-page flex flex-col gap-4 py-6 text-helper text-ivory-100/70 md:flex-row md:items-center md:justify-between">
          <p>
            © <CurrentYear /> TERAN. {t('rights')} {t('trademark')}
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link
              href="/privacy"
              className="underline-offset-4 hover:text-ivory-50 hover:underline"
            >
              {t('privacy')}
            </Link>
            <Link href="/terms" className="underline-offset-4 hover:text-ivory-50 hover:underline">
              {t('terms')}
            </Link>
            <LanguageSwitcherSlot />
          </div>
        </div>
      </div>
    </footer>
  );
}

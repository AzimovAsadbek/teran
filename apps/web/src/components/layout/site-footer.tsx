import { formatUzPhone } from '@teran/contracts';
import { Mail, MapPin, Phone, Send } from 'lucide-react';
import { cacheLife } from 'next/cache';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { LogoPlate } from '@/components/brand/logo';
import { NewsletterForm } from '@/components/forms/newsletter-form';
import { Link } from '@/i18n/navigation';
import { getCategories } from '@/lib/data/catalog';
import { getPublicSettings } from '@/lib/data/content';
import { LanguageSwitcher } from './language-switcher';

async function CurrentYear() {
  'use cache';
  cacheLife('days');
  return <>{new Date().getFullYear()}</>;
}

const linkClass = 'text-ivory-100/85 transition-colors hover:text-gold-300';

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
    <div className="space-y-3 text-sm">
      <p className="text-eyebrow text-gold-300">{t('contactUs')}</p>
      <ul className="space-y-2">
        {contact.phone ? (
          <li>
            <a
              href={`tel:${contact.phone.replace(/\s/g, '')}`}
              className={`${linkClass} inline-flex items-center gap-2`}
            >
              <Phone aria-hidden className="h-4 w-4 text-gold-300" />
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
              <Mail aria-hidden className="h-4 w-4 text-gold-300" />
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
              <Send aria-hidden className="h-4 w-4 text-gold-300" />@{contact.telegram}
            </a>
          </li>
        ) : null}
        {contact.address ? (
          <li className="inline-flex items-start gap-2 text-ivory-100/85">
            <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />
            {contact.address}
          </li>
        ) : null}
      </ul>
    </div>
  );
}

export async function SiteFooter() {
  const t = await getTranslations('Footer');
  const tn = await getTranslations('Nav');
  const tl = await getTranslations('Newsletter');

  return (
    <footer className="on-dark mt-auto bg-forest-950 text-ivory-100">
      <div className="rule-gold opacity-60" />
      <div className="container-page grid gap-12 py-16 lg:grid-cols-[1.3fr_1fr_1fr_1fr_1.6fr]">
        <div className="space-y-5">
          <LogoPlate />
          <p className="max-w-xs font-display text-xl leading-snug text-ivory-50">{t('tagline')}</p>
          <Suspense fallback={null}>
            <ContactChannels />
          </Suspense>
        </div>

        <nav aria-label={t('shop')} className="space-y-4 text-sm">
          <p className="text-eyebrow text-gold-300">{t('shop')}</p>
          <ul className="space-y-2.5">
            <li>
              <Link href="/catalog" className={linkClass}>
                {tn('allTeas')}
              </Link>
            </li>
            <Suspense fallback={null}>
              <ShopLinks />
            </Suspense>
          </ul>
        </nav>

        <nav aria-label={t('company')} className="space-y-4 text-sm">
          <p className="text-eyebrow text-gold-300">{t('company')}</p>
          <ul className="space-y-2.5">
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
          </ul>
        </nav>

        <nav aria-label={t('help')} className="space-y-4 text-sm">
          <p className="text-eyebrow text-gold-300">{t('help')}</p>
          <ul className="space-y-2.5">
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
          </ul>
        </nav>

        <div className="space-y-4">
          <p className="font-display text-2xl text-ivory-50">{tl('title')}</p>
          <p className="text-sm text-ivory-100/80">{tl('text')}</p>
          <NewsletterForm />
        </div>
      </div>

      <div className="border-t border-ivory-50/10">
        <div className="container-page flex flex-col gap-4 py-6 text-xs text-ivory-100/70 md:flex-row md:items-center md:justify-between">
          <p>
            © <CurrentYear /> TERAN. {t('rights')} {t('trademark')}
          </p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <Link href="/privacy" className="hover:text-gold-300">
              {t('privacy')}
            </Link>
            <Link href="/terms" className="hover:text-gold-300">
              {t('terms')}
            </Link>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </footer>
  );
}

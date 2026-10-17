import { formatUzPhone, type Locale } from '@teran/contracts';
import { AtSign, ChevronDown, ExternalLink, Mail, MapPin, Phone, Send } from 'lucide-react';
import { cacheLife } from 'next/cache';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense, type ReactNode } from 'react';
import { Wordmark } from '@/components/brand/logo';
import { ValueIcon } from '@/components/brand/ornaments';
import { NewsletterForm } from '@/components/forms/newsletter-form';
import { BRAND, BRAND_VALUES, brandCopy, brandValueLabels } from '@/content/brand';
import { Link } from '@/i18n/navigation';
import { getPublicSettings } from '@/lib/data/content';
import { ABOUT_LINKS, HELP_LINKS } from '@/lib/navigation';
import { LanguageSwitcherSlot } from './language-switcher';

/** The year, cached for a day (reading the clock directly would make every page dynamic). */
export async function CurrentYear() {
  'use cache';
  cacheLife('days');
  return <>{new Date().getFullYear()}</>;
}

const linkClass =
  'text-[0.9375rem] text-ivory-50 underline-offset-4 transition-colors duration-200 hover:underline';
/** The reference's column headings: 18 px condensed capitals. */
const HEADING = 'font-headline text-[1.125rem] leading-[1.5] text-ivory-50 [--headline-weight:600]';

/** Contact channels and social profiles appear only once TERAN has entered them in the admin. */
async function ContactChannels() {
  await connection();
  const locale = await getLocale();
  const settings = await getPublicSettings(locale).catch(() => null);
  const contact = settings?.contact;
  if (!contact || !(contact.phone || contact.email || contact.address)) return null;
  return (
    <ul className="mt-6 space-y-3 border-t border-ivory-50/15 pt-6">
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
      {contact.address ? (
        <li className="inline-flex items-start gap-2 text-[0.9375rem] text-ivory-50/90">
          <MapPin aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-gold-300" />
          {contact.address}
        </li>
      ) : null}
    </ul>
  );
}

async function SocialLinks() {
  await connection();
  const locale = await getLocale();
  const t = await getTranslations('Footer');
  const contact = (await getPublicSettings(locale).catch(() => null))?.contact;
  const links = [
    contact?.telegram
      ? {
          href: `https://t.me/${contact.telegram}`,
          label: `Telegram @${contact.telegram}`,
          icon: Send,
        }
      : null,
    contact?.instagram
      ? {
          href: `https://instagram.com/${contact.instagram}`,
          label: `Instagram @${contact.instagram}`,
          icon: AtSign,
        }
      : null,
  ].filter((link) => link !== null);
  if (links.length === 0) return null;
  return (
    <nav aria-label={t('followUs')} className="mt-6">
      <ul className="flex items-center gap-2">
        {links.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ivory-50 transition-colors hover:bg-ivory-50/10"
            >
              <Icon aria-hidden className="h-5 w-5" />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * A column of links: a heading over the list from 1024 px; on smaller screens the reference's
 * accordion row (heading and chevron over a rule) that opens the list.
 */
function LinkGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <details className="group border-b border-ivory-50/40 lg:hidden">
        <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
          <span className="font-headline text-[1.5rem] leading-[1.5] text-ivory-50 [--headline-weight:600]">
            {title}
          </span>
          <ChevronDown
            aria-hidden
            className="h-6 w-6 shrink-0 transition-transform duration-200 group-open:rotate-180"
          />
        </summary>
        <ul className="space-y-4 pb-6">{children}</ul>
      </details>
      <nav aria-label={title} className="hidden lg:block">
        <p className={HEADING}>{title}</p>
        <ul className="mt-5 space-y-4">{children}</ul>
      </nav>
    </>
  );
}

/**
 * Footer on the reference's layout: one brand-coloured band with four columns — the brand (logo,
 * the tagline as the 32 px greeting, its description), "TERAN" links, help links with the contact
 * details, and the newsletter (pill field and outlined pill) with social profiles, then the
 * promise: the pack's four values and a pill — then a rule, the legal links centred and the
 * language on the right. On phones the link columns fold into accordion rows.
 */
export async function SiteFooter() {
  const locale = (await rootParams.locale()) as Locale;
  const copy = brandCopy[locale];
  const values = brandValueLabels[locale];
  const t = await getTranslations('Footer');
  const tn = await getTranslations('Nav');
  const tl = await getTranslations('Newsletter');
  const tc = await getTranslations('Common');
  const th = await getTranslations('Home');

  return (
    <footer className="on-dark mt-auto bg-forest-900 text-ivory-50">
      <div className="container-page grid grid-cols-1 py-14 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)_minmax(0,0.85fr)_minmax(0,1.6fr)] lg:gap-10 lg:pt-[5.25rem] lg:pb-16">
        <div className="pb-8 lg:pb-0">
          {/* The logo is drawn for light grounds, so on the band it sits on an ivory plate. */}
          <span className="inline-flex rounded-[0.625rem] bg-ivory-50 px-3.5 py-2.5">
            <Wordmark size="compact" />
          </span>
          <p className="mt-8 font-headline text-[2rem] leading-[1.25] text-ivory-50 [--heading-case:none] [--headline-weight:600]">
            {copy.tagline}
          </p>
          <p className="mt-4 max-w-[18.5rem] text-[1.125rem] leading-[1.33] text-ivory-50">
            {copy.description}
          </p>
          <p className="mt-5 text-helper text-ivory-100/70">
            {BRAND.company} · {copy.location}
          </p>
          <a
            href={BRAND.website.href}
            target="_blank"
            rel="noopener"
            className={`${linkClass} mt-1 inline-flex items-center gap-1 text-helper!`}
          >
            {BRAND.website.label}
            <ExternalLink aria-hidden className="h-3.5 w-3.5" />
            <span className="sr-only"> ({tc('opensInNewTab')})</span>
          </a>
        </div>

        <LinkGroup title={tn('brandWorld')}>
          {ABOUT_LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className={linkClass}>
                {tn(link.label)}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/catalog" className={linkClass}>
              {tn('shopAll')}
            </Link>
          </li>
          <li>
            <Link href="/assistant" className={linkClass}>
              {tn('assistant')}
            </Link>
          </li>
        </LinkGroup>

        <div>
          <LinkGroup title={tn('help')}>
            {HELP_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={linkClass}>
                  {tn(link.label)}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/account" className={linkClass}>
                {tn('account')}
              </Link>
            </li>
          </LinkGroup>
          <Suspense fallback={null}>
            <ContactChannels />
          </Suspense>
        </div>

        <div className="pt-12 lg:pt-0">
          <p className={HEADING}>{tl('title')}</p>
          <p className="mt-2.5 max-w-md text-[0.875rem] leading-[1.3] tracking-[0.02em] text-ivory-50">
            {tl('text')}
          </p>
          <div className="mt-5">
            <NewsletterForm />
          </div>
          <Suspense fallback={null}>
            <SocialLinks />
          </Suspense>
          <p className="mt-12 font-headline text-[2rem] leading-none text-ivory-50 [--heading-case:none] [--headline-weight:600] lg:mt-24">
            {th('valuesTitle')}
          </p>
          {/* Four across where the column is wide enough for the longest (Russian) labels. */}
          <ul className="mt-6 grid max-w-[26rem] grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 min-[90rem]:grid-cols-4">
            {BRAND_VALUES.map((value) => (
              <li key={value} className="flex flex-col items-start gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ivory-50">
                  <ValueIcon value={value} className="w-7" />
                </span>
                <span className="text-[0.83125rem] leading-[1.15] [overflow-wrap:anywhere] text-ivory-50">
                  {values[value]}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/about"
            className="mt-8 inline-flex h-12 items-center rounded-full border border-ivory-50 px-8 text-[1rem] text-ivory-50 transition-colors duration-200 hover:bg-ivory-50 hover:text-forest-900"
          >
            {th('storyCta')}
          </Link>
        </div>
      </div>

      <div className="border-t border-ivory-50/20">
        <div className="container-page grid grid-cols-1 items-center gap-4 py-6 text-helper text-ivory-100/75 md:grid-cols-[1fr_auto_1fr]">
          <p>
            © <CurrentYear /> TERAN. {t('rights')} {t('trademark')}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 md:justify-center">
            <Link href="/terms" className="underline-offset-4 hover:text-ivory-50 hover:underline">
              {t('terms')}
            </Link>
            <span aria-hidden className="h-4 w-px bg-ivory-50/35" />
            <Link
              href="/privacy"
              className="underline-offset-4 hover:text-ivory-50 hover:underline"
            >
              {t('privacy')}
            </Link>
          </div>
          <LanguageSwitcherSlot className="flex md:justify-self-end" />
        </div>
      </div>
    </footer>
  );
}

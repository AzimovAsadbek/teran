import type { Locale } from '@teran/contracts';
import { cacheLife } from 'next/cache';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { connection } from 'next/server';
import { Suspense, type ReactNode } from 'react';
import { FooterCup, ValueMarkMint } from '@/components/brand/footer-art';
import { Wordmark } from '@/components/brand/logo';
import { NewsletterForm } from '@/components/forms/newsletter-form';
import { NETWORK_NAMES, SocialIcon } from '@/components/social/social-icon';
import { MotionToggle } from '@/components/ui/motion-toggle';
import { BRAND, BRAND_VALUES, brandCopy, brandValueLabels } from '@/content/brand';
import { Link } from '@/i18n/navigation';
import { emailLinks, phoneLinks, socialLinks } from '@/lib/contact';
import { getPublicSettings } from '@/lib/data/content';
import { showGallery } from '@/lib/site';
import { FooterColumn } from './footer-column';
import { FooterNavSwitch } from './footer-nav';
import { LanguageSwitcherSlot } from './language-switcher';

/** The year, cached for a day (reading the clock directly would make every page dynamic). */
export async function CurrentYear() {
  'use cache';
  cacheLife('days');
  return <>{new Date().getFullYear()}</>;
}

/** The reference's footer links: 15 px words, underlined (3 px below) while pointed at. */
const LINK = 'text-[0.9375rem] leading-6 font-medium hover:underline hover:underline-offset-[3px]';
/** Its column and newsletter headings: 18 px condensed capitals. */
const HEADING = 'font-headline text-[1.125rem] leading-[1.6875rem] [--headline-weight:600]';

/** A list item with one footer link. */
function Item({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <Link href={href} className={LINK}>
        {children}
      </Link>
    </li>
  );
}

/** TERAN's phones and e-mails as the last links of the contact column, once entered in the admin. */
async function ContactLinks() {
  await connection();
  const locale = await getLocale();
  const contact = (await getPublicSettings(locale).catch(() => null))?.contact;
  return [...phoneLinks(contact), ...emailLinks(contact)].map((channel) => (
    <li key={channel.href}>
      <a
        href={channel.href}
        className={`${LINK} [overflow-wrap:anywhere] min-[61.875rem]:whitespace-nowrap`}
      >
        {channel.label}
      </a>
    </li>
  ));
}

/**
 * The networks TERAN has entered, as the reference's row of white marks under the newsletter
 * form, 8 px apart; each named for screen readers and in its tooltip (they open in a new tab).
 */
async function SocialLinks() {
  await connection();
  const locale = await getLocale();
  const [t, tc] = await Promise.all([getTranslations('Footer'), getTranslations('Common')]);
  const contact = (await getPublicSettings(locale).catch(() => null))?.contact;
  const links = socialLinks(contact);
  if (links.length === 0) return null;
  return (
    <nav aria-labelledby="footer-social" className="mt-8 min-[61.875rem]:mt-[1.375rem]">
      <h2 id="footer-social" className="sr-only">
        {t('followUs')}
      </h2>
      <ul className="flex items-center gap-2">
        {links.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              title={NETWORK_NAMES[link.network]}
              // A 24 px mark in a 44 px target.
              className="-m-2.5 flex h-11 w-11 items-center justify-center"
            >
              <SocialIcon network={link.network} mono className="h-6 w-6" />
              <span className="sr-only">
                {NETWORK_NAMES[link.network]}
                {link.handle ? ` ${link.handle}` : ''} ({tc('opensInNewTab')})
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * The two link columns as the reference's: "About us" (TERAN's story, Tea 101, the journal, for
 * business) and "Contact us" (contact, stores, questions, delivery, returns, accessibility, then
 * the phones and e-mails). On the for-business page they turn into the reference's wholesale
 * columns: the partner request and TERAN itself; delivery and contact.
 */
async function FooterColumns() {
  const [t, tn] = await Promise.all([getTranslations('Footer'), getTranslations('Nav')]);
  const about = 'min-[61.875rem]:w-[11.75rem]';
  const contact = 'min-[61.875rem]:w-auto min-[61.875rem]:min-w-[10.125rem]';
  const standard = (
    <>
      <FooterColumn title={t('aboutUs')} headingClassName={HEADING} className={about}>
        <Item href="/about">{tn('about')}</Item>
        <Item href="/tea-101">{tn('tea101')}</Item>
        <Item href="/journal">{tn('journal')}</Item>
        <Item href="/wholesale">{tn('wholesale')}</Item>
        {showGallery ? <Item href="/media">{tn('media')}</Item> : null}
      </FooterColumn>
      <FooterColumn title={t('contactUs')} headingClassName={HEADING} className={contact}>
        <Item href="/contact">{tn('contact')}</Item>
        <Item href="/stores">{tn('stores')}</Item>
        <Item href="/faq">{tn('faq')}</Item>
        <Item href="/delivery">{tn('delivery')}</Item>
        <Item href="/returns">{tn('returns')}</Item>
        <Item href="/accessibility">{tn('accessibility')}</Item>
        <Suspense fallback={null}>
          <ContactLinks />
        </Suspense>
      </FooterColumn>
    </>
  );
  const business = (
    <>
      <FooterColumn title={t('aboutUs')} headingClassName={HEADING} className={about}>
        <Item href="/wholesale#request">{t('partnerApply')}</Item>
        <Item href="/about">{t('experience')}</Item>
      </FooterColumn>
      <FooterColumn title={t('contactUs')} headingClassName={HEADING} className={contact}>
        <Item href="/delivery">{tn('delivery')}</Item>
        <Item href="/contact">{tn('contact')}</Item>
      </FooterColumn>
    </>
  );
  return (
    <Suspense fallback={standard}>
      <FooterNavSwitch standard={standard} business={business} />
    </Suspense>
  );
}

/**
 * Footer on the reference's layout and measures, within its 1600 px frame: the brand (white
 * wordmark leading home, the pack's tagline as the 32 px greeting, its description), the two link
 * columns, and the newsletter (pill field and outlined pill) with the networks' white marks and
 * the promise (the pack's four values as the reference's pale mint icons, and a pill); a TERAN cup
 * in the same mint stands at the lower right, cut by the rule, as the reference's cup. Then the
 * rule across the frame, the copyright, the legal links and the language. On phones the columns
 * fold into accordion rows.
 */
export async function SiteFooter() {
  const locale = (await rootParams.locale()) as Locale;
  const copy = brandCopy[locale];
  const values = brandValueLabels[locale];
  const t = await getTranslations('Footer');
  const tl = await getTranslations('Newsletter');
  const th = await getTranslations('Home');

  return (
    <footer className="on-dark mt-auto bg-forest-900 text-ivory-50">
      <div className="relative mx-auto flex max-w-[100rem] flex-col overflow-hidden px-6 pt-10 min-[61.875rem]:flex-row min-[61.875rem]:flex-wrap min-[61.875rem]:items-start min-[61.875rem]:justify-between min-[61.875rem]:gap-6 min-[61.875rem]:px-16 min-[61.875rem]:pt-[5.25rem] min-[61.875rem]:pb-16">
        <div className="min-[61.875rem]:w-[19.875rem] min-[61.875rem]:flex-[0_1_19.875rem]">
          <Link href="/" className="flex w-fit" aria-label={BRAND.name}>
            {/* The wordmark in white on the band, as the reference's. */}
            <Wordmark size="compact" sizes="180px" className="w-[11.25rem]! brightness-0 invert" />
          </Link>
          <p className="mt-[1.1875rem] hidden font-headline text-[2rem] leading-10 [--heading-case:none] [--headline-weight:600] min-[61.875rem]:block">
            {copy.tagline}
          </p>
          <p className="mt-4 max-w-[19.875rem] text-[1.125rem] leading-6 font-medium min-[61.875rem]:mt-6">
            {copy.description}
          </p>
        </div>

        <nav
          aria-label={t('navigation')}
          className="flex flex-col min-[61.875rem]:flex-[0_1_auto] min-[61.875rem]:flex-row min-[61.875rem]:gap-20"
        >
          <FooterColumns />
        </nav>

        <div className="mt-10 min-[61.875rem]:mt-0 min-[61.875rem]:w-[28.125rem] min-[61.875rem]:flex-[0_1_28.125rem]">
          <p className="font-headline text-[1.125rem] leading-[1.6875rem] [--headline-weight:600] min-[61.875rem]:leading-[1.375rem]">
            {tl('title')}
          </p>
          <p className="mt-4 text-[0.84375rem] leading-[1.3125rem] font-medium min-[61.875rem]:text-[0.875rem] min-[61.875rem]:leading-[1.375rem]">
            {tl('text')}
          </p>
          <div className="mt-4">
            <NewsletterForm />
          </div>
          <Suspense fallback={null}>
            <SocialLinks />
          </Suspense>
          <div className="my-8 min-[61.875rem]:mt-[5.375rem] min-[61.875rem]:mb-0">
            <p className="mb-6 font-headline text-[2rem] leading-8 [--heading-case:none] [--headline-weight:600]">
              {th('valuesTitle')}
            </p>
            {/* Below 990 px the cup stands at the right of this row: the values keep clear of it
                (two to a row on a phone) rather than run under it. */}
            <ul className="flex flex-wrap gap-x-4 gap-y-6 max-[61.875rem]:pr-[7rem] min-[61.875rem]:gap-6">
              {BRAND_VALUES.map((value) => (
                <li
                  key={value}
                  className="flex flex-col items-start gap-3 text-left min-[61.875rem]:items-center min-[61.875rem]:text-center"
                >
                  <ValueMarkMint value={value} />
                  {/* Two lines each (four values, where the reference has three promises). */}
                  <span className="max-w-[4.5rem] text-[0.83125rem] leading-[0.9375rem] font-medium">
                    {values[value]}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/about"
              className="outline-hover mt-6 inline-flex min-h-11 items-center justify-center rounded-full border border-ivory-50 px-[1.5625rem] text-[0.875rem] leading-[1.3125rem] font-medium min-[61.875rem]:min-h-12 min-[61.875rem]:px-[2.0625rem] min-[61.875rem]:text-[1rem] min-[61.875rem]:leading-6"
            >
              {th('storyCta')}
            </Link>
          </div>
        </div>
        <FooterCup className="pointer-events-none absolute right-[2.1875rem] -bottom-1.5 w-[4.75rem] min-[61.875rem]:right-[1.5625rem] min-[61.875rem]:-bottom-[0.6875rem] min-[61.875rem]:w-[7.375rem]" />
      </div>

      {/* The rule spans the whole 1600 px frame, the words inside its margins, as the reference's. */}
      <div className="mx-auto flex max-w-[100rem] flex-wrap items-start justify-center gap-x-4 gap-y-6 border-t border-[#ccc] px-6 pt-[2.0625rem] pb-8 min-[61.875rem]:flex-nowrap min-[61.875rem]:items-center min-[61.875rem]:justify-between min-[61.875rem]:gap-6 min-[61.875rem]:px-16 min-[61.875rem]:py-[1.4375rem]">
        {/* It may wrap beside the links (the Russian line is longer than the 990–1100 px row). */}
        <p className="flex-[0_0_100%] text-center text-[0.84375rem] font-medium opacity-95 min-[61.875rem]:min-w-0 min-[61.875rem]:flex-[0_1_auto] min-[61.875rem]:text-left">
          © <CurrentYear /> TERAN. {t('rights')} {t('trademark')}
        </p>
        <div className="flex flex-[0_0_100%] items-center justify-center gap-4 min-[61.875rem]:flex-none">
          <Link
            href="/terms"
            className="text-[0.875rem] leading-[1.3125rem] font-medium hover:underline hover:underline-offset-[3px] min-[61.875rem]:text-[0.84375rem]"
          >
            {t('terms')}
          </Link>
          <span aria-hidden className="h-4 w-px bg-ivory-50/55" />
          <Link
            href="/privacy"
            className="text-[0.875rem] leading-[1.3125rem] font-medium hover:underline hover:underline-offset-[3px] min-[61.875rem]:text-[0.84375rem]"
          >
            {t('privacy')}
          </Link>
          {/* Every film on the storefront stops here (WCAG 2.2.2): they have no buttons of their own. */}
          <MotionToggle labels={{ pause: t('motionPause'), play: t('motionPlay') }} />
        </div>
        <LanguageSwitcherSlot placement="up" className="flex" />
      </div>
    </footer>
  );
}

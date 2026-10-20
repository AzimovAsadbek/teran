import type { Locale } from '@teran/contracts';
import { Phone, Send } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { Link } from '@/i18n/navigation';
import { phoneLinks, socialLinks } from '@/lib/contact';
import { getPublicSettings } from '@/lib/data/content';

/**
 * The end of the help and policy pages: one row for what the page did not settle — write to
 * TERAN (the contact page), call or message it on Telegram (from Admin → Settings; left out when
 * not set). `action` names the pill where the page asks for something more specific.
 */
export async function SupportRow({ action }: { action?: string } = {}) {
  await connection();
  const locale = (await getLocale()) as Locale;
  const [t, tp] = await Promise.all([getTranslations('Help'), getTranslations('Pages')]);
  const contact = (await getPublicSettings(locale).catch(() => null))?.contact;
  const phones = phoneLinks(contact);
  const telegram = socialLinks(contact).find((link) => link.network === 'telegram');
  const quiet =
    'inline-flex min-h-11 items-center gap-2 text-[1rem] font-semibold underline decoration-ivory-50/35 underline-offset-[6px] hover:decoration-ivory-50 focus-visible:outline-sun';
  return (
    <section aria-labelledby="help-support" className="container-page pb-16 lg:pb-24">
      <div className="flex flex-col gap-6 rounded-[1.5rem] bg-teal-ink px-6 py-8 text-ivory-50 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12 lg:py-10">
        <div className="max-w-[36rem]">
          <h2
            id="help-support"
            className="font-heading text-[1.75rem] leading-tight sm:text-[2rem]"
          >
            {tp('helpCardTitle')}
          </h2>
          <p className="mt-2 text-[1.0625rem] leading-relaxed text-pretty text-ivory-50/85">
            {tp('helpCardText')}
          </p>
          {contact?.workingHours ? (
            <p className="mt-2 text-[0.9375rem] whitespace-pre-line text-ivory-50/85">
              {contact.workingHours}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-x-6 gap-y-3">
          <Link
            href="/contact"
            className="pill-hover inline-flex h-12 items-center gap-2 rounded-full bg-sun px-7 text-[1rem] font-semibold text-ink-900 focus-visible:outline-sun"
          >
            <Send aria-hidden className="h-4 w-4" />
            {action ?? t('contactTitle')}
          </Link>
          {phones.map((phone) => (
            <a key={phone.href} href={phone.href} className={quiet}>
              <Phone aria-hidden className="h-4 w-4 text-sun" />
              {phone.label}
            </a>
          ))}
          {telegram ? (
            <a href={telegram.href} target="_blank" rel="noopener noreferrer" className={quiet}>
              {telegram.label}
            </a>
          ) : null}
        </div>
      </div>
    </section>
  );
}

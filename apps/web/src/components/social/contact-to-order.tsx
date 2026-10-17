import { Phone } from 'lucide-react';
import { getLocale, getTranslations } from 'next-intl/server';
import { phoneLinks, socialLinks } from '@/lib/contact';
import { cn } from '@/lib/cn';
import { getPublicSettings } from '@/lib/data/content';
import { NETWORK_NAMES, SocialIcon } from './social-icon';

/**
 * Where the bag would be while the shop shows no prices (lib/site `showPrices`): a short line and
 * TERAN's channels as buttons — its phones to call, then the networks it has entered, each opening
 * in a new tab. Nothing is shown when no channel is set. Call inside a request-time region.
 */
export async function ContactToOrder({
  title,
  text,
  className,
  layout = 'panel',
}: {
  title: string;
  text: string;
  className?: string;
  /** `bag`: in place of the cart page's empty bag, laid out as the reference's (centred, pills). */
  layout?: 'panel' | 'bag';
}) {
  const locale = await getLocale();
  const [tc, settings] = await Promise.all([
    getTranslations('Common'),
    getPublicSettings(locale).catch(() => null),
  ]);
  const phones = phoneLinks(settings?.contact);
  const socials = socialLinks(settings?.contact);
  if (phones.length === 0 && socials.length === 0) return null;
  const button =
    'flex min-h-12 w-full items-center gap-2.5 rounded-full border border-line bg-surface py-1.5 pr-5 pl-1.5 text-body font-semibold text-fg transition-colors duration-150 hover:border-brand/50 hover:bg-jade-100 sm:inline-flex sm:w-auto';
  if (layout === 'bag') {
    // The reference's empty bag: a condensed title, one line, then its teal pills (here TERAN's
    // channels) in a centred row, with nothing framing them.
    const pill =
      'pill-hover inline-flex h-12 items-center justify-center gap-2.5 rounded-full bg-forest-900 px-8 text-[1rem] font-medium text-ivory-50';
    return (
      <section
        aria-labelledby="order-by-contact"
        className={cn('flex flex-col items-center px-4 py-12 text-center', className)}
      >
        <h2
          id="order-by-contact"
          className="font-headline text-[1.5rem] leading-none text-fg [--heading-case:none] [--headline-weight:800]"
        >
          {title}
        </h2>
        <p className="mt-8 max-w-xl text-[1rem] leading-[1.6] text-fg">{text}</p>
        <ul className="mt-6 flex flex-wrap justify-center gap-3">
          {socials.map((link) => (
            <li key={link.href}>
              <a href={link.href} target="_blank" rel="noopener noreferrer" className={pill}>
                <SocialIcon network={link.network} mono className="h-5 w-5" />
                {NETWORK_NAMES[link.network]}
                <span className="sr-only">
                  {link.handle ? ` ${link.handle}` : ''} ({tc('opensInNewTab')})
                </span>
              </a>
            </li>
          ))}
          {phones.map((phone) => (
            <li key={phone.href}>
              <a href={phone.href} className={pill}>
                <Phone aria-hidden className="h-5 w-5" strokeWidth={1.75} />
                {phone.label}
              </a>
            </li>
          ))}
        </ul>
      </section>
    );
  }
  return (
    <section
      aria-labelledby="order-by-contact"
      className={cn('rounded-panel bg-jade-100 p-5 sm:p-6', className)}
    >
      <h2 id="order-by-contact" className="text-title-lg text-fg">
        {title}
      </h2>
      <p className="mt-1.5 text-body text-fg-muted">{text}</p>
      {/* One full-width row per channel on phones, pills side by side from 640 px. */}
      <ul className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
        {socials.map((link) => (
          <li key={link.href}>
            <a href={link.href} target="_blank" rel="noopener noreferrer" className={button}>
              <SocialIcon network={link.network} className="h-9 w-9" />
              {NETWORK_NAMES[link.network]}
              <span className="sr-only">
                {link.handle ? ` ${link.handle}` : ''} ({tc('opensInNewTab')})
              </span>
            </a>
          </li>
        ))}
        {phones.map((phone) => (
          <li key={phone.href}>
            <a href={phone.href} className={button}>
              <span
                aria-hidden
                className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-800 text-ivory-50"
              >
                <Phone className="h-4 w-4" />
              </span>
              {phone.label}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

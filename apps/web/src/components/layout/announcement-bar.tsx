import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { Link } from '@/i18n/navigation';
import { getPublicSettings } from '@/lib/data/content';
import { isDemoContent, showPrices } from '@/lib/site';
import { LanguageSwitcherSlot } from './language-switcher';

/**
 * The message configured in the admin area (Settings → announcement), as the reference's: with a
 * link, the whole message is the link and its uppercase call to action, underlined, thickens its
 * rule while pointed at. Nothing is invented: without a configured message the band shows the demo
 * notice (about prices) while the catalogue is a demonstration that shows prices, and stays empty
 * otherwise.
 */
async function AnnouncementMessage() {
  await connection();
  const locale = await getLocale();
  const t = await getTranslations('Common');
  const settings = await getPublicSettings(locale).catch(() => null);
  const announcement = settings?.announcement;

  if (announcement) {
    const text = <span className="min-w-0 truncate pr-[0.9375rem]">{announcement.text}</span>;
    return announcement.href ? (
      <Link href={announcement.href} className="group flex min-w-0 items-center">
        {text}
        <span className="shrink-0 text-[0.6875rem] leading-4 tracking-[0.0875rem] whitespace-nowrap uppercase underline decoration-1 underline-offset-[5px] transition-[text-decoration-thickness] duration-200 ease-[ease] group-hover:decoration-2 group-focus-visible:decoration-2 min-[61.875rem]:text-[0.9375rem] min-[61.875rem]:tracking-[0.034em]">
          {t('learnMore')}
        </span>
      </Link>
    ) : (
      text
    );
  }
  return isDemoContent && showPrices ? (
    <span className="truncate">{t('demoNoticeShort')}</span>
  ) : null;
}

/**
 * 40 px band on phones, 50 px from 990 px: the message centred, the language selector 80 px from
 * the right edge (the reference's).
 */
export function AnnouncementBar() {
  return (
    // Its own layer above the header bar, so the language panel opens over it.
    <div className="on-dark relative z-[1] bg-forest-900 text-ivory-50">
      <div className="relative mx-auto flex h-10 max-w-[120rem] items-center justify-center px-5 min-[61.875rem]:h-[3.125rem] min-[61.875rem]:px-20">
        <p className="flex min-w-0 items-center justify-center text-[0.875rem] leading-none font-semibold tracking-[0.03em] min-[61.875rem]:text-[0.9375rem] min-[61.875rem]:tracking-[0.036em]">
          <Suspense fallback={null}>
            <AnnouncementMessage />
          </Suspense>
        </p>
        <LanguageSwitcherSlot className="absolute top-1/2 right-20 hidden -translate-y-1/2 min-[61.875rem]:flex" />
      </div>
    </div>
  );
}

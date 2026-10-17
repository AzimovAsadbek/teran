import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { Link } from '@/i18n/navigation';
import { getPublicSettings } from '@/lib/data/content';
import { isDemoContent } from '@/lib/site';
import { LanguageSwitcherSlot } from './language-switcher';

/**
 * The message configured in the admin area (Settings → announcement), with its link as an
 * underlined uppercase call to action, as on the reference. Nothing is invented: without a
 * configured message the band shows the demo notice while the catalogue is a demonstration, and
 * stays empty otherwise.
 */
async function AnnouncementMessage() {
  await connection();
  const locale = await getLocale();
  const t = await getTranslations('Common');
  const settings = await getPublicSettings(locale).catch(() => null);
  const announcement = settings?.announcement;

  if (announcement) {
    return (
      <>
        <span className="min-w-0 truncate">{announcement.text}</span>
        {announcement.href ? (
          <Link
            href={announcement.href}
            className="shrink-0 tracking-[0.06em] uppercase underline decoration-gold-300/70 decoration-1 underline-offset-[5px] hover:decoration-gold-300"
          >
            {t('learnMore')}
            {/* "Learn more" alone says nothing out of context (link lists, search engines). */}
            <span className="sr-only">: {announcement.text}</span>
          </Link>
        ) : null}
      </>
    );
  }
  return isDemoContent ? <span className="truncate">{t('demoNoticeShort')}</span> : null;
}

/** 40 px band on phones, 50 px from 1024 px: the message centred, the language switcher right. */
export function AnnouncementBar() {
  return (
    <div className="on-dark bg-forest-900 text-ivory-50">
      <div className="container-page grid h-10 grid-cols-1 items-center lg:h-[3.125rem] lg:grid-cols-[1fr_auto_1fr]">
        <span aria-hidden className="hidden lg:block" />
        <p className="flex min-w-0 items-center justify-center gap-4 text-[0.8125rem] font-medium tracking-[0.01em] sm:text-[0.9375rem]">
          <Suspense fallback={null}>
            <AnnouncementMessage />
          </Suspense>
        </p>
        <LanguageSwitcherSlot className="hidden justify-self-end lg:flex" />
      </div>
    </div>
  );
}

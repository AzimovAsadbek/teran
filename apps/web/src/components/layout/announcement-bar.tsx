import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { Link } from '@/i18n/navigation';
import { getPublicSettings } from '@/lib/data/content';
import { isDemoContent } from '@/lib/site';
import { LanguageSwitcherSlot } from './language-switcher';

async function AnnouncementMessage() {
  await connection();
  const locale = await getLocale();
  const t = await getTranslations('Common');
  const settings = await getPublicSettings(locale).catch(() => null);
  const announcement = settings?.announcement;

  if (announcement) {
    return announcement.href ? (
      <Link href={announcement.href} className="underline-offset-4 hover:underline">
        {announcement.text}
      </Link>
    ) : (
      <span>{announcement.text}</span>
    );
  }
  return isDemoContent ? <span>{t('demoNoticeShort')}</span> : null;
}

/** Slim utility bar: one configurable message plus the language switcher. */
export function AnnouncementBar() {
  return (
    <div className="on-dark bg-forest-900 text-ivory-100">
      <div className="container-page flex min-h-10 items-center justify-center gap-4 py-1.5 text-[0.8rem] font-medium tracking-wide lg:justify-between">
        <span aria-hidden className="hidden w-[132px] lg:block" />
        <p className="text-center">
          <Suspense fallback={null}>
            <AnnouncementMessage />
          </Suspense>
        </p>
        <LanguageSwitcherSlot className="hidden lg:flex" />
      </div>
    </div>
  );
}

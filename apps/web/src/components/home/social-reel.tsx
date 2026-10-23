import type { Locale } from '@teran/contracts';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { mediaLabels } from '@/components/media/media-labels';
import { socialHandle, socialLinks } from '@/lib/contact';
import { getMedia, getPublicSettings } from '@/lib/data/content';
import { SocialReelView } from './social-reel-view';

/**
 * The home page's feed of TERAN's shorts (ADR-056, ADR-059): the shorts posted in Admin →
 * Galereya → Shorts and shown on the home page (the default), in their order, with TERAN's
 * networks from Admin → Settings. A short posted there appears here at once; films and
 * photographs stay in the gallery. Without a short there is no band.
 */
export async function SocialReel() {
  await connection();
  const locale = (await getLocale()) as Locale;
  const [t, tm, media, settings] = await Promise.all([
    getTranslations('Home'),
    getTranslations('Media'),
    getMedia(locale, { kind: 'SHORT', featured: true, pageSize: 12 }).catch(() => null),
    getPublicSettings(locale).catch(() => null),
  ]);
  const films = (media?.items ?? []).filter((item) => item.video);
  if (films.length === 0) return null;
  return (
    <SocialReelView
      films={films}
      socials={socialLinks(settings?.contact)}
      handle={socialHandle(settings?.contact)}
      labels={{
        title: t('socialTitle'),
        intro: t('socialIntro'),
        follow: t('socialFollow'),
        gallery: t('socialGallery'),
        position: tm('position', { index: '{index}', total: '{total}' }),
        media: mediaLabels(tm),
      }}
    />
  );
}

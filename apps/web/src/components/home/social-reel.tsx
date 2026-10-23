import type { Locale } from '@teran/contracts';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { mediaLabels } from '@/components/media/media-labels';
import { socialLinks } from '@/lib/contact';
import { getMedia, getPublicSettings } from '@/lib/data/content';
import { SocialReelView } from './social-reel-view';

/** Fewer upright films than this make no feed: the band is left out. */
const MIN_FILMS = 3;

/**
 * The home page's feed of TERAN's upright films (ADR-056): the gallery's films chosen for the home
 * page in Admin → Gallery, in their order, with TERAN's networks from Admin → Settings. Landscape
 * films and photographs stay in the gallery.
 */
export async function SocialReel() {
  await connection();
  const locale = (await getLocale()) as Locale;
  const [t, tm, media, settings] = await Promise.all([
    getTranslations('Home'),
    getTranslations('Media'),
    getMedia(locale, { kind: 'VIDEO', featured: true, pageSize: 12 }).catch(() => null),
    getPublicSettings(locale).catch(() => null),
  ]);
  const films = (media?.items ?? []).filter(
    (item) => item.video && item.image.height > item.image.width,
  );
  if (films.length < MIN_FILMS) return null;
  return (
    <SocialReelView
      films={films}
      socials={socialLinks(settings?.contact)}
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

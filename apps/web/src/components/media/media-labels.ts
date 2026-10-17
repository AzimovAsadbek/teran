import type { useTranslations } from 'next-intl';
import type { MediaLabels } from './media-gallery';

/** The "Media" translator, as `getTranslations('Media')` returns it. */
type MediaTranslator = ReturnType<typeof useTranslations<'Media'>>;

/**
 * The gallery's labels from the "Media" messages. Templates are formatted with their own
 * placeholders ("{title} — enlarge") and filled per item in the browser.
 */
export function mediaLabels(t: MediaTranslator): MediaLabels {
  return {
    photo: t('photo'),
    video: t('video'),
    open: t('open', { title: '{title}' }),
    play: t('play', { title: '{title}' }),
    close: t('close'),
    previous: t('previous'),
    next: t('next'),
    position: t('position', { index: '{index}', total: '{total}' }),
    thumbnails: t('thumbnails'),
    captions: t('captions'),
  };
}

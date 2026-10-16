import type { MediaLabels } from './media-gallery';

type MediaTranslator = {
  (key: 'photo' | 'video' | 'close' | 'previous' | 'next' | 'thumbnails' | 'captions'): string;
  raw(key: 'open' | 'play' | 'position'): unknown;
};

/** The gallery's labels from the "Media" messages (templates are passed raw, filled per item). */
export function mediaLabels(t: MediaTranslator): MediaLabels {
  return {
    photo: t('photo'),
    video: t('video'),
    open: t.raw('open') as string,
    play: t.raw('play') as string,
    close: t('close'),
    previous: t('previous'),
    next: t('next'),
    position: t.raw('position') as string,
    thumbnails: t('thumbnails'),
    captions: t('captions'),
  };
}

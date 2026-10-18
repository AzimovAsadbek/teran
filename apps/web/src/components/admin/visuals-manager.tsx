'use client';

import type { ImageDto } from '@teran/contracts';
import { useTranslations } from 'next-intl';
import { ImageUploader } from './image-uploader';

export interface VisualPlace {
  slot: string;
  label: string;
  /** The size the place needs, in words. */
  hint: string;
  picture: { image: ImageDto; mobile: ImageDto | null; source: string | null } | null;
  /** A film plays over the picture (set by the import script; a new picture replaces it). */
  film: boolean;
}

/**
 * The storefront's page pictures (Settings → Page pictures): for each place, its main picture and
 * the optional taller crop shown on phones, each uploaded, replaced or removed on its own. The API
 * validates and re-encodes every file; a place without a picture keeps TERAN's artwork.
 */
export function VisualsManager({ places }: { places: VisualPlace[] }) {
  const t = useTranslations('Admin');
  return (
    <ul className="grid gap-5 xl:grid-cols-2">
      {places.map((place) => {
        const path = `/admin/settings/visuals/${place.slot}`;
        return (
          <li key={place.slot} className="rounded-card border border-line bg-surface p-4">
            <h3 className="text-title-sm text-fg">{place.label}</h3>
            <p className="mt-0.5 text-caption text-fg-subtle">{place.hint}</p>
            {place.picture?.source ? (
              <p className="mt-1 truncate text-caption text-fg-subtle" title={place.picture.source}>
                {t('settings.visualSource', { source: place.picture.source })}
              </p>
            ) : null}
            {place.film ? (
              <p className="mt-1 text-caption text-fg-subtle">{t('settings.visualFilm')}</p>
            ) : null}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-label text-fg">{t('settings.visualMain')}</p>
                <ImageUploader
                  image={place.picture?.image ?? null}
                  uploadPath={path}
                  removePath={place.picture ? path : null}
                  emptyText={t('settings.visualEmpty')}
                />
              </div>
              <div>
                <p className="mb-2 text-label text-fg">{t('settings.visualMobile')}</p>
                <ImageUploader
                  image={place.picture?.mobile ?? null}
                  uploadPath={place.picture ? `${path}/mobile` : null}
                  removePath={place.picture?.mobile ? `${path}/mobile` : null}
                  emptyText={t('settings.visualMobileEmpty')}
                  hint={t('settings.visualMobileHint')}
                  disabledText={t('settings.visualNeedsMain')}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

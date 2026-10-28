'use client';

import type { ImageDto } from '@teran/contracts';
import { ChevronDown } from 'lucide-react';
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

/** Places that appear together (the home page, the menus…), shown as one group. */
export interface VisualGroup {
  key: string;
  title: string;
  places: VisualPlace[];
}

/**
 * The storefront's page pictures (Settings → Page pictures), grouped by where they appear, each
 * group saying how many of its places have a picture and opening on demand (the first is open).
 * For each place: its main picture and the optional taller crop shown on phones, each uploaded,
 * replaced or removed on its own. The API validates and re-encodes every file; a place without a
 * picture keeps TERAN's artwork.
 */
export function VisualsManager({ groups }: { groups: VisualGroup[] }) {
  const t = useTranslations('Admin');
  return (
    <div className="space-y-3">
      {groups.map((group, index) => {
        const filled = group.places.filter((place) => place.picture).length;
        return (
          <details
            key={group.key}
            open={index === 0}
            className="group rounded-card border border-line bg-surface-muted/40 open:bg-surface"
          >
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-card px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1 text-title-sm text-fg">{group.title}</span>
              <span
                className={
                  filled === group.places.length
                    ? 'rounded-full bg-success-soft px-2.5 py-0.5 text-caption font-semibold text-success tabular-nums'
                    : 'rounded-full bg-surface px-2.5 py-0.5 text-caption font-semibold text-fg-muted tabular-nums ring-1 ring-line'
                }
              >
                {t('settings.visualGroupCount', { filled, total: group.places.length })}
              </span>
              <ChevronDown
                aria-hidden
                className="h-4 w-4 shrink-0 text-fg-subtle transition-transform group-open:rotate-180"
              />
            </summary>
            <div className="px-4 pt-1 pb-4">
              <VisualPlaces places={group.places} />
            </div>
          </details>
        );
      })}
    </div>
  );
}

/** Places side by side, each with its main picture and its phone crop (also the stores page's). */
export function VisualPlaces({ places }: { places: VisualPlace[] }) {
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

'use client';

import { MAX_ARTICLE_MEDIA, type AdminMediaItem, type MediaKind } from '@teran/contracts';
import { ArrowDown, ArrowUp, Film, ImageIcon, Images, Smartphone, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button, iconButtonClasses } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { Pill } from './pill';

function thumb(item: AdminMediaItem): string | null {
  return item.image ? `${item.image.src}/${item.image.widths[0]}.webp` : null;
}

/**
 * Photographs and films from the gallery shown with an article: chosen from what is already
 * uploaded (nothing is uploaded twice), kept in order, and shown on the article page only while
 * they are published themselves. Part of the article's form (saved with it).
 */
export function ArticleMediaPicker({
  gallery,
  value,
  onChange,
}: {
  /** Every gallery item (the admin list). */
  gallery: AdminMediaItem[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const t = useTranslations('Admin');
  const [choosing, setChoosing] = useState(false);
  const byId = new Map(gallery.map((item) => [item.id, item]));
  const chosen = value
    .map((id) => byId.get(id))
    .filter((item): item is AdminMediaItem => item !== undefined);
  const full = value.length >= MAX_ARTICLE_MEDIA;

  const move = (index: number, step: -1 | 1) => {
    const next = [...value];
    const current = next[index];
    const swap = next[index + step];
    if (current === undefined || swap === undefined) return;
    next[index] = swap;
    next[index + step] = current;
    onChange(next);
  };
  const toggle = (id: string, on: boolean) =>
    onChange(on ? [...value, id] : value.filter((candidate) => candidate !== id));

  const group = (kind: MediaKind) => gallery.filter((item) => item.kind === kind);

  return (
    <div className="space-y-3">
      {chosen.length > 0 ? (
        <ol className="space-y-2">
          {chosen.map((item, index) => {
            const src = thumb(item);
            const title = item.translations.uz.title;
            const Icon =
              item.kind === 'PHOTO' ? ImageIcon : item.kind === 'SHORT' ? Smartphone : Film;
            return (
              <li
                key={item.id}
                className="flex items-center gap-3 rounded-control border border-line bg-surface p-2"
              >
                {src ? (
                  // eslint-disable-next-line @next/next/no-img-element -- API rendition (ADR-009)
                  <img
                    src={src}
                    alt=""
                    width={48}
                    height={48}
                    className="h-12 w-12 shrink-0 rounded-control bg-surface-muted object-cover"
                  />
                ) : (
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-control bg-surface-muted text-fg-subtle">
                    <Icon aria-hidden className="h-5 w-5" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm font-semibold text-fg">{title}</span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-caption text-fg-subtle">
                    <Icon aria-hidden className="h-3.5 w-3.5" />
                    {t(`media.kinds.${item.kind}`)}
                    {item.status !== 'PUBLISHED' ? (
                      <Pill tone="gold">{t('journal.mediaHidden')}</Pill>
                    ) : null}
                  </span>
                </span>
                <span className="flex shrink-0">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    className={iconButtonClasses('ghost', 'sm')}
                    aria-label={t('journal.mediaMoveUp', { title })}
                  >
                    <ArrowUp aria-hidden className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === chosen.length - 1}
                    className={iconButtonClasses('ghost', 'sm')}
                    aria-label={t('journal.mediaMoveDown', { title })}
                  >
                    <ArrowDown aria-hidden className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(item.id, false)}
                    className={iconButtonClasses('danger', 'sm')}
                    aria-label={t('journal.mediaRemove', { title })}
                  >
                    <X aria-hidden className="h-4 w-4" />
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-body-sm text-fg-muted">{t('journal.mediaNone')}</p>
      )}
      {gallery.length > 0 ? (
        <Button type="button" size="sm" variant="secondary" onClick={() => setChoosing(true)}>
          <Images aria-hidden className="h-4 w-4" />
          {t('journal.mediaChoose')}
        </Button>
      ) : (
        <p className="text-body-sm text-fg-muted">
          {t('journal.mediaGalleryEmpty')}{' '}
          <Link href="/admin/media" className="font-semibold text-fg underline">
            {t('nav.media')}
          </Link>
        </p>
      )}
      <p className="text-caption text-fg-subtle">{t('journal.mediaHint')}</p>

      <Modal
        open={choosing}
        onClose={() => setChoosing(false)}
        title={t('journal.mediaChooserTitle')}
        description={t('journal.mediaLimit', { max: MAX_ARTICLE_MEDIA })}
        closeLabel={t('common.close')}
        size="lg"
        footer={
          <Button type="button" onClick={() => setChoosing(false)}>
            {t('journal.mediaDone')}
          </Button>
        }
      >
        <div className="space-y-6">
          {(['PHOTO', 'VIDEO', 'SHORT'] as const).map((kind) =>
            group(kind).length > 0 ? (
              <fieldset key={kind}>
                <legend className="mb-3 text-label text-fg">
                  {t(`media.kinds.${kind}_PLURAL`)}
                </legend>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {group(kind).map((item) => {
                    const checked = value.includes(item.id);
                    const src = thumb(item);
                    return (
                      <li key={item.id}>
                        <label
                          className={cn(
                            'flex h-full cursor-pointer flex-col overflow-hidden rounded-control border bg-surface transition-colors',
                            checked
                              ? 'border-brand ring-1 ring-brand'
                              : 'border-line hover:border-line-strong',
                            !checked && full && 'cursor-not-allowed opacity-60',
                          )}
                        >
                          <span className="relative block aspect-[4/3] bg-surface-muted">
                            {src ? (
                              // eslint-disable-next-line @next/next/no-img-element -- API rendition (ADR-009)
                              <img src={src} alt="" className="h-full w-full object-cover" />
                            ) : null}
                            <Checkbox
                              checked={checked}
                              disabled={!checked && full}
                              onChange={(event) => toggle(item.id, event.target.checked)}
                              className="absolute top-2 left-2"
                            />
                          </span>
                          <span className="flex flex-1 flex-col gap-1 p-2">
                            <span className="line-clamp-2 text-body-sm font-medium text-fg">
                              {item.translations.uz.title}
                            </span>
                            {item.status !== 'PUBLISHED' ? (
                              <span className="text-caption text-fg-subtle">
                                {t('journal.mediaHidden')}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            ) : null,
          )}
        </div>
      </Modal>
    </div>
  );
}

import {
  missingRequired,
  type AdminMediaItem,
  type Locale,
  type MediaKind,
} from '@teran/contracts';
import { Captions, Film, ImageIcon, ImagePlus, Plus } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import * as rootParams from 'next/root-params';
import { MediaOrder } from '@/components/admin/media-order';
import { Pill } from '@/components/admin/pill';
import {
  AccessDenied,
  AdminPageHeader,
  ArticleStatusPill,
  Cell,
  EmptyState,
  StatusTabs,
  table,
} from '@/components/admin/ui';
import { ButtonLink } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { adminGet } from '@/lib/admin/server';
import { formatDate } from '@/lib/format';

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('media.title') };
}

function kindOf(value: string | string[] | undefined): MediaKind {
  return (Array.isArray(value) ? value[0] : value) === 'videos' ? 'VIDEO' : 'PHOTO';
}

function duration(seconds: number | null): string | null {
  if (!seconds) return null;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/**
 * The gallery in two separate lists — photographs ("Rasmlar") and films ("Videolar") — each in the
 * order the storefront shows it, with its own "new" button and ordering, and "Joylash" to post a
 * photograph or a film in one go (ADR-058). What an item still needs before it can be published
 * is shown in the list.
 */
export default async function AdminMediaPage({ searchParams }: PageProps<'/[locale]/admin/media'>) {
  const [params, locale, t] = await Promise.all([
    searchParams,
    getLocale(),
    getTranslations('Admin'),
  ]);
  const kind = kindOf(params.kind);
  const [photos, videos] = await Promise.all([
    adminGet<AdminMediaItem[]>('/media?kind=PHOTO'),
    adminGet<AdminMediaItem[]>('/media?kind=VIDEO'),
  ]);
  if (!photos || !videos) return <AccessDenied />;
  const items = kind === 'VIDEO' ? videos : photos;
  const ids = items.map((item) => item.id);
  const Icon = kind === 'VIDEO' ? Film : ImageIcon;

  return (
    <>
      <AdminPageHeader
        title={t('media.title')}
        description={t('media.intro')}
        actions={
          <>
            <ButtonLink
              href={`/admin/media/new?kind=${kind === 'VIDEO' ? 'videos' : 'photos'}`}
              variant="secondary"
            >
              <Plus aria-hidden className="h-4 w-4" />
              {kind === 'VIDEO' ? t('media.newVideo') : t('media.newPhoto')}
            </ButtonLink>
            <ButtonLink href="/admin/media/post">
              <ImagePlus aria-hidden className="h-4 w-4" />
              {t('compose.post')}
            </ButtonLink>
          </>
        }
      />
      <StatusTabs
        label={t('media.kind')}
        tabs={[
          {
            href: '/admin/media',
            label: t('media.kinds.PHOTO_PLURAL'),
            count: photos.length,
            current: kind === 'PHOTO',
          },
          {
            href: '/admin/media?kind=videos',
            label: t('media.kinds.VIDEO_PLURAL'),
            count: videos.length,
            current: kind === 'VIDEO',
          },
        ]}
      />
      <p className="mb-4 max-w-3xl text-body-sm text-fg-muted">
        {kind === 'VIDEO' ? t('media.videosIntro') : t('media.photosIntro')}
      </p>
      {items.length === 0 ? (
        <EmptyState>
          {kind === 'VIDEO' ? t('media.emptyVideos') : t('media.emptyPhotos')}
        </EmptyState>
      ) : (
        <div className={table.wrapper}>
          <table className={table.table}>
            <thead>
              <tr>
                <th scope="col" className={table.th}>
                  {t('media.item')}
                </th>
                <th scope="col" className={table.th}>
                  {t('common.status')}
                </th>
                <th scope="col" className={table.th}>
                  {t('readiness.title')}
                </th>
                {kind === 'VIDEO' ? (
                  <th scope="col" className={table.th}>
                    {t('media.duration')}
                  </th>
                ) : null}
                <th scope="col" className={table.th}>
                  {t('media.onHome')}
                </th>
                <th scope="col" className={table.th}>
                  {t('common.updated')}
                </th>
                <th scope="col" className={table.th}>
                  {t('media.order')}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const missing = missingRequired(item.readiness);
                return (
                  <tr key={item.id} className={table.row}>
                    <Cell primary>
                      <span className="flex items-center gap-3">
                        {item.image ? (
                          // eslint-disable-next-line @next/next/no-img-element -- see docs/architecture/decisions.md (ADR-009)
                          <img
                            src={`${item.image.src}/${item.image.widths[0]}.webp`}
                            alt=""
                            width={56}
                            height={56}
                            loading="lazy"
                            className="h-14 w-14 shrink-0 rounded-control bg-surface-muted object-cover"
                          />
                        ) : (
                          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-control border border-dashed border-line-strong/50 text-fg-subtle">
                            <Icon aria-hidden className="h-5 w-5" />
                          </span>
                        )}
                        <Link href={`/admin/media/${item.id}`} className={table.rowLink}>
                          {item.translations.uz.title}
                        </Link>
                      </span>
                    </Cell>
                    <Cell label={t('common.status')}>
                      <ArticleStatusPill status={item.status} />
                    </Cell>
                    <Cell label={t('readiness.title')}>
                      {missing.length === 0 ? (
                        <Pill tone="leaf">{t('readiness.ready')}</Pill>
                      ) : (
                        <span
                          title={missing.map((code) => t(`readiness.codes.${code}`)).join(', ')}
                        >
                          <Pill tone="gold">
                            {t('readiness.incompleteShort', { count: missing.length })}
                          </Pill>
                        </span>
                      )}
                    </Cell>
                    {kind === 'VIDEO' ? (
                      <Cell label={t('media.duration')} className="whitespace-nowrap tabular-nums">
                        <span className="inline-flex items-center gap-2">
                          {duration(item.videoDurationSeconds) ?? '—'}
                          {item.captions ? (
                            <Captions
                              aria-label={t('media.hasCaptions')}
                              className="h-4 w-4 text-fg-subtle"
                            />
                          ) : null}
                        </span>
                      </Cell>
                    ) : null}
                    <Cell label={t('media.onHome')}>
                      {item.isFeatured ? t('common.yes') : t('common.no')}
                    </Cell>
                    <Cell label={t('common.updated')} className="whitespace-nowrap text-fg-muted">
                      {formatDate(item.updatedAt, locale as Locale)}
                    </Cell>
                    <Cell label={t('media.order')}>
                      <MediaOrder kind={kind} ids={ids} index={index} />
                    </Cell>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

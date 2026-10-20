import type { ArticleDetailDto, Locale, MediaItemDto } from '@teran/contracts';
import { getTranslations } from 'next-intl/server';
import { MediaGroupHeading } from '@/components/media/media-archive';
import { MediaGallery } from '@/components/media/media-gallery';
import { mediaLabels } from '@/components/media/media-labels';
import { formatDate } from '@/lib/format';
import { coverSizes } from '@/lib/navigation';
import { ArticleBody } from './article-body';
import { ArticleCover } from './article-cover';

/**
 * The gallery items chosen for an article, on a dark band like the gallery itself: photographs
 * and films in separate groups, each opening the full-screen viewer.
 */
async function ArticleMedia({ items }: { items: MediaItemDto[] }) {
  const [t, tp] = await Promise.all([getTranslations('Media'), getTranslations('Pages')]);
  const labels = mediaLabels(t);
  const photos = items.filter((item) => item.kind === 'PHOTO');
  const videos = items.filter((item) => item.kind === 'VIDEO');
  return (
    <section
      aria-labelledby="article-media"
      className="on-dark mt-12 rounded-panel bg-forest-950 p-5 text-ivory-50 sm:p-8"
    >
      <h2 id="article-media" className="text-display-sm text-ivory-50">
        {tp('articleMedia')}
      </h2>
      {photos.length > 0 ? (
        <div className="mt-6">
          <MediaGroupHeading id="article-photos" as="h3" kind="PHOTO" title={t('photosTitle')} />
          <MediaGallery items={photos} labels={labels} layout="justified" className="mt-4" />
        </div>
      ) : null}
      {videos.length > 0 ? (
        <div className="mt-8">
          <MediaGroupHeading id="article-videos" as="h3" kind="VIDEO" title={t('videosTitle')} />
          <MediaGallery items={videos} labels={labels} layout="films" className="mt-4" />
        </div>
      ) : null}
    </section>
  );
}

/** The cover's frame: as wide as 72 rem, 16:9 from 640 px, 4:3 on phones. */
const COVER_FRAMES = [
  { media: '(min-width: 1220px)', width: '72rem', ratio: 16 / 9 },
  { media: '(min-width: 640px)', width: '94vw', ratio: 16 / 9 },
  { width: '94vw', ratio: 4 / 3 },
];

/**
 * An article as its page shows it (ADR-051), a page for reading: the date as a quiet label, the
 * title in TERAN's serif and the excerpt as a standfirst, centred; the cover settling into its
 * wide frame once (or the dry leaf of the tea it is about on deep teal), then the body at a
 * reading measure and the gallery items chosen for it. Nothing moves while the reader reads.
 * Shared by the journal page and the admin preview, so the preview is exactly what readers see.
 */
export async function ArticleContent({
  article,
  locale,
}: {
  article: ArticleDetailDto;
  locale: Locale;
}) {
  const t = await getTranslations('Pages');
  return (
    <>
      <header className="mx-auto max-w-[52rem] pt-10 text-center sm:pt-14 lg:pt-16">
        <time
          dateTime={article.publishedAt}
          className="font-headline text-[0.9375rem] tracking-[0.12em] text-forest-900 uppercase"
        >
          {t('published', { date: formatDate(article.publishedAt, locale) })}
        </time>
        <h1 className="mt-4 font-heading text-[clamp(2.5rem,2rem+2vw,3.75rem)] leading-[1.04] text-balance break-words text-fg">
          {article.title}
        </h1>
        {article.excerpt ? (
          <p className="mx-auto mt-5 max-w-[40rem] text-[1.1875rem] leading-relaxed text-pretty text-fg-muted sm:text-[1.25rem]">
            {article.excerpt}
          </p>
        ) : null}
      </header>
      <div className="relative mx-auto mt-10 aspect-[4/3] max-w-[72rem] overflow-hidden rounded-[1.25rem] sm:aspect-[16/9] lg:mt-12 lg:rounded-[1.5rem]">
        <ArticleCover
          article={article}
          sizes={
            article.cover
              ? coverSizes(article.cover, COVER_FRAMES)
              : '(min-width: 1220px) 72rem, 94vw'
          }
          priority
          settle
        />
      </div>
      <div className="mx-auto mt-12 max-w-[38rem] lg:mt-16">
        <ArticleBody body={article.body} />
        {article.media.length > 0 ? <ArticleMedia items={article.media} /> : null}
      </div>
    </>
  );
}

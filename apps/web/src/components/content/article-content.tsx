import type { ArticleDetailDto, Locale, MediaItemDto } from '@teran/contracts';
import { getTranslations } from 'next-intl/server';
import { TeaTypeArt } from '@/components/brand/illustrations';
import { MediaGroupHeading } from '@/components/media/media-archive';
import { MediaGallery } from '@/components/media/media-gallery';
import { mediaLabels } from '@/components/media/media-labels';
import { formatDate } from '@/lib/format';
import { ArticleBody } from './article-body';
import { CoverImage } from './cover-image';

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

/**
 * An article as its page shows it: date, title, excerpt, the cover (or the article's illustration
 * when it has none), the body and the gallery items chosen for it. Shared by the journal page and
 * the admin preview, so the preview is exactly what readers will see.
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
      {/* The reference's split hero: the picture across the left half, the words centred right. */}
      <header className="-mx-gutter grid grid-cols-1 bg-surface-muted lg:min-h-[25rem] lg:grid-cols-2">
        <div className="relative aspect-[16/10] bg-ivory-200 lg:aspect-auto">
          {article.cover ? (
            <div className="absolute inset-0">
              <CoverImage image={article.cover} sizes="(min-width: 1024px) 50vw, 100vw" priority />
            </div>
          ) : (
            <div aria-hidden className="absolute inset-0 flex items-center justify-center">
              <span className="h-32 w-32 sm:h-40 sm:w-40">
                <TeaTypeArt kind={article.illustrationKey} />
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-center justify-center px-6 py-10 text-center sm:px-12 lg:px-16">
          <time
            dateTime={article.publishedAt}
            className="rounded-full bg-forest-900 px-3.5 py-1.5 text-caption text-ivory-50"
          >
            {t('published', { date: formatDate(article.publishedAt, locale) })}
          </time>
          <h1 className="mt-4 font-headline text-[2.75rem] break-words text-forest-900 sm:text-[4rem]">
            {article.title}
          </h1>
          {article.excerpt ? (
            <p className="mt-4 max-w-xl text-body-lg text-fg-muted">{article.excerpt}</p>
          ) : null}
        </div>
      </header>
      <div className="mx-auto mt-12 max-w-[46rem]">
        <ArticleBody body={article.body} />
        {article.media.length > 0 ? <ArticleMedia items={article.media} /> : null}
      </div>
    </>
  );
}

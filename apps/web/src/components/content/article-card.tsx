import type { ArticleSummaryDto } from '@teran/contracts';
import { useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { coverSizes } from '@/lib/navigation';
import { ArticleCover } from './article-cover';

/** Each layout's frame: its width at each window and its shape (a 1440 px frame at most). */
const FRAMES = {
  card: [
    { media: '(min-width: 1440px)', width: '40rem', ratio: 4 / 3 },
    { media: '(min-width: 1024px)', width: '31vw', ratio: 4 / 3 },
    { media: '(min-width: 768px)', width: '46vw', ratio: 4 / 3 },
    { width: '92vw', ratio: 4 / 3 },
  ],
  wide: [
    { media: '(min-width: 1440px)', width: '40rem', ratio: 4 / 3 },
    { media: '(min-width: 768px)', width: '46vw', ratio: 4 / 3 },
    { width: '92vw', ratio: 4 / 3 },
  ],
  lead: [
    { media: '(min-width: 1440px)', width: '47rem', ratio: 16 / 10 },
    { media: '(min-width: 768px)', width: '56vw', ratio: 16 / 10 },
    { width: '92vw', ratio: 16 / 10 },
  ],
};

/** `sizes` for the cover (a wide cover is drawn wider than a 4:3 frame), or the leaf's frame. */
function sizesFor(article: ArticleSummaryDto, layout: keyof typeof FRAMES): string {
  const frames = FRAMES[layout];
  return article.cover
    ? coverSizes(article.cover, frames)
    : frames.map(({ media, width }) => (media ? `${media} ${width}` : width)).join(', ');
}

/**
 * A journal article as a reader meets it (ADR-051): the picture in a landscape frame, then the
 * date as a quiet label, the title in TERAN's serif and the excerpt, on white — the words never
 * over the picture. `lead` is the newest article beside its picture across the page; `wide` lays
 * a card on its side across two columns, so a grid never ends on one card alone. The whole card
 * is the link; pointing at it underlines the title.
 */
export function ArticleCard({
  article,
  headingLevel = 'h3',
  layout = 'card',
  priority = false,
}: {
  article: ArticleSummaryDto;
  headingLevel?: 'h2' | 'h3';
  layout?: 'card' | 'lead' | 'wide';
  priority?: boolean;
}) {
  const locale = useLocale();
  const Heading = headingLevel;
  const lead = layout === 'lead';
  const side = layout !== 'card';
  return (
    <article
      className={cn(
        'group relative grid grid-cols-1 gap-y-4',
        side && 'md:grid-cols-12 md:items-center md:gap-x-10',
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-[1.25rem] bg-surface-muted',
          lead ? 'aspect-[16/10] md:col-span-7 lg:rounded-[1.5rem]' : 'aspect-[4/3]',
          layout === 'wide' && 'md:col-span-6',
        )}
      >
        <ArticleCover article={article} priority={priority} sizes={sizesFor(article, layout)} />
      </div>
      <div className={cn(lead && 'md:col-span-5', layout === 'wide' && 'md:col-span-6')}>
        <time
          dateTime={article.publishedAt}
          className="font-headline text-[0.875rem] tracking-[0.12em] text-forest-900 uppercase"
        >
          {formatDate(article.publishedAt, locale)}
        </time>
        <Heading
          className={cn(
            'mt-2 font-heading leading-[1.1] text-balance text-fg',
            lead ? 'text-[2rem] sm:text-[2.5rem]' : 'text-[1.5rem] sm:text-[1.625rem]',
          )}
        >
          <Link
            href={`/journal/${article.slug}`}
            className="decoration-forest-900/40 decoration-2 underline-offset-[0.2em] group-hover:underline after:absolute after:inset-0 after:rounded-[1.25rem] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-focus focus-visible:after:outline-solid"
          >
            {article.title}
          </Link>
        </Heading>
        {article.excerpt ? (
          <p
            className={cn(
              'mt-2.5 leading-relaxed text-pretty text-fg-muted',
              lead ? 'max-w-[32rem] text-[1.125rem]' : 'line-clamp-3 text-[1rem]',
            )}
          >
            {article.excerpt}
          </p>
        ) : null}
      </div>
    </article>
  );
}

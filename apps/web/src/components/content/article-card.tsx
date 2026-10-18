import type { ArticleSummaryDto } from '@teran/contracts';
import { ArrowRight } from 'lucide-react';
import { useLocale } from 'next-intl';
import { TeaTypeArt } from '@/components/brand/illustrations';
import { CoverImage } from '@/components/content/cover-image';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { coverSizes } from '@/lib/navigation';

/** The card's width at each layout (its frame is 345 × 472; covers are photographs). */
const CARD_SIZES = [
  { media: '(min-width: 95rem)', width: '21.5625rem', ratio: 345 / 472 },
  { media: '(min-width: 1280px)', width: '23vw', ratio: 345 / 472 },
  { media: '(min-width: 640px)', width: '45vw', ratio: 345 / 472 },
  { width: '92vw', ratio: 345 / 472 },
];

/**
 * The reference's blog card: the picture fills a tall rounded card, a pill sits at its top right
 * (here the date; TERAN's articles have no topics) and the title stands over the foot of the
 * picture in condensed white type, above a dark fade. An article without a cover shows its tea
 * illustration on the brand colour. The excerpt is kept for assistive technology and search.
 */
export function ArticleCard({
  article,
  headingLevel = 'h3',
}: {
  article: ArticleSummaryDto;
  headingLevel?: 'h2' | 'h3';
}) {
  const locale = useLocale();
  const Heading = headingLevel;
  return (
    <article className="group relative isolate flex aspect-[345/472] flex-col justify-end overflow-hidden rounded-[1rem] bg-jade-700">
      {article.cover ? (
        <CoverImage
          image={article.cover}
          // The tall card crops a wide cover at its sides: ask for the width it is drawn at.
          sizes={coverSizes(article.cover, CARD_SIZES)}
          className="absolute inset-0 -z-20 transition-transform duration-[350ms] ease-[ease] group-hover:scale-[1.04]"
        />
      ) : (
        <span className="absolute inset-x-0 top-[14%] -z-20 mx-auto h-28 w-28 transition-transform duration-[350ms] ease-out group-hover:scale-105 sm:h-32 sm:w-32">
          <TeaTypeArt kind={article.illustrationKey} />
        </span>
      )}
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-linear-to-t from-forest-950/85 via-forest-950/40 to-transparent"
      />
      <time
        dateTime={article.publishedAt}
        className="absolute top-3.5 right-3.5 rounded-full bg-forest-900 px-3 py-1 text-[0.8125rem] leading-[1.2] font-semibold text-ivory-50"
      >
        {formatDate(article.publishedAt, locale)}
      </time>
      <span
        aria-hidden
        className="absolute right-3.5 bottom-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-ivory-50 text-fg transition-transform duration-200 group-hover:translate-x-0.5"
      >
        <ArrowRight className="h-4 w-4" />
      </span>
      <div className="px-4 pr-14 pb-4">
        <Heading className="font-headline text-[1.5rem] leading-[1.05] text-ivory-50 [--heading-case:none] [--headline-weight:700]">
          <Link
            href={`/journal/${article.slug}`}
            className={cn(
              // As the reference's cards: the picture grows when pointed at; the title stays.
              'after:absolute after:inset-0 after:rounded-[1rem] focus-visible:outline-none',
              'focus-visible:after:outline-2 focus-visible:after:-outline-offset-4 focus-visible:after:outline-ivory-50 focus-visible:after:outline-solid',
            )}
          >
            {article.title}
          </Link>
        </Heading>
        {article.excerpt ? (
          <p className="mt-1.5 line-clamp-2 text-[0.875rem] leading-snug text-ivory-50/90">
            {article.excerpt}
          </p>
        ) : null}
      </div>
    </article>
  );
}

import type { ArticleSummaryDto } from '@teran/contracts';
import { useLocale } from 'next-intl';
import { TeaTypeArt } from '@/components/brand/illustrations';
import { CoverImage } from '@/components/content/cover-image';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';

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
    <article className="group relative flex h-full flex-col rounded-card border border-line bg-surface transition-[border-color,box-shadow] duration-200 hover:border-gold-400/70 hover:shadow-soft">
      <div className="flex aspect-[16/10] items-center justify-center overflow-hidden rounded-t-card bg-surface-muted">
        {article.cover ? (
          <CoverImage
            image={article.cover}
            sizes="(min-width: 1024px) 24rem, (min-width: 640px) 45vw, 92vw"
            className="transition-transform duration-700 ease-[var(--ease-soft)] group-hover:scale-[1.03]"
          />
        ) : (
          <span className="h-24 w-24 transition-transform duration-500 ease-[var(--ease-soft)] group-hover:scale-105 sm:h-28 sm:w-28">
            <TeaTypeArt kind={article.illustrationKey} />
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <time
          dateTime={article.publishedAt}
          className="text-caption font-semibold tracking-[0.1em] text-accent-fg uppercase"
        >
          {formatDate(article.publishedAt, locale)}
        </time>
        <Heading className="mt-2 text-display-xs text-forest-900">
          <Link
            href={`/journal/${article.slug}`}
            className={cn(
              'decoration-forest-900/30 decoration-1 underline-offset-[0.18em] group-hover:underline',
              'after:absolute after:inset-0 after:rounded-card focus-visible:outline-none',
              'focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-focus focus-visible:after:outline-solid',
            )}
          >
            {article.title}
          </Link>
        </Heading>
        {article.excerpt ? (
          <p className="mt-2.5 line-clamp-3 text-body-sm text-fg-muted">{article.excerpt}</p>
        ) : null}
      </div>
    </article>
  );
}

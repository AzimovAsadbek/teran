import type { ArticleSummaryDto } from '@teran/contracts';
import { useLocale } from 'next-intl';
import { TeaTypeArt } from '@/components/brand/illustrations';
import { Link } from '@/i18n/navigation';
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
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-ivory-200 bg-white">
      <div className="flex aspect-[16/10] items-center justify-center bg-ivory-100 p-8">
        <span className="h-28 w-28 transition-transform duration-500 group-hover:scale-105">
          <TeaTypeArt kind={article.illustrationKey} />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <time
          dateTime={article.publishedAt}
          className="text-xs font-semibold tracking-wide text-gold-700 uppercase"
        >
          {formatDate(article.publishedAt, locale)}
        </time>
        <Heading className="mt-2 font-display text-2xl leading-snug font-semibold text-forest-900">
          <Link href={`/journal/${article.slug}`} className="after:absolute after:inset-0">
            {article.title}
          </Link>
        </Heading>
        {article.excerpt ? (
          <p className="mt-2 line-clamp-3 text-sm text-ink-700">{article.excerpt}</p>
        ) : null}
      </div>
    </article>
  );
}

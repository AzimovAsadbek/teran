import type { CategoryDto } from '@teran/contracts';
import { ArrowUpRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { TeaTypeArt } from '@/components/brand/illustrations';
import { Link } from '@/i18n/navigation';

export function CategoryTile({
  category,
  basePath = '/catalog',
}: {
  category: CategoryDto;
  basePath?: '/catalog' | '/collections';
}) {
  const t = useTranslations('Catalog');
  return (
    <Link
      href={`${basePath}/${category.slug}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-ivory-200 bg-white p-6 transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:border-gold-500/50 hover:shadow-soft"
    >
      <span className="h-24 w-24 transition-transform duration-500 group-hover:rotate-3">
        <TeaTypeArt kind={category.illustrationKey} />
      </span>
      <span className="mt-6 font-display text-2xl font-semibold text-forest-900">
        {category.name}
      </span>
      {category.description ? (
        <span className="mt-2 line-clamp-2 text-sm text-ink-700">{category.description}</span>
      ) : null}
      <span className="mt-auto flex items-center justify-between pt-5 text-sm font-semibold text-gold-700">
        {t('results', { count: category.productCount })}
        <ArrowUpRight
          aria-hidden
          className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
        />
      </span>
    </Link>
  );
}

import type { CategoryDto, IllustrationKey, ImageDto } from '@teran/contracts';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import { BotanicalLayer } from '@/components/brand/botanical';
import { TeaTypeArt } from '@/components/brand/illustrations';
import { CoverImage } from '@/components/content/cover-image';
import { DemoNotice } from '@/components/ui/demo-notice';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { getCategories } from '@/lib/data/catalog';

/**
 * Compact listing header: the category's own cover picture in a round frame when one is assigned,
 * otherwise its medallion (a neutral one when it has no illustration), then the title, one line of
 * description, optional navigation (category chips) and the demo note. Kept short so products
 * start on the first screen of a phone.
 */
export function ListingHeader({
  eyebrow,
  title,
  description,
  illustrationKey,
  image,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string | null;
  illustrationKey?: IllustrationKey | null;
  /** The category's or collection's assigned cover; never a product's picture. */
  image?: ImageDto | null;
  /** Rendered under the title, e.g. <CategoryChips />. */
  children?: ReactNode;
}) {
  return (
    <header className="relative isolate mt-4 sm:mt-6">
      <BotanicalLayer scene="listing" className="-z-10" />
      <div className="flex items-center gap-4 sm:gap-6">
        {image ? (
          <span className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-ivory-50 ring-1 ring-line sm:h-24 sm:w-24">
            <CoverImage
              image={image}
              sizes="(min-width: 640px) 96px, 64px"
              priority
              cutoutInset="p-1.5 sm:p-2"
            />
          </span>
        ) : (
          <span aria-hidden className="h-14 w-14 shrink-0 sm:h-20 sm:w-20">
            <TeaTypeArt kind={illustrationKey ?? null} />
          </span>
        )}
        <div className="min-w-0">
          {eyebrow ? <p className="mb-1 text-eyebrow text-accent-fg">{eyebrow}</p> : null}
          <h1 className="text-display-lg break-words text-forest-900 [hyphens:auto]">{title}</h1>
        </div>
      </div>
      {description ? (
        <p className="mt-3 line-clamp-3 max-w-3xl text-body text-fg-muted sm:mt-4 sm:text-body-lg">
          {description}
        </p>
      ) : null}
      {children}
      <DemoNotice variant="inline" className="mt-4" />
    </header>
  );
}

export function ListingHeaderSkeleton({ chips = true }: { chips?: boolean }) {
  return (
    <div aria-hidden className="mt-4 sm:mt-6">
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="h-14 w-14 shrink-0 animate-pulse rounded-full bg-surface-sunken/60 motion-reduce:animate-none sm:h-20 sm:w-20" />
        <div className="h-10 w-56 animate-pulse rounded-sm bg-surface-sunken/60 motion-reduce:animate-none" />
      </div>
      <div className="mt-4 h-6 w-full max-w-xl animate-pulse rounded-sm bg-surface-sunken/60 motion-reduce:animate-none" />
      {chips ? <CategoryChipsFallback /> : null}
    </div>
  );
}

const CHIP_ROW =
  '-mx-gutter mt-5 flex gap-2 overflow-x-auto px-gutter py-1 [scrollbar-width:none] lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0';
const CHIP =
  'inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-body-sm font-medium whitespace-nowrap transition-colors duration-150';

export interface ChipLink {
  href: string;
  name: string;
  current: boolean;
}

/** A row of category links; the current one is marked with aria-current. */
export function CategoryChipRow({ label, items }: { label: string; items: ChipLink[] }) {
  return (
    <nav aria-label={label}>
      <ul className={CHIP_ROW}>
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={item.current ? 'page' : undefined}
              className={cn(
                CHIP,
                item.current
                  ? 'border-brand bg-brand text-fg-inverse'
                  : 'border-line-strong/45 bg-surface text-fg hover:border-brand/60',
              )}
            >
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Top-level categories as links ("All products" first), for the all-products listing. */
export async function CategoryChips({
  active,
  categories,
}: {
  /** Slug of the current category; omit on the all-products page. */
  active?: string;
  categories: CategoryDto[];
}) {
  const t = await getTranslations('Catalog');
  const items: ChipLink[] = [
    { href: '/catalog', name: t('shopAllTitle'), current: active === undefined },
    ...categories
      .filter((category) => category.parentSlug === null)
      .map((category) => ({
        href: `/${category.path}`,
        name: category.name,
        current: category.slug === active,
      })),
  ];
  return <CategoryChipRow label={t('subcategories')} items={items} />;
}

/** Loads the categories at request time (for pages that have not fetched them already). */
export async function CategoryChipsLoader({ active }: { active?: string }) {
  await connection();
  const locale = await getLocale();
  const categories = await getCategories(locale).catch(() => null);
  if (!categories || categories.length === 0) return null;
  return <CategoryChips active={active} categories={categories} />;
}

export function CategoryChipsFallback() {
  return (
    <div aria-hidden className={CHIP_ROW}>
      {['w-24', 'w-28', 'w-28', 'w-24', 'w-20', 'w-32', 'w-28'].map((width, index) => (
        <div
          key={index}
          className={cn(
            'h-9 shrink-0 animate-pulse rounded-full bg-surface-sunken/60 motion-reduce:animate-none',
            width,
          )}
        />
      ))}
    </div>
  );
}

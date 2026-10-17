import type { CategoryDto, IllustrationKey, ImageDto, PublicVisualDto } from '@teran/contracts';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import { CoverImage } from '@/components/content/cover-image';
import { VisualPicture } from '@/components/content/visual-picture';
import { DemoNotice } from '@/components/ui/demo-notice';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { getCategories } from '@/lib/data/catalog';
import { CategoryArt } from './category-art';

/**
 * Listing header on the reference's model: a rounded banner (196 px on wide screens) with the
 * title and one or two lines of description on the left. A wide banner set in Admin → Settings
 * fills the whole header, as the reference's collection banners do (with its taller crop on
 * phones); otherwise the category's picture sits on the right — its own cover when one is
 * assigned, else its botanical art (never a product's picture). Under it: optional navigation
 * (category chips) and the demo note. Kept short so products start on the first screen of a phone.
 */
export function ListingHeader({
  eyebrow,
  title,
  description,
  illustrationKey,
  image,
  banner,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string | null;
  illustrationKey?: IllustrationKey | null;
  /** The category's or collection's assigned cover; never a product's picture. */
  image?: ImageDto | null;
  /** A wide banner from Admin → Settings, filling the header; replaces `image` when set. */
  banner?: PublicVisualDto | null;
  /** Rendered under the banner, e.g. <CategoryChips />. */
  children?: ReactNode;
}) {
  return (
    <header className="mt-3 sm:mt-5">
      <div className="on-dark relative isolate flex min-h-[11rem] items-center overflow-hidden rounded-tile bg-forest-900 text-ivory-50 sm:min-h-[12.25rem]">
        {banner ? (
          <div aria-hidden className="absolute inset-0 -z-10">
            <VisualPicture
              visual={banner}
              sizes="(min-width: 1440px) 1312px, calc(100vw - 2rem)"
              priority
            />
            {/* Keeps the white title readable over a light picture. */}
            <span className="absolute inset-0 bg-linear-to-r from-forest-950/60 via-forest-950/20 to-transparent" />
          </div>
        ) : (
          <div
            aria-hidden
            className="cat-card absolute inset-y-0 right-0 -z-10 w-[62%] opacity-60 sm:w-[52%] sm:opacity-100"
          >
            {image ? (
              <CoverImage
                image={image}
                sizes="(min-width: 1024px) 40vw, 60vw"
                priority
                cutoutInset="p-4"
              />
            ) : (
              <CategoryArt
                category={{ image: null, illustrationKey: illustrationKey ?? null }}
                sizes="20rem"
              />
            )}
            <span className="absolute inset-0 bg-linear-to-r from-forest-900 via-forest-900/40 to-transparent sm:via-forest-900/10" />
          </div>
        )}
        <div className="max-w-[min(36rem,80%)] px-6 py-8 sm:px-10 lg:max-w-[48%]">
          {eyebrow ? <p className="mb-2 text-eyebrow text-ivory-50">{eyebrow}</p> : null}
          <h1 className="font-headline text-[2.5rem] leading-[1.2] break-words text-ivory-50 [--heading-case:none] [--headline-weight:600] [hyphens:auto] sm:text-[3.125rem]">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 line-clamp-3 text-[1rem] leading-normal text-ivory-50">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {children}
      <DemoNotice variant="inline" className="mt-4" />
    </header>
  );
}

export function ListingHeaderSkeleton({ chips = true }: { chips?: boolean }) {
  return (
    <div aria-hidden className="mt-3 sm:mt-5">
      <div className="h-[11rem] animate-pulse rounded-tile bg-forest-900/85 motion-reduce:animate-none sm:h-[12.25rem]" />
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

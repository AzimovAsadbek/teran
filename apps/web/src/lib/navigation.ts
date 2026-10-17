import type {
  ArticleSummaryDto,
  CategoryDto,
  CollectionDto,
  IllustrationKey,
  ImageDto,
} from '@teran/contracts';

/*
 * The catalogue as the menus and category cards show it, built from the API's category and
 * collection lists only: no category is named in code, so a category created in the admin area
 * appears everywhere once it is active and has products.
 */

/** A category as menus and cards show it. */
export interface NavCategory {
  slug: string;
  /** Address below the locale: "tea" or "tea/green-tea". */
  path: string;
  name: string;
  description: string | null;
  /** Visible products (a top-level category counts its subcategories' too). */
  productCount: number;
  illustrationKey: IllustrationKey | null;
  /** The category's own cover, or null (its illustration or the neutral medallion stands in). */
  image: ImageDto | null;
}

/** A top-level category with its subcategories (two levels, as the catalogue allows). */
export interface NavCategoryTree extends NavCategory {
  children: NavCategory[];
}

export interface NavCollection {
  slug: string;
  name: string;
  description: string | null;
  productCount: number;
  illustrationKey: IllustrationKey | null;
  /** The collection's own cover, or null. */
  image: ImageDto | null;
}

/** A journal article as the "tea school" menu lists it (featured first, then the newest). */
export interface NavArticle {
  slug: string;
  title: string;
  cover: ImageDto | null;
}

export interface Navigation {
  categories: NavCategoryTree[];
  collections: NavCollection[];
  articles: NavArticle[];
}

export const EMPTY_NAVIGATION: Navigation = { categories: [], collections: [], articles: [] };

export function navArticles(articles: ArticleSummaryDto[]): NavArticle[] {
  return articles.map((article) => ({
    slug: article.slug,
    title: article.title,
    cover: article.cover,
  }));
}

/*
 * The fixed destinations of the "tea school" and "about" menus, shared by the desktop panels and
 * the drawer (labels are Nav message keys). Everything else in the menus comes from the API.
 */
export const LEARN_LINKS = [
  { href: '/journal', label: 'journal' },
  { href: '/assistant', label: 'assistant' },
  { href: '/media/photos', label: 'photos' },
  { href: '/media/videos', label: 'videos' },
] as const;

export const ABOUT_LINKS = [
  { href: '/about', label: 'about' },
  { href: '/wholesale', label: 'wholesale' },
  { href: '/journal', label: 'journal' },
  { href: '/media', label: 'media' },
] as const;

export const HELP_LINKS = [
  { href: '/contact', label: 'contact' },
  { href: '/delivery', label: 'delivery' },
  { href: '/returns', label: 'returns' },
  { href: '/faq', label: 'faq' },
  { href: '/terms', label: 'terms' },
  { href: '/privacy', label: 'privacy' },
] as const;

function navCategory(category: CategoryDto): NavCategory {
  return {
    slug: category.slug,
    path: category.path,
    name: category.name,
    description: category.description,
    productCount: category.productCount,
    illustrationKey: category.illustrationKey,
    image: category.image,
  };
}

/**
 * Top-level categories with their subcategories, in the API's order (the admin's positions). Every
 * active category is listed as soon as it is created in the admin area; one without products yet
 * says so ("coming soon") and its page explains it, so nothing added in the admin stays hidden.
 */
export function categoryTree(categories: CategoryDto[]): NavCategoryTree[] {
  return categories
    .filter((category) => category.parentSlug === null)
    .map((top) => ({
      ...navCategory(top),
      children: categories.filter((child) => child.parentSlug === top.slug).map(navCategory),
    }));
}

/** Active collections in the API's order (one without products yet says so, like categories). */
export function navCollections(collections: CollectionDto[]): NavCollection[] {
  return collections.map((collection) => ({
    slug: collection.slug,
    name: collection.name,
    description: collection.description,
    productCount: collection.productCount,
    illustrationKey: collection.illustrationKey,
    image: collection.image,
  }));
}

/**
 * The categories shoppers browse directly, as the home page's picture cards: subcategories with
 * products, or a top-level category with products when none of its subcategories has any, in menu
 * order. Cards are for stocked categories only (an empty card would lead nowhere); the menus list
 * every active category.
 */
export function browsableCategories(tree: NavCategoryTree[]): NavCategory[] {
  return tree.flatMap((top) => {
    const stocked = top.children.filter((child) => child.productCount > 0);
    if (stocked.length > 0) return stocked;
    return top.productCount > 0 ? [top] : [];
  });
}

/** `src`/`srcSet` for an API image (renditions at fixed widths, ADR-009). */
export function imageSources(image: ImageDto, preferredWidth = 640) {
  const url = (width: number) => `${image.src}/${width}.webp`;
  const fallback =
    image.widths.find((width) => width >= preferredWidth) ??
    image.widths[image.widths.length - 1] ??
    image.width;
  return {
    src: url(fallback),
    srcSet: image.widths.map((width) => `${url(width)} ${width}w`).join(', '),
  };
}

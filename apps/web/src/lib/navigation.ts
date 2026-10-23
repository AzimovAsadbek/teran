import type {
  ArticleSummaryDto,
  CategoryDto,
  CollectionDto,
  IllustrationKey,
  ImageDto,
  PublicVisualDto,
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

/** The four desktop menus, whose right-hand picture Admin → Settings can set (`menu.<name>`). */
export type MenuPicture = 'shop' | 'collections' | 'learn' | 'about';

export interface Navigation {
  categories: NavCategoryTree[];
  collections: NavCollection[];
  articles: NavArticle[];
  /** Pictures set for the menus; a menu without one shows its category, article or artwork. */
  pictures: Partial<Record<MenuPicture, PublicVisualDto>>;
}

export const EMPTY_NAVIGATION: Navigation = {
  categories: [],
  collections: [],
  articles: [],
  pictures: {},
};

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
  { href: '/tea-101', label: 'tea101' },
  { href: '/media/photos', label: 'photos' },
  { href: '/media/videos', label: 'videos' },
  { href: '/media/shorts', label: 'shorts' },
] as const;

export const ABOUT_LINKS = [
  { href: '/about', label: 'about' },
  { href: '/wholesale', label: 'wholesale' },
  { href: '/journal', label: 'journal' },
  { href: '/media', label: 'media' },
] as const;

export const HELP_LINKS = [
  { href: '/contact', label: 'contact' },
  // The store finder: here (the "About" menu and the drawer) and in the footer.
  { href: '/stores', label: 'findStore' },
  { href: '/delivery', label: 'delivery' },
  { href: '/returns', label: 'returns' },
  { href: '/faq', label: 'faq' },
  { href: '/accessibility', label: 'accessibility' },
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
 * Top-level categories with their subcategories, in the API's order (the admin's positions), for
 * shoppers: only categories with products. A category created in the admin area appears in the
 * menus and on the home page by itself as soon as its first product is published (TERAN sells tea
 * only for now; a coffee category, say, shows once it has coffee). A top-level category counts its
 * subcategories' products, so it stays while any of them has some.
 */
export function categoryTree(categories: CategoryDto[]): NavCategoryTree[] {
  return categories
    .filter((category) => category.parentSlug === null && category.productCount > 0)
    .map((top) => ({
      ...navCategory(top),
      children: categories
        .filter((child) => child.parentSlug === top.slug && child.productCount > 0)
        .map(navCategory),
    }));
}

/**
 * The menus' tree (the header's panels and the drawer): every active category with its
 * subcategories, products or not, in the API's order, so the range TERAN plans (coffee, sweets,
 * teaware…) shows from the start, an empty one marked "coming soon" and leading to its own "coming
 * soon" page (the owner's wish of 2026-10-19, ADR-041). The home page's sections, the catalogue's
 * chips and the search keep `categoryTree`: they show products, so only stocked categories.
 */
export function menuCategoryTree(categories: CategoryDto[]): NavCategoryTree[] {
  return categories
    .filter((category) => category.parentSlug === null)
    .map((top) => ({
      ...navCategory(top),
      children: categories.filter((child) => child.parentSlug === top.slug).map(navCategory),
    }));
}

/** Active collections with products, in the API's order (like categories, empty ones wait). */
export function navCollections(collections: CollectionDto[]): NavCollection[] {
  return collections
    .filter((collection) => collection.productCount > 0)
    .map((collection) => ({
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
 * order (the tree holds stocked categories only, so the filters below only matter for a tree built
 * elsewhere).
 */
export function browsableCategories(tree: NavCategoryTree[]): NavCategory[] {
  return tree.flatMap((top) => {
    const stocked = top.children.filter((child) => child.productCount > 0);
    if (stocked.length > 0) return stocked;
    return top.productCount > 0 ? [top] : [];
  });
}

/**
 * `sizes` for a picture filling a frame of a known shape with `object-fit: cover`. A picture wider
 * than its frame is drawn at the frame's height, so wider than the frame: told only the frame's
 * width, the browser picks too narrow a file and the picture looks soft. `frames` follow the
 * `sizes` order (widest windows first, the last without a media condition): each frame's width
 * (a length `sizes` accepts) and shape (width / height).
 */
export function coverSizes(
  picture: { width: number; height: number },
  frames: { media?: string; width: string; ratio: number }[],
): string {
  const aspect = picture.width / picture.height;
  return frames
    .map(({ media, width, ratio }) => {
      const scale = aspect / ratio;
      const drawn = scale > 1.02 ? `calc(${width} * ${scale.toFixed(2)})` : width;
      return media ? `${media} ${drawn}` : drawn;
    })
    .join(', ');
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

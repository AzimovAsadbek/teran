'use client';

import { ArrowRight, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image, { type StaticImageData } from 'next/image';
import {
  Fragment,
  Suspense,
  use,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import type { PublicVisualDto } from '@teran/contracts';
import { CategoryArt } from '@/components/catalog/category-art';
import { VisualPicture } from '@/components/content/visual-picture';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { showAdvisor } from '@/lib/site';
import {
  ABOUT_LINKS,
  EMPTY_NAVIGATION,
  HELP_LINKS,
  LEARN_LINKS,
  imageSources,
  type NavCategory,
  type NavCategoryTree,
  type Navigation,
} from '@/lib/navigation';
import lake from '../../../public/brand/art/lake.webp';

type MenuId = 'shop' | 'collections' | 'learn' | 'about';

/** The reference's hover timings (its dt-navigation.js): open, close, and switch a category. */
const OPEN_DELAY_MS = 60;
const CLOSE_DELAY_MS = 160;
const SECTION_DELAY_MS = 80;

/** Each menu's panel has its own tint, as on the reference (stone, pistachio, peach, sky). */
const PANEL_TONE: Record<MenuId, string> = {
  shop: 'bg-[#e9e8df]',
  collections: 'bg-[#c6e7c0]',
  learn: 'bg-[#ffeadc]',
  about: 'bg-[#c9ebfc]',
};

/*
 * A trigger fills the bar's height, as the reference's: 16 px semibold words, a 2 px rule along
 * the bar's lower edge that colours in (200 ms) while pointed at or open; the words keep their ink.
 */
const ITEM =
  'inline-flex h-full items-center gap-0.5 border-b-2 border-transparent px-1 text-[1rem] leading-6 font-semibold whitespace-nowrap text-fg transition-[border-color] duration-200 ease-[ease] hover:border-[#00a6a5] aria-expanded:border-[#00a6a5]';

const COLUMN_HEADING = 'font-heading text-[2rem] leading-[1.2] text-black';
/** The reference's menu links: 15 px words that are underlined while pointed at. */
const COLUMN_LINK_BASE =
  'inline-flex min-h-6 max-w-full items-center gap-2 text-[0.9375rem] leading-6 font-medium tracking-[0.01em] hover:underline hover:underline-offset-4';
const COLUMN_LINK = `${COLUMN_LINK_BASE} text-fg`;
/** The closing "all in …" link of a column. */
const COLUMN_LINK_STRONG = `${COLUMN_LINK_BASE} font-semibold text-fg`;

/**
 * Desktop navigation from 1280 px (narrower screens use the drawer), on the reference's model:
 * four triggers open full-width panels directly under the bar, each in its own tint. Catalogue: a
 * card of top-level categories on the left (the active one is a filled pill), its subcategories and
 * browse links in the middle, its picture on the right. Collections, Tea school and About: columns
 * of links and a picture card. Triggers are WAI-ARIA disclosure buttons (aria-expanded): a short
 * hover, a click, Enter or Space opens; Esc closes and returns focus; a click outside or on any
 * link closes. Every category, collection and article comes from the API (lib/navigation.ts).
 */
export function DesktopNav({ navigation }: { navigation: Promise<Navigation> }) {
  const t = useTranslations('Nav');
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!openMenu) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
        rootRef.current?.querySelector<HTMLButtonElement>(`[data-menu="${openMenu}"]`)?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenMenu(null);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [openMenu]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const schedule = (next: MenuId | null, delay: number) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpenMenu(next), delay);
  };

  const menus: { id: MenuId; label: string; panel: ReactNode }[] = [
    {
      id: 'shop',
      label: t('shop'),
      panel: (
        <Suspense fallback={<ShopPanel navigation={EMPTY_NAVIGATION} />}>
          <Streamed navigation={navigation} render={(data) => <ShopPanel navigation={data} />} />
        </Suspense>
      ),
    },
    {
      id: 'collections',
      label: t('collections'),
      panel: (
        <Suspense fallback={<CollectionsPanel navigation={EMPTY_NAVIGATION} />}>
          <Streamed
            navigation={navigation}
            render={(data) => <CollectionsPanel navigation={data} />}
          />
        </Suspense>
      ),
    },
    {
      id: 'learn',
      label: t('learn'),
      panel: (
        <Suspense fallback={<LearnPanel navigation={EMPTY_NAVIGATION} />}>
          <Streamed navigation={navigation} render={(data) => <LearnPanel navigation={data} />} />
        </Suspense>
      ),
    },
    {
      id: 'about',
      label: t('about'),
      panel: (
        <Suspense fallback={<AboutPanel navigation={EMPTY_NAVIGATION} />}>
          <Streamed navigation={navigation} render={(data) => <AboutPanel navigation={data} />} />
        </Suspense>
      ),
    },
  ];

  return (
    <div
      ref={rootRef}
      className="hidden h-full xl:block"
      onPointerLeave={(event) => event.pointerType === 'mouse' && schedule(null, CLOSE_DELAY_MS)}
      onPointerEnter={() => clearTimeout(timer.current)}
      // Following any link inside the menus closes them (no need to watch the URL).
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('a')) setOpenMenu(null);
      }}
    >
      <nav aria-label={t('main')} className="h-full">
        <ul className="-ml-1 flex h-full items-stretch gap-4">
          {menus.map((menu) => (
            // Each panel follows its trigger in the DOM, so Tab moves from a button into its menu.
            <li key={menu.id} className="flex">
              <button
                type="button"
                data-menu={menu.id}
                aria-expanded={openMenu === menu.id}
                aria-controls={`${panelId}-${menu.id}`}
                onClick={() => setOpenMenu((current) => (current === menu.id ? null : menu.id))}
                onPointerEnter={(event) =>
                  event.pointerType === 'mouse' && schedule(menu.id, OPEN_DELAY_MS)
                }
                className={ITEM}
              >
                {menu.label}
                <ChevronDown
                  aria-hidden
                  strokeWidth={2.25}
                  className={cn(
                    'h-3.5 w-3.5 -translate-y-px transition-transform duration-200',
                    openMenu === menu.id && 'rotate-180',
                  )}
                />
              </button>
              <MegaPanel
                id={`${panelId}-${menu.id}`}
                open={openMenu === menu.id}
                className={PANEL_TONE[menu.id]}
              >
                {menu.panel}
              </MegaPanel>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function Streamed({
  navigation,
  render,
}: {
  navigation: Promise<Navigation>;
  render: (navigation: Navigation) => ReactNode;
}) {
  return render(use(navigation));
}

/**
 * A full-width panel directly under the bar (no dimming, as on the reference). Its contents are
 * rendered the first time it opens (no page carries the menus' markup in its HTML), then kept while
 * closed, invisible and inert, so it can fade out as well as in.
 */
function MegaPanel({
  id,
  open,
  className,
  children,
}: {
  id: string;
  open: boolean;
  className: string;
  children: ReactNode;
}) {
  const [opened, setOpened] = useState(open);
  if (open && !opened) setOpened(true);
  return (
    <div
      id={id}
      inert={!open}
      data-open={open ? '' : undefined}
      className={cn(
        // The reference's panel: a hairline on top, a deep soft shadow; it fades in while sliding
        // 6 px into place (220 ms, a soft ease-out).
        'invisible absolute inset-x-0 top-full -translate-y-1.5 border-t border-black/10 opacity-0 shadow-[0_34px_17px_rgb(0_0_0_/_15%)] transition-[opacity,translate,visibility] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] data-open:visible data-open:translate-y-0 data-open:opacity-100 motion-reduce:transition-none',
        className,
      )}
    >
      {opened ? (
        // The panel's colour spans the window; its content keeps to the header's frame (the same
        // 1920 px container and gutters), so the columns start under the menu buttons and the
        // picture ends under the account button, however wide the screen.
        <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto overscroll-contain">
          <div className="container-page pt-[1.9375rem] pb-10">{children}</div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * The picture card on a panel's right (258×310 on the reference) with its label over it. It shows
 * what it leads to: the category's, collection's or article's own picture (`children`), so the
 * page it opens shows the same one; the menu's picture from Admin → Settings (`photo`) only stands
 * in for an item without a picture of its own, or for a page that is not an item.
 */
function FeatureCard({
  href,
  label,
  photo,
  children,
}: {
  href: string;
  label: string;
  /** The menu's picture from Admin → Settings, shown instead of `children` when given. */
  photo?: PublicVisualDto | null;
  children: ReactNode;
}) {
  return (
    // The reference's tile: the picture brightens a little while pointed at (350 ms), under a
    // shade along its lower third and its label in white capitals.
    <Link
      href={href}
      tabIndex={-1}
      aria-hidden
      className="cat-card group relative block h-[19.375rem] w-full overflow-hidden rounded-tile bg-forest-900 text-ivory-50"
    >
      <span className="picture-hover absolute inset-0">
        {photo ? <VisualPicture visual={photo} sizes="16rem" /> : children}
      </span>
      <span className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(0_0_0_/_0)_66%,rgb(0_0_0_/_50%))]" />
      <span className="absolute bottom-4 left-4 z-[1] max-w-[calc(100%-2rem)] font-headline text-[1.5rem] leading-[1.1]">
        {label}
      </span>
    </Link>
  );
}

function PhotoFill({ src, sizes }: { src: StaticImageData; sizes: string }) {
  return <Image src={src} alt="" fill sizes={sizes} className="object-cover" />;
}

/** The reference's category pills: teal capitals, a tint when pointed at, filled when chosen. */
const CATEGORY_TAB =
  'flex min-h-[2.625rem] items-center rounded-full px-4 py-1.5 font-headline text-[1.25rem] leading-none tracking-[0.02em] text-[#2e8e93] hover:bg-[#2e8e93]/10 data-active:bg-[#2e8e93] data-active:text-ivory-50';

/**
 * The category whose picture the panel's card shows: the subcategory pointed at, else the
 * category's own cover, else the first subcategory with a cover, else the category (its art).
 */
function featuredOf(category: NavCategoryTree, pointed: NavCategory | null): NavCategory {
  if (pointed) return pointed;
  if (category.image) return category;
  return category.children.find((child) => child.image) ?? category;
}

/**
 * Top-level categories in a card on the left; the active one (pointed at or focused; the first by
 * default) shows its subcategories and browse links in the middle and a picture on the right (the
 * subcategory pointed at, or the category's cover, see featuredOf). Each category's columns follow
 * its row in the document and are placed by the grid, so Tab walks row → its subcategories → next
 * row (the card behind the rows is a decorative grid item).
 */
function ShopPanel({ navigation }: { navigation: Navigation }) {
  const t = useTranslations('Nav');
  const { categories } = navigation;
  const [active, setActive] = useState(0);
  const [pointed, setPointed] = useState<NavCategory | null>(null);
  const sectionTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const current: NavCategoryTree | undefined =
    categories[Math.min(active, Math.max(categories.length - 1, 0))];
  const rows = categories.length;
  const activate = (index: number) => {
    clearTimeout(sectionTimer.current);
    setActive(index);
    setPointed(null);
  };
  // As the reference's: a category pointed at takes over after a short pause (80 ms).
  const point = (index: number) => {
    clearTimeout(sectionTimer.current);
    sectionTimer.current = setTimeout(() => activate(index), SECTION_DELAY_MS);
  };
  useEffect(() => () => clearTimeout(sectionTimer.current), []);

  return (
    <div
      className="grid min-h-[19.375rem] grid-cols-[15.25rem_minmax(0,1fr)_16.25rem] gap-x-10"
      // One row per category, the "all products" row, then a flexible row that takes up the height
      // of a long subcategory list, so the rows on the left keep their size.
      style={{ gridTemplateRows: `repeat(${rows + 1}, auto) 1fr` } as CSSProperties}
    >
      <span
        aria-hidden
        className="rounded-tile bg-[#f2f1e9]"
        style={{ gridColumn: 1, gridRow: `1 / ${rows + 2}` }}
      />
      {categories.map((category, index) => (
        <Fragment key={category.slug}>
          <Link
            href={`/${category.path}`}
            onPointerEnter={() => point(index)}
            onPointerLeave={() => clearTimeout(sectionTimer.current)}
            onFocus={() => activate(index)}
            data-active={category === current ? '' : undefined}
            style={{ gridColumn: 1, gridRow: index + 1 }}
            className={cn(CATEGORY_TAB, 'mx-4 mb-1', index === 0 && 'mt-4')}
          >
            <span className="flex min-w-0 flex-col">
              <span className="line-clamp-2">{category.name}</span>
              {category.productCount === 0 ? (
                <span className="mt-1 font-sans text-[0.75rem] leading-tight font-medium tracking-normal normal-case opacity-80">
                  {t('menuSoon')}
                </span>
              ) : null}
            </span>
          </Link>
          {category === current ? (
            <>
              <CategoryColumns category={category} onPoint={setPointed} />
              <div style={{ gridColumn: 3, gridRow: '1 / -1', alignSelf: 'start' }}>
                <FeaturedCategory
                  category={featuredOf(category, pointed)}
                  variant={index}
                  photo={navigation.pictures.shop}
                />
              </div>
            </>
          ) : null}
        </Fragment>
      ))}
      <div
        className="mx-4 mb-4 border-t border-black/[0.12] pt-2"
        style={{ gridColumn: 1, gridRow: rows + 1 }}
      >
        <Link href="/catalog" className={CATEGORY_TAB}>
          {t('shopAll')}
        </Link>
      </div>
    </div>
  );
}

function FeaturedCategory({
  category,
  variant,
  photo,
}: {
  category: NavCategory;
  variant: number;
  /** The shop menu's picture from Admin → Settings, for a category without a picture. */
  photo?: PublicVisualDto;
}) {
  return (
    <FeatureCard
      href={`/${category.path}`}
      label={category.name}
      // The menu's photograph shows TERAN's teas: an empty category (coffee, say) keeps its art.
      photo={category.image || category.productCount === 0 ? null : photo}
    >
      <CategoryArt category={category} variant={variant} sizes="16rem" />
    </FeatureCard>
  );
}

/** The active category in the middle: its subcategories, then the ways to browse it. */
function CategoryColumns({
  category,
  onPoint,
}: {
  category: NavCategoryTree;
  /** A subcategory pointed at or focused (its picture shows on the card). */
  onPoint: (child: NavCategory | null) => void;
}) {
  const t = useTranslations('Nav');
  return (
    <div
      className="grid min-w-0 grid-cols-[repeat(2,minmax(0,14rem))] content-start gap-x-14"
      style={{ gridColumn: 2, gridRow: '1 / -1' }}
    >
      <div className="min-w-0">
        <p className={COLUMN_HEADING}>{category.name}</p>
        {category.productCount === 0 ? (
          <p className="mt-2 text-[0.9375rem] leading-snug text-fg-muted">{t('menuSoonNote')}</p>
        ) : null}
        <ul className="mt-4 flex flex-col gap-2">
          {category.children.map((child) => (
            <li key={child.slug}>
              <Link
                href={`/${child.path}`}
                className={COLUMN_LINK}
                onPointerEnter={() => onPoint(child)}
                onFocus={() => onPoint(child)}
              >
                {child.name}
                {child.productCount === 0 ? (
                  <span className="text-caption text-fg-subtle">{t('menuSoon')}</span>
                ) : null}
              </Link>
            </li>
          ))}
          <li>
            <Link href={`/${category.path}`} className={COLUMN_LINK_STRONG}>
              {t('shopIn', { name: category.name })}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </li>
        </ul>
      </div>
      <div className="min-w-0">
        <p className={COLUMN_HEADING}>{t('browse')}</p>
        <ul className="mt-4 flex flex-col gap-2">
          {category.productCount > 0 ? (
            <>
              <li>
                <Link href={`/${category.path}?sort=newest`} className={COLUMN_LINK}>
                  {t('newest')}
                </Link>
              </li>
              <li>
                <Link href={`/${category.path}`} className={COLUMN_LINK}>
                  {t('recommended')}
                </Link>
              </li>
            </>
          ) : null}
          <li>
            <Link href="/catalog?sort=newest" className={COLUMN_LINK}>
              {t('shopAll')}
            </Link>
          </li>
          {showAdvisor ? (
            <li>
              <Link href="/assistant" className={COLUMN_LINK}>
                {t('assistant')}
              </Link>
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

/** Every active collection in columns, and the first one's picture. */
function CollectionsPanel({ navigation }: { navigation: Navigation }) {
  const t = useTranslations('Nav');
  const { collections } = navigation;
  const first = collections[0];
  return (
    <div className="grid min-h-[19.375rem] grid-cols-[minmax(0,1fr)_16.25rem] gap-x-10">
      <div className="min-w-0">
        <p className={COLUMN_HEADING}>{t('collections')}</p>
        {/* Columns of up to seven links, filled one after another from the left, so a few
            collections stay together instead of spreading across the panel. */}
        <ul className="mt-4 grid auto-cols-[minmax(0,18rem)] grid-flow-col grid-rows-[repeat(7,auto)] justify-start gap-x-14 gap-y-2">
          {collections.map((collection) => (
            <li key={collection.slug}>
              <Link href={`/collections/${collection.slug}`} className={COLUMN_LINK}>
                {collection.name}
                {collection.productCount === 0 ? (
                  <span className="text-caption text-fg-subtle">{t('menuSoon')}</span>
                ) : null}
              </Link>
            </li>
          ))}
          <li>
            <Link href="/catalog" className={COLUMN_LINK_STRONG}>
              {t('shopAll')}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </li>
        </ul>
      </div>
      {first ? (
        <FeatureCard
          href={`/collections/${first.slug}`}
          label={first.name}
          photo={first.image ? null : navigation.pictures.collections}
        >
          <CategoryArt category={first} variant={1} sizes="16rem" />
        </FeatureCard>
      ) : null}
    </div>
  );
}

/** Journal articles (featured first) and the guides, with the newest article's cover. */
function LearnPanel({ navigation }: { navigation: Navigation }) {
  const t = useTranslations('Nav');
  const { articles } = navigation;
  const cover = articles.find((article) => article.cover);
  const coverSources = cover?.cover ? imageSources(cover.cover, 480) : null;
  return (
    <div className="grid min-h-[19.375rem] grid-cols-[minmax(0,1fr)_16.25rem] gap-x-10">
      <div className="grid min-w-0 grid-cols-[minmax(0,24rem)_minmax(0,18rem)] content-start gap-x-14">
        <div className="min-w-0">
          <p className={COLUMN_HEADING}>{t('articles')}</p>
          <ul className="mt-4 flex flex-col gap-2">
            {articles.map((article) => (
              <li key={article.slug}>
                <Link href={`/journal/${article.slug}`} className={COLUMN_LINK}>
                  <span className="truncate">{article.title}</span>
                </Link>
              </li>
            ))}
            <li>
              <Link href="/journal" className={COLUMN_LINK_STRONG}>
                {t('allArticles')}
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </li>
          </ul>
        </div>
        <div className="min-w-0">
          <p className={COLUMN_HEADING}>{t('guides')}</p>
          <ul className="mt-4 flex flex-col gap-2">
            {LEARN_LINKS.filter((link) => link.href !== '/journal').map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={COLUMN_LINK}>
                  {t(link.label)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {cover?.cover && coverSources ? (
        // The article's own cover, as its page opens with it.
        <FeatureCard href={`/journal/${cover.slug}`} label={t('featuredArticle')}>
          {/* eslint-disable-next-line @next/next/no-img-element -- API renditions (ADR-009) */}
          <img
            src={coverSources.src}
            srcSet={coverSources.srcSet}
            sizes="16rem"
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-[var(--ease-soft)] group-hover:scale-[1.04]"
          />
        </FeatureCard>
      ) : (
        <FeatureCard href="/journal" label={t('journal')} photo={navigation.pictures.learn}>
          <PhotoFill src={lake} sizes="16rem" />
        </FeatureCard>
      )}
    </div>
  );
}

/** The brand's own pages and the help pages, with the pack's landscape as the picture. */
function AboutPanel({ navigation }: { navigation: Navigation }) {
  const t = useTranslations('Nav');
  return (
    <div className="grid min-h-[19.375rem] grid-cols-[minmax(0,1fr)_16.25rem] gap-x-10">
      <div className="grid min-w-0 grid-cols-[repeat(2,minmax(0,18rem))] content-start gap-x-14">
        <div>
          <p className={COLUMN_HEADING}>{t('brandWorld')}</p>
          <ul className="mt-4 flex flex-col gap-2">
            {ABOUT_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={COLUMN_LINK}>
                  {t(link.label)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className={COLUMN_HEADING}>{t('help')}</p>
          <ul className="mt-4 flex flex-col gap-2">
            {HELP_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={COLUMN_LINK}>
                  {t(link.label)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <FeatureCard href="/about" label={t('ourStory')} photo={navigation.pictures.about}>
        <PhotoFill src={lake} sizes="16rem" />
      </FeatureCard>
    </div>
  );
}

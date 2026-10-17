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
import { CategoryArt } from '@/components/catalog/category-art';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
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

const OPEN_DELAY_MS = 120;
const CLOSE_DELAY_MS = 220;

/** Each menu's panel has its own tint, as on the reference (cream, jade, gold, sage). */
const PANEL_TONE: Record<MenuId, string> = {
  shop: 'bg-ivory-100',
  collections: 'bg-jade-100',
  learn: 'bg-gold-50',
  about: 'bg-sage-100',
};

/*
 * A trigger fills the bar's height; its underline sits on the bar's lower edge. 16 px labels from
 * 1440 px (the reference); a little tighter from 1280 px, so the longest labels (Uzbek) stay clear
 * of the centred wordmark.
 */
const ITEM =
  'relative inline-flex h-full items-center gap-1 px-2 text-[0.9375rem] font-medium whitespace-nowrap text-fg transition-colors duration-[220ms] ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-brand min-[90rem]:gap-1.5 min-[90rem]:px-3 min-[90rem]:text-[1rem] ' +
  "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:origin-left after:scale-x-0 after:bg-forest-900 after:transition-transform after:duration-200 after:content-['']";

const COLUMN_HEADING = 'font-heading text-[2rem] leading-[1.1] text-forest-900';
const COLUMN_LINK_BASE =
  'inline-flex min-h-8 max-w-full items-center gap-2 py-1 text-[0.9375rem] transition-colors duration-[220ms] ease-[cubic-bezier(0.32,0.72,0,1)] hover:text-brand hover:underline hover:underline-offset-4';
const COLUMN_LINK = `${COLUMN_LINK_BASE} text-fg`;
/** The closing "all in …" link of a column. */
const COLUMN_LINK_STRONG = `${COLUMN_LINK_BASE} font-semibold text-forest-900`;

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
    { id: 'about', label: t('about'), panel: <AboutPanel /> },
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
        <ul className="-ml-2 flex h-full items-stretch min-[90rem]:-ml-3 min-[90rem]:gap-1">
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
                className={cn(ITEM, 'aria-expanded:text-brand aria-expanded:after:scale-x-100')}
              >
                {menu.label}
                <ChevronDown
                  aria-hidden
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
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
        // The reference's panel: fades in while sliding 4 px into place, 220 ms, a soft ease-out.
        'invisible absolute inset-x-0 top-full -translate-y-1 opacity-0 shadow-[0_28px_48px_-36px_rgb(8_43_13_/_0.45)] transition-[opacity,translate,visibility] duration-[220ms] ease-[cubic-bezier(0.22,1,0.36,1)] data-open:visible data-open:translate-y-0 data-open:opacity-100 motion-reduce:transition-none',
        className,
      )}
    >
      {opened ? (
        <div className="container-page max-h-[calc(100dvh-9rem)] overflow-y-auto overscroll-contain py-8">
          {children}
        </div>
      ) : null}
    </div>
  );
}

/** The picture card on a panel's right (258×310 on the reference) with its label over it. */
function FeatureCard({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      tabIndex={-1}
      aria-hidden
      className="cat-card group relative block h-[19.375rem] w-full overflow-hidden rounded-tile bg-forest-900 text-ivory-50"
    >
      {children}
      <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-forest-950/85 via-forest-950/35 to-transparent px-4 pt-16 pb-4">
        <span className="flex items-end justify-between gap-3">
          <span className="font-headline text-[1.75rem]">{label}</span>
          <ArrowRight
            aria-hidden
            className="mb-1 h-5 w-5 shrink-0 transition-transform duration-200 group-hover:translate-x-1"
          />
        </span>
      </span>
    </Link>
  );
}

function PhotoFill({ src, sizes }: { src: StaticImageData; sizes: string }) {
  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={sizes}
      className="object-cover transition-transform duration-500 ease-[var(--ease-soft)] group-hover:scale-[1.04]"
    />
  );
}

const CATEGORY_TAB =
  'flex min-h-[2.625rem] items-center rounded-full px-4 py-1.5 font-headline text-[1.25rem] leading-none text-jade-700 transition-colors duration-[220ms] hover:bg-forest-900/[0.06] data-active:bg-jade-700 data-active:text-ivory-50';

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
  const current: NavCategoryTree | undefined =
    categories[Math.min(active, Math.max(categories.length - 1, 0))];
  const rows = categories.length;
  const activate = (index: number) => {
    setActive(index);
    setPointed(null);
  };

  return (
    <div
      className="grid min-h-[19.375rem] grid-cols-[15.25rem_minmax(0,1fr)_16.25rem] gap-x-10"
      // One row per category, the "all products" row, then a flexible row that takes up the height
      // of a long subcategory list, so the rows on the left keep their size.
      style={{ gridTemplateRows: `repeat(${rows + 1}, auto) 1fr` } as CSSProperties}
    >
      <span
        aria-hidden
        className="rounded-tile bg-canvas/80"
        style={{ gridColumn: 1, gridRow: `1 / ${rows + 2}` }}
      />
      {categories.map((category, index) => (
        <Fragment key={category.slug}>
          <Link
            href={`/${category.path}`}
            onPointerEnter={() => activate(index)}
            onFocus={() => activate(index)}
            data-active={category === current ? '' : undefined}
            style={{ gridColumn: 1, gridRow: index + 1 }}
            className={cn(CATEGORY_TAB, 'mx-4 mb-1', index === 0 && 'mt-4')}
          >
            <span className="line-clamp-2">{category.name}</span>
          </Link>
          {category === current ? (
            <>
              <CategoryColumns category={category} onPoint={setPointed} />
              <div style={{ gridColumn: 3, gridRow: '1 / -1', alignSelf: 'start' }}>
                <FeaturedCategory category={featuredOf(category, pointed)} variant={index} />
              </div>
            </>
          ) : null}
        </Fragment>
      ))}
      <div
        className="mx-4 mb-4 border-t border-line pt-3"
        style={{ gridColumn: 1, gridRow: rows + 1 }}
      >
        <Link href="/catalog" className={CATEGORY_TAB}>
          {t('shopAll')}
        </Link>
      </div>
    </div>
  );
}

function FeaturedCategory({ category, variant }: { category: NavCategory; variant: number }) {
  return (
    <FeatureCard href={`/${category.path}`} label={category.name}>
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
        <ul className="mt-4">
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
        <ul className="mt-4">
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
          <li>
            <Link href="/catalog?sort=newest" className={COLUMN_LINK}>
              {t('shopAll')}
            </Link>
          </li>
          <li>
            <Link href="/assistant" className={COLUMN_LINK}>
              {t('assistant')}
            </Link>
          </li>
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
        <ul className="mt-4 columns-3 gap-x-10">
          {collections.map((collection) => (
            <li key={collection.slug} className="break-inside-avoid">
              <Link href={`/collections/${collection.slug}`} className={COLUMN_LINK}>
                {collection.name}
                {collection.productCount === 0 ? (
                  <span className="text-caption text-fg-subtle">{t('menuSoon')}</span>
                ) : null}
              </Link>
            </li>
          ))}
          <li className="break-inside-avoid">
            <Link href="/catalog" className={COLUMN_LINK_STRONG}>
              {t('shopAll')}
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
          </li>
        </ul>
      </div>
      {first ? (
        <FeatureCard href={`/collections/${first.slug}`} label={first.name}>
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
      <div className="grid min-w-0 grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] content-start gap-x-10">
        <div className="min-w-0">
          <p className={COLUMN_HEADING}>{t('articles')}</p>
          <ul className="mt-4">
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
          <ul className="mt-4">
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
        <FeatureCard href="/journal" label={t('journal')}>
          <PhotoFill src={lake} sizes="16rem" />
        </FeatureCard>
      )}
    </div>
  );
}

/** The brand's own pages and the help pages, with the pack's landscape as the picture. */
function AboutPanel() {
  const t = useTranslations('Nav');
  return (
    <div className="grid min-h-[19.375rem] grid-cols-[minmax(0,1fr)_16.25rem] gap-x-10">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)] content-start gap-x-10">
        <div>
          <p className={COLUMN_HEADING}>{t('brandWorld')}</p>
          <ul className="mt-4">
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
          <ul className="mt-4">
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
      <FeatureCard href="/about" label={t('ourStory')}>
        <PhotoFill src={lake} sizes="16rem" />
      </FeatureCard>
    </div>
  );
}

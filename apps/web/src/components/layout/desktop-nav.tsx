'use client';

import { ArrowRight, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
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
import type { Locale } from '@teran/contracts';
import { Emblem } from '@/components/brand/logo';
import { CategoryArt } from '@/components/catalog/category-art';
import { CategoryThumb } from '@/components/catalog/category-thumb';
import { brandCopy } from '@/content/brand';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { EMPTY_NAVIGATION, type NavCategoryTree, type Navigation } from '@/lib/navigation';

type MenuId = 'shop' | 'collections' | 'about';

const OPEN_DELAY_MS = 120;
const CLOSE_DELAY_MS = 220;

/* Shared by menu triggers and plain links: the gold underline sits on the header's lower edge. */
const ITEM =
  'relative inline-flex h-11 items-center gap-1 px-3 text-nav whitespace-nowrap text-fg transition-colors duration-150 hover:text-brand ' +
  "after:pointer-events-none after:absolute after:inset-x-3 after:-bottom-4 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-accent after:transition-transform after:duration-200 after:content-[''] hover:after:scale-x-100";

/**
 * Desktop navigation (from 1280 px; narrower screens use the drawer): "Catalogue", "Collections"
 * and "About TERAN" open full-width panels under the header (WAI-ARIA disclosure buttons with
 * aria-expanded; click, Enter/Space or a short hover; Esc closes and returns focus; a click outside
 * or on any link closes). Panels fade and slide a few pixels, and the page dims behind them.
 *
 * Every category and collection comes from the API (lib/navigation.ts), the same tree the drawer
 * and the home page's cards use. The catalogue panel lists the top-level categories; pointing at
 * or focusing one shows its subcategories and its picture beside the list. Each category's details
 * follow its row in the document, so Tab walks row → its subcategories → next row. Very long
 * catalogues scroll inside the panel instead of stretching the page.
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

  const trigger = (id: MenuId, label: string) => (
    <button
      type="button"
      data-menu={id}
      aria-expanded={openMenu === id}
      aria-controls={`${panelId}-${id}`}
      onClick={() => setOpenMenu((current) => (current === id ? null : id))}
      onPointerEnter={(event) => event.pointerType === 'mouse' && schedule(id, OPEN_DELAY_MS)}
      className={cn(ITEM, 'aria-expanded:text-brand aria-expanded:after:scale-x-100')}
    >
      {label}
      <ChevronDown
        aria-hidden
        className={cn(
          'h-4 w-4 text-fg-subtle transition-transform duration-200',
          openMenu === id && 'rotate-180 text-brand',
        )}
      />
    </button>
  );

  return (
    <div
      ref={rootRef}
      className="hidden xl:block"
      onPointerLeave={(event) => event.pointerType === 'mouse' && schedule(null, CLOSE_DELAY_MS)}
      onPointerEnter={() => clearTimeout(timer.current)}
      // Following any link inside the menus closes them (no need to watch the URL).
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('a')) setOpenMenu(null);
      }}
    >
      {/* The page dims behind an open panel; a click on it closes the panel. */}
      <div
        aria-hidden
        data-open={openMenu ? '' : undefined}
        onPointerDown={() => setOpenMenu(null)}
        className="pointer-events-none invisible absolute inset-x-0 top-full h-dvh bg-forest-950/25 opacity-0 transition-[opacity,visibility] duration-300 data-open:pointer-events-auto data-open:visible data-open:opacity-100 motion-reduce:transition-none"
      />
      <nav aria-label={t('main')}>
        <ul className="-ml-3 flex items-center">
          {/* Each panel follows its trigger in the DOM, so Tab moves from a button into its menu. */}
          <li>
            {trigger('shop', t('shop'))}
            <MegaPanel id={`${panelId}-shop`} open={openMenu === 'shop'}>
              <Suspense fallback={<ShopPanel navigation={EMPTY_NAVIGATION} />}>
                <StreamedShopPanel navigation={navigation} />
              </Suspense>
            </MegaPanel>
          </li>
          <li>
            {trigger('collections', t('collections'))}
            <MegaPanel id={`${panelId}-collections`} open={openMenu === 'collections'}>
              <Suspense fallback={<CollectionsPanel navigation={EMPTY_NAVIGATION} />}>
                <StreamedCollectionsPanel navigation={navigation} />
              </Suspense>
            </MegaPanel>
          </li>
          <li>
            <Link href="/wholesale" className={ITEM}>
              {t('wholesale')}
            </Link>
          </li>
          <li>
            {trigger('about', t('about'))}
            <MegaPanel id={`${panelId}-about`} open={openMenu === 'about'}>
              <AboutPanel />
            </MegaPanel>
          </li>
        </ul>
      </nav>
    </div>
  );
}

/**
 * A full-width panel under the header, aligned to the page grid. Its contents are rendered the
 * first time it opens (so no page carries the menus' markup in its HTML, and nothing hidden has to
 * be laid out), then kept while closed, invisible and inert, so it can fade out as well as in.
 */
function MegaPanel({ id, open, children }: { id: string; open: boolean; children: ReactNode }) {
  const [opened, setOpened] = useState(open);
  if (open && !opened) setOpened(true);
  return (
    <div
      id={id}
      inert={!open}
      data-open={open ? '' : undefined}
      className="invisible absolute inset-x-0 top-full -translate-y-1.5 border-t border-line-subtle bg-surface opacity-0 shadow-[0_32px_64px_-36px_rgb(8_43_13_/_0.55)] transition-[opacity,translate,visibility] duration-200 ease-[var(--ease-standard)] data-open:visible data-open:translate-y-0 data-open:opacity-100 motion-reduce:transition-none"
    >
      {opened ? (
        <div className="container-page max-h-[calc(100dvh-8.5rem)] overflow-y-auto overscroll-contain py-8">
          {children}
        </div>
      ) : null}
    </div>
  );
}

const PANEL_HEADING = 'text-eyebrow text-accent-fg';

function StreamedShopPanel({ navigation }: { navigation: Promise<Navigation> }) {
  return <ShopPanel navigation={use(navigation)} />;
}

/**
 * Top-level categories on the left. The active one (pointed at or focused; the first by default)
 * shows its subcategories in the middle and its picture on the right.
 */
function ShopPanel({ navigation }: { navigation: Navigation }) {
  const t = useTranslations('Nav');
  const { categories } = navigation;
  const [active, setActive] = useState(0);
  const current = Math.min(active, Math.max(categories.length - 1, 0));

  return (
    <div
      className="grid grid-cols-[minmax(15rem,17rem)_minmax(0,1fr)_minmax(15rem,18rem)] gap-x-10"
      // Heading, one row per category, "all products", then a flexible row that takes up the
      // height of a long subcategory list, so the rows on the left keep their size.
      style={
        { gridTemplateRows: `auto repeat(${categories.length}, auto) auto 1fr` } as CSSProperties
      }
    >
      <p className={cn(PANEL_HEADING, 'col-start-1 mb-3 px-3')} style={{ gridRow: 1 }}>
        {t('categories')}
      </p>
      {categories.map((category, index) => (
        <Fragment key={category.slug}>
          <Link
            href={`/${category.path}`}
            onPointerEnter={() => setActive(index)}
            onFocus={() => setActive(index)}
            data-active={index === current ? '' : undefined}
            style={{ gridColumn: 1, gridRow: index + 2 }}
            className="group relative flex min-h-14 items-center gap-3 rounded-control px-3 py-2 text-fg transition-colors duration-150 before:absolute before:inset-y-2.5 before:left-0 before:w-0.5 before:rounded-full before:bg-accent before:opacity-0 before:transition-opacity data-active:bg-ivory-100 data-active:text-forest-900 data-active:before:opacity-100 hover:bg-ivory-100"
          >
            <CategoryThumb
              image={category.image}
              illustrationKey={category.illustrationKey}
              className="h-9 w-9"
            />
            <span className="min-w-0 flex-1">
              <span className="line-clamp-2 text-title-sm font-semibold">{category.name}</span>
              <span className="block text-caption text-fg-subtle">
                {t('menuCount', { count: category.productCount })}
              </span>
            </span>
            <ChevronRight
              aria-hidden
              className="h-4 w-4 shrink-0 text-fg-subtle transition-transform duration-150 group-data-active:translate-x-0.5 group-data-active:text-accent-fg"
            />
          </Link>
          {index === current ? (
            <>
              <CategoryDetails category={category} />
              <Link
                href={`/${category.path}`}
                tabIndex={-1}
                aria-hidden
                className="cat-card group relative block min-h-[19rem] overflow-hidden rounded-[1.25rem] text-ivory-50"
                style={{ gridColumn: 3, gridRow: '1 / -1', alignSelf: 'start' }}
              >
                <CategoryArt category={category} variant={index} sizes="9rem" />
                <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-forest-950/90 via-forest-950/50 to-transparent px-5 pt-12 pb-5">
                  <span className="block text-display-xs text-ivory-50">{category.name}</span>
                  <span className="mt-2 inline-flex items-center gap-1.5 text-button text-gold-300">
                    {t('explore')}
                    <ArrowRight
                      aria-hidden
                      className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1"
                    />
                  </span>
                </span>
              </Link>
            </>
          ) : null}
        </Fragment>
      ))}
      <Link
        href="/catalog"
        style={{ gridColumn: 1, gridRow: categories.length + 2 }}
        className="group mt-3 inline-flex items-center gap-2 self-start px-3 py-2 text-button text-brand hover:underline hover:underline-offset-4"
      >
        {t('shopAll')}
        <ArrowRight
          aria-hidden
          className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
        />
      </Link>
      <Link
        href="/assistant"
        style={{ gridColumn: 1, gridRow: categories.length + 3 }}
        className="group inline-flex items-center gap-2 self-start px-3 py-2 text-body-sm font-semibold text-forest-900 hover:underline hover:underline-offset-4"
      >
        <Sparkles aria-hidden className="h-4 w-4 text-accent-fg" />
        {t('assistant')}
      </Link>
    </div>
  );
}

/** The active category in the middle column: its description, subcategories and a link to it. */
function CategoryDetails({ category }: { category: NavCategoryTree }) {
  const t = useTranslations('Nav');
  return (
    <div
      className="flex min-w-0 flex-col border-l border-line-subtle pl-10"
      style={{ gridColumn: 2, gridRow: '1 / -1' }}
    >
      <p className={PANEL_HEADING}>{t('menuCount', { count: category.productCount })}</p>
      <p className="mt-2 text-display-sm text-forest-900">{category.name}</p>
      {category.description ? (
        <p className="mt-2 line-clamp-2 max-w-xl text-body text-fg-muted">{category.description}</p>
      ) : null}
      {category.children.length > 0 ? (
        <ul className="mt-6 grid max-h-[22rem] grid-cols-2 content-start gap-x-6 gap-y-1 overflow-y-auto pr-1">
          {category.children.map((child) => (
            <li key={child.slug} className="min-w-0">
              <Link
                href={`/${child.path}`}
                className="group flex min-h-12 items-center gap-3 rounded-control px-2 py-1.5 transition-colors duration-150 hover:bg-ivory-100"
              >
                <CategoryThumb
                  image={child.image}
                  illustrationKey={child.illustrationKey}
                  className="h-8 w-8 transition-transform duration-200 group-hover:scale-105"
                />
                <span className="min-w-0">
                  <span className="line-clamp-2 text-body font-medium text-fg group-hover:text-brand">
                    {child.name}
                  </span>
                  <span className="block text-caption text-fg-subtle">
                    {t('menuCount', { count: child.productCount })}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      <Link
        href={`/${category.path}`}
        className="group mt-6 inline-flex items-center gap-2 self-start rounded-full border border-line-strong/45 px-4 py-2 text-button text-forest-900 transition-colors duration-150 hover:border-forest-900 hover:bg-forest-900 hover:text-ivory-50"
      >
        {t('shopIn', { name: category.name })}
        <ArrowRight
          aria-hidden
          className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
        />
      </Link>
    </div>
  );
}

function StreamedCollectionsPanel({ navigation }: { navigation: Promise<Navigation> }) {
  return <CollectionsPanel navigation={use(navigation)} />;
}

/** Curated collections as tiles in the same art direction as the category cards. */
function CollectionsPanel({ navigation }: { navigation: Navigation }) {
  const t = useTranslations('Nav');
  return (
    <div>
      <div className="flex items-end justify-between gap-6">
        <p className={PANEL_HEADING}>{t('featured')}</p>
        <Link
          href="/catalog"
          className="group inline-flex items-center gap-2 text-button text-brand hover:underline hover:underline-offset-4"
        >
          {t('shopAll')}
          <ArrowRight
            aria-hidden
            className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
          />
        </Link>
      </div>
      <ul className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(max(13rem,calc((100%-3rem)/4)),1fr))] gap-4">
        {navigation.collections.map((collection, index) => (
          <li key={collection.slug}>
            <Link
              href={`/collections/${collection.slug}`}
              className="cat-card group relative block h-56 overflow-hidden rounded-[1.25rem] text-ivory-50 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
            >
              <CategoryArt
                category={collection}
                variant={index + 1}
                sizes="8rem"
                className="[--window-top:36%] [--window:min(46cqw,48cqh)]"
              />
              <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-forest-950/90 via-forest-950/45 to-transparent px-4 pt-10 pb-4">
                <span className="line-clamp-2 block text-title-sm font-semibold text-ivory-50">
                  {collection.name}
                </span>
                <span className="mt-0.5 block text-caption text-ivory-100/70">
                  {t('menuCount', { count: collection.productCount })}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** About TERAN: the brand's own pages and the help pages, each with a line saying what it holds. */
function AboutPanel() {
  const t = useTranslations('Nav');
  const locale = useLocale() as Locale;
  const groups = [
    {
      title: t('brandWorld'),
      links: [
        ['/about', t('about'), t('aboutText')],
        ['/journal', t('journal'), t('journalText')],
        ['/media/photos', t('photos'), t('photosText')],
        ['/media/videos', t('videos'), t('videosText')],
        ['/wholesale', t('wholesale'), t('wholesaleText')],
      ],
    },
    {
      title: t('help'),
      links: [
        ['/contact', t('contact'), t('contactText')],
        ['/delivery', t('delivery'), t('deliveryText')],
        ['/faq', t('faq'), t('faqText')],
      ],
    },
  ] as const;
  return (
    <div className="grid grid-cols-12 gap-10">
      {groups.map((group) => (
        <div key={group.title} className="col-span-4">
          <p className={PANEL_HEADING}>{group.title}</p>
          <ul className="mt-3 space-y-1">
            {group.links.map(([href, label, text]) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex items-start justify-between gap-4 rounded-control px-3 py-2.5 transition-colors duration-150 hover:bg-ivory-100"
                >
                  <span>
                    <span className="block text-title-sm font-semibold text-forest-900 group-hover:text-brand">
                      {label}
                    </span>
                    <span className="mt-0.5 block text-body-sm text-fg-muted">{text}</span>
                  </span>
                  <ArrowRight
                    aria-hidden
                    className="mt-1 h-4 w-4 shrink-0 text-accent-fg opacity-0 transition-[opacity,translate] duration-150 group-hover:translate-x-0.5 group-hover:opacity-100"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
      <Link
        href="/about"
        className="on-dark group relative col-span-4 flex min-h-56 flex-col justify-between overflow-hidden rounded-[1.25rem] bg-surface-inverse p-6 text-fg-inverse"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-14 -bottom-14 h-48 w-48 rounded-full border border-gold-300/20"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -right-6 -bottom-6 h-32 w-32 rounded-full border border-gold-300/15"
        />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-ivory-50 shadow-soft">
          <Emblem className="w-9" sizes="36px" />
        </span>
        <span className="relative">
          <span className="block text-display-sm text-ivory-50">{brandCopy[locale].tagline}</span>
          <span className="mt-2 block text-body-sm text-ivory-100/80">{t('aboutText')}</span>
          <span className="mt-4 inline-flex items-center gap-2 text-button text-accent-on-inverse">
            {t('about')}
            <ArrowRight
              aria-hidden
              className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1"
            />
          </span>
        </span>
      </Link>
    </div>
  );
}

'use client';

import type { IllustrationKey } from '@teran/contracts';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Suspense, use, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Emblem } from '@/components/brand/logo';
import { TeaTypeArt } from '@/components/brand/illustrations';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

export interface NavCategory {
  slug: string;
  /** Address below the locale: "tea" or "tea/green-tea". */
  path: string;
  name: string;
  illustrationKey: IllustrationKey | null;
}

/** A top-level category with its subcategories (both come from the API). */
export interface NavCategoryTree extends NavCategory {
  children: NavCategory[];
}

export interface NavCollection {
  slug: string;
  name: string;
}

export interface Navigation {
  categories: NavCategoryTree[];
  collections: NavCollection[];
}

type MenuId = 'shop' | 'collections' | 'about';

const OPEN_DELAY_MS = 120;
const CLOSE_DELAY_MS = 220;

/* Shared by menu triggers and plain links: the gold underline sits on the header's lower edge. */
const ITEM =
  'relative inline-flex h-11 items-center gap-1 px-3 text-nav whitespace-nowrap text-fg transition-colors duration-150 hover:text-brand ' +
  "after:pointer-events-none after:absolute after:inset-x-3 after:-bottom-4 after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-accent after:transition-transform after:duration-200 after:content-[''] hover:after:scale-x-100";

/**
 * Desktop navigation with mega menus (WAI-ARIA disclosure pattern): real <button> triggers with
 * aria-expanded, open on click/Enter/Space or after a short hover, Esc closes and returns focus.
 * Shown from 1280 px; narrower screens use the drawer. The triggers work before the navigation
 * data arrives; only the panel lists stream in.
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
      <nav aria-label={t('main')}>
        <ul className="-ml-3 flex items-center">
          {/* Each panel follows its trigger in the DOM, so Tab moves from a button into its menu. */}
          <li>
            {trigger('shop', t('shop'))}
            <MegaPanel id={`${panelId}-shop`} open={openMenu === 'shop'}>
              <div className="grid grid-cols-12 gap-10">
                <Suspense fallback={<ShopLists categories={[]} collections={[]} />}>
                  <StreamedShopLists navigation={navigation} />
                </Suspense>
                <FeatureCard
                  className="col-span-3"
                  title={t('discoverTitle')}
                  text={t('discoverText')}
                  cta={t('shopAll')}
                />
              </div>
            </MegaPanel>
          </li>
          <li>
            {trigger('collections', t('collections'))}
            <MegaPanel id={`${panelId}-collections`} open={openMenu === 'collections'}>
              <div className="grid grid-cols-12 gap-10">
                <div className="col-span-9">
                  <p className="text-eyebrow text-accent-fg">{t('featured')}</p>
                  <Suspense fallback={<CollectionTiles collections={[]} />}>
                    <StreamedCollectionTiles navigation={navigation} />
                  </Suspense>
                </div>
                <FeatureCard
                  className="col-span-3"
                  title={t('discoverTitle')}
                  text={t('discoverText')}
                  cta={t('shopAll')}
                />
              </div>
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
              <ul className="grid grid-cols-3 gap-3">
                {(
                  [
                    ['/about', t('about')],
                    ['/journal', t('journal')],
                    ['/wholesale', t('wholesale')],
                    ['/contact', t('contact')],
                    ['/delivery', t('delivery')],
                    ['/faq', t('faq')],
                  ] as const
                ).map(([href, label]) => (
                  <li key={href}>
                    <Link href={href} className={cn(TILE, 'items-center')}>
                      <span className="text-display-xs text-forest-900">{label}</span>
                      <ArrowRight
                        aria-hidden
                        className="h-4 w-4 text-accent-fg transition-transform duration-150 group-hover:translate-x-0.5"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </MegaPanel>
          </li>
        </ul>
      </nav>
    </div>
  );
}

const TILE =
  'group flex h-full justify-between gap-4 rounded-card border border-line bg-canvas px-5 py-4 transition-[border-color,background-color] duration-150 hover:border-gold-400 hover:bg-surface';

function MegaPanel({ id, open, children }: { id: string; open: boolean; children: ReactNode }) {
  return (
    <div
      id={id}
      hidden={!open}
      className="absolute inset-x-0 top-full border-t border-line-subtle bg-surface shadow-[0_28px_56px_-32px_rgb(11_46_25_/_0.4)] motion-safe:animate-fade-in"
    >
      <div className="container-page py-8">{children}</div>
    </div>
  );
}

function FeatureCard({
  title,
  text,
  cta,
  className,
}: {
  title: string;
  text: string;
  cta: string;
  className?: string;
}) {
  return (
    <Link
      href="/catalog"
      className={cn(
        'on-dark group relative flex min-h-60 flex-col justify-between overflow-hidden rounded-card bg-surface-inverse p-6 text-fg-inverse',
        className,
      )}
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
        <span className="block text-display-sm text-ivory-50">{title}</span>
        <span className="mt-2 block text-body-sm text-ivory-100/80">{text}</span>
        <span className="mt-4 inline-flex items-center gap-2 text-button text-accent-on-inverse">
          {cta}
          <ArrowRight
            aria-hidden
            className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-1"
          />
        </span>
      </span>
    </Link>
  );
}

function StreamedShopLists({ navigation }: { navigation: Promise<Navigation> }) {
  return <ShopLists {...use(navigation)} />;
}

/**
 * The category tree and featured collections in the "Shop" panel (empty while data is on its way).
 * Every category comes from the API: a new one appears here once it is active and has products.
 */
function ShopLists({ categories, collections }: Navigation) {
  const t = useTranslations('Nav');
  return (
    <>
      <div className="col-span-6 grid grid-cols-2 gap-x-8 gap-y-6">
        {categories.map((category) => (
          <div key={category.slug}>
            <Link
              href={`/${category.path}`}
              className="group flex items-center gap-3 rounded-control px-2 py-1.5 transition-colors duration-150 hover:bg-surface-muted"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-muted p-1.5 transition-colors group-hover:bg-surface">
                <TeaTypeArt kind={category.illustrationKey} />
              </span>
              <span className="text-title-sm font-semibold text-forest-900 group-hover:text-brand">
                {category.name}
              </span>
            </Link>
            {category.children.length > 0 ? (
              <ul className="mt-1 ml-[3.75rem] space-y-0.5">
                {category.children.map((child) => (
                  <li key={child.slug}>
                    <Link
                      href={`/${child.path}`}
                      className="block rounded-control px-2 py-1.5 text-body text-fg transition-colors duration-150 hover:bg-surface-muted hover:text-brand"
                    >
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>
      <div className="col-span-3 border-l border-line-subtle pl-8">
        <p className="text-eyebrow text-accent-fg">{t('featured')}</p>
        <ul className="mt-4 space-y-0.5">
          {collections.map((collection) => (
            <li key={collection.slug}>
              <Link
                href={`/collections/${collection.slug}`}
                className="block rounded-control px-2 py-2 text-body text-fg transition-colors duration-150 hover:bg-surface-muted hover:text-brand"
              >
                {collection.name}
              </Link>
            </li>
          ))}
        </ul>
        <Link
          href="/catalog"
          className="group mt-4 inline-flex items-center gap-2 px-2 text-button text-brand hover:underline hover:underline-offset-4"
        >
          {t('shopAll')}
          <ArrowRight
            aria-hidden
            className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5"
          />
        </Link>
      </div>
    </>
  );
}

function StreamedCollectionTiles({ navigation }: { navigation: Promise<Navigation> }) {
  return <CollectionTiles collections={use(navigation).collections} />;
}

/** Collection tiles in the "Collections" panel (empty while data is on its way). */
function CollectionTiles({ collections }: Pick<Navigation, 'collections'>) {
  return (
    <ul className="mt-4 grid grid-cols-3 gap-3">
      {collections.map((collection) => (
        <li key={collection.slug}>
          <Link href={`/collections/${collection.slug}`} className={cn(TILE, 'min-h-28 items-end')}>
            <span className="text-display-xs text-forest-900">{collection.name}</span>
            <ArrowRight
              aria-hidden
              className="h-4 w-4 shrink-0 text-accent-fg transition-transform duration-150 group-hover:translate-x-0.5"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

'use client';

import { ArrowLeft, ChevronRight, Menu, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import {
  Suspense,
  use,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { CategoryArt } from '@/components/catalog/category-art';
import { buttonClasses, IconButton } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { fitWidth } from '@/lib/fit';
import {
  ABOUT_LINKS,
  EMPTY_NAVIGATION,
  HELP_LINKS,
  LEARN_LINKS,
  type Navigation,
} from '@/lib/navigation';
import type { HeaderAccount } from '@/lib/session';
import lake from '../../../public/brand/art/lake.webp';
import { LanguageSwitcherSlot } from './language-switcher';

type Level = 'categories' | 'learn' | 'about';

const TILE =
  'cat-card group @container relative block aspect-square overflow-hidden rounded-tile bg-forest-900 text-ivory-50 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus';
/** A long word gets smaller rather than break inside ("MAHSULOTL-AR"): see lib/fit. */
const TILE_LABEL =
  'absolute inset-x-0 bottom-0 line-clamp-3 bg-linear-to-t from-forest-950/90 via-forest-950/55 to-transparent px-3 pt-12 pb-3 font-headline text-[length:min(1.375rem,var(--fit))] [overflow-wrap:anywhere]';

/** The tile's name, sized so its longest word fits the tile (its padding included). */
function TileLabel({ children }: { children: string }) {
  return (
    <span className={TILE_LABEL} style={{ '--fit': fitWidth(children, 0.66) } as CSSProperties}>
      {children}
    </span>
  );
}
const ROW =
  'flex min-h-14 w-full items-center justify-between gap-3 rounded-tile bg-surface-muted px-5 text-[1.0625rem] font-medium text-fg transition-colors hover:bg-surface-sunken';
const LINK_ROW =
  'flex min-h-12 items-center justify-between gap-3 border-b border-line-subtle py-3 text-body hover:underline hover:underline-offset-4';

/**
 * Drawer navigation below 1280 px, on the reference's model: picture tiles for the catalogue (its
 * top-level categories, collections with products and "all products", in two columns), then
 * rounded rows that open the other sections one level deeper (Shop: every category with its
 * subcategories and every collection; Tea school; About), and a bottom bar with the account and
 * the language. The tree is the one the
 * desktop panels use. The button and drawer work before the data arrives; only the lists stream
 * in. Esc, the close button and following a link close it; focus returns to the menu button.
 */
export function MobileMenu({
  navigation,
  account,
}: {
  navigation: Promise<Navigation>;
  account: Promise<HeaderAccount>;
}) {
  const t = useTranslations('Nav');
  const [open, setOpen] = useState(false);
  const [opened, setOpened] = useState(false);
  const [level, setLevel] = useState<Level | null>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  if (open && !opened) setOpened(true);

  const close = () => {
    setOpen(false);
    setLevel(null);
  };
  // Following any link closes the drawer (no need to watch the URL).
  const closeOnLink = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest('a')) close();
  };
  const enter = (next: Level) => {
    setLevel(next);
    requestAnimationFrame(() => backRef.current?.focus());
  };

  return (
    <>
      <IconButton
        label={t('openMenu')}
        icon={<Menu />}
        onClick={() => setOpen(true)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="-ml-2 xl:hidden"
      />
      <Sheet
        open={open}
        onClose={close}
        side="left"
        narrow
        title={t('explore')}
        hideTitle
        closeLabel={t('closeMenu')}
        footer={
          opened ? (
            <div className="flex items-center justify-between gap-3">
              <Suspense fallback={<AccountLink user={null} onDone={close} />}>
                <StreamedAccountLink account={account} onDone={close} />
              </Suspense>
              <LanguageSwitcherSlot tone="light" placement="up" />
            </div>
          ) : null
        }
      >
        {opened ? (
          <div className="px-5 pt-6 pb-8" onClick={closeOnLink}>
            {level ? (
              <div>
                <button
                  ref={backRef}
                  type="button"
                  onClick={() => setLevel(null)}
                  className="-ml-1 inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-body font-semibold text-fg"
                >
                  <ArrowLeft aria-hidden className="h-5 w-5" />
                  {t('backTo')}
                </button>
                <Suspense fallback={null}>
                  <LevelLinks level={level} navigation={navigation} />
                </Suspense>
              </div>
            ) : (
              <>
                <p className="font-headline text-[2rem] text-jade-700">{t('explore')}</p>
                <Suspense fallback={<Tiles navigation={EMPTY_NAVIGATION} />}>
                  <StreamedTiles navigation={navigation} />
                </Suspense>
                <ul className="mt-6 space-y-3">
                  {(
                    [
                      ['categories', t('shop')],
                      ['learn', t('learn')],
                      ['about', t('about')],
                    ] as const
                  ).map(([id, label]) => (
                    <li key={id}>
                      <button type="button" onClick={() => enter(id)} className={ROW}>
                        {label}
                        <ChevronRight aria-hidden className="h-5 w-5 shrink-0" />
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        ) : null}
      </Sheet>
    </>
  );
}

function StreamedTiles({ navigation }: { navigation: Promise<Navigation> }) {
  return <Tiles navigation={use(navigation)} />;
}

/** Five picture tiles and "all products" fill the first screen, as on the reference. */
const MAX_TILES = 5;

/**
 * Picture tiles in two columns: the top-level categories, then collections with products, and
 * "all products". Everything else (subcategories, every collection, empty ones too) is one level
 * deeper under the "Shop" row.
 */
function Tiles({ navigation }: { navigation: Navigation }) {
  const t = useTranslations('Nav');
  const items = [
    ...navigation.categories.map((category, index) => ({
      key: `c-${category.slug}`,
      href: `/${category.path}`,
      label: category.name,
      art: <CategoryArt category={category} variant={index} sizes="10rem" />,
    })),
    ...navigation.collections
      .filter((collection) => collection.productCount > 0)
      .map((collection, index) => ({
        key: `k-${collection.slug}`,
        href: `/collections/${collection.slug}`,
        label: collection.name,
        art: <CategoryArt category={collection} variant={index + 1} sizes="10rem" />,
      })),
  ].slice(0, MAX_TILES);
  return (
    <ul className="mt-5 grid grid-cols-2 gap-3">
      {items.map((item) => (
        <li key={item.key}>
          <Link href={item.href} className={TILE}>
            {item.art}
            <TileLabel>{item.label}</TileLabel>
          </Link>
        </li>
      ))}
      <li>
        <Link href="/catalog" className={TILE}>
          <Image src={lake} alt="" fill sizes="10rem" className="object-cover" />
          <TileLabel>{t('shopAll')}</TileLabel>
        </Link>
      </li>
    </ul>
  );
}

function LevelLinks({ level, navigation }: { level: Level; navigation: Promise<Navigation> }) {
  const t = useTranslations('Nav');
  if (level === 'learn') {
    return (
      <Section title={t('learn')}>
        {LEARN_LINKS.map((link) => (
          <Row key={link.href} href={link.href}>
            {t(link.label)}
          </Row>
        ))}
      </Section>
    );
  }
  if (level === 'about') {
    return (
      <>
        <Section title={t('brandWorld')}>
          {ABOUT_LINKS.map((link) => (
            <Row key={link.href} href={link.href}>
              {t(link.label)}
            </Row>
          ))}
        </Section>
        <Section title={t('help')}>
          {HELP_LINKS.map((link) => (
            <Row key={link.href} href={link.href}>
              {t(link.label)}
            </Row>
          ))}
        </Section>
      </>
    );
  }
  return <CategoryLinks navigation={navigation} />;
}

/** Every category with its subcategories, then every collection. */
function CategoryLinks({ navigation }: { navigation: Promise<Navigation> }) {
  const t = useTranslations('Nav');
  const { categories, collections } = use(navigation);
  return (
    <>
      {categories.map((category) => (
        <Section key={category.slug} title={category.name}>
          {category.children.map((child) => (
            <Row key={child.slug} href={`/${child.path}`} soon={child.productCount === 0}>
              {child.name}
            </Row>
          ))}
          <Row href={`/${category.path}`} strong>
            {t('shopIn', { name: category.name })}
          </Row>
        </Section>
      ))}
      {collections.length > 0 ? (
        <Section title={t('collections')}>
          {collections.map((collection) => (
            <Row
              key={collection.slug}
              href={`/collections/${collection.slug}`}
              soon={collection.productCount === 0}
            >
              {collection.name}
            </Row>
          ))}
        </Section>
      ) : null}
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <nav aria-label={title} className="mt-6">
      <h3 className="font-heading text-[1.5rem] leading-tight text-fg">{title}</h3>
      <ul className="mt-2">{children}</ul>
    </nav>
  );
}

function Row({
  href,
  children,
  soon = false,
  strong = false,
}: {
  href: string;
  children: ReactNode;
  soon?: boolean;
  strong?: boolean;
}) {
  const t = useTranslations('Nav');
  return (
    <li>
      <Link
        href={href}
        className={cn(LINK_ROW, strong ? 'font-semibold text-fg' : 'font-medium text-fg')}
      >
        <span className="min-w-0">
          {children}
          {soon ? <span className="ml-2 text-caption text-fg-subtle">{t('menuSoon')}</span> : null}
        </span>
        <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-fg-subtle" />
      </Link>
    </li>
  );
}

function StreamedAccountLink({
  account,
  onDone,
}: {
  account: Promise<HeaderAccount>;
  onDone: () => void;
}) {
  return <AccountLink user={use(account)} onDone={onDone} />;
}

/**
 * Visitors: "Sign in" and "Register" side by side; customers: their account, by name with the
 * person icon (as in the bar from 1280 px).
 */
function AccountLink({ user, onDone }: { user: HeaderAccount; onDone: () => void }) {
  const t = useTranslations('Nav');
  if (!user) {
    return (
      <div className="flex min-w-0 items-center gap-4">
        <Link
          href="/account/login"
          onClick={onDone}
          className="inline-flex min-h-11 items-center text-title-sm text-fg hover:underline hover:underline-offset-4"
        >
          {t('signIn')}
        </Link>
        <Link
          href="/account/register"
          onClick={onDone}
          className={buttonClasses('primary', 'sm', 'font-medium')}
        >
          {t('register')}
        </Link>
      </div>
    );
  }
  return (
    <Link
      href="/account"
      onClick={onDone}
      className="inline-flex min-h-11 items-center gap-2 text-title-sm text-fg hover:underline hover:underline-offset-4"
    >
      <UserRound aria-hidden className="h-5 w-5" />
      <span className="max-w-[10rem] truncate">{user.firstName}</span>
    </Link>
  );
}

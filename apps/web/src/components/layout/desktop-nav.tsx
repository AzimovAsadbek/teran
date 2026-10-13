'use client';

import type { IllustrationKey } from '@teran/contracts';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { TeaTypeArt } from '@/components/brand/illustrations';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/cn';

export interface NavCategory {
  slug: string;
  name: string;
  illustrationKey: IllustrationKey | null;
}

export interface NavCollection {
  slug: string;
  name: string;
}

type MenuId = 'teas' | 'collections' | 'about';

const OPEN_DELAY_MS = 120;
const CLOSE_DELAY_MS = 220;

/**
 * Desktop navigation with mega menus (WAI-ARIA disclosure pattern): real <button> triggers with
 * aria-expanded, open on click/Enter/Space or after a short hover, Esc closes and returns focus.
 */
export function DesktopNav({
  categories,
  collections,
}: {
  categories: NavCategory[];
  collections: NavCollection[];
}) {
  const t = useTranslations('Nav');
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const panelId = useId();

  // Any navigation closes the menus.
  useEffect(() => {
    setOpenMenu(null);
  }, [pathname]);

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
      className={cn(
        'group relative inline-flex h-11 items-center gap-1 rounded-full px-3.5 text-[0.92rem] font-semibold text-forest-900 transition-colors hover:bg-forest-900/[0.05]',
        openMenu === id && 'bg-forest-900/[0.06]',
      )}
    >
      {label}
      <ChevronDown
        aria-hidden
        className={cn('h-4 w-4 transition-transform duration-200', openMenu === id && 'rotate-180')}
      />
    </button>
  );

  return (
    <div
      ref={rootRef}
      className="hidden lg:block"
      onPointerLeave={(event) => event.pointerType === 'mouse' && schedule(null, CLOSE_DELAY_MS)}
      onPointerEnter={() => clearTimeout(timer.current)}
    >
      <nav aria-label={t('main')}>
        <ul className="flex items-center gap-0.5">
          <li>{trigger('teas', t('teas'))}</li>
          <li>{trigger('collections', t('collections'))}</li>
          <li>
            <Link
              href="/wholesale"
              className="inline-flex h-11 items-center rounded-full px-3.5 text-[0.92rem] font-semibold text-forest-900 transition-colors hover:bg-forest-900/[0.05]"
            >
              {t('wholesale')}
            </Link>
          </li>
          <li>{trigger('about', t('about'))}</li>
        </ul>
      </nav>

      <MegaPanel id={`${panelId}-teas`} open={openMenu === 'teas'}>
        <div className="grid grid-cols-[1.5fr_1fr_1.1fr] gap-10">
          <div>
            <p className="text-eyebrow text-gold-700">{t('shopByType')}</p>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1">
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link
                    href={`/catalog/${category.slug}`}
                    className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-ivory-100"
                  >
                    <span className="h-10 w-10 shrink-0">
                      <TeaTypeArt kind={category.illustrationKey} />
                    </span>
                    <span className="font-medium text-ink-900 group-hover:text-forest-900">
                      {category.name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-eyebrow text-gold-700">{t('featured')}</p>
            <ul className="mt-4 space-y-1">
              {collections.map((collection) => (
                <li key={collection.slug}>
                  <Link
                    href={`/collections/${collection.slug}`}
                    className="block rounded-lg px-2 py-2 text-ink-900 transition-colors hover:bg-ivory-100 hover:text-forest-900"
                  >
                    {collection.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/catalog"
                  className="mt-2 inline-flex items-center gap-2 px-2 py-2 font-semibold text-forest-900 hover:underline"
                >
                  {t('allTeas')} <ArrowRight aria-hidden className="h-4 w-4" />
                </Link>
              </li>
            </ul>
          </div>
          <FeatureCard title={t('discoverTitle')} text={t('discoverText')} cta={t('allTeas')} />
        </div>
      </MegaPanel>

      <MegaPanel id={`${panelId}-collections`} open={openMenu === 'collections'}>
        <div className="grid grid-cols-[2fr_1.1fr] gap-10">
          <ul className="grid grid-cols-2 gap-3">
            {collections.map((collection) => (
              <li key={collection.slug}>
                <Link
                  href={`/collections/${collection.slug}`}
                  className="flex h-full items-center justify-between rounded-2xl border border-ivory-200 bg-white/60 px-5 py-4 font-display text-xl font-semibold text-forest-900 transition-colors hover:border-gold-500/60 hover:bg-white"
                >
                  {collection.name}
                  <ArrowRight aria-hidden className="h-4 w-4 text-gold-600" />
                </Link>
              </li>
            ))}
          </ul>
          <FeatureCard title={t('discoverTitle')} text={t('discoverText')} cta={t('allTeas')} />
        </div>
      </MegaPanel>

      <MegaPanel id={`${panelId}-about`} open={openMenu === 'about'}>
        <ul className="grid grid-cols-3 gap-3">
          {(
            [
              ['/about', t('about')],
              ['/journal', t('journal')],
              ['/contact', t('contact')],
              ['/faq', t('faq')],
              ['/delivery', t('delivery')],
              ['/wholesale', t('wholesale')],
            ] as const
          ).map(([href, label]) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center justify-between rounded-2xl border border-ivory-200 bg-white/60 px-5 py-4 font-semibold text-forest-900 transition-colors hover:border-gold-500/60 hover:bg-white"
              >
                {label}
                <ArrowRight aria-hidden className="h-4 w-4 text-gold-600" />
              </Link>
            </li>
          ))}
        </ul>
      </MegaPanel>
    </div>
  );
}

function MegaPanel({ id, open, children }: { id: string; open: boolean; children: ReactNode }) {
  return (
    <div
      id={id}
      hidden={!open}
      className="absolute inset-x-0 top-full border-y border-ivory-200 bg-ivory-50 shadow-[0_24px_48px_-32px_rgb(11_46_25_/_0.5)] motion-safe:animate-fade-in"
    >
      <div className="container-page py-8">{children}</div>
    </div>
  );
}

function FeatureCard({ title, text, cta }: { title: string; text: string; cta: string }) {
  return (
    <Link
      href="/catalog"
      className="on-dark group relative flex min-h-56 flex-col justify-end overflow-hidden rounded-[var(--radius-card)] bg-forest-900 p-6 text-ivory-50"
    >
      <span
        aria-hidden
        className="absolute -top-8 -right-8 h-40 w-40 opacity-90 transition-transform duration-500 group-hover:scale-105"
      >
        <TeaTypeArt kind="green" />
      </span>
      <span className="text-display-md relative text-[1.7rem]">{title}</span>
      <span className="relative mt-2 text-sm text-ivory-100/85">{text}</span>
      <span className="relative mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gold-300">
        {cta}{' '}
        <ArrowRight
          aria-hidden
          className="h-4 w-4 transition-transform group-hover:translate-x-1"
        />
      </span>
    </Link>
  );
}

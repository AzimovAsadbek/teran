'use client';

import { ChevronRight, Menu, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Suspense, use, useState, type MouseEvent } from 'react';
import { TeaTypeArt } from '@/components/brand/illustrations';
import { Sheet } from '@/components/ui/sheet';
import { Link } from '@/i18n/navigation';
import type { Navigation } from './desktop-nav';
import { LanguageSwitcherSlot } from './language-switcher';

/**
 * Mobile drawer: visual tea-type tiles first (the way shoppers browse), then everything else.
 * The button and drawer work before the navigation data arrives; only the lists stream in.
 */
export function MobileMenu({ navigation }: { navigation: Promise<Navigation> }) {
  const t = useTranslations('Nav');
  const tc = useTranslations('Common');
  const [open, setOpen] = useState(false);
  // Following any link closes the drawer (no need to watch the URL).
  const closeOnLink = (event: MouseEvent) => {
    if ((event.target as HTMLElement).closest('a')) setOpen(false);
  };

  const links = [
    ['/wholesale', t('wholesale')],
    ['/journal', t('journal')],
    ['/about', t('about')],
    ['/contact', t('contact')],
    ['/faq', t('faq')],
    ['/delivery', t('delivery')],
  ] as const;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t('openMenu')}
        aria-expanded={open}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-forest-900 transition-colors hover:bg-forest-900/[0.06] lg:hidden"
      >
        <Menu aria-hidden className="h-6 w-6" />
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        side="left"
        title={t('explore')}
        closeLabel={t('closeMenu')}
        footer={
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/account"
              className="inline-flex items-center gap-2 text-sm font-semibold text-forest-900"
            >
              <UserRound aria-hidden className="h-5 w-5" />
              {t('account')}
            </Link>
            <LanguageSwitcherSlot tone="light" />
          </div>
        }
      >
        <div className="space-y-7 px-5 py-5" onClick={closeOnLink}>
          <Suspense fallback={<CatalogueLinks categories={[]} collections={[]} />}>
            <StreamedCatalogueLinks navigation={navigation} />
          </Suspense>

          <nav aria-label={tc('home')}>
            <ul className="divide-y divide-ivory-200">
              {links.map(([href, label]) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex items-center justify-between py-3 font-medium text-ink-900"
                  >
                    {label}
                    <ChevronRight aria-hidden className="h-4 w-4 text-ink-500" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </Sheet>
    </>
  );
}

function StreamedCatalogueLinks({ navigation }: { navigation: Promise<Navigation> }) {
  return <CatalogueLinks {...use(navigation)} />;
}

/** Tea-type tiles, "all teas" and collections (empty lists while the data is on its way). */
function CatalogueLinks({ categories, collections }: Navigation) {
  const t = useTranslations('Nav');
  return (
    <>
      <section>
        <h3 className="text-eyebrow text-gold-700">{t('shopByType')}</h3>
        <ul className="mt-3 grid grid-cols-2 gap-3">
          {categories.map((category) => (
            <li key={category.slug}>
              <Link
                href={`/catalog/${category.slug}`}
                className="flex h-full flex-col items-center gap-2 rounded-2xl border border-ivory-200 bg-white px-3 py-4 text-center text-sm font-semibold text-forest-900 transition-colors hover:border-gold-500/60"
              >
                <span className="h-14 w-14">
                  <TeaTypeArt kind={category.illustrationKey} />
                </span>
                {category.name}
              </Link>
            </li>
          ))}
          <li className="col-span-2">
            <Link
              href="/catalog"
              className="flex items-center justify-between rounded-2xl bg-forest-900 px-5 py-4 font-semibold text-ivory-50"
            >
              {t('allTeas')} <ChevronRight aria-hidden className="h-5 w-5 text-gold-300" />
            </Link>
          </li>
        </ul>
      </section>

      {collections.length > 0 ? (
        <section>
          <h3 className="text-eyebrow text-gold-700">{t('collections')}</h3>
          <ul className="mt-2 divide-y divide-ivory-200">
            {collections.map((collection) => (
              <li key={collection.slug}>
                <Link
                  href={`/collections/${collection.slug}`}
                  className="flex items-center justify-between py-3 font-medium text-ink-900"
                >
                  {collection.name}
                  <ChevronRight aria-hidden className="h-4 w-4 text-ink-500" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

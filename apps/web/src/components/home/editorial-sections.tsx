import type { Locale } from '@teran/contracts';
import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { RIBBON_STICKERS, StickerDefs } from '@/components/brand/stickers';
import { BRAND, PACKAGING } from '@/content/brand';
import { ArticleCard } from '@/components/content/article-card';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import { getCategories } from '@/lib/data/catalog';
import { getArticles } from '@/lib/data/content';
import { categoryTree } from '@/lib/navigation';
import { Marquee } from './marquee';

/*
 * The home page's editorial sections, in the reference's order and at its measurements
 * (docs/design/reference-map.md). Every one uses TERAN's own content: the catalogue and the
 * journal from the API, the official brand copy (content/brand.ts) and the packaging artwork.
 * Nothing is invented — no offer, statistic, certification or rating — and a section with
 * nothing real to show is left out.
 */

/* ── 3. Category marquee ─────────────────────────────────────────────────────────────────── */

/**
 * The reference's ribbon: the catalogue's categories with products and the pack's slogan, colour
 * stickers of TERAN's tea things between, in the reference's sticker style. Every word is a link,
 * as the reference's: a category to its page, the slogan to TERAN's story.
 */
export async function CategoryMarquee() {
  await connection();
  const locale = (await getLocale()) as Locale;
  const t = await getTranslations('Home');
  const tree = categoryTree(await getCategories(locale).catch(() => []));
  const items = [
    ...tree.flatMap((top) =>
      [top, ...top.children].map((category) => ({
        label: category.name,
        href: `/${category.path}`,
      })),
    ),
    ...PACKAGING.slogan.map((label) => ({ label, href: '/about' })),
  ];
  if (items.length === 0) return null;
  return (
    <>
      <StickerDefs />
      <Marquee
        label={t('marqueeLabel')}
        items={items}
        tone="lavender"
        marks={RIBBON_STICKERS.map((Sticker, index) => (
          <Sticker key={index} />
        ))}
      />
    </>
  );
}

/* ── 16. Pair ────────────────────────────────────────────────────────────────────────────── */

/**
 * The journal's two newest articles with their own photographs (featured first), on the journal's
 * own cards (components/content/article-card.tsx); with only one such article (or none, then the
 * newest, its tea's dry leaf in place of a cover), that article alone, laid on its side. Each card
 * shows its article's own cover, so the page it opens starts with the same picture. (The business
 * card that stood here is now the home page's own business section,
 * components/home/business-section.tsx.)
 */
export async function PairSection() {
  await connection();
  const locale = (await getLocale()) as Locale;
  const [t, tn, articles] = await Promise.all([
    getTranslations('Home'),
    getTranslations('Nav'),
    getArticles(locale, 1, 6, true).catch(() => null),
  ]);
  const items = articles?.items ?? [];
  // Two articles with their own photographs side by side; with fewer, one article on its own,
  // picture beside the words (an article without a cover is never set next to one that has one).
  const covered = items.filter((item) => item.cover);
  const chosen = covered.length > 0 ? covered.slice(0, 2) : items.slice(0, 1);
  if (chosen.length === 0) return null;
  const single = chosen.length === 1;

  return (
    <section aria-labelledby="pair-title" className="container-page pt-8 pb-8 sm:pt-12 sm:pb-16">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
        <h2
          id="pair-title"
          className="font-heading text-[2.25rem] leading-[1.1] text-fg min-[46.875rem]:text-[2.75rem]"
        >
          {t('journalTitle')}
        </h2>
        <Link
          href="/journal"
          className="inline-flex min-h-11 items-center text-[1rem] font-semibold text-forest-900 underline decoration-forest-900/30 underline-offset-[6px] hover:decoration-forest-900"
        >
          {tn('allArticles')}
        </Link>
      </div>
      <ul className={cn('mt-6 grid gap-x-8 gap-y-12', !single && 'md:grid-cols-2')}>
        {chosen.map((article) => (
          <li key={article.slug}>
            <ArticleCard article={article} layout={single ? 'wide' : 'card'} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ── 17. Slogan band ─────────────────────────────────────────────────────────────────────── */

/**
 * The reference's ribbon above the footer (226 px): a small capital line, a 64 px ribbon of the
 * same words repeated, a second capital line and an underlined link. Here the pack's slogan.
 */
export async function SloganBand() {
  const t = await getTranslations('Home');
  // The reference's band above the footer: a line, the moving figures, a line and a link that is
  // underlined while the pointer is anywhere on the band.
  return (
    <section
      aria-label={PACKAGING.slogan.join(' · ')}
      className="group bg-gold-400 pt-7 pb-6 text-center text-fg min-[46.875rem]:pt-8 min-[46.875rem]:pb-4"
    >
      <p className="px-6 text-[0.9375rem] leading-[1.375rem] font-medium tracking-[0.02em] uppercase min-[46.875rem]:text-[1.125rem] min-[46.875rem]:leading-[1.6875rem]">
        {BRAND.name}® · {BRAND.descriptor}
      </p>
      <div className="mt-6 min-[46.875rem]:mt-9">
        <Marquee
          label={PACKAGING.slogan.join(' · ')}
          items={PACKAGING.slogan.map((label) => ({ label }))}
          tone="surf"
          size="lg"
          marks={[]}
        />
      </div>
      <p
        lang="uz"
        className="mt-7 px-6 text-[0.9375rem] leading-[1.375rem] font-medium tracking-[0.02em] uppercase min-[46.875rem]:mt-10 min-[46.875rem]:text-[1.125rem] min-[46.875rem]:leading-[1.6875rem]"
      >
        {PACKAGING.tagline}
      </p>
      <Link
        href="/about"
        className="inline-flex text-[1rem] leading-6 font-semibold tracking-[0.06em] uppercase underline decoration-transparent decoration-1 underline-offset-[3px] transition-[text-decoration-color] duration-200 group-focus-within:decoration-current group-hover:decoration-current"
      >
        {t('storyCta')}
      </Link>
    </section>
  );
}

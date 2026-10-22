import type { Locale } from '@teran/contracts';
import { getLocale } from 'next-intl/server';
import { ProductFilm } from '@/components/catalog/product-film';
import { ProductImage } from '@/components/catalog/product-image';
import { PACK_COLOURS, PREMIUM_COLLECTION_SLUG, teaCodeOf } from '@/content/brand';
import { getProductList } from '@/lib/data/catalog';

/**
 * One of TERAN's own teas beside the sign-in and registration cards (AuthCard's `aside`): its
 * first picture with its film, as on its card, and on a white plate its name in its pack's colour
 * and, from 1024 px, what it is. `pick` chooses among the premium collection's photographed teas
 * in the collection's order, so the pages do not all show the same one. Nothing without one.
 */
export async function AuthTeaPanel({ pick }: { pick: number }) {
  const locale = (await getLocale()) as Locale;
  const list = await getProductList(
    locale,
    `collection=${PREMIUM_COLLECTION_SLUG}&pageSize=12&sort=featured`,
  ).catch(() => null);
  const teas = (list?.items ?? []).filter((item) => item.image && !item.image.transparent);
  const tea = teas.length > 0 ? teas[pick % teas.length] : undefined;
  if (!tea?.image) return null;
  const code = teaCodeOf(tea.slug);
  return (
    <>
      <ProductImage
        image={tea.image}
        name={tea.name}
        sizes="(min-width: 90rem) 42rem, (min-width: 1024px) 46vw, 100vw"
        priority
      />
      {tea.image.film?.cardSrc ? <ProductFilm film={tea.image.film} size="card" /> : null}
      <div className="absolute bottom-0 left-0 max-w-[min(26rem,calc(100%-1.5rem))] rounded-tr-[1.25rem] bg-surface px-4 pt-3 pb-3 lg:px-6 lg:pt-5 lg:pb-5">
        <p
          className="font-headline text-[1.25rem] leading-none text-fg uppercase lg:text-[1.75rem]"
          style={code ? { color: PACK_COLOURS[code] } : undefined}
        >
          {tea.name}
        </p>
        {tea.shortDescription ? (
          <p className="mt-2.5 hidden text-[0.9375rem] leading-snug text-fg-muted lg:line-clamp-2">
            {tea.shortDescription}
          </p>
        ) : null}
      </div>
    </>
  );
}

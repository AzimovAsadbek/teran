import { getLocale, getTranslations } from 'next-intl/server';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { ProductRail } from '@/components/home/product-rail';
import { RailFallback } from '@/components/home/rail-sections';
import { StateMessage } from '@/components/ui/state-message';
import { getProductList } from '@/lib/data/catalog';

/** "Discover something new" under the missing page: TERAN's featured teas. */
async function Suggestions() {
  await connection();
  const locale = await getLocale();
  const [t, th, tn] = await Promise.all([
    getTranslations('Errors'),
    getTranslations('Home'),
    getTranslations('Nav'),
  ]);
  const list = await getProductList(locale, 'featured=true&pageSize=8&sort=featured').catch(
    () => null,
  );
  if (!list || list.items.length === 0) return null;
  return (
    <ProductRail
      tabs={[
        {
          id: 'discover',
          label: t('discoverNew'),
          products: list.items,
          href: '/catalog',
          cta: tn('shopAll'),
        },
      ]}
      labels={{
        tabList: th('showcaseTabs'),
        previous: th('showcasePrevious'),
        next: th('showcaseNext'),
      }}
      heading="condensed"
      frame="content"
    />
  );
}

/**
 * The missing page on the one state pattern (components/ui/state-message.tsx): what happened, the
 * way home and the way to the teas, then a row of TERAN's teas to discover.
 */
export default async function NotFound() {
  const [t, tn] = await Promise.all([getTranslations('Errors'), getTranslations('Nav')]);
  return (
    <>
      <StateMessage
        eyebrow="404"
        title={t('notFoundTitle')}
        text={t('notFoundText')}
        primary={{ href: '/', label: t('backHome') }}
        secondary={{ href: '/catalog', label: tn('allTeas') }}
      />
      <Suspense fallback={<RailFallback />}>
        <Suggestions />
      </Suspense>
      <div className="pb-section-sm" />
    </>
  );
}

import { getTranslations } from 'next-intl/server';
import { NotFoundSuggestions } from '@/components/home/not-found-suggestions';
import { RailFallback } from '@/components/home/rail-sections';
import { StateMessage } from '@/components/ui/state-message';

/**
 * The missing page on the one state pattern (components/ui/state-message.tsx): what happened, the
 * way home and the way to the teas, then a row of TERAN's teas to discover, fetched by the browser
 * once this page shows (not with every page, whose payload carries this element).
 */
export default async function NotFound() {
  const [t, th, tn] = await Promise.all([
    getTranslations('Errors'),
    getTranslations('Home'),
    getTranslations('Nav'),
  ]);
  return (
    <>
      <StateMessage
        eyebrow="404"
        title={t('notFoundTitle')}
        text={t('notFoundText')}
        primary={{ href: '/', label: t('backHome') }}
        secondary={{ href: '/catalog', label: tn('allTeas') }}
      />
      <NotFoundSuggestions
        fallback={<RailFallback />}
        label={t('discoverNew')}
        cta={tn('shopAll')}
        labels={{
          tabList: th('showcaseTabs'),
          previous: th('showcasePrevious'),
          next: th('showcaseNext'),
        }}
      />
      <div className="pb-section-sm" />
    </>
  );
}

import { getTranslations } from 'next-intl/server';
import { ButtonLink } from '@/components/ui/button';

/** "Still have questions?" band at the end of help and policy pages. */
export async function HelpFooter() {
  const t = await getTranslations('Pages');
  const tn = await getTranslations('Nav');
  return (
    <section aria-labelledby="help-footer" className="border-t border-ivory-200 bg-white">
      <div className="container-page flex flex-col items-start justify-between gap-6 py-12 sm:flex-row sm:items-center">
        <div>
          <h2 id="help-footer" className="font-display text-3xl font-semibold text-forest-900">
            {t('stillQuestions')}
          </h2>
          <p className="mt-1 text-ink-700">{t('stillQuestionsText')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/contact">{tn('contact')}</ButtonLink>
          <ButtonLink href="/faq" variant="secondary">
            {tn('faq')}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

import { ChevronRight, MessageCircle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

/**
 * The end of help and policy pages, as the reference's help centre card ("Hey! Chat with us"): a
 * bordered card with an icon, the title and a chevron over a rule, the line and the FAQ link below.
 */
export async function HelpFooter() {
  const t = await getTranslations('Pages');
  const tn = await getTranslations('Nav');
  return (
    <section aria-labelledby="help-footer" className="container-page pb-14">
      <div className="mx-auto max-w-[72rem] overflow-hidden rounded-[0.75rem] border border-line bg-surface">
        <Link
          href="/contact"
          className="group flex min-h-[3.25rem] items-center gap-3 border-b border-line px-4 transition-colors duration-200 hover:bg-ivory-50"
        >
          <MessageCircle aria-hidden className="h-5 w-5 text-jade-700" />
          <h2 id="help-footer" className="flex-1 text-[1rem] font-semibold text-fg">
            {t('stillQuestions')}
          </h2>
          <ChevronRight
            aria-hidden
            className="h-5 w-5 text-fg transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
        <div className="space-y-2 px-4 py-5 text-[0.875rem] text-fg-muted">
          <p>{t('stillQuestionsText')}</p>
          <p>
            <Link href="/faq" className="text-fg underline underline-offset-4 hover:text-brand">
              {tn('faq')}
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

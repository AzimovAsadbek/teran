import { useTranslations } from 'next-intl';

/** First focusable element on every page: jumps past the header to the main content. */
export function SkipLink() {
  const t = useTranslations('Common');
  return (
    <a
      href="#main"
      className="sr-only z-50 rounded-control bg-brand px-5 py-3 font-semibold text-fg-inverse shadow-overlay focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      {t('skipToContent')}
    </a>
  );
}

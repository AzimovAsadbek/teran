import type { Locale } from '@teran/contracts';
import { ChevronRight } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { jsonLd, localizedUrl } from '@/lib/seo';

export interface Crumb {
  label: string;
  /** Path without locale prefix; omit for the current page. */
  href?: string;
}

/** Visible breadcrumb trail plus matching BreadcrumbList structured data. */
export async function Breadcrumbs({ items, locale }: { items: Crumb[]; locale: Locale }) {
  const t = await getTranslations('Common');
  const trail: Crumb[] = [{ label: t('home'), href: '/' }, ...items];

  const structured = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.label,
      ...(crumb.href ? { item: localizedUrl(crumb.href, locale) } : {}),
    })),
  };

  return (
    <nav aria-label={t('breadcrumbs')} className="text-body-sm">
      <ol className="flex flex-wrap items-center gap-1.5 text-fg-subtle">
        {trail.map((crumb, index) => (
          <li key={`${crumb.label}-${index}`} className="flex items-center gap-1.5">
            {index > 0 ? (
              <ChevronRight aria-hidden className="h-3.5 w-3.5 text-fg-subtle/70" />
            ) : null}
            {crumb.href && index < trail.length - 1 ? (
              <Link
                href={crumb.href}
                className="underline-offset-4 transition-colors hover:text-fg hover:underline"
              >
                {crumb.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-fg">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(structured)} />
    </nav>
  );
}

import type { Locale } from '@teran/contracts';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { jsonLd, localizedUrl } from '@/lib/seo';

export interface Crumb {
  label: string;
  /** Path without locale prefix; omit for the current page. */
  href?: string;
}

/**
 * Visible breadcrumb trail plus matching BreadcrumbList structured data, as the reference sets it:
 * 14 px, the links semibold, slashes between, the current page in a muted tone.
 */
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
    <nav aria-label={t('breadcrumbs')} className="text-[0.875rem] leading-[1.5]">
      <ol className="flex flex-wrap items-center gap-x-4 gap-y-1 text-fg">
        {trail.map((crumb, index) => (
          <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-x-4">
            {index > 0 ? <span aria-hidden>/</span> : null}
            {crumb.href && index < trail.length - 1 ? (
              <Link href={crumb.href} className="font-semibold underline-offset-4 hover:underline">
                {crumb.label}
              </Link>
            ) : (
              <span aria-current="page" className="text-fg-muted">
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

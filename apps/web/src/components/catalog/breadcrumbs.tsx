import type { Locale } from '@teran/contracts';
import { getTranslations } from 'next-intl/server';
import { JsonLd } from '@/components/seo/json-ld';
import { Link } from '@/i18n/navigation';
import { breadcrumbSchema, type Crumb } from '@/lib/seo';

/**
 * Visible breadcrumb trail plus matching BreadcrumbList structured data, as the reference sets it:
 * 14 px, the links semibold, slashes between, the current page in a muted tone.
 */
export async function Breadcrumbs({ items, locale }: { items: Crumb[]; locale: Locale }) {
  const t = await getTranslations('Common');
  const trail: Crumb[] = [{ label: t('home'), href: '/' }, ...items];

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
              <span
                aria-current={index === trail.length - 1 ? 'page' : undefined}
                className="text-fg-muted"
              >
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
      <JsonLd data={breadcrumbSchema(trail, locale)} />
    </nav>
  );
}

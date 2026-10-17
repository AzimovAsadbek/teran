import type { AdminArticle, ArticleDetailDto, Locale } from '@teran/contracts';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import * as rootParams from 'next/root-params';
import { AdminPageHeader, ArticleStatusPill } from '@/components/admin/ui';
import { ArticleCard } from '@/components/content/article-card';
import { ArticleContent } from '@/components/content/article-content';
import { Notice } from '@/components/ui/notice';
import { Link } from '@/i18n/navigation';
import { adminGet } from '@/lib/admin/server';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A publication date still ahead: the article is scheduled. */
function isFuture(iso: string | null): boolean {
  return iso !== null && new Date(iso).getTime() > Date.now();
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = (await rootParams.locale()) as Locale;
  const t = await getTranslations({ locale, namespace: 'Admin' });
  return { title: t('preview.articleTitle') };
}

/**
 * The article as readers would see it, drafts and scheduled articles included, built from the
 * same data and components as the journal page; plus its card as the journal list and the home
 * page show it.
 */
export default async function ArticlePreviewPage({
  params,
}: PageProps<'/[locale]/admin/journal/[id]/preview'>) {
  const [{ id }, locale] = await Promise.all([params, getLocale() as Promise<Locale>]);
  if (!UUID.test(id)) notFound();
  const [t, article, admin] = await Promise.all([
    getTranslations('Admin'),
    adminGet<ArticleDetailDto>(`/articles/${id}/preview?locale=${locale}`).catch(() => null),
    adminGet<AdminArticle>(`/articles/${id}`).catch(() => null),
  ]);
  if (!article || !admin) notFound();
  const missing = admin.readiness.items.filter((item) => item.required && !item.ok);
  const scheduled = admin.status === 'PUBLISHED' && isFuture(admin.publishedAt);

  return (
    <>
      <Link
        href={`/admin/journal/${id}`}
        className="mb-4 inline-flex items-center gap-2 text-body-sm font-semibold text-forest-900 hover:underline"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        {t('preview.backToEditor')}
      </Link>
      <AdminPageHeader
        title={t('preview.articleTitle')}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <ArticleStatusPill status={admin.status} />
            {scheduled
              ? t('preview.scheduled')
              : admin.status === 'PUBLISHED'
                ? t('preview.live')
                : t('preview.notLive')}
          </span>
        }
      />
      {missing.length > 0 ? (
        <Notice tone="warning" className="mb-6" title={t('preview.incomplete')}>
          {missing.map((item) => t(`readiness.codes.${item.code}`)).join(', ')}
        </Notice>
      ) : null}

      {/* Gutter padding as on the storefront, so the article's full-bleed hero fits the frame. */}
      <div className="overflow-hidden rounded-panel border border-line bg-canvas px-gutter pb-10">
        <article>
          <ArticleContent article={article} locale={locale} />
        </article>
      </div>

      <h2 className="mt-10 text-title-lg text-fg">{t('preview.asCard')}</h2>
      <p className="mt-1 text-body-sm text-fg-muted">{t('preview.asArticleCardHint')}</p>
      <div inert className="mt-4 w-80 max-w-full">
        <ArticleCard
          article={{
            slug: article.slug,
            title: article.title,
            excerpt: article.excerpt,
            illustrationKey: article.illustrationKey,
            cover: article.cover,
            isFeatured: article.isFeatured,
            publishedAt: article.publishedAt,
          }}
        />
      </div>
    </>
  );
}

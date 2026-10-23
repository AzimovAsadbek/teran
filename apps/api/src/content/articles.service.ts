import { Injectable } from '@nestjs/common';
import {
  buildPaginated,
  type ArticleDetailDto,
  type ArticleSummaryDto,
  type ImageDto,
  type Locale,
  type Paginated,
} from '@teran/contracts';
import type { Prisma } from '../generated/prisma/client.js';
import { ApiException } from '../common/errors/api-exception.js';
import { localeChain, pickTranslation, translatedLocales } from '../common/i18n.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { asIllustrationKey, PUBLIC_UPLOADS_PATH } from '../catalog/catalog.mapper.js';
import { toMediaItem, VISIBLE_MEDIA_WHERE } from './media.service.js';

function publishedWhere(): Prisma.ArticleWhereInput {
  return { status: 'PUBLISHED', publishedAt: { lte: new Date() } };
}

type ArticleWithCover = {
  coverKey: string | null;
  coverWidths: number[];
  coverWidth: number | null;
  coverHeight: number | null;
};

/** The article's cover picture, if it has one. */
function coverDto(article: ArticleWithCover, alt: string): ImageDto | null {
  if (!article.coverKey || !article.coverWidth || !article.coverHeight) return null;
  return {
    src: `${PUBLIC_UPLOADS_PATH}/${article.coverKey}`,
    widths: article.coverWidths,
    width: article.coverWidth,
    height: article.coverHeight,
    alt,
    transparent: false,
  };
}

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Published articles, newest first; the home page asks for featured ones first. */
  async list(
    locale: Locale,
    page: number,
    pageSize: number,
    featuredFirst = false,
  ): Promise<Paginated<ArticleSummaryDto>> {
    const where = publishedWhere();
    const [total, articles] = await Promise.all([
      this.prisma.article.count({ where }),
      this.prisma.article.findMany({
        where,
        orderBy: featuredFirst
          ? [{ isFeatured: 'desc' }, { publishedAt: 'desc' }]
          : { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { translations: { where: { locale: { in: localeChain(locale) } } } },
      }),
    ]);
    const items = articles.map((article) => {
      const translation = pickTranslation(article.translations, locale);
      return {
        slug: article.slug,
        title: translation?.title ?? article.slug,
        excerpt: translation?.excerpt ?? null,
        illustrationKey: asIllustrationKey(article.illustrationKey),
        cover: coverDto(article, translation?.coverAlt ?? translation?.title ?? article.slug),
        isFeatured: article.isFeatured,
        publishedAt: (article.publishedAt ?? article.createdAt).toISOString(),
      };
    });
    return buildPaginated(items, total, page, pageSize);
  }

  async get(slug: string, locale: Locale): Promise<ArticleDetailDto> {
    return this.detail({ slug, ...publishedWhere() }, locale);
  }

  /** Any article as its page would show it, drafts and scheduled ones included (admin preview). */
  async preview(id: string, locale: Locale): Promise<ArticleDetailDto> {
    return this.detail({ id }, locale);
  }

  private async detail(where: Prisma.ArticleWhereInput, locale: Locale): Promise<ArticleDetailDto> {
    const locales = { locale: { in: localeChain(locale) } };
    const article = await this.prisma.article.findFirst({
      where,
      include: {
        // Every language's row (at most three): the page states which versions exist (hreflang).
        translations: true,
        // Gallery items go with the article only while they are published themselves.
        media: {
          where: { mediaItem: VISIBLE_MEDIA_WHERE },
          orderBy: { position: 'asc' },
          include: { mediaItem: { include: { translations: { where: locales } } } },
        },
      },
    });
    const translation = article ? pickTranslation(article.translations, locale) : undefined;
    if (!article || !translation) throw ApiException.notFound('Article not found');
    return {
      slug: article.slug,
      title: translation.title,
      excerpt: translation.excerpt,
      body: translation.body,
      illustrationKey: asIllustrationKey(article.illustrationKey),
      cover: coverDto(article, translation.coverAlt ?? translation.title),
      isFeatured: article.isFeatured,
      publishedAt: (article.publishedAt ?? article.createdAt).toISOString(),
      seoTitle: translation.seoTitle,
      seoDescription: translation.seoDescription,
      updatedAt: article.updatedAt.toISOString(),
      locales: translatedLocales(article.translations),
      media: article.media.flatMap(({ mediaItem }) => {
        const item = toMediaItem(mediaItem, locale);
        return item ? [item] : [];
      }),
    };
  }

  /** Current slug of a renamed, published article (for permanent redirects). */
  async resolveRedirect(slug: string): Promise<{ slug: string }> {
    const redirect = await this.prisma.slugRedirect.findUnique({
      where: { entity_fromSlug: { entity: 'ARTICLE', fromSlug: slug } },
      select: { toId: true },
    });
    const target = redirect
      ? await this.prisma.article.findFirst({
          where: { id: redirect.toId, ...publishedWhere() },
          select: { slug: true },
        })
      : null;
    if (!target || target.slug === slug) throw ApiException.notFound('No redirect');
    return { slug: target.slug };
  }
}

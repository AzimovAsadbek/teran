import { Injectable } from '@nestjs/common';
import {
  buildPaginated,
  type ArticleDetailDto,
  type ArticleSummaryDto,
  type Locale,
  type Paginated,
} from '@teran/contracts';
import type { Prisma } from '../generated/prisma/client.js';
import { ApiException } from '../common/errors/api-exception.js';
import { localeChain, pickTranslation } from '../common/i18n.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { asIllustrationKey } from '../catalog/catalog.mapper.js';

function publishedWhere(): Prisma.ArticleWhereInput {
  return { status: 'PUBLISHED', publishedAt: { lte: new Date() } };
}

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(
    locale: Locale,
    page: number,
    pageSize: number,
  ): Promise<Paginated<ArticleSummaryDto>> {
    const where = publishedWhere();
    const [total, articles] = await Promise.all([
      this.prisma.article.count({ where }),
      this.prisma.article.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
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
        publishedAt: (article.publishedAt ?? article.createdAt).toISOString(),
      };
    });
    return buildPaginated(items, total, page, pageSize);
  }

  async get(slug: string, locale: Locale): Promise<ArticleDetailDto> {
    const article = await this.prisma.article.findFirst({
      where: { slug, ...publishedWhere() },
      include: { translations: { where: { locale: { in: localeChain(locale) } } } },
    });
    const translation = article ? pickTranslation(article.translations, locale) : undefined;
    if (!article || !translation) throw ApiException.notFound('Article not found');
    return {
      slug: article.slug,
      title: translation.title,
      excerpt: translation.excerpt,
      body: translation.body,
      illustrationKey: asIllustrationKey(article.illustrationKey),
      publishedAt: (article.publishedAt ?? article.createdAt).toISOString(),
      seoTitle: translation.seoTitle,
      seoDescription: translation.seoDescription,
      updatedAt: article.updatedAt.toISOString(),
    };
  }
}

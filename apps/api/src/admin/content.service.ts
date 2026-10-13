import { Injectable } from '@nestjs/common';
import {
  buildPaginated,
  type adminSimpleListQuerySchema,
  type AdminArticle,
  type AdminDeliveryMethod,
  type AnnouncementSetting,
  type articleUpsertSchema,
  type ContactSetting,
  type deliveryMethodUpsertSchema,
  type Paginated,
  type SettingKey,
} from '@teran/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import { asIllustrationKey } from '../catalog/catalog.mapper.js';
import { ApiException } from '../common/errors/api-exception.js';
import { toMoney, toMoneyOrNull } from '../common/money.js';
import { SettingsService, type SettingValues } from '../content/settings.service.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RevalidationService } from '../revalidation/revalidation.service.js';
import {
  nullable,
  pageArgs,
  toAdminTranslation,
  translationRows,
  type Actor,
} from './admin-support.js';

type DeliveryPayload = z.output<typeof deliveryMethodUpsertSchema>;
type ArticlePayload = z.output<typeof articleUpsertSchema>;
type SimpleQuery = z.output<typeof adminSimpleListQuerySchema>;

const deliveryInclude = { translations: true } satisfies Prisma.DeliveryMethodInclude;
type DeliveryRow = Prisma.DeliveryMethodGetPayload<{ include: typeof deliveryInclude }>;
const articleInclude = { translations: true } satisfies Prisma.ArticleInclude;
type ArticleRow = Prisma.ArticleGetPayload<{ include: typeof articleInclude }>;

@Injectable()
export class AdminContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly revalidation: RevalidationService,
    private readonly settings: SettingsService,
  ) {}

  // ─── Site settings ─────────────────────────────────────────────────────────

  getSettings(): Promise<SettingValues> {
    return this.settings.getAll();
  }

  async updateSetting(
    key: SettingKey,
    value: AnnouncementSetting | ContactSetting,
    actor: Actor,
  ): Promise<SettingValues> {
    await this.settings.update(key, value, actor.userId);
    await this.audit.record({
      actorUserId: actor.userId,
      action: `settings.${key}.update`,
      entityType: 'SiteSetting',
      entityId: key,
      ipAddress: actor.ipAddress,
    });
    this.revalidation.notify('settings');
    return this.settings.getAll();
  }

  // ─── Delivery methods ──────────────────────────────────────────────────────

  async deliveryMethods(): Promise<AdminDeliveryMethod[]> {
    const rows = await this.prisma.deliveryMethod.findMany({
      include: deliveryInclude,
      orderBy: [{ position: 'asc' }, { code: 'asc' }],
    });
    return rows.map((row) => this.toDeliveryMethod(row));
  }

  async saveDeliveryMethod(
    id: string | null,
    input: DeliveryPayload,
    actor: Actor,
  ): Promise<AdminDeliveryMethod> {
    const savedId = await this.prisma.$transaction(async (tx) => {
      const fields = {
        code: input.code,
        isActive: input.isActive,
        position: input.position,
        price: new Prisma.Decimal(input.price),
        freeFromAmount:
          input.freeFromAmount === null ? null : new Prisma.Decimal(input.freeFromAmount),
        regionCodes: [...new Set(input.regionCodes)],
        requiresAddress: input.requiresAddress,
      };
      const rows = translationRows(input.translations).map((row) => ({
        locale: row.locale,
        name: row.name,
        description: nullable(row.description),
        estimate: nullable(row.estimate),
      }));
      let methodId: string;
      if (id) {
        const exists = await tx.deliveryMethod.count({ where: { id } });
        if (!exists) throw ApiException.notFound('Delivery method not found');
        await tx.deliveryMethod.update({ where: { id }, data: fields });
        await tx.deliveryMethodTranslation.deleteMany({
          where: { deliveryMethodId: id, locale: { notIn: rows.map((row) => row.locale) } },
        });
        for (const row of rows) {
          await tx.deliveryMethodTranslation.upsert({
            where: { deliveryMethodId_locale: { deliveryMethodId: id, locale: row.locale } },
            create: { ...row, deliveryMethodId: id },
            update: row,
          });
        }
        methodId = id;
      } else {
        const created = await tx.deliveryMethod.create({
          data: { ...fields, translations: { create: rows } },
          select: { id: true },
        });
        methodId = created.id;
      }
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: id ? 'delivery.update' : 'delivery.create',
          entityType: 'DeliveryMethod',
          entityId: methodId,
          metadata: { code: input.code, price: input.price, isActive: input.isActive },
          ipAddress: actor.ipAddress,
        },
        tx,
      );
      return methodId;
    });
    this.revalidation.notify('settings');
    const row = await this.prisma.deliveryMethod.findUniqueOrThrow({
      where: { id: savedId },
      include: deliveryInclude,
    });
    return this.toDeliveryMethod(row);
  }

  // ─── Journal articles ──────────────────────────────────────────────────────

  async articles(query: SimpleQuery): Promise<Paginated<AdminArticle>> {
    const where: Prisma.ArticleWhereInput = query.q
      ? {
          OR: [
            { slug: { contains: query.q.toLowerCase() } },
            { translations: { some: { title: { contains: query.q, mode: 'insensitive' } } } },
          ],
        }
      : {};
    const [total, rows] = await Promise.all([
      this.prisma.article.count({ where }),
      this.prisma.article.findMany({
        where,
        include: articleInclude,
        orderBy: { updatedAt: 'desc' },
        ...pageArgs(query.page, query.pageSize),
      }),
    ]);
    return buildPaginated(
      rows.map((row) => this.toArticle(row)),
      total,
      query.page,
      query.pageSize,
    );
  }

  async article(id: string): Promise<AdminArticle> {
    const row = await this.prisma.article.findUnique({ where: { id }, include: articleInclude });
    if (!row) throw ApiException.notFound('Article not found');
    return this.toArticle(row);
  }

  async saveArticle(id: string | null, input: ArticlePayload, actor: Actor): Promise<AdminArticle> {
    const savedId = await this.prisma.$transaction(async (tx) => {
      const rows = translationRows(input.translations).map((row) => ({
        locale: row.locale,
        title: row.title,
        excerpt: nullable(row.excerpt),
        body: row.body,
        seoTitle: nullable(row.seoTitle),
        seoDescription: nullable(row.seoDescription),
      }));
      let articleId: string;
      if (id) {
        const existing = await tx.article.findUnique({
          where: { id },
          select: { publishedAt: true },
        });
        if (!existing) throw ApiException.notFound('Article not found');
        await tx.article.update({
          where: { id },
          data: {
            slug: input.slug,
            status: input.status,
            illustrationKey: input.illustrationKey,
            // The first publication date is kept when an article is unpublished and republished.
            publishedAt:
              input.status === 'PUBLISHED' && !existing.publishedAt
                ? new Date()
                : existing.publishedAt,
          },
        });
        await tx.articleTranslation.deleteMany({
          where: { articleId: id, locale: { notIn: rows.map((row) => row.locale) } },
        });
        for (const row of rows) {
          await tx.articleTranslation.upsert({
            where: { articleId_locale: { articleId: id, locale: row.locale } },
            create: { ...row, articleId: id },
            update: row,
          });
        }
        articleId = id;
      } else {
        const created = await tx.article.create({
          data: {
            slug: input.slug,
            status: input.status,
            illustrationKey: input.illustrationKey,
            publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
            translations: { create: rows },
          },
          select: { id: true },
        });
        articleId = created.id;
      }
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: id ? 'article.update' : 'article.create',
          entityType: 'Article',
          entityId: articleId,
          metadata: { slug: input.slug, status: input.status },
          ipAddress: actor.ipAddress,
        },
        tx,
      );
      return articleId;
    });
    this.revalidation.notify('content');
    return this.article(savedId);
  }

  private toDeliveryMethod(row: DeliveryRow): AdminDeliveryMethod {
    return {
      id: row.id,
      code: row.code,
      isActive: row.isActive,
      position: row.position,
      price: toMoney(row.price),
      freeFromAmount: toMoneyOrNull(row.freeFromAmount),
      regionCodes: row.regionCodes,
      requiresAddress: row.requiresAddress,
      translations: toAdminTranslation(row.translations, (translation) => ({
        name: translation.name,
        description: translation.description ?? undefined,
        estimate: translation.estimate ?? undefined,
      })),
    };
  }

  private toArticle(row: ArticleRow): AdminArticle {
    return {
      id: row.id,
      slug: row.slug,
      status: row.status,
      illustrationKey: asIllustrationKey(row.illustrationKey),
      publishedAt: row.publishedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
      translations: toAdminTranslation(row.translations, (translation) => ({
        title: translation.title,
        excerpt: translation.excerpt ?? undefined,
        body: translation.body,
        seoTitle: translation.seoTitle ?? undefined,
        seoDescription: translation.seoDescription ?? undefined,
      })),
    };
  }
}

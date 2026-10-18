import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  type StoresSetting,
  type VisualsSetting,
} from '@teran/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import { asIllustrationKey, PUBLIC_UPLOADS_PATH } from '../catalog/catalog.mapper.js';
import { ApiException } from '../common/errors/api-exception.js';
import { toMoney, toMoneyOrNull } from '../common/money.js';
import { mediaImage } from '../content/media.service.js';
import { SettingsService, type SettingValues } from '../content/settings.service.js';
import { Prisma } from '../generated/prisma/client.js';
import type { Env } from '../config/env.js';
import {
  articleImagePrefix,
  deleteStoredImage,
  imageStore,
  type ImageStore,
  storeImage,
  type StoredImage,
  visualImagePrefix,
  WIDE_IMAGE_WIDTHS,
} from '../media/image-processing.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RevalidationService } from '../revalidation/revalidation.service.js';
import { TelegramService } from '../telegram/telegram.service.js';
import { articleReadiness, assertPublishable } from './readiness.js';
import { uploadError } from './uploads.js';
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
const articleInclude = {
  translations: true,
  media: {
    orderBy: { position: 'asc' },
    include: { mediaItem: { include: { translations: { where: { locale: 'uz' } } } } },
  },
} satisfies Prisma.ArticleInclude;
type ArticleRow = Prisma.ArticleGetPayload<{ include: typeof articleInclude }>;

@Injectable()
export class AdminContentService {
  private readonly images: ImageStore;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly revalidation: RevalidationService,
    private readonly settings: SettingsService,
    private readonly telegram: TelegramService,
    config: ConfigService<Env, true>,
  ) {
    this.images = imageStore({
      uploadsDir: config.get('UPLOADS_DIR', { infer: true }),
      blobToken: config.get('BLOB_READ_WRITE_TOKEN', { infer: true }),
    });
  }

  // ─── Site settings ─────────────────────────────────────────────────────────

  getSettings(): Promise<SettingValues> {
    return this.settings.getAll();
  }

  async updateSetting(
    key: SettingKey,
    value: AnnouncementSetting | ContactSetting | StoresSetting,
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

  // ─── Page pictures ─────────────────────────────────────────────────────────

  /**
   * Sets the picture of a place on the storefront, replacing the previous one, whose files are
   * removed once the setting is saved. A taller crop for phones sent with it replaces the current
   * one; without it, the current crop stays. The slot has been validated by the controller.
   */
  async setVisual(
    slot: string,
    files: { image: Buffer; mobile: Buffer | null },
    source: string | null,
    actor: Actor,
  ): Promise<SettingValues> {
    const stored: StoredImage[] = [];
    try {
      stored.push(await storeImage(files.image, this.images, visualImagePrefix(), WIDE_PICTURE));
      if (files.mobile) {
        stored.push(await storeImage(files.mobile, this.images, visualImagePrefix(), WIDE_PICTURE));
      }
    } catch (error) {
      for (const item of stored) await deleteStoredImage(this.images, item.storageKey);
      uploadError(error);
    }
    const [image, mobile] = stored.map(storedPicture);
    const { visuals } = await this.settings.getAll();
    const previous = visuals[slot];
    const keptMobile = mobile ? null : (previous?.mobile ?? null);
    try {
      await this.settings.update(
        'visuals',
        // A new picture also replaces a film playing in the place (films come from the import
        // script, docs/reference-assets.md): what is uploaded here is what the place shows.
        {
          ...visuals,
          [slot]: {
            image: image!,
            mobile: mobile ?? keptMobile,
            video: null,
            mobileVideo: null,
            source,
          },
        },
        actor.userId,
      );
      await this.audit.record({
        actorUserId: actor.userId,
        action: 'settings.visual.set',
        entityType: 'SiteSetting',
        entityId: slot,
        metadata: { source, mobile: Boolean(mobile) },
        ipAddress: actor.ipAddress,
      });
    } catch (error) {
      for (const item of stored) await deleteStoredImage(this.images, item.storageKey);
      throw error;
    }
    if (previous) {
      await deleteStoredImage(this.images, previous.image.key);
      if (previous.mobile && !keptMobile) await deleteStoredImage(this.images, previous.mobile.key);
      if (previous.video) await deleteStoredImage(this.images, previous.video.key);
      if (previous.mobileVideo) await deleteStoredImage(this.images, previous.mobileVideo.key);
    }
    this.revalidation.notify('settings');
    return this.settings.getAll();
  }

  /**
   * Sets (file) or removes (null) the taller crop for phones of a place that has a picture. The
   * previous crop's files are removed once the setting is saved.
   */
  async setVisualMobile(slot: string, file: Buffer | null, actor: Actor): Promise<SettingValues> {
    const { visuals } = await this.settings.getAll();
    const current = visuals[slot];
    if (!current) {
      throw ApiException.badRequest('BAD_REQUEST', 'Set the main picture first', {
        reason: 'visual_missing',
      });
    }
    let stored: StoredImage | null = null;
    if (file) {
      try {
        stored = await storeImage(file, this.images, visualImagePrefix(), WIDE_PICTURE);
      } catch (error) {
        uploadError(error);
      }
    }
    try {
      await this.settings.update(
        'visuals',
        { ...visuals, [slot]: { ...current, mobile: stored ? storedPicture(stored) : null } },
        actor.userId,
      );
      await this.audit.record({
        actorUserId: actor.userId,
        action: stored ? 'settings.visual.mobile' : 'settings.visual.mobile.remove',
        entityType: 'SiteSetting',
        entityId: slot,
        ipAddress: actor.ipAddress,
      });
    } catch (error) {
      if (stored) await deleteStoredImage(this.images, stored.storageKey);
      throw error;
    }
    if (current.mobile) await deleteStoredImage(this.images, current.mobile.key);
    this.revalidation.notify('settings');
    return this.settings.getAll();
  }

  /** Removes a place's picture: the storefront shows TERAN's artwork there again. */
  async removeVisual(slot: string, actor: Actor): Promise<SettingValues> {
    const { visuals } = await this.settings.getAll();
    const previous = visuals[slot];
    if (!previous) return this.settings.getAll();
    const rest: VisualsSetting = { ...visuals };
    delete rest[slot];
    await this.settings.update('visuals', rest, actor.userId);
    await this.audit.record({
      actorUserId: actor.userId,
      action: 'settings.visual.remove',
      entityType: 'SiteSetting',
      entityId: slot,
      ipAddress: actor.ipAddress,
    });
    await this.deleteVisualFiles(previous);
    this.revalidation.notify('settings');
    return this.settings.getAll();
  }

  private async deleteVisualFiles(visual: VisualsSetting[string]): Promise<void> {
    await deleteStoredImage(this.images, visual.image.key);
    if (visual.mobile) await deleteStoredImage(this.images, visual.mobile.key);
    if (visual.video) await deleteStoredImage(this.images, visual.video.key);
    if (visual.mobileVideo) await deleteStoredImage(this.images, visual.mobileVideo.key);
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
    const posts = await this.prisma.telegramPost.findMany({
      where: { entityType: 'ARTICLE', entityId: { in: rows.map((row) => row.id) } },
    });
    return buildPaginated(
      rows.map((row) => {
        const post = posts.find((entry) => entry.entityId === row.id);
        return this.toArticle(
          row,
          post
            ? {
                id: post.id,
                status: post.status,
                dryRun: post.dryRun,
                attempts: post.attempts,
                lastError: post.lastError,
                sentAt: post.sentAt?.toISOString() ?? null,
                createdAt: post.createdAt.toISOString(),
                updatedAt: post.updatedAt.toISOString(),
                canRetry: post.status === 'FAILED',
              }
            : null,
        );
      }),
      total,
      query.page,
      query.pageSize,
    );
  }

  async article(id: string): Promise<AdminArticle> {
    const row = await this.prisma.article.findUnique({ where: { id }, include: articleInclude });
    if (!row) throw ApiException.notFound('Article not found');
    return this.toArticle(row, await this.telegram.statusFor('ARTICLE', id));
  }

  /** Sets the cover picture; the previous one's files go once the change is committed. */
  async setArticleCover(id: string, file: Buffer, actor: Actor): Promise<AdminArticle> {
    const existing = await this.prisma.article.findUnique({
      where: { id },
      select: { coverKey: true },
    });
    if (!existing) throw ApiException.notFound('Article not found');
    let stored;
    try {
      stored = await storeImage(file, this.images, articleImagePrefix(id), WIDE_PICTURE);
    } catch (error) {
      uploadError(error);
    }
    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.article.update({
          where: { id },
          data: {
            coverKey: stored.storageKey,
            coverWidths: stored.widths,
            coverWidth: stored.width,
            coverHeight: stored.height,
          },
        });
        await this.audit.record(
          {
            actorUserId: actor.userId,
            action: 'article.cover',
            entityType: 'Article',
            entityId: id,
            ipAddress: actor.ipAddress,
          },
          tx,
        );
      });
    } catch (error) {
      await deleteStoredImage(this.images, stored.storageKey);
      throw error;
    }
    if (existing.coverKey) await deleteStoredImage(this.images, existing.coverKey);
    this.revalidation.notify('content');
    return this.article(id);
  }

  /** Removes the cover picture. A published article keeps its cover (it is required). */
  async removeArticleCover(id: string, actor: Actor): Promise<AdminArticle> {
    const existing = await this.prisma.article.findUnique({
      where: { id },
      select: { coverKey: true, status: true },
    });
    if (!existing) throw ApiException.notFound('Article not found');
    if (existing.status === 'PUBLISHED') {
      throw ApiException.conflict(
        'PUBLICATION_BLOCKED',
        'A published article must keep its cover picture',
        { reason: 'cover_of_published_article', missing: ['cover'] },
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.article.update({
        where: { id },
        data: { coverKey: null, coverWidths: [], coverWidth: null, coverHeight: null },
      });
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: 'article.cover.remove',
          entityType: 'Article',
          entityId: id,
          ipAddress: actor.ipAddress,
        },
        tx,
      );
    });
    if (existing.coverKey) await deleteStoredImage(this.images, existing.coverKey);
    this.revalidation.notify('content');
    return this.article(id);
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
        coverAlt: nullable(row.coverAlt),
      }));
      const existing = id
        ? await tx.article.findUnique({
            where: { id },
            select: { slug: true, publishedAt: true, coverKey: true },
          })
        : null;
      if (id && !existing) throw ApiException.notFound('Article not found');
      if (input.status === 'PUBLISHED') {
        assertPublishable(
          articleReadiness({
            slug: input.slug,
            hasCover: Boolean(existing?.coverKey),
            translations: rows,
          }),
          'article',
        );
      }
      // A date chosen in the editor wins (a future one schedules the article); otherwise the
      // first publication date is kept when an article is unpublished and republished.
      const chosenDate =
        input.publishedAt === undefined || input.publishedAt === null
          ? undefined
          : new Date(input.publishedAt);
      const publishedAt =
        chosenDate ??
        (input.status === 'PUBLISHED' && !existing?.publishedAt
          ? new Date()
          : (existing?.publishedAt ?? null));
      if (input.mediaIds && input.mediaIds.length > 0) {
        const found = await tx.mediaItem.count({ where: { id: { in: input.mediaIds } } });
        if (found !== input.mediaIds.length) {
          throw ApiException.badRequest('BAD_REQUEST', 'Unknown gallery item', {
            reason: 'unknown_media',
          });
        }
      }
      await tx.slugRedirect.deleteMany({ where: { entity: 'ARTICLE', fromSlug: input.slug } });
      let articleId: string;
      if (id && existing) {
        if (existing.slug !== input.slug) {
          // Links to the old address keep working: they are redirected to the new one.
          await tx.slugRedirect.upsert({
            where: { entity_fromSlug: { entity: 'ARTICLE', fromSlug: existing.slug } },
            create: { entity: 'ARTICLE', fromSlug: existing.slug, toId: id },
            update: { toId: id },
          });
        }
        await tx.article.update({
          where: { id },
          data: {
            slug: input.slug,
            status: input.status,
            illustrationKey: input.illustrationKey,
            isFeatured: input.isFeatured,
            announceOnTelegram: input.announceOnTelegram,
            publishedAt,
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
            isFeatured: input.isFeatured,
            announceOnTelegram: input.announceOnTelegram,
            publishedAt,
            translations: { create: rows },
          },
          select: { id: true },
        });
        articleId = created.id;
      }
      if (input.mediaIds !== undefined) {
        // The chosen gallery items, in the editor's order (reused, not copied).
        await tx.articleMedia.deleteMany({ where: { articleId } });
        await tx.articleMedia.createMany({
          data: input.mediaIds.map((mediaItemId, position) => ({
            articleId,
            mediaItemId,
            position,
          })),
        });
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
    if (input.status === 'PUBLISHED' && input.announceOnTelegram) {
      await this.telegram.requestAnnouncement('ARTICLE', savedId, actor.userId);
    }
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

  private toArticle(row: ArticleRow, telegram: AdminArticle['telegram']): AdminArticle {
    const uz = row.translations.find((translation) => translation.locale === 'uz');
    return {
      id: row.id,
      slug: row.slug,
      status: row.status,
      illustrationKey: asIllustrationKey(row.illustrationKey),
      cover:
        row.coverKey && row.coverWidth && row.coverHeight
          ? {
              src: `${PUBLIC_UPLOADS_PATH}/${row.coverKey}`,
              widths: row.coverWidths,
              width: row.coverWidth,
              height: row.coverHeight,
              alt: uz?.coverAlt ?? uz?.title ?? row.slug,
              transparent: false,
            }
          : null,
      media: row.media.map(({ mediaItem }) => {
        const title = mediaItem.translations[0]?.title ?? '';
        return {
          id: mediaItem.id,
          kind: mediaItem.kind,
          status: mediaItem.status,
          title,
          image: mediaImage(mediaItem, title),
        };
      }),
      isFeatured: row.isFeatured,
      announceOnTelegram: row.announceOnTelegram,
      telegram,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
      translations: toAdminTranslation(row.translations, (translation) => ({
        title: translation.title,
        excerpt: translation.excerpt ?? undefined,
        body: translation.body,
        seoTitle: translation.seoTitle ?? undefined,
        seoDescription: translation.seoDescription ?? undefined,
        coverAlt: translation.coverAlt ?? undefined,
      })),
      readiness: articleReadiness({
        slug: row.slug,
        hasCover: row.coverKey !== null,
        translations: row.translations,
      }),
    };
  }
}

/**
 * Page pictures span the page, and journal cards show a slice of their cover: renditions up to
 * 5120 px, as far as the picture's own width (and at that width).
 */
const WIDE_PICTURE = { widths: WIDE_IMAGE_WIDTHS, fullWidth: true } as const;

/** A stored image as the `visuals` setting keeps it. */
function storedPicture(stored: StoredImage): VisualsSetting[string]['image'] {
  return {
    key: stored.storageKey,
    widths: stored.widths,
    width: stored.width,
    height: stored.height,
  };
}

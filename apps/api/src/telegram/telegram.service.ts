import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  AdminTelegramPost,
  AdminTelegramPostList,
  AdminTelegramStatus,
  Locale,
  TelegramBlocker,
  TelegramEntity,
  TelegramMode,
  TelegramPreview,
} from '@teran/contracts';
import { ApiException } from '../common/errors/api-exception.js';
import type { Env } from '../config/env.js';
import type { TelegramPost } from '../generated/prisma/client.js';
import { type ImageStore } from '../media/image-processing.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TelegramApiError, TelegramClient } from './telegram.client.js';
import {
  composeArticlePost,
  composeProductPost,
  telegramPhoto,
  type ComposedPost,
} from './telegram.composer.js';
import { configuredImageStore } from '../media/configured-store.js';

/** How long a sender holds a post; after that an unfinished send counts as "outcome unknown". */
const CLAIM_MS = 90_000;
/** Automatic attempts for requests that never reached Telegram (connection refused, DNS). */
const MAX_AUTOMATIC_ATTEMPTS = 3;

/**
 * Failure codes stored in TelegramPost.lastError (`code` or `code: detail`); the admin area
 * explains each one. Details come from Telegram's own short description, never containing secrets.
 */
export const TELEGRAM_FAILURES = {
  unknownOutcome: 'unknown_outcome',
  notPublished: 'not_published',
  notEnabled: 'not_enabled',
  deleted: 'item_deleted',
  image: 'image_unavailable',
  internal: 'internal_error',
  telegram: 'telegram_error',
} as const;

/**
 * Announcements on the Telegram channel, through an outbox: publishing an item with "announce"
 * switched on creates one TelegramPost row after the item's transaction has committed (never for
 * drafts, never twice for one item), and the post is then delivered — at once, and by the
 * scheduled processor for anything still pending. The website never waits on Telegram: a failed
 * post stays visible in the admin area with its reason and can be retried there.
 */
@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  readonly mode: TelegramMode;
  readonly channel: string | null;
  private readonly locale: Locale;
  private readonly origin: string;
  private readonly client: TelegramClient | null;
  private readonly images: ImageStore;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService<Env, true>,
  ) {
    this.mode = config.get('TELEGRAM_MODE', { infer: true });
    this.channel = config.get('TELEGRAM_CHANNEL_ID', { infer: true }) ?? null;
    this.locale = config.get('TELEGRAM_POST_LOCALE', { infer: true });
    this.origin = config.get('WEB_ORIGIN', { infer: true });
    const token = config.get('TELEGRAM_BOT_TOKEN', { infer: true });
    this.client =
      this.mode === 'live' && token && this.channel
        ? new TelegramClient({
            apiBase: config.get('TELEGRAM_API_BASE', { infer: true }),
            token,
            chatId: this.channel,
          })
        : null;
    this.images = configuredImageStore(config);
  }

  /**
   * Called after an item's publishing transaction has committed. Creates the item's post when the
   * item is public and its announcement is switched on, then tries to deliver it right away.
   * Never throws: the item is published whatever happens on Telegram's side.
   */
  async requestAnnouncement(
    entityType: TelegramEntity,
    entityId: string,
    requestedById: string | null,
  ): Promise<void> {
    if (this.mode === 'disabled') return;
    try {
      const composed = await this.compose(entityType, entityId);
      if (!composed?.published || !composed.announce) return;
      const post = await this.prisma.telegramPost.upsert({
        where: { entityType_entityId: { entityType, entityId } },
        // One post per item, ever: an existing post (sent, failed or pending) is left as it is.
        update: {},
        create: { entityType, entityId, requestedById },
      });
      if (post.status === 'PENDING') await this.deliverIfClaimed(post.id);
    } catch (error) {
      this.logger.warn({ err: error, entityType, entityId }, 'Telegram announcement not queued');
    }
  }

  /** Delivers pending posts that are due (the scheduled processor and the cron endpoint call it). */
  async processDue(limit = 5, now = new Date()): Promise<{ sent: number; failed: number }> {
    if (this.mode === 'disabled') return { sent: 0, failed: 0 };
    // A claim that ran out without an answer recorded: the post may or may not be on the channel.
    await this.prisma.telegramPost.updateMany({
      where: { status: 'SENDING', lockedUntil: { lt: now } },
      data: { status: 'FAILED', lockedUntil: null, lastError: TELEGRAM_FAILURES.unknownOutcome },
    });
    const due = await this.prisma.telegramPost.findMany({
      where: {
        status: 'PENDING',
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { id: true },
    });
    let sent = 0;
    let failed = 0;
    for (const { id } of due) {
      const status = await this.deliverIfClaimed(id);
      if (status === 'SENT') sent += 1;
      if (status === 'FAILED') failed += 1;
    }
    return { sent, failed };
  }

  /** Sends a failed post again. A post that was delivered is never sent a second time. */
  async retry(postId: string): Promise<AdminTelegramPost> {
    if (this.mode === 'disabled') {
      throw ApiException.conflict('FEATURE_DISABLED', 'Telegram publishing is switched off');
    }
    const { count } = await this.prisma.telegramPost.updateMany({
      where: { id: postId, status: 'FAILED' },
      data: { status: 'PENDING', nextAttemptAt: null },
    });
    if (count === 0) {
      const exists = await this.prisma.telegramPost.count({ where: { id: postId } });
      if (!exists) throw ApiException.notFound('Telegram post not found');
      throw ApiException.conflict('CONFLICT', 'Only a failed post can be sent again');
    }
    await this.deliverIfClaimed(postId);
    return this.get(postId);
  }

  async get(postId: string): Promise<AdminTelegramPost> {
    const post = await this.prisma.telegramPost.findUnique({ where: { id: postId } });
    if (!post) throw ApiException.notFound('Telegram post not found');
    const [item] = await this.withTitles([post]);
    return item!;
  }

  async list(page: number, pageSize: number): Promise<AdminTelegramPostList> {
    const [total, rows] = await Promise.all([
      this.prisma.telegramPost.count(),
      this.prisma.telegramPost.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return {
      mode: this.mode,
      channel: this.channel,
      items: await this.withTitles(rows),
      page,
      pageSize,
      total,
    };
  }

  /** The item's post, for its editor (null: never announced). */
  async statusFor(
    entityType: TelegramEntity,
    entityId: string,
  ): Promise<AdminTelegramStatus | null> {
    const post = await this.prisma.telegramPost.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
    });
    return post ? toStatus(post) : null;
  }

  /** What would be posted for the item now, and whether it can be. Sends nothing. */
  async preview(entityType: TelegramEntity, entityId: string): Promise<TelegramPreview> {
    const composed = await this.compose(entityType, entityId);
    if (!composed) throw ApiException.notFound('Item not found');
    const existing = await this.prisma.telegramPost.findUnique({
      where: { entityType_entityId: { entityType, entityId } },
      select: { status: true },
    });
    const blockers: TelegramBlocker[] = [];
    if (this.mode === 'disabled') blockers.push('disabled');
    if (!composed.published) blockers.push('not_published');
    if (!composed.announce) blockers.push('not_enabled');
    if (existing?.status === 'SENT') blockers.push('already_sent');
    const image = composed.image
      ? {
          src: composed.image.src,
          widths: composed.image.widths,
          width: composed.image.width,
          height: composed.image.height,
          alt: composed.image.alt,
          transparent: composed.image.transparent,
        }
      : null;
    return {
      mode: this.mode,
      text: composed.text,
      image,
      parts: composed.caption && composed.message ? 2 : 1,
      eligible: blockers.length === 0,
      blockers,
    };
  }

  private compose(entityType: TelegramEntity, entityId: string): Promise<ComposedPost | null> {
    return entityType === 'PRODUCT'
      ? composeProductPost(this.prisma, entityId, this.locale, this.origin)
      : composeArticlePost(this.prisma, entityId, this.locale, this.origin);
  }

  /**
   * Claims a pending post (one sender at a time, across processes) and delivers it. Returns the
   * resulting status, or null when another sender holds it or it is not pending.
   */
  private async deliverIfClaimed(postId: string): Promise<TelegramPost['status'] | null> {
    const now = new Date();
    const { count } = await this.prisma.telegramPost.updateMany({
      where: {
        id: postId,
        status: 'PENDING',
        OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }],
      },
      data: {
        status: 'SENDING',
        lockedUntil: new Date(now.getTime() + CLAIM_MS),
        attempts: { increment: 1 },
      },
    });
    if (count === 0) return null;
    const post = await this.prisma.telegramPost.findUniqueOrThrow({ where: { id: postId } });
    try {
      return await this.deliver(post);
    } catch (error) {
      // Unexpected (database, image processing): record it rather than leave the claim hanging.
      this.logger.warn({ err: error, postId }, 'Telegram delivery failed unexpectedly');
      await this.finish(postId, { status: 'FAILED', lastError: TELEGRAM_FAILURES.internal });
      return 'FAILED';
    }
  }

  private async deliver(post: TelegramPost): Promise<TelegramPost['status']> {
    const composed = await this.compose(post.entityType, post.entityId);
    if (!composed) return this.fail(post.id, TELEGRAM_FAILURES.deleted);
    if (!composed.published) return this.fail(post.id, TELEGRAM_FAILURES.notPublished);
    if (!composed.announce) return this.fail(post.id, TELEGRAM_FAILURES.notEnabled);
    const base = { text: composed.text, imageKey: composed.image?.storageKey ?? null };

    if (this.mode === 'dry-run') {
      await this.finish(post.id, { status: 'SENT', dryRun: true, sentAt: new Date(), ...base });
      this.logger.log(
        { postId: post.id, entityType: post.entityType },
        'Telegram post recorded (dry run)',
      );
      return 'SENT';
    }
    if (!this.client)
      return this.fail(post.id, `${TELEGRAM_FAILURES.telegram}: not configured`, base);

    const messageIds = [...post.messageIds];
    try {
      if (composed.caption && composed.image) {
        // A retry after a partial delivery does not post the photo again.
        if (messageIds.length === 0) {
          const photo = await telegramPhoto(this.images, composed.image);
          if (!photo) return this.fail(post.id, TELEGRAM_FAILURES.image, base);
          messageIds.push(await this.client.sendPhoto(photo, composed.caption));
          await this.prisma.telegramPost.update({ where: { id: post.id }, data: { messageIds } });
        }
        if (composed.message && messageIds.length < 2) {
          messageIds.push(
            await this.client.sendMessage(composed.message, {
              replyTo: messageIds[0],
              preview: false,
            }),
          );
        }
      } else {
        const text = composed.message ?? composed.caption ?? composed.text;
        messageIds.push(await this.client.sendMessage(text, { preview: true }));
      }
    } catch (error) {
      if (!(error instanceof TelegramApiError)) throw error;
      // Retried automatically only when nothing can have been posted: Telegram asked to wait, or
      // the request never reached it. A refusal or an unknown outcome waits for a person.
      const retryable =
        error.failure === 'rate_limited' ||
        (error.failure === 'unreachable' && post.attempts < MAX_AUTOMATIC_ATTEMPTS);
      if (retryable) {
        const waitSeconds = error.retryAfterSeconds ?? 60 * post.attempts ** 2;
        await this.finish(post.id, {
          status: 'PENDING',
          messageIds,
          nextAttemptAt: new Date(Date.now() + waitSeconds * 1000),
          lastError: `${TELEGRAM_FAILURES.telegram}: ${error.message}`,
          ...base,
        });
        return 'PENDING';
      }
      return this.fail(post.id, `${TELEGRAM_FAILURES.telegram}: ${error.message}`, {
        ...base,
        messageIds,
      });
    }
    await this.finish(post.id, {
      status: 'SENT',
      dryRun: false,
      sentAt: new Date(),
      messageIds,
      lastError: null,
      ...base,
    });
    this.logger.log({ postId: post.id, entityType: post.entityType }, 'Telegram post delivered');
    return 'SENT';
  }

  private async fail(
    postId: string,
    reason: string,
    extra: Partial<Pick<TelegramPost, 'text' | 'imageKey' | 'messageIds'>> = {},
  ): Promise<'FAILED'> {
    await this.finish(postId, { status: 'FAILED', lastError: reason, ...extra });
    this.logger.warn({ postId, reason: reason.split(':')[0] }, 'Telegram post failed');
    return 'FAILED';
  }

  private async finish(
    postId: string,
    data: Partial<
      Pick<
        TelegramPost,
        | 'status'
        | 'dryRun'
        | 'sentAt'
        | 'messageIds'
        | 'lastError'
        | 'text'
        | 'imageKey'
        | 'nextAttemptAt'
      >
    >,
  ): Promise<void> {
    await this.prisma.telegramPost.update({
      where: { id: postId },
      data: { ...data, lockedUntil: null },
    });
  }

  private async withTitles(posts: TelegramPost[]): Promise<AdminTelegramPost[]> {
    const ids = (type: TelegramEntity) =>
      posts.filter((post) => post.entityType === type).map((post) => post.entityId);
    const [products, articles] = await Promise.all([
      this.prisma.productTranslation.findMany({
        where: { productId: { in: ids('PRODUCT') }, locale: 'uz' },
        select: { productId: true, name: true },
      }),
      this.prisma.articleTranslation.findMany({
        where: { articleId: { in: ids('ARTICLE') }, locale: 'uz' },
        select: { articleId: true, title: true },
      }),
    ]);
    const titles = new Map<string, string>([
      ...products.map((row) => [row.productId, row.name] as const),
      ...articles.map((row) => [row.articleId, row.title] as const),
    ]);
    return posts.map((post) => ({
      ...toStatus(post),
      entityType: post.entityType,
      entityId: post.entityId,
      entityTitle: titles.get(post.entityId) ?? null,
      messageIds: post.messageIds,
      text: post.text,
    }));
  }
}

function toStatus(post: TelegramPost): AdminTelegramStatus {
  return {
    id: post.id,
    status: post.status,
    dryRun: post.dryRun,
    attempts: post.attempts,
    lastError: post.lastError,
    sentAt: post.sentAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    canRetry: post.status === 'FAILED',
  };
}

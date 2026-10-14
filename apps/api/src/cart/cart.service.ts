import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MAX_LINE_QUANTITY,
  type CartDto,
  type CartLineDto,
  type Locale,
  type ProductFormat,
  type ReorderResultDto,
} from '@teran/contracts';
import type { Request, Response } from 'express';
import { Prisma } from '../generated/prisma/client.js';
import type { Env } from '../config/env.js';
import { clearCookieOptions, cookieName, cookieOptions } from '../common/cookies.js';
import { generateToken, sha256 } from '../common/crypto.js';
import { ApiException } from '../common/errors/api-exception.js';
import { localeChain, pickTranslation } from '../common/i18n.js';
import { ZERO, toMoney, toMoneyOrNull } from '../common/money.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { asIllustrationKey, toImageDto, variantStockLevel } from '../catalog/catalog.mapper.js';
import { visibleProductWhere } from '../catalog/product-visibility.js';
import { DeliveryService } from '../delivery/delivery.service.js';
import { evaluateCartLine, isProductPublic } from './cart-line.js';
import { MAX_CART_LINES } from './cart-merge.js';

const DAY_MS = 86_400_000;

function cartItemsInclude(locale: Locale) {
  return {
    variant: {
      include: {
        product: {
          include: {
            translations: { where: { locale: { in: localeChain(locale) } } },
            images: { orderBy: { position: 'asc' }, take: 1 },
          },
        },
      },
    },
  } satisfies Prisma.CartItemInclude;
}

type CartItemRow = Prisma.CartItemGetPayload<{ include: ReturnType<typeof cartItemsInclude> }>;

/** An orderable line with server-side prices, as used by checkout. */
export interface OrderableLine {
  variantId: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  productName: string;
  productSlug: string;
  format: ProductFormat;
  sku: string;
  weightGrams: number | null;
  unitCount: number | null;
}

@Injectable()
export class CartService {
  private readonly secure: boolean;
  private readonly ttlMs: number;
  readonly cookie: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly delivery: DeliveryService,
    config: ConfigService<Env, true>,
  ) {
    this.secure = config.get('COOKIE_SECURE', { infer: true });
    this.ttlMs = config.get('CART_TTL_DAYS', { infer: true }) * DAY_MS;
    this.cookie = cookieName('teran_cart', this.secure);
  }

  /**
   * The cart behind the request's cart cookie, whoever it belongs to (used when signing in, to
   * decide what to do with it). Expired carts and malformed tokens count as no cart.
   */
  async findDeviceCart(request: Request): Promise<{ id: string; userId: string | null } | null> {
    const token: unknown = request.cookies?.[this.cookie];
    if (typeof token !== 'string' || token.length < 20 || token.length > 200) return null;
    return this.prisma.cart.findFirst({
      where: { tokenHash: sha256(token), expiresAt: { gt: new Date() } },
      select: { id: true, userId: true },
    });
  }

  /**
   * The request's cart, if the visitor may use it. A guest cart belongs to whoever holds its
   * cookie; a cart attached to an account is only visible to that account. So when a customer's
   * session ends on a shared device, the next visitor does not see (or take over) their cart.
   */
  async findCart(request: Request): Promise<{ id: string } | null> {
    const cart = await this.findDeviceCart(request);
    if (!cart) return null;
    if (cart.userId !== null && cart.userId !== (request.auth?.userId ?? null)) return null;
    return { id: cart.id };
  }

  private async findOrCreateCart(request: Request, response: Response): Promise<{ id: string }> {
    const existing = await this.findCart(request);
    if (existing) return existing;
    const token = generateToken();
    const cart = await this.prisma.cart.create({
      data: {
        tokenHash: sha256(token),
        userId: request.auth?.userId ?? null,
        expiresAt: new Date(Date.now() + this.ttlMs),
      },
      select: { id: true },
    });
    response.cookie(this.cookie, token, cookieOptions(this.secure, this.ttlMs));
    return cart;
  }

  /** Gives the cart a new token and cookie (used when a signed-in customer returns on a new device). */
  async adoptCart(cartId: string, response: Response): Promise<void> {
    const token = generateToken();
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { tokenHash: sha256(token), expiresAt: new Date(Date.now() + this.ttlMs) },
    });
    response.cookie(this.cookie, token, cookieOptions(this.secure, this.ttlMs));
  }

  clearCookie(response: Response): void {
    response.clearCookie(this.cookie, clearCookieOptions(this.secure));
  }

  async getCart(request: Request, locale: Locale): Promise<CartDto> {
    const cart = await this.findCart(request);
    return this.buildCart(cart?.id ?? null, locale);
  }

  async addItem(
    request: Request,
    response: Response,
    input: { variantId: string; quantity: number },
    locale: Locale,
  ): Promise<CartDto> {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: input.variantId, isActive: true, product: visibleProductWhere() },
      select: { id: true, stockQuantity: true },
    });
    if (!variant) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        'CART_ITEM_UNAVAILABLE',
        'This product is not available',
      );
    }
    const available = Math.min(variant.stockQuantity, MAX_LINE_QUANTITY);
    if (available <= 0) {
      throw ApiException.conflict('INSUFFICIENT_STOCK', 'This product is out of stock', {
        variantId: variant.id,
        available: 0,
      });
    }

    const cart = await this.findOrCreateCart(request, response);
    const existing = await this.prisma.cartItem.findUnique({
      where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
    });
    if (existing && existing.quantity >= available) {
      throw ApiException.conflict('INSUFFICIENT_STOCK', 'No more of this product is available', {
        variantId: variant.id,
        available,
      });
    }
    if (
      !existing &&
      (await this.prisma.cartItem.count({ where: { cartId: cart.id } })) >= MAX_CART_LINES
    ) {
      throw ApiException.conflict(
        'CONFLICT',
        'The cart already contains the maximum number of products',
      );
    }

    const quantity = Math.min((existing?.quantity ?? 0) + input.quantity, available);
    await this.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
      create: { cartId: cart.id, variantId: variant.id, quantity },
      update: { quantity },
    });
    await this.touch(cart.id);
    return this.buildCart(cart.id, locale);
  }

  async updateItem(
    request: Request,
    itemId: string,
    quantity: number,
    locale: Locale,
  ): Promise<CartDto> {
    const cart = await this.requireCart(request);
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { variant: { select: { stockQuantity: true } } },
    });
    if (!item) throw ApiException.notFound('Cart item not found');

    const available = Math.min(item.variant.stockQuantity, MAX_LINE_QUANTITY);
    if (quantity > available) {
      throw ApiException.conflict('INSUFFICIENT_STOCK', 'Not enough stock for this quantity', {
        variantId: item.variantId,
        available,
      });
    }
    await this.prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
    await this.touch(cart.id);
    return this.buildCart(cart.id, locale);
  }

  async removeItem(request: Request, itemId: string, locale: Locale): Promise<CartDto> {
    const cart = await this.requireCart(request);
    // Scoped by cartId: a customer can only ever remove lines from their own cart.
    await this.prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
    await this.touch(cart.id);
    return this.buildCart(cart.id, locale);
  }

  /**
   * Puts the items of an earlier order back into the cart, validated against today's catalogue:
   * prices are today's (the cart is always priced when read), quantities are capped by stock and
   * the cart's limits, and lines that cannot be bought any more are reported instead of added.
   * Nothing is ordered.
   */
  async addOrderItems(
    request: Request,
    response: Response,
    items: readonly { variantId: string | null; sku: string; quantity: number }[],
    locale: Locale,
  ): Promise<ReorderResultDto> {
    const variantIds = items.flatMap((item) => (item.variantId ? [item.variantId] : []));
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: {
        id: true,
        isActive: true,
        stockQuantity: true,
        product: { select: { status: true, publishedAt: true } },
      },
    });
    const byId = new Map(variants.map((variant) => [variant.id, variant]));
    const now = new Date();
    const added: string[] = [];
    const skipped: ReorderResultDto['skipped'] = [];

    const cart = await this.findOrCreateCart(request, response);
    const lines = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id },
      select: { variantId: true, quantity: true },
    });
    const inCart = new Map(lines.map((line) => [line.variantId, line.quantity]));

    for (const item of items) {
      const variant = item.variantId ? byId.get(item.variantId) : undefined;
      if (!variant || !variant.isActive || !isProductPublic(variant.product, now)) {
        skipped.push({ sku: item.sku, reason: 'unavailable' });
        continue;
      }
      const available = Math.min(variant.stockQuantity, MAX_LINE_QUANTITY);
      if (available <= 0) {
        skipped.push({ sku: item.sku, reason: 'out_of_stock' });
        continue;
      }
      const current = inCart.get(variant.id);
      if (current === undefined && inCart.size >= MAX_CART_LINES) {
        skipped.push({ sku: item.sku, reason: 'limited' });
        continue;
      }
      const wanted = (current ?? 0) + item.quantity;
      const quantity = Math.min(wanted, available);
      if (quantity > (current ?? 0)) {
        await this.prisma.cartItem.upsert({
          where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
          create: { cartId: cart.id, variantId: variant.id, quantity },
          update: { quantity },
        });
        inCart.set(variant.id, quantity);
        added.push(item.sku);
      }
      if (quantity < wanted) skipped.push({ sku: item.sku, reason: 'limited' });
    }
    await this.touch(cart.id);
    return { cart: await this.buildCart(cart.id, locale), added, skipped };
  }

  /** Orderable lines with current server-side prices; throws if the cart cannot be ordered as-is. */
  async orderableLines(
    cartId: string,
    locale: Locale,
    tx: Prisma.TransactionClient,
  ): Promise<OrderableLine[]> {
    const items = await tx.cartItem.findMany({
      where: { cartId },
      include: cartItemsInclude(locale),
      orderBy: { createdAt: 'asc' },
    });
    if (items.length === 0) {
      throw ApiException.badRequest('CART_EMPTY', 'The cart is empty');
    }
    const now = new Date();
    const lines: OrderableLine[] = [];
    const blocked: string[] = [];
    for (const item of items) {
      const evaluation = this.evaluate(item, now);
      if (!evaluation.orderable) {
        blocked.push(item.variant.sku);
        continue;
      }
      lines.push({
        variantId: item.variantId,
        quantity: evaluation.quantity,
        unitPrice: item.variant.price,
        productName:
          pickTranslation(item.variant.product.translations, locale)?.name ??
          item.variant.product.slug,
        productSlug: item.variant.product.slug,
        format: item.variant.product.format,
        sku: item.variant.sku,
        weightGrams: item.variant.weightGrams,
        unitCount: item.variant.unitCount,
      });
    }
    if (blocked.length > 0) {
      throw ApiException.conflict(
        'CART_ITEM_UNAVAILABLE',
        'Some products in the cart can no longer be ordered',
        {
          skus: blocked,
        },
      );
    }
    return lines;
  }

  async buildCart(cartId: string | null, locale: Locale): Promise<CartDto> {
    const items = cartId
      ? await this.prisma.cartItem.findMany({
          where: { cartId },
          include: cartItemsInclude(locale),
          orderBy: { createdAt: 'asc' },
        })
      : [];

    const now = new Date();
    const lines: CartLineDto[] = [];
    let subtotal = ZERO;
    let itemCount = 0;
    let ready = items.length > 0;

    for (const item of items) {
      const evaluation = this.evaluate(item, now);
      const { variant } = item;
      const name =
        pickTranslation(variant.product.translations, locale)?.name ?? variant.product.slug;
      const lineTotal = variant.price.times(evaluation.quantity);
      if (evaluation.orderable) {
        subtotal = subtotal.plus(lineTotal);
        itemCount += evaluation.quantity;
      } else {
        ready = false;
      }
      const image = variant.product.images[0];
      lines.push({
        id: item.id,
        variantId: variant.id,
        productSlug: variant.product.slug,
        productName: name,
        format: variant.product.format,
        sku: variant.sku,
        weightGrams: variant.weightGrams,
        unitCount: variant.unitCount,
        image: image ? toImageDto(image, name) : null,
        illustrationKey: asIllustrationKey(variant.product.illustrationKey),
        unitPrice: toMoney(variant.price),
        compareAtPrice: toMoneyOrNull(variant.compareAtPrice),
        quantity: evaluation.quantity,
        lineTotal: toMoney(lineTotal),
        maxQuantity: Math.max(0, Math.min(variant.stockQuantity, MAX_LINE_QUANTITY)),
        stockLevel: variantStockLevel(variant),
        issue: evaluation.issue,
      });
    }

    return {
      lines,
      itemCount,
      subtotal: toMoney(subtotal),
      currency: 'UZS',
      isCheckoutReady: ready && itemCount > 0,
      deliveryHint: itemCount > 0 ? await this.delivery.freeDeliveryHint(subtotal, locale) : null,
    };
  }

  private evaluate(item: CartItemRow, now: Date) {
    return evaluateCartLine({
      requestedQuantity: item.quantity,
      productVisible: isProductPublic(item.variant.product, now),
      variantActive: item.variant.isActive,
      stockQuantity: item.variant.stockQuantity,
    });
  }

  private async requireCart(request: Request): Promise<{ id: string }> {
    const cart = await this.findCart(request);
    if (!cart) throw ApiException.notFound('Cart not found');
    return cart;
  }

  /** Sliding expiry: an active cart stays alive. */
  private async touch(cartId: string): Promise<void> {
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { expiresAt: new Date(Date.now() + this.ttlMs) },
    });
  }
}

import { Injectable } from '@nestjs/common';
import {
  buildPaginated,
  normalizeSearchText,
  type AdminInventoryMovement,
  type AdminInventoryRow,
  type InventoryAdjustmentInput,
  type inventoryListQuerySchema,
  type Paginated,
} from '@teran/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import { ApiException } from '../common/errors/api-exception.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RevalidationService } from '../revalidation/revalidation.service.js';
import { pageArgs, type Actor } from './admin-support.js';

type ListQuery = z.output<typeof inventoryListQuerySchema>;

const rowSelect = {
  id: true,
  sku: true,
  weightGrams: true,
  unitCount: true,
  stockQuantity: true,
  lowStockThreshold: true,
  isActive: true,
  product: {
    select: {
      id: true,
      slug: true,
      translations: { where: { locale: 'uz' }, select: { name: true } },
    },
  },
} satisfies Prisma.ProductVariantSelect;

type VariantRow = Prisma.ProductVariantGetPayload<{ select: typeof rowSelect }>;

export function toInventoryRow(row: VariantRow): AdminInventoryRow {
  return {
    variantId: row.id,
    sku: row.sku,
    productId: row.product.id,
    productName: row.product.translations[0]?.name ?? row.product.slug,
    weightGrams: row.weightGrams,
    unitCount: row.unitCount,
    stockQuantity: row.stockQuantity,
    lowStockThreshold: row.lowStockThreshold,
    isActive: row.isActive,
  };
}

export const inventoryRowSelect = rowSelect;

@Injectable()
export class AdminInventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly revalidation: RevalidationService,
  ) {}

  async list(query: ListQuery): Promise<Paginated<AdminInventoryRow>> {
    const search = query.q ? normalizeSearchText(query.q) : undefined;
    const where: Prisma.ProductVariantWhereInput = {
      ...(query.lowStockOnly
        ? {
            isActive: true,
            stockQuantity: { lte: this.prisma.productVariant.fields.lowStockThreshold },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { sku: { contains: search.toUpperCase() } },
              { product: { translations: { some: { searchText: { contains: search } } } } },
            ],
          }
        : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.productVariant.count({ where }),
      this.prisma.productVariant.findMany({
        where,
        select: rowSelect,
        orderBy: [{ stockQuantity: 'asc' }, { sku: 'asc' }],
        ...pageArgs(query.page, query.pageSize),
      }),
    ]);
    return buildPaginated(rows.map(toInventoryRow), total, query.page, query.pageSize);
  }

  /**
   * Applies a manual stock change. The conditional update refuses to go below zero even when two
   * staff members (or an order) change the same variant at once; every change is written to the
   * ledger with its reason and author.
   */
  async adjust(
    variantId: string,
    input: InventoryAdjustmentInput,
    actor: Actor,
  ): Promise<AdminInventoryRow> {
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.productVariant.updateMany({
        where: {
          id: variantId,
          ...(input.delta < 0 ? { stockQuantity: { gte: -input.delta } } : {}),
        },
        data: { stockQuantity: { increment: input.delta } },
      });
      if (updated.count === 0) {
        const exists = await tx.productVariant.count({ where: { id: variantId } });
        if (!exists) throw ApiException.notFound('Variant not found');
        throw ApiException.conflict('INSUFFICIENT_STOCK', 'Stock cannot go below zero');
      }
      const variant = await tx.productVariant.findUniqueOrThrow({
        where: { id: variantId },
        select: rowSelect,
      });
      await tx.inventoryMovement.create({
        data: {
          variantId,
          delta: input.delta,
          quantityAfter: variant.stockQuantity,
          reason: input.reason,
          note: input.note ?? null,
          actorUserId: actor.userId,
        },
      });
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: 'inventory.adjust',
          entityType: 'ProductVariant',
          entityId: variantId,
          metadata: {
            sku: variant.sku,
            delta: input.delta,
            reason: input.reason,
            quantityAfter: variant.stockQuantity,
          },
          ipAddress: actor.ipAddress,
        },
        tx,
      );
      return variant;
    });
    this.revalidation.notify('catalog');
    return toInventoryRow(row);
  }

  async movements(
    variantId: string,
    page: number,
    pageSize: number,
  ): Promise<Paginated<AdminInventoryMovement>> {
    const where = { variantId };
    const [total, rows] = await Promise.all([
      this.prisma.inventoryMovement.count({ where }),
      this.prisma.inventoryMovement.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(page, pageSize),
        include: { actor: { select: { firstName: true, lastName: true } } },
      }),
    ]);
    const orderIds = [
      ...new Set(rows.map((row) => row.orderId).filter((id): id is string => Boolean(id))),
    ];
    const orders = orderIds.length
      ? await this.prisma.order.findMany({
          where: { id: { in: orderIds } },
          select: { id: true, number: true },
        })
      : [];
    const numbers = new Map(orders.map((order) => [order.id, order.number]));
    const items = rows.map((row): AdminInventoryMovement => ({
      id: row.id,
      delta: row.delta,
      quantityAfter: row.quantityAfter,
      reason: row.reason,
      note: row.note,
      orderNumber: row.orderId ? (numbers.get(row.orderId) ?? null) : null,
      actorName: row.actor
        ? [row.actor.firstName, row.actor.lastName].filter(Boolean).join(' ')
        : null,
      createdAt: row.createdAt.toISOString(),
    }));
    return buildPaginated(items, total, page, pageSize);
  }
}

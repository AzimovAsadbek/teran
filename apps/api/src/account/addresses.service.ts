import { Injectable } from '@nestjs/common';
import { MAX_ADDRESSES, type AddressDto, type addressInputSchema } from '@teran/contracts';
import type { z } from 'zod';
import { ApiException } from '../common/errors/api-exception.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

type AddressPayload = z.output<typeof addressInputSchema>;

const addressSelect = {
  id: true,
  label: true,
  recipientName: true,
  phone: true,
  regionCode: true,
  city: true,
  addressLine: true,
  landmark: true,
  isDefault: true,
  createdAt: true,
} satisfies Prisma.CustomerAddressSelect;

type AddressRow = Prisma.CustomerAddressGetPayload<{ select: typeof addressSelect }>;

function toDto(row: AddressRow): AddressDto {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

/**
 * A customer's saved delivery addresses. Every query is scoped by the signed-in user's id, so an
 * address id from another account behaves exactly like a missing one (404). At most one address
 * is the default (also enforced by a partial unique index).
 */
@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<AddressDto[]> {
    const rows = await this.prisma.customerAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select: addressSelect,
    });
    return rows.map(toDto);
  }

  async create(userId: string, input: AddressPayload): Promise<AddressDto> {
    const row = await this.prisma.$transaction(async (tx) => {
      const count = await tx.customerAddress.count({ where: { userId } });
      if (count >= MAX_ADDRESSES) {
        throw ApiException.conflict('CONFLICT', 'The address book is full', { max: MAX_ADDRESSES });
      }
      // The first address is the default one.
      const isDefault = input.isDefault || count === 0;
      if (isDefault) await this.clearDefault(tx, userId);
      return tx.customerAddress.create({
        data: { ...this.fields(input), isDefault, userId },
        select: addressSelect,
      });
    });
    return toDto(row);
  }

  async update(userId: string, id: string, input: AddressPayload): Promise<AddressDto> {
    const row = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.customerAddress.findFirst({
        where: { id, userId },
        select: { isDefault: true },
      });
      if (!existing) throw ApiException.notFound('Address not found');
      // The default address stays default until another one is chosen.
      const isDefault = input.isDefault || existing.isDefault;
      if (isDefault && !existing.isDefault) await this.clearDefault(tx, userId);
      return tx.customerAddress.update({
        where: { id },
        data: { ...this.fields(input), isDefault },
        select: addressSelect,
      });
    });
    return toDto(row);
  }

  async setDefault(userId: string, id: string): Promise<AddressDto[]> {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.customerAddress.findFirst({
        where: { id, userId },
        select: { id: true },
      });
      if (!existing) throw ApiException.notFound('Address not found');
      await this.clearDefault(tx, userId);
      await tx.customerAddress.update({ where: { id }, data: { isDefault: true } });
    });
    return this.list(userId);
  }

  /** Removing the default address makes the most recent remaining one the default. */
  async remove(userId: string, id: string): Promise<AddressDto[]> {
    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.customerAddress.findFirst({
        where: { id, userId },
        select: { isDefault: true },
      });
      if (!existing) throw ApiException.notFound('Address not found');
      await tx.customerAddress.delete({ where: { id } });
      if (existing.isDefault) {
        const next = await tx.customerAddress.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        if (next)
          await tx.customerAddress.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    });
    return this.list(userId);
  }

  private clearDefault(tx: Prisma.TransactionClient, userId: string) {
    return tx.customerAddress.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }

  private fields(input: AddressPayload) {
    return {
      label: input.label ?? null,
      recipientName: input.recipientName,
      phone: input.phone,
      regionCode: input.regionCode,
      city: input.city,
      addressLine: input.addressLine,
      landmark: input.landmark ?? null,
    };
  }
}

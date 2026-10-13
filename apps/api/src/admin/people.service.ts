import { Injectable } from '@nestjs/common';
import {
  buildPaginated,
  type adminSimpleListQuerySchema,
  type AdminCustomer,
  type AdminOrderListItem,
  type AdminStaffMember,
  type Paginated,
  type staffCreateSchema,
  type staffUpdateSchema,
} from '@teran/contracts';
import type { z } from 'zod';
import { AuditService } from '../audit/audit.service.js';
import { hashPassword } from '../auth/password.js';
import { SessionService } from '../auth/session.service.js';
import { ApiException } from '../common/errors/api-exception.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { pageArgs, type Actor } from './admin-support.js';
import { orderListSelect, toOrderListItem } from './orders.service.js';

type ListQuery = z.output<typeof adminSimpleListQuerySchema>;

function searchUsers(q: string | undefined): Prisma.UserWhereInput {
  if (!q) return {};
  const digits = q.replace(/\D/g, '');
  return {
    OR: [
      { email: { contains: q.toLowerCase() } },
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
    ],
  };
}

@Injectable()
export class AdminPeopleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly sessions: SessionService,
  ) {}

  async customers(query: ListQuery): Promise<Paginated<AdminCustomer>> {
    const where: Prisma.UserWhereInput = { role: 'CUSTOMER', ...searchUsers(query.q) };
    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...pageArgs(query.page, query.pageSize),
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          isActive: true,
          createdAt: true,
          _count: { select: { orders: true } },
        },
      }),
    ]);
    const items = rows.map((row): AdminCustomer => ({
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      phone: row.phone,
      orderCount: row._count.orders,
      createdAt: row.createdAt.toISOString(),
      isActive: row.isActive,
    }));
    return buildPaginated(items, total, query.page, query.pageSize);
  }

  async customer(id: string): Promise<{ customer: AdminCustomer; orders: AdminOrderListItem[] }> {
    const row = await this.prisma.user.findFirst({
      where: { id, role: 'CUSTOMER' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isActive: true,
        createdAt: true,
        _count: { select: { orders: true } },
        orders: { select: orderListSelect, orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!row) throw ApiException.notFound('Customer not found');
    return {
      customer: {
        id: row.id,
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        phone: row.phone,
        orderCount: row._count.orders,
        createdAt: row.createdAt.toISOString(),
        isActive: row.isActive,
      },
      orders: row.orders.map(toOrderListItem),
    };
  }

  async staff(): Promise<AdminStaffMember[]> {
    const rows = await this.prisma.user.findMany({
      where: { role: { in: ['MANAGER', 'ADMIN'] } },
      orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
      },
    });
    return rows.map((row) => ({ ...row, lastLoginAt: row.lastLoginAt?.toISOString() ?? null }));
  }

  async createStaff(
    input: z.output<typeof staffCreateSchema>,
    actor: Actor,
  ): Promise<AdminStaffMember> {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing)
      throw ApiException.conflict('EMAIL_TAKEN', 'An account with this e-mail already exists');
    const passwordHash = await hashPassword(input.password);
    const created = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          firstName: input.firstName,
          lastName: input.lastName ?? null,
          role: input.role,
          passwordHash,
        },
        select: { id: true },
      });
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: 'staff.create',
          entityType: 'User',
          entityId: user.id,
          metadata: { email: input.email, role: input.role },
          ipAddress: actor.ipAddress,
        },
        tx,
      );
      return user;
    });
    return this.staffMember(created.id);
  }

  /**
   * Changes a staff member's role or access. Administrators cannot lower their own role or
   * deactivate themselves, and the last active administrator cannot be removed. Deactivating an
   * account signs it out everywhere immediately.
   */
  async updateStaff(
    id: string,
    input: z.output<typeof staffUpdateSchema>,
    actor: Actor,
  ): Promise<AdminStaffMember> {
    if (id === actor.userId && (input.role !== 'ADMIN' || !input.isActive)) {
      throw ApiException.conflict('CONFLICT', 'You cannot remove your own administrator access');
    }
    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findFirst({
        where: { id, role: { in: ['MANAGER', 'ADMIN'] } },
        select: { role: true, isActive: true },
      });
      if (!user) throw ApiException.notFound('Staff member not found');
      const losesAdmin =
        user.role === 'ADMIN' && user.isActive && (input.role !== 'ADMIN' || !input.isActive);
      if (losesAdmin) {
        const otherAdmins = await tx.user.count({
          where: { role: 'ADMIN', isActive: true, id: { not: id } },
        });
        if (otherAdmins === 0) {
          throw ApiException.conflict('CONFLICT', 'At least one active administrator is required');
        }
      }
      await tx.user.update({ where: { id }, data: { role: input.role, isActive: input.isActive } });
      await this.audit.record(
        {
          actorUserId: actor.userId,
          action: 'staff.update',
          entityType: 'User',
          entityId: id,
          metadata: { from: { role: user.role, isActive: user.isActive }, to: input },
          ipAddress: actor.ipAddress,
        },
        tx,
      );
    });
    if (!input.isActive) await this.sessions.destroyAllForUser(id);
    return this.staffMember(id);
  }

  private async staffMember(id: string): Promise<AdminStaffMember> {
    const row = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
      },
    });
    return { ...row, lastLoginAt: row.lastLoginAt?.toISOString() ?? null };
  }
}

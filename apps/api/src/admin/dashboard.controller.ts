import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  adminOrderListQuerySchema,
  paginationQuerySchema,
  type AdminAuditEntry,
  type AdminBadges,
  type AdminDashboard,
  type Paginated,
  type PaginationQuery,
} from '@teran/contracts';
import type { z } from 'zod';
import { RequireStaff } from '../auth/auth.guard.js';
import { CurrentActor, type Actor } from './admin-support.js';
import { AdminDashboardService } from './dashboard.service.js';

const exportQuerySchema = adminOrderListQuerySchema.pick({ from: true, to: true, status: true });

@ApiTags('admin')
@Controller('admin')
@RequireStaff()
export class AdminDashboardController {
  constructor(private readonly dashboard: AdminDashboardService) {}

  @Get('dashboard')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Key figures for the last 30 days, stock alerts and recent orders' })
  @ApiOkResponse({ description: 'AdminDashboard' })
  overview(): Promise<AdminDashboard> {
    return this.dashboard.dashboard();
  }

  @Get('badges')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Counts of orders by status, new inquiries and low-stock pack sizes' })
  @ApiOkResponse({ description: 'AdminBadges' })
  badges(): Promise<AdminBadges> {
    return this.dashboard.badges();
  }

  @Get('reports/orders.csv')
  @RequireStaff(['ADMIN'])
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="teran-orders.csv"')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Orders export for accounting (administrators only)' })
  exportOrders(
    @Query({ schema: exportQuerySchema }) query: z.output<typeof exportQuerySchema>,
    @CurrentActor() actor: Actor,
  ): Promise<string> {
    return this.dashboard.exportOrders(query, actor);
  }

  @Get('audit')
  @RequireStaff(['ADMIN'])
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Audit trail of administrative actions (administrators only)' })
  @ApiOkResponse({ description: 'Paginated<AdminAuditEntry>' })
  auditLog(
    @Query({ schema: paginationQuerySchema }) query: PaginationQuery,
  ): Promise<Paginated<AdminAuditEntry>> {
    return this.dashboard.auditLog(query.page, Math.min(query.pageSize, 100));
  }
}

import { Body, Controller, Get, Header, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  adminSimpleListQuerySchema,
  idSchema,
  staffCreateSchema,
  staffUpdateSchema,
  type AdminCustomer,
  type AdminOrderListItem,
  type AdminStaffMember,
  type Paginated,
} from '@teran/contracts';
import type { z } from 'zod';
import { RequireStaff } from '../auth/auth.guard.js';
import { CurrentActor, type Actor } from './admin-support.js';
import { AdminPeopleService } from './people.service.js';

@ApiTags('admin')
@Controller('admin')
@RequireStaff()
export class AdminPeopleController {
  constructor(private readonly people: AdminPeopleService) {}

  @Get('customers')
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ description: 'Paginated<AdminCustomer>' })
  customers(
    @Query({ schema: adminSimpleListQuerySchema })
    query: z.output<typeof adminSimpleListQuerySchema>,
  ): Promise<Paginated<AdminCustomer>> {
    return this.people.customers(query);
  }

  @Get('customers/:id')
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ description: '{ customer: AdminCustomer, orders: AdminOrderListItem[] }' })
  customer(
    @Param('id', { schema: idSchema }) id: string,
  ): Promise<{ customer: AdminCustomer; orders: AdminOrderListItem[] }> {
    return this.people.customer(id);
  }

  @Get('staff')
  @RequireStaff(['ADMIN'])
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Staff accounts (administrators only)' })
  @ApiOkResponse({ description: 'AdminStaffMember[]' })
  staff(): Promise<AdminStaffMember[]> {
    return this.people.staff();
  }

  @Post('staff')
  @RequireStaff(['ADMIN'])
  @ApiOkResponse({ description: 'AdminStaffMember' })
  createStaff(
    @Body({ schema: staffCreateSchema }) body: z.output<typeof staffCreateSchema>,
    @CurrentActor() actor: Actor,
  ): Promise<AdminStaffMember> {
    return this.people.createStaff(body, actor);
  }

  @Patch('staff/:id')
  @RequireStaff(['ADMIN'])
  @ApiOkResponse({ description: 'AdminStaffMember' })
  updateStaff(
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: staffUpdateSchema }) body: z.output<typeof staffUpdateSchema>,
    @CurrentActor() actor: Actor,
  ): Promise<AdminStaffMember> {
    return this.people.updateStaff(id, body, actor);
  }
}

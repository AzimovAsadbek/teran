import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  accountOrdersQuerySchema,
  addressInputSchema,
  changeEmailSchema,
  idSchema,
  localeQuerySchema,
  type AccountProfileDto,
  type AccountSessionDto,
  type AccountSummaryDto,
  type AddressDto,
  type CurrentUserDto,
  type LocaleQuery,
  type OrderDto,
  type Paginated,
  type PurchasedProductDto,
  type ReorderResultDto,
} from '@teran/contracts';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { CurrentAuth, RequireAuth } from '../auth/auth.guard.js';
import type { RequestAuth } from '../auth/auth.types.js';
import { AccountService } from './account.service.js';
import { AddressesService } from './addresses.service.js';

const orderNumberSchema = z.string().regex(/^TRN-[0-9A-Z]{8}$/);

/**
 * The signed-in customer's account. Every route requires a session and acts only on the session's
 * own user: no route accepts a user id, and resources of other users answer 404.
 */
@ApiTags('account')
@Controller('account')
@RequireAuth()
export class AccountController {
  constructor(
    private readonly account: AccountService,
    private readonly addresses: AddressesService,
  ) {}

  @Get('summary')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Account overview: order counts, recent orders, orders needing action' })
  @ApiOkResponse({ description: 'AccountSummaryDto' })
  summary(@CurrentAuth() auth: RequestAuth): Promise<AccountSummaryDto> {
    return this.account.summary(auth.userId);
  }

  @Get('orders')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: "The customer's orders, newest first, filtered by state" })
  @ApiOkResponse({ description: 'Paginated<OrderDto>' })
  orders(
    @CurrentAuth() auth: RequestAuth,
    @Query({ schema: accountOrdersQuerySchema }) query: z.output<typeof accountOrdersQuerySchema>,
  ): Promise<Paginated<OrderDto>> {
    return this.account.orders(auth.userId, query.status, query.page, query.pageSize);
  }

  @Post('orders/:number/reorder')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({
    summary: "Put an earlier order's items back in the cart at today's prices (nothing is ordered)",
  })
  @ApiOkResponse({ description: 'ReorderResultDto' })
  reorder(
    @CurrentAuth() auth: RequestAuth,
    @Param('number', { schema: orderNumberSchema }) number: string,
    @Query({ schema: localeQuerySchema }) query: LocaleQuery,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ReorderResultDto> {
    return this.account.reorder(request, response, auth.userId, number, query.locale);
  }

  @Get('purchases')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Products the customer has bought, with current availability' })
  @ApiOkResponse({ description: 'PurchasedProductDto[]' })
  purchases(
    @CurrentAuth() auth: RequestAuth,
    @Query({ schema: localeQuerySchema }) query: LocaleQuery,
  ): Promise<PurchasedProductDto[]> {
    return this.account.purchases(auth.userId, query.locale);
  }

  @Get('profile')
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ description: 'AccountProfileDto' })
  profile(@CurrentAuth() auth: RequestAuth): Promise<AccountProfileDto> {
    return this.account.profile(auth.userId);
  }

  @Post('email')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Change the sign-in e-mail (requires the current password)' })
  @ApiOkResponse({ description: 'CurrentUserDto' })
  changeEmail(
    @CurrentAuth() auth: RequestAuth,
    @Body({ schema: changeEmailSchema }) body: z.output<typeof changeEmailSchema>,
  ): Promise<CurrentUserDto> {
    return this.account.changeEmail(auth, body);
  }

  @Get('sessions')
  @Header('Cache-Control', 'private, no-store')
  @ApiOperation({ summary: 'Devices where the customer is signed in' })
  @ApiOkResponse({ description: 'AccountSessionDto[]' })
  sessions(@CurrentAuth() auth: RequestAuth): Promise<AccountSessionDto[]> {
    return this.account.sessionsFor(auth);
  }

  @Post('sessions/revoke-others')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: 'Sign out every other device; this one stays signed in' })
  @ApiOkResponse({ description: '{ revoked: number }' })
  revokeOthers(@CurrentAuth() auth: RequestAuth): Promise<{ revoked: number }> {
    return this.account.signOutOtherDevices(auth);
  }

  // ─── Address book ─────────────────────────────────────────────────────────

  @Get('addresses')
  @Header('Cache-Control', 'private, no-store')
  @ApiOkResponse({ description: 'AddressDto[]' })
  listAddresses(@CurrentAuth() auth: RequestAuth): Promise<AddressDto[]> {
    return this.addresses.list(auth.userId);
  }

  @Post('addresses')
  @ApiOkResponse({ description: 'AddressDto' })
  createAddress(
    @CurrentAuth() auth: RequestAuth,
    @Body({ schema: addressInputSchema }) body: z.output<typeof addressInputSchema>,
  ): Promise<AddressDto> {
    return this.addresses.create(auth.userId, body);
  }

  @Put('addresses/:id')
  @ApiOkResponse({ description: 'AddressDto' })
  updateAddress(
    @CurrentAuth() auth: RequestAuth,
    @Param('id', { schema: idSchema }) id: string,
    @Body({ schema: addressInputSchema }) body: z.output<typeof addressInputSchema>,
  ): Promise<AddressDto> {
    return this.addresses.update(auth.userId, id, body);
  }

  @Post('addresses/:id/default')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ description: 'AddressDto[]' })
  setDefaultAddress(
    @CurrentAuth() auth: RequestAuth,
    @Param('id', { schema: idSchema }) id: string,
  ): Promise<AddressDto[]> {
    return this.addresses.setDefault(auth.userId, id);
  }

  @Delete('addresses/:id')
  @ApiOkResponse({ description: 'AddressDto[]' })
  removeAddress(
    @CurrentAuth() auth: RequestAuth,
    @Param('id', { schema: idSchema }) id: string,
  ): Promise<AddressDto[]> {
    return this.addresses.remove(auth.userId, id);
  }
}

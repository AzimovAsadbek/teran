import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  addCartItemSchema,
  cartQuerySchema,
  idSchema,
  updateCartItemSchema,
  type AddCartItemInput,
  type CartDto,
  type UpdateCartItemInput,
} from '@teran/contracts';
import type { Request, Response } from 'express';
import type { z } from 'zod';
import { CartService } from './cart.service.js';

type CartQuery = z.output<typeof cartQuerySchema>;

/** The cart is personal: never cache it in shared caches. */
const PRIVATE = 'private, no-store';

@ApiTags('cart')
@Controller('cart')
@Throttle({ default: { limit: 60, ttl: 60_000 } })
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  @Header('Cache-Control', PRIVATE)
  @ApiOperation({ summary: 'Current cart, re-priced and re-validated against live stock' })
  @ApiOkResponse({ description: 'CartDto' })
  get(
    @Req() request: Request,
    @Query({ schema: cartQuerySchema }) query: CartQuery,
  ): Promise<CartDto> {
    return this.cart.getCart(request, query.locale);
  }

  @Post('items')
  @Header('Cache-Control', PRIVATE)
  @ApiOperation({ summary: 'Add a pack size to the cart (creates the cart cookie if needed)' })
  @ApiOkResponse({ description: 'CartDto' })
  add(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
    @Body({ schema: addCartItemSchema }) body: AddCartItemInput,
    @Query({ schema: cartQuerySchema }) query: CartQuery,
  ): Promise<CartDto> {
    return this.cart.addItem(request, response, body, query.locale);
  }

  @Patch('items/:itemId')
  @Header('Cache-Control', PRIVATE)
  @ApiOperation({ summary: 'Change the quantity of a cart line' })
  @ApiOkResponse({ description: 'CartDto' })
  update(
    @Req() request: Request,
    @Param('itemId', { schema: idSchema }) itemId: string,
    @Body({ schema: updateCartItemSchema }) body: UpdateCartItemInput,
    @Query({ schema: cartQuerySchema }) query: CartQuery,
  ): Promise<CartDto> {
    return this.cart.updateItem(request, itemId, body.quantity, query.locale);
  }

  @Delete('items/:itemId')
  @Header('Cache-Control', PRIVATE)
  @ApiOperation({ summary: 'Remove a cart line' })
  @ApiOkResponse({ description: 'CartDto' })
  remove(
    @Req() request: Request,
    @Param('itemId', { schema: idSchema }) itemId: string,
    @Query({ schema: cartQuerySchema }) query: CartQuery,
  ): Promise<CartDto> {
    return this.cart.removeItem(request, itemId, query.locale);
  }
}

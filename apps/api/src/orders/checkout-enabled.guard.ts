import { HttpStatus, Injectable, type CanActivate } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiException } from '../common/errors/api-exception.js';
import type { Env } from '../config/env.js';

/**
 * Online ordering is open only when CHECKOUT_ENABLED is true. While the storefront hides prices
 * and takes orders by phone (NEXT_PUBLIC_SHOW_PRICES, ADR-027), these routes would otherwise still
 * accept carts, orders and simulated payments from anyone calling the API directly: a script could
 * reserve every pack in stock with invented names. Put on the routes that add to a cart, place an
 * order or start a payment; reading a cart, an order or a payment's state stays open.
 */
@Injectable()
export class CheckoutEnabledGuard implements CanActivate {
  constructor(private readonly config: ConfigService<Env, true>) {}

  canActivate(): boolean {
    if (this.config.get('CHECKOUT_ENABLED', { infer: true })) return true;
    throw new ApiException(
      HttpStatus.SERVICE_UNAVAILABLE,
      'FEATURE_DISABLED',
      'Online ordering is closed: orders are taken by phone and messengers',
    );
  }
}

import { Prisma } from '../generated/prisma/client.js';
import type { Money } from '@teran/contracts';

export const ZERO = new Prisma.Decimal(0);

/** Exact decimal → contract money string with two fraction digits ("85000.00"). */
export function toMoney(value: Prisma.Decimal | number | string): Money {
  return new Prisma.Decimal(value).toFixed(2);
}

export function toMoneyOrNull(value: Prisma.Decimal | null | undefined): Money | null {
  return value === null || value === undefined ? null : toMoney(value);
}

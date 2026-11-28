import 'server-only';
import type { Locale, OrderDto } from '@teran/contracts';
import { redirect } from 'next/navigation';
import { getPathname } from '@/i18n/navigation';
import { ApiError } from './api/errors';
import { apiFindAsVisitor } from './api/server';

export const paymentToken = /^[A-Za-z0-9_-]{20,200}$/;
const orderNumber = /^TRN-[A-Z0-9]{8}$/;

export function buyerOrderPath(number: string, token: string | null) {
  return token
    ? `/orders/${number}?token=${encodeURIComponent(token)}`
    : `/account/orders/${number}`;
}

/** A provider return token resolves the order; it never authorises access to the buyer's details. */
export async function readBuyerOrder(
  number: string,
  token: string | null,
  locale: Locale,
  next: string,
) {
  if (!orderNumber.test(number) || (token !== null && !paymentToken.test(token))) return null;
  try {
    return await apiFindAsVisitor<OrderDto>(buyerOrderPath(number, token));
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && !token)
      redirect(getPathname({ locale, href: `/account/login?next=${encodeURIComponent(next)}` }));
    if (error instanceof ApiError && error.status === 403) return null;
    throw error;
  }
}

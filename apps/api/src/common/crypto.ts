import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

/** 256-bit opaque token for cookies and links. Only its SHA-256 is ever stored. */
export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Compares two hex digests in constant time. */
export function digestsEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'hex');
  const right = Buffer.from(b, 'hex');
  return left.length === right.length && timingSafeEqual(left, right);
}

// Crockford base32 without I, L, O, U: unambiguous when read out over the phone.
const ORDER_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Public order number such as "TRN-7K4Q2M9X". Random rather than sequential, so order numbers
 * do not reveal sales volume; 32^8 ≈ 10^12 values make collisions negligible (and still handled).
 */
export function generateOrderNumber(): string {
  let code = '';
  for (let index = 0; index < 8; index++) {
    code += ORDER_ALPHABET[randomInt(ORDER_ALPHABET.length)];
  }
  return `TRN-${code}`;
}

/**
 * Unsubscribe token for a newsletter subscriber, derived from the server secret so it never has to
 * be stored and every e-mail (or export) can include a working link. Rotating APP_SECRET
 * invalidates old links.
 */
export function newsletterUnsubscribeToken(appSecret: string, subscriberId: string): string {
  return createHmac('sha256', appSecret)
    .update(`newsletter-unsubscribe:${subscriberId}`)
    .digest('base64url');
}

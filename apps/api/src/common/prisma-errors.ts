import { Prisma } from '../generated/prisma/client.js';

interface DriverAdapterMeta {
  target?: unknown;
  driverAdapterError?: { cause?: { constraint?: { index?: unknown; fields?: unknown } } };
}

/**
 * Identifies which unique constraint a P2002 error violated, e.g. "Order_idempotencyKey_key".
 *
 * Prisma reports this differently depending on the engine: the classic engine sets `meta.target`,
 * while driver adapters (used here, Prisma 7 + pg) put it under `meta.driverAdapterError.cause.constraint`.
 * Returns null for anything that is not a unique-constraint violation.
 */
export function uniqueConstraintName(error: unknown): string | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return null;
  }
  const meta = (error.meta ?? {}) as DriverAdapterMeta;
  const parts: string[] = [];
  const collect = (value: unknown) => {
    if (typeof value === 'string') parts.push(value);
    else if (Array.isArray(value))
      parts.push(...value.filter((entry): entry is string => typeof entry === 'string'));
  };
  collect(meta.target);
  collect(meta.driverAdapterError?.cause?.constraint?.index);
  collect(meta.driverAdapterError?.cause?.constraint?.fields);
  return parts.join(',');
}

import { Prisma } from '../generated/prisma/client.js';
import { uniqueConstraintName } from './prisma-errors.js';

const error = (meta: Record<string, unknown>, code = 'P2002') =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code,
    clientVersion: 'test',
    meta,
  });

describe('uniqueConstraintName', () => {
  it('reads the driver-adapter shape used with Prisma 7 + pg', () => {
    const adapterError = error({
      driverAdapterError: {
        cause: {
          kind: 'UniqueConstraintViolation',
          constraint: { index: 'Order_idempotencyKey_key' },
        },
      },
    });
    expect(uniqueConstraintName(adapterError)).toBe('Order_idempotencyKey_key');
  });

  it('reads the classic engine shape', () => {
    expect(uniqueConstraintName(error({ target: ['number'] }))).toBe('number');
  });

  it('ignores other errors', () => {
    expect(uniqueConstraintName(error({}, 'P2025'))).toBeNull();
    expect(uniqueConstraintName(new Error('boom'))).toBeNull();
  });
});

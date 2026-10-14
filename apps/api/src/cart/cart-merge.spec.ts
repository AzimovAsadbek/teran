import { MAX_LINE_QUANTITY } from '@teran/contracts';
import { MAX_CART_LINES, mergeCartLines, type VariantAvailability } from './cart-merge.js';

const available = (stockQuantity: number): VariantAvailability => ({
  orderable: true,
  stockQuantity,
});

describe('mergeCartLines', () => {
  it('combines the same variant into one line and keeps distinct ones', () => {
    const result = mergeCartLines(
      [{ variantId: 'a', quantity: 2 }],
      [
        { variantId: 'a', quantity: 1 },
        { variantId: 'b', quantity: 3 },
      ],
      new Map([
        ['a', available(10)],
        ['b', available(10)],
      ]),
    );
    expect(result).toEqual([
      { variantId: 'a', quantity: 3 },
      { variantId: 'b', quantity: 3 },
    ]);
  });

  it('caps combined quantities at the stock available now and at the line limit', () => {
    const result = mergeCartLines(
      [
        { variantId: 'low', quantity: 3 },
        { variantId: 'big', quantity: MAX_LINE_QUANTITY },
      ],
      [
        { variantId: 'low', quantity: 4 },
        { variantId: 'big', quantity: 5 },
      ],
      new Map([
        ['low', available(5)],
        ['big', available(1000)],
      ]),
    );
    expect(result).toEqual([
      { variantId: 'low', quantity: 5 },
      { variantId: 'big', quantity: MAX_LINE_QUANTITY },
    ]);
  });

  it('keeps unavailable and out-of-stock lines for the customer to see, capped at the line limit', () => {
    const result = mergeCartLines(
      [{ variantId: 'gone', quantity: 2 }],
      [{ variantId: 'empty', quantity: 30 }],
      new Map([
        ['gone', { orderable: false, stockQuantity: 9 }],
        ['empty', available(0)],
      ]),
    );
    expect(result).toEqual([
      { variantId: 'gone', quantity: 2 },
      { variantId: 'empty', quantity: MAX_LINE_QUANTITY },
    ]);
  });

  it('puts the device cart first and stops at the line limit', () => {
    const device = Array.from({ length: MAX_CART_LINES - 1 }, (_, index) => ({
      variantId: `d${index}`,
      quantity: 1,
    }));
    const account = [
      { variantId: 'x', quantity: 1 },
      { variantId: 'y', quantity: 1 },
    ];
    const result = mergeCartLines(device, account, new Map());
    expect(result).toHaveLength(MAX_CART_LINES);
    expect(result.at(-1)).toEqual({ variantId: 'x', quantity: 1 });
  });

  it('is deterministic and ignores non-positive quantities', () => {
    const device = [
      { variantId: 'a', quantity: 0 },
      { variantId: 'b', quantity: 2 },
    ];
    const account = [{ variantId: 'a', quantity: 1 }];
    const stock = new Map([
      ['a', available(5)],
      ['b', available(5)],
    ]);
    expect(mergeCartLines(device, account, stock)).toEqual(mergeCartLines(device, account, stock));
    expect(mergeCartLines(device, account, stock)).toEqual([
      { variantId: 'b', quantity: 2 },
      { variantId: 'a', quantity: 1 },
    ]);
  });
});

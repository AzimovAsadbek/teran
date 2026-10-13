import { evaluateCartLine, isProductPublic } from './cart-line.js';

const base = { requestedQuantity: 2, productVisible: true, variantActive: true, stockQuantity: 10 };

describe('evaluateCartLine', () => {
  it('keeps an orderable line as requested', () => {
    expect(evaluateCartLine(base)).toEqual({ quantity: 2, issue: null, orderable: true });
  });

  it('reduces the quantity to available stock without dropping the line', () => {
    expect(evaluateCartLine({ ...base, requestedQuantity: 8, stockQuantity: 3 })).toEqual({
      quantity: 3,
      issue: 'quantity_reduced',
      orderable: true,
    });
  });

  it('caps at the per-line maximum even with plenty of stock', () => {
    expect(evaluateCartLine({ ...base, requestedQuantity: 50, stockQuantity: 500 }).quantity).toBe(
      20,
    );
  });

  it('blocks out-of-stock and unavailable lines', () => {
    expect(evaluateCartLine({ ...base, stockQuantity: 0 })).toEqual({
      quantity: 0,
      issue: 'out_of_stock',
      orderable: false,
    });
    expect(evaluateCartLine({ ...base, productVisible: false }).issue).toBe('unavailable');
    expect(evaluateCartLine({ ...base, variantActive: false }).issue).toBe('unavailable');
  });
});

describe('isProductPublic', () => {
  const now = new Date('2026-10-13T12:00:00Z');
  it('requires ACTIVE status and a publication date in the past', () => {
    expect(isProductPublic({ status: 'ACTIVE', publishedAt: new Date('2026-10-01') }, now)).toBe(
      true,
    );
    expect(isProductPublic({ status: 'ACTIVE', publishedAt: new Date('2026-11-01') }, now)).toBe(
      false,
    );
    expect(isProductPublic({ status: 'ACTIVE', publishedAt: null }, now)).toBe(false);
    expect(isProductPublic({ status: 'DRAFT', publishedAt: new Date('2026-10-01') }, now)).toBe(
      false,
    );
  });
});

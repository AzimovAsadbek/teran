import { isInternalRequest, redactUrl } from './internal-request.js';

const KEY = 'k'.repeat(40);

describe('isInternalRequest', () => {
  it('accepts the configured key', () => {
    expect(isInternalRequest({ headers: { 'x-internal-key': KEY } }, KEY)).toBe(true);
  });

  it('rejects a missing, wrong or repeated header', () => {
    expect(isInternalRequest({ headers: {} }, KEY)).toBe(false);
    expect(isInternalRequest({ headers: { 'x-internal-key': `${KEY}x` } }, KEY)).toBe(false);
    expect(isInternalRequest({ headers: { 'x-internal-key': [KEY] } }, KEY)).toBe(false);
  });

  it('is never true when no key is configured', () => {
    expect(isInternalRequest({ headers: { 'x-internal-key': '' } }, undefined)).toBe(false);
    expect(isInternalRequest({ headers: { 'x-internal-key': 'anything' } }, undefined)).toBe(false);
  });
});

describe('redactUrl', () => {
  it('removes order access tokens from logged URLs', () => {
    expect(redactUrl('/api/v1/orders/TRN-ABCDEFGH?token=s3cr3t&x=1')).toBe(
      '/api/v1/orders/TRN-ABCDEFGH?token=[redacted]&x=1',
    );
    expect(redactUrl('/api/v1/catalog/products?locale=uz')).toBe(
      '/api/v1/catalog/products?locale=uz',
    );
  });
});

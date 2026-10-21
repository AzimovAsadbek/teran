import { afterEach, describe, expect, it } from 'vitest';
import { ApiError, ApiUnavailableError } from './errors';
import { apiFailureLine, describeApiFailure, resetApiFailures } from './failures';

const options = (now: number) => ({ apiUrl: 'http://api:4000', timeoutMs: 8_000, now });

function unreachable(code: string): Error {
  return Object.assign(new TypeError('fetch failed'), { cause: { code } });
}

describe('API failure lines', () => {
  afterEach(() => resetApiFailures());

  it('names the call, the reason, the time and the API request id', () => {
    expect(
      apiFailureLine(
        {
          method: 'GET',
          path: '/catalog/products?pageSize=8',
          status: 500,
          body: {
            statusCode: 500,
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
            requestId: '7bce04be',
          },
          ms: 45.4,
        },
        options(0),
      ),
    ).toBe(
      '[api] GET /catalog/products?pageSize=8 failed: 500 INTERNAL_ERROR after 45 ms (API request 7bce04be)',
    );
  });

  it('tells a timeout from an API that cannot be reached', () => {
    const timeout = Object.assign(new Error('signal timed out'), { name: 'TimeoutError' });
    expect(
      apiFailureLine(
        { method: 'GET', path: '/content/settings', error: timeout, ms: 8001 },
        options(0),
      ),
    ).toBe('[api] GET /content/settings failed: no answer within 8 s after 8001 ms');
    expect(
      apiFailureLine(
        { method: 'GET', path: '/catalog/categories', error: unreachable('ECONNREFUSED'), ms: 3 },
        options(0),
      ),
    ).toBe(
      '[api] GET /catalog/categories failed: the API at http://api:4000 is unreachable (ECONNREFUSED) after 3 ms',
    );
  });

  it('never writes a token from the address', () => {
    const line = apiFailureLine(
      { method: 'GET', path: '/orders/TRN-1?token=secret', status: 502, ms: 1 },
      options(0),
    );
    expect(line).toBe('[api] GET /orders/TRN-1?token=[redacted] failed: 502 after 1 ms');
  });

  it('writes one line a minute per kind of failure, then counts what it left out', () => {
    const down = {
      method: 'GET',
      path: '/catalog/products',
      error: unreachable('ECONNREFUSED'),
      ms: 2,
    };
    expect(apiFailureLine(down, options(0))).not.toBeNull();
    expect(apiFailureLine(down, options(1_000))).toBeNull();
    expect(apiFailureLine(down, options(30_000))).toBeNull();
    // Another kind of failure is reported on its own.
    expect(
      apiFailureLine({ ...down, error: undefined, status: 503 }, options(31_000)),
    ).not.toBeNull();
    expect(apiFailureLine(down, options(61_000))).toMatch(
      /; 2 more like this since the last report$/,
    );
  });

  it('describes a call that got no answer in one line, for the error thrown to the caller', () => {
    const description = describeApiFailure(
      {
        method: 'GET',
        path: '/orders/TRN-1?token=secret',
        error: unreachable('ECONNREFUSED'),
        ms: 3,
      },
      { apiUrl: 'http://api:4000', timeoutMs: 8_000 },
    );
    expect(description).toBe(
      'GET /orders/TRN-1?token=[redacted]: the API at http://api:4000 is unreachable (ECONNREFUSED)',
    );
    const error = new ApiUnavailableError(description);
    // Not an answer with a status: callers that handle ApiError (404, 401) must not take it for one.
    expect(error).not.toBeInstanceOf(ApiError);
    expect(error.stack).toBe(`ApiUnavailableError: ${description}`);
  });
});

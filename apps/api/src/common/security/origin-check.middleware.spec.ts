import type { NextFunction, Request, Response } from 'express';
import { createOriginCheckMiddleware } from './origin-check.middleware.js';

function run(method: string, headers: Record<string, string>) {
  const middleware = createOriginCheckMiddleware(['https://teran.uz']);
  const next = vi.fn() as unknown as NextFunction;
  const json = vi.fn();
  const locals: Record<string, unknown> = {};
  const response = { locals, status: vi.fn(() => ({ json })) } as unknown as Response;
  middleware({ method, headers, id: 'request-1' } as unknown as Request, response, next);
  return {
    passed: (next as unknown as ReturnType<typeof vi.fn>).mock.calls.length === 1,
    json,
    locals,
  };
}

describe('origin check (CSRF)', () => {
  it('never blocks safe methods', () => {
    expect(run('GET', { origin: 'https://evil.example' }).passed).toBe(true);
  });

  it('allows the storefront origin and rejects others', () => {
    expect(run('POST', { origin: 'https://teran.uz' }).passed).toBe(true);
    const rejected = run('POST', { origin: 'https://evil.example' });
    expect(rejected.passed).toBe(false);
    expect(rejected.json).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'INVALID_ORIGIN', requestId: 'request-1' }),
    );
    // The request log reads the code from here (common/logging/request-log.ts).
    expect(rejected.locals.errorCode).toBe('INVALID_ORIGIN');
    expect(run('DELETE', { origin: 'null' }).passed).toBe(false);
  });

  it('falls back to Sec-Fetch-Site when Origin is absent', () => {
    expect(run('POST', { 'sec-fetch-site': 'cross-site' }).passed).toBe(false);
    expect(run('POST', { 'sec-fetch-site': 'same-origin' }).passed).toBe(true);
  });

  it('lets non-browser clients through (they cannot carry a victim’s cookies)', () => {
    expect(run('POST', {}).passed).toBe(true);
  });
});

import { EventEmitter } from 'node:events';
import type { NextFunction, Request, Response } from 'express';
import type { Logger } from 'pino';
import {
  requestIdFor,
  requestLog,
  requestLogLevel,
  requestLogMessage,
  type RequestOutcome,
} from './request-log.js';

const outcome = (overrides: Partial<RequestOutcome> = {}): RequestOutcome => ({
  method: 'GET',
  url: '/api/v1/catalog/products',
  status: 200,
  ms: 12,
  ...overrides,
});

describe('request ids', () => {
  it('reuses a well-formed id from the proxy and makes one otherwise', () => {
    expect(requestIdFor({ 'x-request-id': 'nginx-1a2b3c4d' })).toBe('nginx-1a2b3c4d');
    for (const header of [undefined, 'short', 'has spaces in it', 'x'.repeat(65), '<script>']) {
      const id = requestIdFor({ 'x-request-id': header });
      expect(id).not.toBe(header);
      expect(id).toMatch(/^[0-9a-f-]{36}$/);
    }
  });
});

describe('request log level', () => {
  it('raises failures and refusals worth a look', () => {
    expect(requestLogLevel(outcome({ status: 500 }), '/api/v1/orders')).toBe('error');
    expect(requestLogLevel(outcome({ status: 503 }), '/api/v1/health/ready')).toBe('error');
    expect(requestLogLevel(outcome({ status: 429 }), '/api/v1/auth/login')).toBe('warn');
    expect(
      requestLogLevel(outcome({ status: 403, code: 'INVALID_ORIGIN' }), '/api/v1/cart/items'),
    ).toBe('warn');
  });

  it('keeps the rest at info, client errors included', () => {
    expect(requestLogLevel(outcome(), '/api/v1/catalog/products')).toBe('info');
    expect(requestLogLevel(outcome({ status: 404, code: 'NOT_FOUND' }), '/api/v1/x')).toBe('info');
    expect(requestLogLevel(outcome({ status: 401 }), '/api/v1/account/orders')).toBe('info');
  });

  it('leaves out routine traffic that worked, but not when it fails', () => {
    expect(requestLogLevel(outcome(), '/api/v1/health/live')).toBe('silent');
    expect(requestLogLevel(outcome({ status: 304 }), '/uploads/products/a/640.webp')).toBe(
      'silent',
    );
    expect(requestLogLevel(outcome({ method: 'OPTIONS', status: 204 }), '/api/v1/cart')).toBe(
      'silent',
    );
    expect(requestLogLevel(outcome({ status: 404 }), '/uploads/products/a/640.webp')).toBe('info');
  });
});

describe('request log message', () => {
  it('reads method, address, status and time, then why it failed', () => {
    expect(requestLogMessage(outcome())).toBe('GET /api/v1/catalog/products 200 12ms');
    expect(
      requestLogMessage(
        outcome({ method: 'POST', url: '/api/v1/auth/login', status: 400, code: 'BAD_REQUEST' }),
      ),
    ).toBe('POST /api/v1/auth/login 400 12ms BAD_REQUEST');
    expect(requestLogMessage(outcome({ status: 499, aborted: true }))).toBe(
      'GET /api/v1/catalog/products 499 12ms (client closed the connection)',
    );
  });
});

describe('request log middleware', () => {
  function run(headers: Record<string, string> = {}, url = '/api/v1/orders/TRN-1?token=secret') {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const request = {
      headers,
      method: 'GET',
      path: url.split('?')[0],
      originalUrl: url,
    } as unknown as Request;
    const locals: Record<string, unknown> = {};
    const response = Object.assign(new EventEmitter(), {
      statusCode: 200,
      locals,
      headersSent: false,
      writableFinished: false,
      setHeader: vi.fn(),
    });
    const next = vi.fn() as unknown as NextFunction;
    requestLog(() => logger as unknown as Logger)(request, response as unknown as Response, next);
    const finish = (status: number, code?: string) => {
      response.statusCode = status;
      if (code) response.locals.errorCode = code;
      response.headersSent = true;
      response.writableFinished = true;
      response.emit('finish');
      response.emit('close');
    };
    return { logger, request, response, next, finish };
  }

  it('gives the request its id and passes it on', () => {
    const { request, response, next } = run({ 'x-request-id': 'nginx-1a2b3c4d' });
    expect(request.id).toBe('nginx-1a2b3c4d');
    expect(response.setHeader).toHaveBeenCalledWith('X-Request-Id', 'nginx-1a2b3c4d');
    expect(next).toHaveBeenCalledOnce();
  });

  it('writes one line when the answer is complete, secrets left out', () => {
    const { logger, request, finish } = run();
    // A router mounted below a prefix may rewrite the url before the answer completes.
    request.url = '/TRN-1';
    finish(404, 'NOT_FOUND');
    expect(logger.info).toHaveBeenCalledOnce();
    const [fields, message] = logger.info.mock.calls[0]!;
    expect(fields).toMatchObject({
      reqId: request.id,
      method: 'GET',
      url: '/api/v1/orders/TRN-1?token=[redacted]',
      status: 404,
      code: 'NOT_FOUND',
    });
    expect(fields.ms).toBeGreaterThanOrEqual(0);
    expect(message).toMatch(
      /^GET \/api\/v1\/orders\/TRN-1\?token=\[redacted\] 404 \d+ms NOT_FOUND$/,
    );
    expect(JSON.stringify(logger.info.mock.calls)).not.toContain('secret');
  });

  it('logs a failure as an error and a refused origin as a warning', () => {
    const failed = run();
    failed.finish(500, 'INTERNAL_ERROR');
    expect(failed.logger.error).toHaveBeenCalledOnce();
    const refused = run();
    refused.finish(403, 'INVALID_ORIGIN');
    expect(refused.logger.warn).toHaveBeenCalledOnce();
  });

  it('says so when the client leaves before the answer', () => {
    const { logger, response } = run();
    response.emit('close');
    const [fields, message] = logger.info.mock.calls[0]!;
    expect(fields).toMatchObject({ status: 499, aborted: true });
    expect(message).toContain('(client closed the connection)');
  });

  it('stays quiet for routine traffic that worked', () => {
    const { logger, finish } = run({}, '/uploads/products/a/640.webp');
    finish(200);
    expect(logger.info).not.toHaveBeenCalled();
  });
});

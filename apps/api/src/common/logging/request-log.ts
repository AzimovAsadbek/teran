import { randomUUID } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import type { NextFunction, Request, Response } from 'express';
import type { LevelWithSilent, Logger } from 'pino';
import { redactUrl } from '../security/internal-request.js';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;
/** Nginx's code for a request the client gave up on before it was answered. */
const CLIENT_CLOSED = 499;

/** Reuses a well-formed X-Request-Id from the proxy, so its lines and ours share the id. */
export function requestIdFor(headers: IncomingHttpHeaders): string {
  const header = headers['x-request-id'];
  return typeof header === 'string' && REQUEST_ID_PATTERN.test(header) ? header : randomUUID();
}

/** One finished request, as its log line tells it. */
export interface RequestOutcome {
  method: string;
  /** Path and query string, with secrets in the query redacted. */
  url: string;
  status: number;
  /** Time from arrival to the last byte of the answer, in milliseconds. */
  ms: number;
  /** The `code` of the error answer (ApiErrorBody), when the request failed. */
  code?: string;
  /** The client closed the connection before the answer was complete. */
  aborted?: boolean;
}

/** Traffic with nothing to report while it works: health checks, stored files, CORS preflights. */
function isRoutine(method: string, path: string): boolean {
  return method === 'OPTIONS' || path.startsWith('/api/v1/health/') || path.startsWith('/uploads/');
}

/**
 * How loud a finished request is:
 * - error: the API failed (5xx);
 * - warn: refused for a reason worth a look: rate limited, or a browser request from a foreign
 *   origin (an attack, or WEB_ORIGIN no longer matching the site's address);
 * - info: everything else, client errors included (their code says why);
 * - silent: routine traffic that worked (health checks, stored files, CORS preflights).
 */
export function requestLogLevel(outcome: RequestOutcome, path: string): LevelWithSilent {
  if (outcome.status >= 500) return 'error';
  if (outcome.status === 429 || outcome.code === 'INVALID_ORIGIN') return 'warn';
  if (outcome.status < 400 && isRoutine(outcome.method, path)) return 'silent';
  return 'info';
}

/** `GET /api/v1/catalog/products?pageSize=8 200 12ms`, then the error code of a failed request. */
export function requestLogMessage(outcome: RequestOutcome): string {
  const line = [outcome.method, outcome.url, String(outcome.status), `${outcome.ms}ms`];
  if (outcome.code) line.push(outcome.code);
  if (outcome.aborted) line.push('(client closed the connection)');
  return line.join(' ');
}

/**
 * The API's request log: one line per request, written when its answer is complete, e.g.
 *
 *   {"level":"info","time":"2026-10-21T05:31:12.345Z","reqId":"7bce04be-…","method":"GET",
 *    "url":"/api/v1/catalog/categories","status":200,"ms":12,"msg":"GET /api/v1/catalog/categories 200 12ms"}
 *
 * It is the first middleware (configure-app.ts), so it also sees the requests that later
 * middleware answers on its own: refused origins, bodies too large or malformed, stored files.
 * It gives every request its id (X-Request-Id, reused when the proxy sent one): the answer carries
 * it in the same header and in error bodies, and every log made while handling the request
 * carries it as `reqId`. Error answers leave their code in `response.locals.errorCode`
 * (AllExceptionsFilter, the origin check).
 */
export function requestLog(logger: () => Logger) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const id = requestIdFor(request.headers);
    request.id = id;
    response.setHeader('X-Request-Id', id);
    // Read now: a router mounted below a prefix (/uploads) rewrites the request's url while it
    // works, and may finish the answer before restoring it.
    const { method, path } = request;
    const url = redactUrl(request.originalUrl) ?? request.originalUrl;
    const started = performance.now();
    let written = false;

    const write = () => {
      if (written) return;
      written = true;
      const aborted = !response.writableFinished;
      const errorCode: unknown = response.locals.errorCode;
      const outcome: RequestOutcome = {
        method,
        url,
        status: aborted && !response.headersSent ? CLIENT_CLOSED : response.statusCode,
        ms: Math.round(performance.now() - started),
        ...(typeof errorCode === 'string' ? { code: errorCode } : {}),
        ...(aborted ? { aborted } : {}),
      };
      const level = requestLogLevel(outcome, path);
      if (level !== 'silent')
        logger()[level]({ reqId: id, ...outcome }, requestLogMessage(outcome));
    };
    response.once('finish', write);
    response.once('close', write);
    next();
  };
}

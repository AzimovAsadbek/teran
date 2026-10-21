import { randomUUID } from 'node:crypto';
import type { ConfigService } from '@nestjs/config';
import type { Params } from 'nestjs-pino';
import { stdTimeFunctions } from 'pino';
import type { Env } from '../../config/env.js';

/**
 * The API's one logger (pino, through nestjs-pino), written for the person who reads it later:
 *
 * - one JSON object per line, the time in ISO 8601 (UTC) and the level as a word, without the
 *   process id and host name (one process per container):
 *   {"level":"warn","time":"2026-10-21T05:31:12.345Z","context":"OrdersService","orderNumber":"TRN-…","msg":"Order confirmation e-mail failed"};
 * - in development the same lines pretty-printed (pino-pretty);
 * - a log made while handling a request carries the request's id (`reqId`); the request lines
 *   themselves are written by requestLog() (request-log.ts), which sees every request.
 *
 * docs/deployment/production.md ("Logs") explains how to read and search them.
 */
export function loggerParams(config: ConfigService<Env, true>): Params {
  const pretty = config.get('NODE_ENV', { infer: true }) === 'development';
  return {
    pinoHttp: {
      level: config.get('LOG_LEVEL', { infer: true }),
      timestamp: stdTimeFunctions.isoTime,
      base: undefined,
      // pino-pretty reads the numeric level; the JSON lines spell it out.
      formatters: pretty ? undefined : { level: (label) => ({ level: label }) },
      // Never log credentials, session/cart cookies or personal data sent in bodies.
      redact: {
        paths: [
          'req.headers.cookie',
          'req.headers.authorization',
          'res.headers["set-cookie"]',
          'password',
          '*.password',
        ],
        remove: true,
      },
      autoLogging: false,
      quietReqLogger: true,
      // requestLog() has already given the request its id.
      genReqId: (request) => request.id ?? randomUUID(),
      transport: pretty
        ? {
            target: 'pino-pretty',
            options: { singleLine: true, translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname' },
          }
        : undefined,
    },
  };
}

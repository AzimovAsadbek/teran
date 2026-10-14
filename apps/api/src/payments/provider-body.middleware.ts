import type { NextFunction, Request, Response } from 'express';
import { UNPARSABLE_BODY } from './providers/payme.service.js';

/** Provider callbacks are small; anything larger is not a genuine request. */
const LIMIT_BYTES = 16 * 1024;

/**
 * Reads the body of a payment provider callback before the global JSON parser sees it. Payme sends
 * JSON-RPC (documented with a `text/json` content type, which the global parser ignores) and must
 * get a JSON-RPC error for malformed JSON rather than an HTTP 400; Click sends form-encoded data.
 * Once the stream has been read, the global parser skips the request.
 */
export function providerBodyReader(format: 'json' | 'form') {
  return (request: Request, response: Response, next: NextFunction): void => {
    if (request.method !== 'POST') {
      next();
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    let done = false;
    request.on('data', (chunk: Buffer) => {
      if (done) return;
      size += chunk.length;
      if (size > LIMIT_BYTES) {
        done = true;
        response.status(413).json({
          statusCode: 413,
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Payload too large',
        });
        request.resume();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => {
      if (done) return;
      done = true;
      const text = Buffer.concat(chunks).toString('utf8');
      if (format === 'form') {
        request.body = Object.fromEntries(new URLSearchParams(text));
      } else {
        try {
          request.body = JSON.parse(text) as unknown;
        } catch {
          request.body = UNPARSABLE_BODY;
        }
      }
      next();
    });
    request.on('error', (error) => {
      if (done) return;
      done = true;
      next(error);
    });
  };
}

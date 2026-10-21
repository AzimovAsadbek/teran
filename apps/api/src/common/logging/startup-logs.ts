import type { LoggerService } from '@nestjs/common';

/** Nest's account of its own start: every module, controller and route, one line each. */
const START_UP_DETAIL = new Set([
  'InstanceLoader',
  'RoutesResolver',
  'RouterExplorer',
  'NestApplication',
]);

function isStartUpDetail(params: unknown[]): boolean {
  const context = params.at(-1);
  return typeof context === 'string' && START_UP_DETAIL.has(context);
}

/**
 * The application logger with Nest's start-up detail lowered to debug: a start then reads
 * "Starting Nest application...", the payment mode and "TERAN API listening on …" (main.ts)
 * instead of some 190 lines listing modules and routes. LOG_LEVEL=debug shows them again.
 */
export function withQuietStartUp(logger: LoggerService): LoggerService {
  return {
    log(message: unknown, ...params: unknown[]) {
      if (isStartUpDetail(params)) logger.debug?.(message, ...params);
      else logger.log(message, ...params);
    },
    error(message: unknown, ...params: unknown[]) {
      logger.error(message, ...params);
    },
    warn(message: unknown, ...params: unknown[]) {
      logger.warn(message, ...params);
    },
    debug(message: unknown, ...params: unknown[]) {
      logger.debug?.(message, ...params);
    },
    verbose(message: unknown, ...params: unknown[]) {
      logger.verbose?.(message, ...params);
    },
    fatal(message: unknown, ...params: unknown[]) {
      logger.fatal?.(message, ...params);
    },
  };
}

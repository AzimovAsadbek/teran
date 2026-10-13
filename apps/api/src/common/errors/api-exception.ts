import { HttpException, HttpStatus } from '@nestjs/common';
import type { ErrorCode, ValidationIssue } from '@teran/contracts';

/**
 * Application error with a stable machine-readable code. Services throw these for expected
 * business failures; the global filter turns them into the ApiErrorBody contract.
 */
export class ApiException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: ErrorCode,
    message: string,
    readonly extras: { issues?: ValidationIssue[]; details?: Record<string, unknown> } = {},
  ) {
    super(message, status);
  }

  static notFound(message = 'Resource not found'): ApiException {
    return new ApiException(HttpStatus.NOT_FOUND, 'NOT_FOUND', message);
  }

  static badRequest(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ): ApiException {
    return new ApiException(HttpStatus.BAD_REQUEST, code, message, { details });
  }

  static conflict(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
  ): ApiException {
    return new ApiException(HttpStatus.CONFLICT, code, message, { details });
  }

  static unauthenticated(message = 'Authentication required'): ApiException {
    return new ApiException(HttpStatus.UNAUTHORIZED, 'UNAUTHENTICATED', message);
  }

  static forbidden(message = 'You do not have permission to perform this action'): ApiException {
    return new ApiException(HttpStatus.FORBIDDEN, 'FORBIDDEN', message);
  }
}

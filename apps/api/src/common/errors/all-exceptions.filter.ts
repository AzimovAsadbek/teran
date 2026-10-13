import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
  type ExceptionFilter,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { ApiErrorBody, ErrorCode } from '@teran/contracts';
import { Prisma } from '../../generated/prisma/client.js';
import { ApiException } from './api-exception.js';

const STATUS_CODES: Partial<Record<number, ErrorCode>> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  429: 'RATE_LIMITED',
  503: 'SERVICE_UNAVAILABLE',
};

/** Errors raised by Express middleware (body-parser, multer) carry an HTTP status of their own. */
interface HttpLikeError {
  status?: number;
  statusCode?: number;
  expose?: boolean;
  type?: string;
  message?: string;
}

function isHttpLikeError(error: unknown): error is HttpLikeError {
  return (
    typeof error === 'object' && error !== null && ('statusCode' in error || 'status' in error)
  );
}

/**
 * Converts every error into the ApiErrorBody contract. Client errors keep their message;
 * server errors are logged with the stack and answered with a generic message so internals
 * (SQL, file paths, stack traces) never reach the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request & { id?: string }>();
    const response = http.getResponse<Response>();
    const body = this.toBody(exception);
    body.requestId = typeof request.id === 'string' ? request.id : undefined;

    if (body.statusCode >= 500) {
      this.logger.error(
        { err: exception, requestId: body.requestId, path: request.originalUrl },
        'Unhandled error while processing request',
      );
    }

    if (!response.headersSent) {
      response.status(body.statusCode).json(body);
    }
  }

  private toBody(exception: unknown): ApiErrorBody {
    if (exception instanceof ApiException) {
      return {
        statusCode: exception.getStatus(),
        code: exception.code,
        message: exception.message,
        issues: exception.extras.issues,
        details: exception.extras.details,
      };
    }

    if (exception instanceof ThrottlerException) {
      return {
        statusCode: 429,
        code: 'RATE_LIMITED',
        message: 'Too many requests, please try again later',
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        statusCode: status,
        code: STATUS_CODES[status] ?? (status >= 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST'),
        message: status >= 500 ? 'Internal server error' : this.httpMessage(exception),
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === 'P2002') {
        return {
          statusCode: 409,
          code: 'CONFLICT',
          message: 'A record with the same unique value already exists',
        };
      }
      if (exception.code === 'P2025') {
        return { statusCode: 404, code: 'NOT_FOUND', message: 'Resource not found' };
      }
      if (exception.code === 'P2003') {
        return {
          statusCode: 409,
          code: 'CONFLICT',
          message: 'The record is still referenced by other data',
        };
      }
    }

    if (isHttpLikeError(exception)) {
      const status = exception.statusCode ?? exception.status ?? 500;
      if (status >= 400 && status < 500) {
        const message =
          exception.type === 'entity.parse.failed'
            ? 'Malformed JSON body'
            : (exception.message ?? 'Bad request');
        return { statusCode: status, code: STATUS_CODES[status] ?? 'BAD_REQUEST', message };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    };
  }

  private httpMessage(exception: HttpException): string {
    const response = exception.getResponse();
    if (typeof response === 'string') return response;
    if (typeof response === 'object' && 'message' in response) {
      const { message } = response;
      if (typeof message === 'string') return message;
      if (Array.isArray(message)) return message.map(String).join('; ');
    }
    return exception.message;
  }
}

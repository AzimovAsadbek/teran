import { HttpStatus, StandardSchemaValidationPipe } from '@nestjs/common';
import type { ValidationIssue } from '@teran/contracts';
import { ApiException } from '../errors/api-exception.js';

interface StandardIssue {
  message: string;
  path?: readonly (PropertyKey | { key: PropertyKey })[];
  code?: string;
}

function toValidationIssue(issue: StandardIssue): ValidationIssue {
  const path = (issue.path ?? [])
    .map((segment) => (typeof segment === 'object' ? segment.key : segment))
    .map(String)
    .join('.');
  return { path, code: issue.code ?? 'invalid', message: issue.message };
}

/**
 * Validates every `@Body/@Query/@Param({ schema })` against the shared Zod contracts and reports
 * failures as `VALIDATION_FAILED` with per-field issues. Unknown keys are stripped by the schemas,
 * which prevents mass assignment.
 */
export function createValidationPipe(): StandardSchemaValidationPipe {
  return new StandardSchemaValidationPipe({
    exceptionFactory: (issues) =>
      new ApiException(HttpStatus.BAD_REQUEST, 'VALIDATION_FAILED', 'Request validation failed', {
        issues: (issues as readonly StandardIssue[]).map(toValidationIssue),
      }),
  });
}

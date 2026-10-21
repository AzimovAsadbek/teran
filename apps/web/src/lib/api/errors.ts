import type { ApiErrorBody, ErrorCode } from '@teran/contracts';

/** An error response from the TERAN API, carrying the contract body when available. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody | null,
  ) {
    super(body?.message ?? `API request failed with status ${status}`);
    this.name = 'ApiError';
  }

  get code(): ErrorCode | null {
    return this.body?.code ?? null;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
}

/**
 * The API gave no answer at all: unreachable, or not within the time allowed. Not an ApiError,
 * which is an answer with a status. Its message says which call failed and why; it carries no
 * stack, since Next.js prints errors thrown in cached loaders even when the caller catches them,
 * and one line per failure says all there is.
 */
export class ApiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiUnavailableError';
    this.stack = `${this.name}: ${message}`;
  }
}

export async function readErrorBody(response: Response): Promise<ApiErrorBody | null> {
  try {
    const body: unknown = await response.json();
    return body && typeof body === 'object' && 'code' in body ? (body as ApiErrorBody) : null;
  } catch {
    return null;
  }
}

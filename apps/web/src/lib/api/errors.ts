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

export async function readErrorBody(response: Response): Promise<ApiErrorBody | null> {
  try {
    const body: unknown = await response.json();
    return body && typeof body === 'object' && 'code' in body ? (body as ApiErrorBody) : null;
  } catch {
    return null;
  }
}

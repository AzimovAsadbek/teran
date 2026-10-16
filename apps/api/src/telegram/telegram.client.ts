/**
 * Minimal Telegram Bot API client (sendPhoto, sendMessage) over the built-in fetch. The bot token
 * is part of every request URL, so nothing derived from a request (URLs, raw errors) is ever
 * returned or logged: failures become TelegramApiError with a short, token-free description.
 */
/**
 * How a request failed, which decides what may happen next:
 * - unreachable: it never reached Telegram (DNS, connection refused) — safe to try again;
 * - rate_limited: Telegram asked to wait (429) — try again after `retryAfterSeconds`;
 * - rejected: Telegram refused it (4xx: wrong channel, bot not an admin…) — nothing was posted,
 *   but sending again only helps once the cause is fixed;
 * - unknown: no answer (timeout) or a server error — it may have been posted.
 */
export type TelegramFailure = 'unreachable' | 'rate_limited' | 'rejected' | 'unknown';

export class TelegramApiError extends Error {
  constructor(
    message: string,
    readonly failure: TelegramFailure,
    /** Telegram asked to wait (HTTP 429): seconds before the next attempt. */
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(message);
  }
}

interface TelegramResponse {
  ok: boolean;
  result?: { message_id?: number };
  description?: string;
  error_code?: number;
  parameters?: { retry_after?: number };
}

const REQUEST_TIMEOUT_MS = 15_000;
/** Errors raised before a request reaches the server: safe to retry without a duplicate. */
const NOT_SENT_CODES = new Set(['ENOTFOUND', 'ECONNREFUSED', 'EAI_AGAIN', 'ENETUNREACH']);

export class TelegramClient {
  constructor(private readonly options: { apiBase: string; token: string; chatId: string }) {}

  /** Posts a photo with an HTML caption (at most 1024 characters); returns the message id. */
  async sendPhoto(photo: Buffer, caption: string): Promise<string> {
    const form = new FormData();
    form.set('chat_id', this.options.chatId);
    form.set('caption', caption);
    form.set('parse_mode', 'HTML');
    form.set('photo', new Blob([new Uint8Array(photo)], { type: 'image/jpeg' }), 'teran.jpg');
    return this.call('sendPhoto', form);
  }

  /** Posts an HTML text message (at most 4096 characters); returns the message id. */
  async sendMessage(
    text: string,
    options: { replyTo?: string; preview: boolean },
  ): Promise<string> {
    return this.call('sendMessage', {
      chat_id: this.options.chatId,
      text,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: !options.preview },
      ...(options.replyTo
        ? {
            reply_parameters: {
              message_id: Number(options.replyTo),
              allow_sending_without_reply: true,
            },
          }
        : {}),
    });
  }

  private async call(method: string, body: FormData | Record<string, unknown>): Promise<string> {
    const url = `${this.options.apiBase.replace(/\/$/, '')}/bot${this.options.token}/${method}`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        ...(body instanceof FormData
          ? { body }
          : { body: JSON.stringify(body), headers: { 'Content-Type': 'application/json' } }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      const code = errorCode(error);
      if (code && NOT_SENT_CODES.has(code)) {
        throw new TelegramApiError(`Telegram is unreachable (${code})`, 'unreachable');
      }
      const timedOut = error instanceof Error && error.name === 'TimeoutError';
      throw new TelegramApiError(
        timedOut ? 'Telegram did not answer in time' : 'The request to Telegram failed',
        'unknown',
      );
    }
    let payload: TelegramResponse | null = null;
    try {
      payload = (await response.json()) as TelegramResponse;
    } catch {
      payload = null;
    }
    const messageId = payload?.result?.message_id;
    if (response.ok && payload?.ok && typeof messageId === 'number') return String(messageId);
    const description = sanitize(
      payload?.description ?? `HTTP ${response.status}`,
      this.options.token,
    );
    if (response.status === 429) {
      throw new TelegramApiError(
        description,
        'rate_limited',
        payload?.parameters?.retry_after ?? 30,
      );
    }
    throw new TelegramApiError(description, response.status >= 500 ? 'unknown' : 'rejected');
  }
}

function errorCode(error: unknown): string | null {
  const cause = error instanceof Error ? (error as Error & { cause?: unknown }).cause : undefined;
  if (cause && typeof cause === 'object' && 'code' in cause && typeof cause.code === 'string') {
    return cause.code;
  }
  return null;
}

/** Keeps Telegram's short description, without the token (never expected there, but certain). */
function sanitize(text: string, token: string): string {
  return text.split(token).join('[token]').slice(0, 300);
}

/** Run from apps/api with its service environment. Local polling and production webhooks are mutually exclusive. */
import { setTimeout as pause } from 'node:timers/promises';

const [mode] = process.argv.slice(2);
const token = process.env.AUTH_TELEGRAM_BOT_TOKEN,
  secret = process.env.AUTH_TELEGRAM_WEBHOOK_SECRET;
const username = process.env.AUTH_TELEGRAM_USERNAME;
if (!token || !secret || !username)
  throw new Error('Configure all three AUTH_TELEGRAM variables first.');
type Update = { update_id: number };
async function telegram<T>(method: string, body: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch('https://api.telegram.org/bot' + token + '/' + method, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(35_000),
  }).catch(() => null);
  if (!response?.ok)
    throw new Error(
      'Telegram ' + method + ' failed (HTTP ' + (response?.status ?? 'unreachable') + ').',
    );
  const payload = (await response.json()) as { ok: boolean; result: T };
  if (!payload.ok) throw new Error('Telegram refused ' + method);
  return payload.result;
}
async function run() {
  const me = await telegram<{ username: string }>('getMe');
  if (me.username !== username) throw new Error('The configured token belongs to a different bot.');
  const origin = new URL(process.env.WEB_ORIGIN ?? 'http://localhost:3000');
  const route = '/api/v1/auth/telegram/webhook';
  if (mode === 'webhook') {
    if (origin.protocol !== 'https:' || process.env.NODE_ENV !== 'production')
      throw new Error('Webhooks require the production HTTPS storefront origin.');
    const url = new URL(route, origin).href;
    await telegram('setWebhook', { url, secret_token: secret, allowed_updates: ['message'] });
    const status = await telegram<{ url: string }>('getWebhookInfo');
    if (status.url !== url) throw new Error('Telegram did not confirm the webhook URL.');
    console.log('Webhook verified for @' + username);
    return;
  }
  if (
    mode !== 'poll' ||
    process.env.NODE_ENV === 'production' ||
    !['127.0.0.1', 'localhost'].includes(origin.hostname)
  )
    throw new Error('Use poll with a local origin, or webhook with the production origin.');
  const status = await telegram<{ url: string }>('getWebhookInfo');
  if (status.url) throw new Error('This bot already has a webhook. Local polling was not started.');
  const port = Number(process.env.PORT ?? 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('Invalid local API port.');
  const local = 'http://127.0.0.1:' + port + route;
  let offset = 0;
  console.log('Receiving local verification messages for @' + username);
  for (;;) {
    try {
      const updates = await telegram<Update[]>('getUpdates', {
        offset,
        timeout: 25,
        limit: 50,
        allowed_updates: ['message'],
      });
      for (const update of updates) {
        const delivered = await fetch(local, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-telegram-bot-api-secret-token': secret!,
          },
          body: JSON.stringify(update),
          signal: AbortSignal.timeout(12_000),
        });
        if (!delivered.ok) throw new Error('Local API unavailable');
        offset = update.update_id + 1;
      }
    } catch {
      console.error('Telegram updates paused; retrying in five seconds.');
      await pause(5000);
    }
  }
}
run().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Telegram setup failed');
  process.exitCode = 1;
});

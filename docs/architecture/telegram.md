# Telegram channel announcements

How a published product or journal article is announced on TERAN's Telegram channel. Implemented
in `apps/api/src/telegram` (composer, client, service, processor) and the admin area
(`/admin/telegram`, the "Telegram announcement" panel of the product and article editors);
verified by `apps/api/src/telegram/telegram.composer.spec.ts`,
`apps/api/test/telegram.int-spec.ts` (against a simulated Bot API) and the e2e journeys in
`e2e/tests/admin.spec.ts` and `e2e/tests/publishing.spec.ts` (dry-run mode).

> **Status (2026-10-16).** Composition, the outbox, retries, dry-run mode and the admin screens
> are implemented and tested. Nothing has been sent to a real channel: no bot token or channel is
> configured anywhere, and test messages to a real channel need the owner's explicit approval.

## Principles

1. **The website never waits on Telegram.** An item is published in its own transaction; the
   announcement is requested only after that transaction has committed. A Telegram failure is
   recorded on the post, never on the item.
2. **One post per item, ever.** `TelegramPost` is unique on `(entityType, entityId)`: saving again,
   double clicks and retries cannot create a second post. A delivered post is never resent.
3. **Only real data.** The text is built from the item as the storefront shows it: the real name,
   the real price (or "from" the lowest active pack), packs, up to three recorded characteristics,
   the real picture and the public link. Nothing is invented (no discounts, ratings or claims).
4. **Nothing is announced by itself.** Only items an administrator publishes with "Announce on
   Telegram" ticked; drafts never; connecting the bot does not announce existing products.
5. **Secrets stay on the server.** The bot token is an API environment variable; it is never sent
   to the browser, written to the database or logged (Bot API errors are stored without the URL).

## Modes (`TELEGRAM_MODE`)

| Mode       | What happens                                                                        |
| ---------- | ----------------------------------------------------------------------------------- |
| `disabled` | Default. Nothing is composed or recorded; the switch in the editors is unavailable. |
| `dry-run`  | Posts are composed and recorded as "Test: not sent". Telegram is never contacted.   |
| `live`     | Posts are delivered with `TELEGRAM_BOT_TOKEN` to `TELEGRAM_CHANNEL_ID`.             |

`live` refuses to start without both the token and the channel. Use `dry-run` for staging and
demonstrations: the admin area shows exactly what would have been posted.

## Flow

1. The editor saves a product as `ACTIVE` (or an article as `PUBLISHED`) with "Announce on
   Telegram" ticked. The save is validated and committed as usual.
2. After the commit, `TelegramService.requestAnnouncement` checks that the item is still public
   and announced, then creates its `TelegramPost` (`PENDING`) — or leaves an existing one alone.
3. The post is claimed (`PENDING → SENDING`, locked for 90 s) and delivered at once:
   - with a picture: `sendPhoto` with the caption (HTML, at most 1024 visible characters);
   - text too long for a caption: the photo with a short caption, then the rest as a reply message
     (never silently cut);
   - no picture (articles only): `sendMessage`.
     Packaging cut-outs are placed on an ivory square; pictures are sent as JPEG, at most 1280 px.
4. Outcome: `SENT` (with the message ids), or `FAILED` with a reason code. Rate limits
   (`retry_after`) and network failures go back to `PENDING` with a next attempt time, up to three
   attempts; a refusal (e.g. "chat not found") waits for an administrator.
5. Pending posts are processed every minute by the API process itself (`TelegramProcessor`).
6. A claim that expired without an answer becomes `FAILED` with `unknown_outcome`: the post may or
   may not be on the channel, so it is never retried automatically — the administrator checks the
   channel and decides.

## Admin area

- **Editors** (product, article): the switch, the post's state, attempts and the reason of a
  failure in words, "Preview the post" (the exact text and picture, without sending), and
  "Send again" for a failed post.
- **`/admin/telegram`**: the mode and channel, and every post newest first with its item, state,
  attempts, time, the text as sent and "Send again".

Reason codes (shown translated): `unknown_outcome`, `not_published`, `not_enabled`,
`item_deleted`, `image_unavailable`, `internal_error`, `telegram_error: <Telegram's description>`.

## Setting up a real channel

1. Create a bot with [@BotFather](https://t.me/BotFather) (`/newbot`) and keep its token secret.
2. Add the bot to the channel as an **administrator** with the **"Post messages"** permission
   (nothing else is needed: it does not read, edit or delete messages).
3. Set on the API (`.env.production` on the server, never in the repository):
   `TELEGRAM_MODE=live`, `TELEGRAM_BOT_TOKEN=<token>`, `TELEGRAM_CHANNEL_ID=@channel` (or the
   numeric id `-100…` of a private channel), optionally `TELEGRAM_POST_LOCALE` (`uz` by default).
4. Restart the API (`teran up -d`). Existing products are not announced; the next item published
   with the switch on is.
5. Before the first real post, try `dry-run` on the same deployment and compare the previews.

## Limits

- One post per item: a changed price after the announcement is not re-announced.
- A post deleted from the channel by hand is still recorded as sent.

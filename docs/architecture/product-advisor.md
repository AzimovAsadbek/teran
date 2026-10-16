# Product advisor

The storefront's advisor (`/assistant`, "TERAN maslahatchisi") helps a shopper find products in
the live catalogue: "a mild green tea under 100 000 soʻm", "a gift set", "qahva kerak". Implemented
in `apps/api/src/assistant` and `apps/web/src/components/assistant`; verified by
`apps/api/src/assistant/request-parser.spec.ts`, `apps/api/test/assistant.int-spec.ts` (rule-based
mode, and AI mode against a simulated provider) and `e2e/tests/publishing.spec.ts`.

> **Status (2026-10-16).** Rule-based mode is live wherever the API runs. AI mode is implemented
> and tested only against a simulated provider: **no `ANTHROPIC_API_KEY` is configured**, so live
> AI answers have not been verified. Until a key is configured and an integration test with the
> real provider passes, the advisor runs (and says it runs) in rule-based mode.

## Grounding rules

1. **Products come only from the catalogue search.** Every recommendation is a product returned by
   `CatalogService.listProducts` (published, in an active category, purchasable) during this
   request. In AI mode a pick is kept only if the search returned that product id; anything else
   the model names is dropped. Names, prices, pictures and links are the store's own records.
2. **Structured filters, never free-form queries.** The search takes a category slug, a product
   type key, formats, a price range, attribute option keys, a word for the text search, stock and
   a sort — each validated against the catalogue's vocabulary (categories, types, attributes and
   options read from the database, refreshed every five minutes). Model output never reaches the
   database as a query.
3. **Reasons are recorded facts.** Price within the budget, category, pack format, recorded
   attributes (e.g. "Barg turi: Butun barg"), brewing data where the product has it, origin, the
   word found in its description, availability.
4. **Unrecorded qualities are named, not invented.** Quality grade, taste intensity, health effects
   and "easy to brew" are not recorded in the catalogue: the advisor says so in a note and narrows
   by what is recorded. It never makes health or medical claims (such words are filtered out of AI
   reasons as well).
5. **It recommends; it never orders.** Each card links to the product page; the bag and checkout
   are the store's usual ones.

## How a request is answered

```
request (locale, message ≤ 500 chars, ≤ 8 earlier turns)
  → personal data removed (phone numbers, e-mail addresses)
  → AI mode, when a key is configured:
        model ⇄ search_catalog(filters) … (at most 4 turns, 25 s)
        model → recommend(message, picks[productId, reasons], notes, followUp)
        picks kept only if returned by search_catalog; claims filtered
     on any provider error or timeout → rule-based mode
  → rule-based mode:
        request read with the catalogue vocabulary: prices ("100 000 gacha", "до 150 тысяч",
        "under 100000", ranges), category and product type names in uz/ru/en, pack formats,
        attribute options and yes/no attributes (with negation), gift intent, a descriptive word
        → search; if nothing matches, criteria are relaxed one at a time (word → attributes →
          formats → same category over budget, cheapest first → category) and the answer says
          which was dropped
  → answer: message, what was understood (criteria), up to 4 products with reasons, notes,
    and a short follow-up question when the request was vague or nothing matched exactly
```

New categories and product types (coffee, sweets…) work without code changes: the vocabulary and
the attribute filters come from the catalogue data.

## Safety

- `POST /api/v1/assistant/recommend` is public, validated (zod) and rate limited to 12 requests
  per minute per visitor. `GET /api/v1/assistant/status` reports the mode (`ai` or `basic`).
- The key (`ANTHROPIC_API_KEY`) is server-side only and never logged; the browser talks only to
  the TERAN API.
- Nothing about the visitor is sent to the provider except the request text (after redaction) and
  the earlier turns kept by the visitor's own browser. No account, order or payment data is used.
- The conversation is not stored by TERAN.
- Provider failures fall back to rule-based mode; the storefront and checkout never depend on it.

## Configuration

| Variable             | Default                     | Meaning                                       |
| -------------------- | --------------------------- | --------------------------------------------- |
| `ANTHROPIC_API_KEY`  | unset                       | Enables AI mode. Without it: rule-based mode. |
| `ASSISTANT_MODEL`    | `claude-opus-5-5`           | The model used in AI mode.                    |
| `ASSISTANT_API_BASE` | `https://api.anthropic.com` | Provider address (tests point it at a stub).  |

To enable AI mode: set the key on the API (secret store or Vercel project settings), redeploy, then
run a few real requests in each language and check that every product, price and link matches the
catalogue before announcing the feature.

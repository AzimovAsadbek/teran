# SEO architecture

How the storefront presents itself to search engines and answer engines: which pages may be
indexed, under which addresses and languages, with which metadata and structured data, and how
that is tested. Decisions: [ADR-007](decisions.md#adr-007-uzbek-by-default-language-chosen-explicitly)
(languages), [ADR-012](decisions.md#adr-012-demonstration-mode-until-real-content-exists)
(demonstration mode), [ADR-035](decisions.md#adr-035-ordering-closed-at-the-api-prices-out-of-the-page-data-real-status-codes-for-crawlers)
(status codes, structured data) and [ADR-060](decisions.md#adr-060-one-indexing-decision-per-build-language-versions-only-where-the-text-exists)
(indexing policy, language versions). The work that produced this design is tracked in the
[SEO implementation checklist](../seo-implementation-checklist.md).

## The stack it rests on

- **Next.js 16.4 App Router** (`apps/web`) with Cache Components: page shells are prerendered,
  data streams in. Metadata uses the framework's own APIs — `generateMetadata`, `app/robots.ts`,
  `app/sitemap.ts` — and no SEO library.
- **Languages** (next-intl 4): `uz` (default, no prefix), `ru` (`/ru/…`) and `en` (`/en/…`), the
  enabled set from `NEXT_PUBLIC_ENABLED_LOCALES` (`apps/web/src/i18n/routing.ts`). The proxy drops
  `Accept-Language`, so a URL always serves its own language and nothing redirects a crawler to
  another one; only the visitor's explicit choice (the `TERAN_LOCALE` cookie) does.
- **Content** comes from the NestJS API (`apps/api`): products, categories, collections and
  articles are written in Uzbek and optionally in Russian and English; a missing translation
  falls back to the Uzbek text. Static pages, the help centre and every interface text exist in all
  three languages (`apps/web/messages`, `apps/web/src/content`; `scripts/check-messages.mjs` keeps
  the message files in step).
- **Crawlers that read only HTML** (Googlebot, Yandex, Bing, link previews: `htmlLimitedBots` in
  `next.config.ts`) get pages without streaming, so every tag is in `<head>` and unknown or
  renamed addresses answer 404 or 308.

## Modules and what each owns

| Module                                                      | Owns                                                                                                                                                                             |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/lib/seo/indexing.ts`                          | Whether this build may be indexed at all (see below). Imports nothing, so `next.config.ts` loads it too.                                                                         |
| `apps/web/src/lib/seo/urls.ts`                              | Absolute localised addresses, a page's language versions, the `hreflang` set.                                                                                                    |
| `apps/web/src/lib/seo/metadata.ts`                          | `pageMetadata`: title, description, canonical URL, `hreflang`, Open Graph, page-level `noindex`; share pictures.                                                                 |
| `apps/web/src/lib/seo/robots.ts`                            | `robots.txt` rules, private paths, the robots meta tag every page starts from.                                                                                                   |
| `apps/web/src/lib/seo/sitemap.ts`                           | The sitemap's entries and their alternates.                                                                                                                                      |
| `apps/web/src/lib/seo/json-ld.ts`                           | Safe serialisation of structured data; the organisation's and website's `@id`s.                                                                                                  |
| `apps/web/src/lib/seo/schema.ts`                            | What each page describes: product, article, breadcrumbs, FAQ, the shop and the website. GTIN validation, brand rule.                                                             |
| `apps/web/src/components/seo/json-ld.tsx`                   | The only place a `<script type="application/ld+json">` is written.                                                                                                               |
| `apps/web/src/app/[locale]/layout.tsx`                      | Site-wide defaults: `metadataBase`, title template ("%s — TERAN"), default description, Open Graph and Twitter defaults, the default robots tag.                                 |
| Page files (`app/[locale]/(store)/**/page.tsx`)             | Their own title, description, address, share picture and `locales`, through `pageMetadata`; private pages state `noindex` (and `no-referrer` where the address carries a token). |
| `apps/web/src/app/robots.ts`, `apps/web/src/app/sitemap.ts` | Thin routes over `lib/seo`.                                                                                                                                                      |
| `apps/web/next.config.ts`                                   | `X-Robots-Tag` headers, `htmlLimitedBots`, redirects of renamed products, security headers.                                                                                      |
| `apps/api` (`catalog`, `content`, `common/i18n.ts`)         | The data: visibility rules (only public, published, stocked items reach the sitemap), `locales` per item, `X-Robots-Tag` on API answers.                                         |

`apps/web/src/lib/seo/ownership.test.ts` keeps it that way: canonical and `hreflang` come only from
`lib/seo`, structured data only from `JsonLd`, and every storefront page either goes through
`pageMetadata` (directly or through `categoryMetadata`, `legalMetadata`, `mediaKindMetadata`) or is
`noindex`.

## Indexing policy

`searchIndexing` is decided once, when the web image is built, from three variables that Next.js
writes into the build (the production server runs without them):

1. `NEXT_PUBLIC_DEMO_CONTENT` other than `false` → not indexed (demonstration content, ADR-012).
2. `NEXT_PUBLIC_SEARCH_INDEXING=off` → not indexed. A value other than `auto`, `on`, `off` or empty
   → not indexed (and `deploy.sh` refuses it before building).
3. `NEXT_PUBLIC_SITE_URL` not https, or on localhost, an IP address, a one-label name or a reserved
   name (`.localhost`, `.local`, `.test`, `.example`, `.invalid`, `.internal`, `.home.arpa`) → not
   indexed, `on` or not.
4. A staging-like host — a subdomain whose first label is `staging`, `stage`, `dev`, `develop`,
   `development`, `preview`, `test`, `testing`, `qa`, `uat`, `sandbox` or `demo` (optionally with
   a number), or a hosting platform's address (`*.vercel.app`, `*.netlify.app`, `*.pages.dev`,
   `*.workers.dev`, `*.onrender.com`, `*.herokuapp.com`, `*.github.io`, ngrok, trycloudflare) →
   not indexed unless `NEXT_PUBLIC_SEARCH_INDEXING=on`.
5. Otherwise indexed: `https://terantrade.uz` with `DEMO_CONTENT=false` needs nothing else.

|                     | Indexable build                                                                           | Build that is not indexable                     |
| ------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Robots meta tag     | `max-image-preview:large` (index and follow go unsaid); private and empty pages `noindex` | `noindex, nofollow` on every page               |
| `X-Robots-Tag`      | Only on `/api/*` (`noindex, nofollow`)                                                    | `noindex, nofollow` on every response           |
| `robots.txt`        | `Allow: /`; disallows `/api/` and the private paths in every language; sitemap            | `Disallow: /`, no sitemap                       |
| Canonical, hreflang | As below                                                                                  | Still written (correct for that origin), unused |

The API adds `X-Robots-Tag: noindex, nofollow` to every `/api/v1` answer on any build; stored
pictures under `/uploads` (or in R2) stay indexable.

## Addresses, canonical URLs and languages

- One address per page: no trailing slash (Next.js answers `/en/tea/` with a 308 to `/en/tea`),
  lower-case slugs, Uzbek without a prefix. Renamed products, categories, collections and articles
  answer 308 to the new address; unknown ones 404 (for crawlers; visitors see the same branded
  page).
- **Canonical** = the page's own address in its own language (`localizedUrl`), absolute on
  `NEXT_PUBLIC_SITE_URL`. The only query parameter ever kept is `page` beyond the first page.
  Tracking parameters, filters, sorting and `?variant=` never reach the canonical URL.
- **Language versions** = the enabled languages the item has its own text in (`locales` from the
  API) or, for pages written in every language, all enabled languages. `hreflang` lists every
  version (reciprocal: each version lists the same set, itself included) and `x-default` for the
  Uzbek one; a page with a single version gets a canonical URL and no `hreflang`.
- **A page in a language without its own text** shows the Uzbek text, so it is not a version of its
  own: `noindex, follow`, no canonical, no alternates, and the other versions do not list it.
  Structured data on such a page states the language of the text shown (`inLanguage: uz` for
  articles).
- **Titles**: "Page title — TERAN" from the layout's template; a title that names TERAN already is
  used as it is; product pages read "TERAN 8800 — Green tea, 400 g". Pages beyond the first add
  "— Page N" in the page's language.
- **Open Graph**: `og:url` = canonical, `og:locale` and `og:locale:alternate` for the versions, the
  page's own picture (a product's first photograph, an article's or category's cover, with its
  real size) or the site's default `/brand/og-default.png` (1200 × 630).

## Which pages are offered to search engines

| Pages                                                                                                                                                  | Indexed                                                       | In the sitemap                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- | ------------------------------------- |
| Home, catalogue, about, wholesale, journal, Tea 101, gallery, contact, stores, FAQ and help articles, delivery, returns, privacy, terms, accessibility | Yes, in every language                                        | Yes, every language                   |
| Categories and collections with products                                                                                                               | Yes, in their languages                                       | Yes (the API lists stocked ones)      |
| Categories and collections without products ("coming soon", ADR-041)                                                                                   | `noindex`                                                     | No                                    |
| Products (active, published, with an active pack, in a public category)                                                                                | Yes, in their languages                                       | Yes                                   |
| Articles (published, publication date reached)                                                                                                         | Yes, in their languages                                       | Yes                                   |
| Gallery kind pages (`/media/photos`, `/videos`, `/shorts`)                                                                                             | While something of the kind is published                      | While something is published          |
| Listing pages 2, 3…                                                                                                                                    | Yes, with their number; `noindex` past the last page          | No (reached through pagination links) |
| Filtered or re-sorted listings (`?format=`, `?sort=`, `attr.*`…)                                                                                       | `noindex`                                                     | No                                    |
| Search results (`/search`, `/faq/search`)                                                                                                              | `noindex`, disallowed                                         | No                                    |
| Account, bag, checkout, order status, payments, newsletter, admin                                                                                      | `noindex` (token pages `nofollow`, `no-referrer`), disallowed | No                                    |
| Unknown addresses                                                                                                                                      | 404, `noindex`                                                | No                                    |

## Structured data

Every block is built by a function in `lib/seo/schema.ts` from the data the page shows, and written
by `JsonLd`, whose serialiser turns `<`, `>`, `&`, U+2028 and U+2029 into JSON escapes so nothing a
person typed can end the script tag.

| Type                        | Where                         | Source and rules                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OnlineStore` and `WebSite` | Home page                     | `content/brand.ts` (name, legal name TERAN TRADE MChJ, Namangan, description, slogan) and Admin → Settings → Contact (phones, e-mail, Telegram/Instagram/YouTube profiles). Stable `@id`s `<origin>/#organization` and `<origin>/#website`; the website lists every enabled language. No street address, opening hours, languages of service or ratings: TERAN has not given them.                             |
| `Product`                   | Product pages                 | Name, description, every photograph, the opening pack's SKU, a `gtin` only when the barcode has a valid GS1 length and check digit, the brand only when the product's name carries TERAN, the category. `aggregateRating` and the reviews shown on the page once customers have rated it (ADR-042). `Offer`s per pack with price, currency and availability only while prices are shown (ADR-027); none today. |
| `BreadcrumbList`            | Pages with a visible trail    | The visible trail; a step without its own page is left out; the current page last, without an address.                                                                                                                                                                                                                                                                                                         |
| `Article`                   | Journal articles              | Title, excerpt, cover, publication and change dates, the language of the text shown; author and publisher are TERAN by the organisation's `@id` (no person is invented).                                                                                                                                                                                                                                       |
| `FAQPage`                   | Help articles, wholesale page | The questions and answers shown on the page, written by TERAN. Google shows FAQ rich results only for a few authoritative sites; the markup stays because it describes the page.                                                                                                                                                                                                                               |

Not used, on purpose: `LocalBusiness`/`Store` for the store locator (its entries may be partners'
shops and their opening hours are free text), `Offer` without prices, `Review` of the shop,
`Person` authors, `HowTo`, `Speakable` and `sitelinks` search boxes.

## Sitemap

`/sitemap.xml` is generated per request (`connection()`) from the API's `GET /catalog/sitemap` and
cached under the `catalog` and `content` tags, so a published or withdrawn item appears or leaves
with the next revalidation, never from build-time data. Each page has one entry per language
version, each with the same reciprocal alternates and `lastmod` from the item's last change.
Without the API it still lists the pages written in every language. The help centre's addresses
are the same in every language (checked by a unit test).

## Security and caching

- Structured data and metadata are built from public data only: the cached loaders
  (`lib/data/*`, `'use cache'`) call the API without visitor cookies, so nothing personal can enter
  a cached page, the sitemap or the metadata. Account, bag, checkout and admin pages read with the
  visitor's cookies and are never cached or indexed.
- Prices stay out of the page data while hidden (ADR-035), so no offer can leak them.
- Admin-entered links (networks) are validated by the contracts (`https://` and fixed hosts) before
  they reach `sameAs`.
- The content security policy is unchanged; JSON-LD needs no `unsafe-eval`.

## Environment and deployment

| Variable (production `.env.production`) | Build variable                | Purpose                                                                                      |
| --------------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------- |
| `PUBLIC_ORIGIN`                         | `NEXT_PUBLIC_SITE_URL`        | The canonical origin, `https://terantrade.uz` (required; https, no path, no trailing slash). |
| `DEMO_CONTENT`                          | `NEXT_PUBLIC_DEMO_CONTENT`    | `false` for the real shop.                                                                   |
| `SEARCH_INDEXING`                       | `NEXT_PUBLIC_SEARCH_INDEXING` | `auto` (default), `on` or `off`; see the policy above.                                       |
| `ENABLED_LOCALES`                       | `NEXT_PUBLIC_ENABLED_LOCALES` | The languages served; Uzbek always.                                                          |
| `SHOW_PRICES`                           | `NEXT_PUBLIC_SHOW_PRICES`     | Offers in structured data appear with prices.                                                |

All of them are compiled into the web image: change them and run `./deploy.sh` (it always
rebuilds). After a deployment `deploy.sh` reports whether `robots.txt` lets search engines in.

## Testing and validation

| Layer       | Command                                                   | Covers                                                                                                                                                                                                   |
| ----------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit (web)  | `pnpm --filter @teran/web test` (`src/lib/seo/*.test.ts`) | Indexing policy, robots rules, URLs and `hreflang`, page metadata (canonical, fallback languages, pagination, titles), serialiser, structured data builders, sitemap, ownership, title uniqueness.       |
| Integration | `pnpm test:integration` (`apps/api/test`)                 | `locales` on products, categories, articles and sitemap entries; `X-Robots-Tag` on API answers but not on stored files.                                                                                  |
| End to end  | `pnpm --filter @teran/e2e build:stack && pnpm test:e2e`   | `e2e/tests/seo.spec.ts`: the production build read as Googlebot — head tags of public pages, reciprocal `hreflang`, private and empty pages, 404 and 308, JSON-LD, `robots.txt`, `sitemap.xml`, headers. |

After a deployment, by hand: `curl -s https://terantrade.uz/robots.txt` (a `Sitemap:` line),
`curl -sI https://terantrade.uz/ | grep -i x-robots-tag` (nothing), the page source of a product
(`<link rel="canonical">`, `hreflang`, JSON-LD), and Google's Rich Results Test and Schema Markup
Validator on a product and an article.

## Known limitations and work outside the repository

- Product pages describe products without offers until TERAN publishes prices, so Google reports
  them as products without rich-result eligibility; `shippingDetails` and a return policy need
  TERAN's delivery and returns terms first.
- The Russian and English brand texts are drafts awaiting the owner's approval
  (`docs/business-information-required.md`).
- Pages in a language without their own text are `noindex`, which is correct but means a product
  appears in a language only once its translation is entered.
- `ru`, `en` and `x-default` cover the market; `uz-Cyrl` is not offered.
- Search Console and Yandex Webmaster verification, submitting the sitemap, monitoring coverage
  and Core Web Vitals in the field, and any off-site work are outside this repository.

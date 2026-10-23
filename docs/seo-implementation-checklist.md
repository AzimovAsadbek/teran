# SEO implementation checklist

The plan and progress of the technical SEO hardening of 2026-10-23 (branch
`feat/teran-design-refinement`). How the result works is described in
[SEO architecture](architecture/seo.md); the decision is [ADR-060](architecture/decisions.md).

Status: **Done** (implemented and verified by the named check), **Open** (not done; the reason is
given), **Needs TERAN** (blocked on a fact or decision only the owner can give).

## Baseline (before any change, HEAD `3aec7d8`)

| Check                                                | Result                                                                                                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm lint`                                          | Passed                                                                                                                                           |
| `pnpm typecheck`                                     | Passed                                                                                                                                           |
| `pnpm test`                                          | Passed: contracts 34, API 146, web 103                                                                                                           |
| `pnpm format:check`                                  | Failed on 363 files, all in git-ignored local tooling (`.claude/worktrees`, `.claude/skills`, `apps/web/.impeccable`); every tracked file passes |
| Rendered pages (dev server, `teran_refinement` data) | One `h1` per page, every image with `alt`, canonical and hreflang on every public page, JSON-LD parses                                           |

## Findings

| #   | Finding                                                                                                                                                                                                      | Severity |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| F1  | Indexing depended only on `NEXT_PUBLIC_DEMO_CONTENT`: a build for `http://localhost`, a staging host (the former `staging.terantrade.uz`) or a preview host was indexable, with canonical URLs on that host. | Critical |
| F2  | The API falls back to the Uzbek text when a Russian or English translation is missing (both are optional in the admin area), yet every page listed all three languages in `hreflang` and in the sitemap.     | High     |
| F3  | Every product's structured data named the brand "TERAN", including teapots, juices, water and chocolates whose brand is not recorded anywhere.                                                               | High     |
| F4  | Any 8–14 digit barcode was published as `gtin13` without checking its length or GS1 check digit.                                                                                                             | Medium   |
| F5  | `ContactPoint.availableLanguage` claimed sales support in Uzbek, Russian and English; TERAN has not confirmed this.                                                                                          | Medium   |
| F6  | JSON-LD escaped only `<`; `>`, `&` and the JavaScript line separators U+2028/U+2029 were left as they were.                                                                                                  | Medium   |
| F7  | Paginated journal, collection and gallery pages repeated the title of page 1; titles that already name TERAN ended in "— TERAN" a second time.                                                               | Low      |
| F8  | Gallery kind pages (`/media/photos`, `/media/videos`, `/media/shorts`) were in the sitemap and indexable while empty.                                                                                        | Low      |
| F9  | `robots.txt` did not list the token pages under `/payments` or the help centre's search results, and API responses carried no `X-Robots-Tag`.                                                                | Low      |
| F10 | Article structured data did not reference the organisation's `@id` and stated the page's language even when the text shown was the Uzbek fallback.                                                           | Low      |
| F11 | No SEO architecture document; no automated tests for metadata, sitemap, robots or structured data beyond two Open Graph image assertions.                                                                    | Medium   |

## Plan and progress

### A. One indexing policy per build (F1, F9)

| Item                                                                                                                                                       | Status | Evidence                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------ |
| A1. `lib/seo/indexing.ts`: a pure decision from the public origin, the demonstration flag and `NEXT_PUBLIC_SEARCH_INDEXING` (`auto`, `on`, `off`)          | Done   | `indexing.test.ts`; production-like builds below             |
| A2. Root layout: `noindex, nofollow` when the build is not indexable; only `max-image-preview:large` when it is (nothing to contradict a page's `noindex`) | Done   | `robots.test.ts`; production-like builds below               |
| A3. `robots.txt`: disallow everything when not indexable; otherwise private paths per locale (adds `/payments`, `/faq/search`) and the sitemap's address   | Done   | `robots.test.ts`, `seo.spec.ts`                              |
| A4. `X-Robots-Tag: noindex, nofollow` on every response of a build that is not indexable and on the storefront's own `/api` routes                         | Done   | `seo.spec.ts`; production-like builds below                  |
| A5. API: `X-Robots-Tag: noindex, nofollow` on `/api/v1` responses (stored files under `/uploads` stay indexable)                                           | Done   | `auth-security.int-spec.ts`, `uploads-r2.int-spec.ts`        |
| A6. Deployment: `SEARCH_INDEXING` in the production example, Compose, the web Dockerfile, `deploy.sh` validation and report, the production guide          | Done   | `bash -n deploy.sh`; CI runs shellcheck (not installed here) |

### B. Metadata and languages (F2, F7, F8)

| Item                                                                                                                                                       | Status | Evidence                                                   |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------- |
| B1. `lib/seo.ts` split into focused modules under `lib/seo/` (URLs, metadata, indexing, JSON-LD, schema builders, sitemap), public entry unchanged         | Done   | `ownership.test.ts`                                        |
| B2. Contracts and API: `locales` (languages with their own text) on product detail, categories, collections, article detail and sitemap entries            | Done   | `catalog.int-spec.ts`, `publishing.int-spec.ts`            |
| B3. `hreflang`, `x-default` and `og:locale:alternate` only for translated versions; a page showing the Uzbek fallback is `noindex` and lists no alternates | Done   | `metadata.test.ts`, `urls.test.ts`                         |
| B4. Titles: page number on every paginated listing; no second "— TERAN" when the title names the brand; pages past the last one `noindex`                  | Done   | `metadata.test.ts`, `seo.spec.ts` (`/en/journal?page=999`) |
| B5. Gallery kind pages `noindex` and out of the sitemap while empty                                                                                        | Done   | `app/sitemap.ts`, `media-kind-page.tsx`                    |
| B6. Product share image with its real dimensions; the layout's default share image from the same constant as the pages'                                    | Done   | `metadata.test.ts`                                         |

### C. Structured data (F3–F6, F10)

| Item                                                                                                                                         | Status | Evidence                        |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------- |
| C1. Safe serialiser: escapes `<`, `>`, `&`, U+2028 and U+2029; drops `undefined`                                                             | Done   | `json-ld.test.ts`               |
| C2. Product builder: brand only when the product's own name carries TERAN; GTIN only when valid (`gtin`); offers only while prices are shown | Done   | `schema.test.ts`, `seo.spec.ts` |
| C3. Article builder: `@id`, the language of the text actually shown, author and publisher by the organisation's `@id`                        | Done   | `schema.test.ts`                |
| C4. Breadcrumb builder as a tested pure function                                                                                             | Done   | `schema.test.ts`, `seo.spec.ts` |
| C5. Organisation: unconfirmed `availableLanguage` removed; `WebSite` describes the whole site (root address, every enabled language)         | Done   | `schema.test.ts`, `seo.spec.ts` |

### D. Sitemap (F2, F8)

| Item                                                                                                                        | Status | Evidence                         |
| --------------------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------- |
| D1. Pure sitemap builder: translated versions only, reciprocal alternates, empty gallery kinds left out, no private address | Done   | `sitemap.test.ts`, `seo.spec.ts` |
| D2. Help-centre addresses checked to be the same in every language                                                          | Done   | `sitemap.test.ts`                |

### E. Tests and documentation (F11)

| Item                                                                                                                                  | Status | Evidence                  |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------- |
| E1. Unit tests: indexing policy, URLs and alternates, page metadata, serialiser, schema builders, sitemap, robots, ownership          | Done   | 53 tests in `src/lib/seo` |
| E2. API tests: `locales` in the catalogue, article and sitemap responses; `X-Robots-Tag` on API responses                             | Done   | 1 new test, 3 extended    |
| E3. End-to-end `seo.spec.ts` on the production build: head tags, JSON-LD, status codes, `robots.txt`, `sitemap.xml`, response headers | Done   | 6 tests                   |
| E4. [SEO architecture](architecture/seo.md), ADR-060, links from the overview, the production guide, security and project checklist   | Done   | `docs/`                   |

### F. Verification (2026-10-23)

| Check                                                                                               | Result                                                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Format, lint, typecheck (main checkout and a clean scratch worktree)                                | Passed (`format:check` clean in the worktree, which has none of the ignored local tooling)                                                                                                                                                                                        |
| Unit tests                                                                                          | Passed: contracts 34, API 146, web 156 (103 before)                                                                                                                                                                                                                               |
| API integration tests (`teran_test`)                                                                | Passed: 136 (135 before)                                                                                                                                                                                                                                                          |
| Production build (`build:stack`) and end-to-end suite                                               | Passed: 385 pages generated; 60 end-to-end tests (54 before). The robots default for indexable builds changed afterwards; that branch is not taken by the demonstration build and was checked by the unit tests and the build below                                               |
| Production-like builds served without any `NEXT_PUBLIC_*` variable (the production image's runtime) | `https://terantrade.uz`: `Allow: /`, sitemap on the apex, canonical and hreflang on the apex, robots `max-image-preview:large`, 404 with `noindex` only, no `X-Robots-Tag`. `https://staging.terantrade.uz`: `Disallow: /`, `noindex, nofollow`, `X-Robots-Tag` on every response |
| Live dev servers (`teran_refinement` data)                                                          | Sitemap unchanged (321 addresses, all reciprocal); local origin now `Disallow: /`; TERAN 8800 keeps brand and GTIN; the glass teapot states neither                                                                                                                               |

## Outside this task

Search Console and Yandex Webmaster verification, submitting the sitemap, backlinks and directory
listings are deliberately not part of this work.

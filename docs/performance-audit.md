# Performance audit

Date: 2026-10-29. Scope: the storefront (Next.js 16) and the API it reads, on production builds,
for slow mobile networks and low-end phones. Branch `feat/admin-uploads` from c0903cf; then
integrated with ADR-065 (an 800 px file for phones) and ADR-066 (drawers that open at once) on
`perf/integration-2026-10-29` and measured again (section 13). The changes are in the working
tree, not committed. Decision record:
[ADR-064](architecture/decisions.md#adr-064-a-first-visit-that-stays-light-on-a-slow-phone).
Earlier measurements are in the [QA report](testing/qa-report.md).

Nothing on the live server, in Nginx, DNS, TLS, Cloudflare R2 or the production database was
read or changed. No migration, environment variable or dependency was added.

## 1. Summary

On production builds with Lighthouse's phone profile (applied throttling: processor 4× slower,
1.47 Mbit/s, 562 ms per request), median of three runs:

- **Listing pages are much lighter to parse.** Product cards no longer repeat their icons and
  stars as inline drawings or their long class lists: the catalogue's HTML went from 1,065 to
  640 kB, the search page's from 677 to 445 kB, a category's from 570 to 383 kB. On the
  catalogue the blocking time fell from 572 to 369 ms, the first paint from 2.61 to 2.14 s, the
  speed index from 9.7 to 2.8 s and the score from 60 to 73.
- **A slow connection no longer downloads decorative films.** Where the browser reports data
  saving or 3G or slower, films stay pictures: the phone profile transfers 1.3 MB instead of
  3.9 MB on the home page, 1.1 instead of 4.5 MB on the catalogue, 0.8 instead of 4.2 MB on a
  collection and 0.9 instead of 3.1 MB on a subcategory (score 83 → 92). On a fast connection
  the films play as before (desktop profile, rated 4G).
- **Two pages paint their largest picture 1.6 s sooner.** The for-business and about pages' front
  pack now stands from the first frame: LCP 3.75 → 2.15 s and 3.77 → 2.14 s, scores 86 → 95 and
  86 → 96.
- **The product and store pages start with 33–36 kB less JavaScript** (compressed): the
  validation library is no longer among their first scripts.
- **Unchanged by ADR-064 alone, and taken up after:** the home page's and the catalogue's largest
  paint was one large picture each, and taps that open the menu or the filters took 230–290 ms on
  the slowed processor (section 11, items 1 and 2). ADR-065 and ADR-066 address them; with all
  three integrated (section 13), measured against the baseline in the same hour: home 5.84 → 4.67 s
  and catalogue 4.57 → 3.24 s largest paint, every drawer tap 112–152 ms. The product page's
  largest paint (2.5 s) still waits for its streamed part. Desktop scores stay 99–100, and no page
  measured slower beyond run-to-run noise.
- **Tried and withdrawn on evidence:** asking for the main picture at high priority (Next.js 16's
  `priority` no longer does): no earlier largest paint, a later first paint on the product page
  (section 5).

## 2. Method and conditions

| Item             | Setting                                                                                                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Storefront build | `next build` standalone (Next.js 16.4.2, Turbopack, React 19.3), configured as the live site: no demonstration content, prices hidden, three languages, `NEXT_PUBLIC_SEARCH_INDEXING=auto`                         |
| API              | production mode (`node dist/main.js`, NestJS), its own disposable database `teran_perf` (a copy of the local data: 46 products, 45 on sale, 15 categories, 51 gallery items, 66 product photos, no reviews; 12 MB) |
| Pictures, films  | a copy of the local uploads, served by the API on the same machine (the live site serves them from Cloudflare R2)                                                                                                  |
| Network path     | localhost over HTTP/1.1, no TLS, no Nginx, no CDN; slowed by Lighthouse                                                                                                                                            |
| Lab tool         | Lighthouse 12.8.2 (command line) with Chrome 156, headless; performance category only                                                                                                                              |
| Phone profile    | Lighthouse mobile (412 × 823 at 1.75×) with **applied** throttling (`--throttling-method=devtools`): processor 4× slower, 562.5 ms per request, 1,474.56 kbit/s down, 675 kbit/s up                                |
| Desktop profile  | Lighthouse desktop preset (1350 × 940); with applied throttling it slows neither the network nor the processor                                                                                                     |
| Runs             | 3 per page and profile; the median of each metric                                                                                                                                                                  |
| Machine          | MacBook Pro, Intel Core i9-8950HK (6 cores, 12 threads), 32 GB, macOS (Darwin 24.6), Node.js 24.21                                                                                                                 |
| Load             | other applications open; load average 3–13 during the runs, so absolute times vary by roughly ±10 % from run to run; one search run coincided with a screenshot script and is outlying (the median absorbs it)     |

Applied throttling really slows the network and the processor during the load. Lighthouse's
default (simulated) throttling estimates instead, and on this machine under load its estimates
were skewed (the QA report saw the same: it charges all JavaScript to the largest paint).
Lighthouse 12.8.2 was used throughout this audit; the QA report's earlier figures came from
Lighthouse 13.5 and are not compared here.

The baseline build was measured first. The changed build was then measured the same way, while a
copy of the baseline build kept running on another port: the two pages added later (help centre
and contact) were measured on that copy, and the experiments below ran both builds in turn.

Also measured: page weight by fetching each page directly (exact, no throttling), first-load
JavaScript (every script the HTML asks for, compressed), interaction latency (the Event Timing
API in Chromium through Playwright, processor 4× slower), API response times (curl on the API
directly) and response headers. Before and after screenshots of the changed views were compared
pixel by pixel.

The local path is pessimistic for pages led by a large picture: over HTTP/1.1 Chrome opens up to
six connections and the throttled bandwidth is split between them, while the live site (HTTP/2
behind Nginx) multiplexes one connection and can favour the high-priority picture. Absolute LCP
of such pages is therefore higher here than on the live site; before and after share the path.

**Lighthouse is served the crawler's page.** Its user agent contains `Chrome-Lighthouse`, which
`htmlLimitedBots` (ADR-060) serves as it serves Googlebot: the whole page in one response, without
streaming, with every tag in `<head>`. A visitor's browser gets the streamed page instead (a
prerendered shell in 3–4 ms, the rest as it renders). Sections 6 and 13 measure the crawler's page,
like every earlier Lighthouse figure of this project. A set with a visitor's user agent was tried
in section 13.6; Lighthouse could not finish it.

**Not measured:** real phones, the production network path (Nginx, HTTP/2, TLS, R2), field data
from real visitors (Chrome UX Report or own monitoring; none is collected), Safari and Firefox.

## 3. Budgets

| Metric                          | Budget (phone profile)                                      | Why                                                                                                                      |
| ------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Largest contentful paint (LCP)  | ≤ 2.5 s                                                     | Google's "good" threshold                                                                                                |
| Interaction to next paint (INP) | ≤ 200 ms; in the lab: tap latency ≤ 200 ms at 4× slower CPU | Google's "good" threshold; Lighthouse has no INP for a page load                                                         |
| Total blocking time (TBT)       | ≤ 200 ms                                                    | Lighthouse's "good" threshold, the lab's proxy for INP                                                                   |
| Cumulative layout shift (CLS)   | ≤ 0.1                                                       | Google's "good" threshold                                                                                                |
| Lighthouse performance score    | ≥ 90 where the page allows                                  | a page led by a large photograph cannot load it in 2.5 s at 1.47 Mbit/s                                                  |
| First-load JavaScript           | ≤ 300 kB compressed per page                                | 282–298 kB after the change; the for-business and contact pages carry 319 kB (their forms validate with Zod), section 11 |
| HTML of a listing page          | ≤ 80 kB compressed, ≤ 700 kB uncompressed                   | the phone parses and hydrates the uncompressed HTML and the payload inside it                                            |

## 4. Findings of the baseline, ranked

Measured on the baseline build (phone profile unless said otherwise).

1. **Listing pages were heavy to parse.** The catalogue's HTML was 1,065 kB (75 kB compressed),
   the search page's 677 kB, a category's 570 kB (section 6.3). Each product card repeated its icons as inline
   SVG and its five-star row as ten SVG drawings (450 SVGs for the catalogue's 45 cards), and its
   long class lists (194 kB of class names on the catalogue), once in the HTML and again in the
   React payload inlined in the page. Compression hides most of it on the wire, but a phone parses,
   lays out and hydrates the full size: the catalogue had the highest blocking time measured
   (572 ms) and a speed index of 9.7 s.
2. **Decorative films on every connection.** Films (0.7–1.9 MB each) started after the page had
   loaded, whatever the connection: 2.6 MB on the home page, 3.4 MB on the catalogue and the
   collection page, 2.2 MB on a subcategory, out of 3–4.5 MB in total. On a 1.47 Mbit/s link
   that is 15–20 s of the visitor's bandwidth and data after the page is usable, and the speed
   index counts the frames as unfinished painting.
3. **The product page fetched its main picture late.** The pouch on a TERAN tea's page (the
   largest picture) was requested at **low** priority 1.25 s after the page started, behind the
   scripts. Next.js 16 turned `priority` into `preload`, which adds a preload link but no longer
   sets `fetchPriority="high"`; the same applied to every `next/image` picture marked `priority`.
   (The API's renditions, ADR-009, set it themselves and were not affected.)
4. **The largest picture of two pages arrived with an animation.** The for-business page's front
   pack (one of a fan of five) started transparent (`arrive-pack`), so it counted as painted only
   when the fade ended: LCP 3.76 s with motion, 2.11 s on the same build with reduced motion
   forced (`--force-prefers-reduced-motion`, three runs each, taken in turn). The about page's
   front pack was set down from 94 % (`set-down`), so a side pack, painted later at full size,
   outgrew it and became the largest paint: LCP 3.77 s against a first paint at 2.13 s.
5. **The validation library on two first loads.** The product page and the store locator loaded
   Zod (32 kB compressed, 113 kB of JavaScript to parse) on first view, for one number
   (`REVIEW_COMMENT_MAX`) and one list (`STORE_KINDS`) imported from the contracts' main entry,
   whose modules define schemas. The project's own rule (`@teran/contracts/constants`) exists for
   exactly this.
6. **The home page's first picture is large for a phone.** The phone crop of the first view is
   fetched at 960 px (264 kB) for a 412 px wide phone at 1.75× (721 px needed): the API makes
   320, 480, 640, 960… px renditions, so the next step up is 960. It shares the 1.47 Mbit/s link
   with the fonts (130 kB), the styles (39 kB) and the scripts, and arrives after 4.2 s. The
   catalogue's banner is the same case (203 kB at 960 px). LCP 5.1 s and 4.4 s.
7. **Every page ships the same 30 kB of interface messages**, including the account, checkout and
   payment texts (11 kB uncompressed) that only those pages use, and the not-found page's product
   suggestions (8 kB) in every page's payload.
8. **Unknown addresses answer a visitor's browser with 200** and `noindex`: the page streams, so
   the status is sent before the not-found page is known. Crawlers get a real 404: Googlebot,
   Yandex, Bing and link previews are served without streaming (`htmlLimitedBots`, ADR-060), as
   `seo.spec.ts` checks and section 13 confirmed for both builds. Not a fault, and not changed by
   this work. (A first version of this finding said "answer 200" without that distinction; it had
   been measured with a browser's user agent.) The measured "help" address is such a page (LCP
   4.9 s).

Checked and found fine: time to first byte 3–4 ms for every page (the pages are prerendered
shells, the rest streams; 15–80 ms to the last byte without throttling); no layout shift above
0.035; fonts subset and swapped with fallback metrics; the first view's pictures preloaded per
screen size; the animation library (GSAP) loaded only on the first scroll; the API answers in a
few milliseconds (section 6), and a whole page, its streamed parts and API reads included, is
complete in 15–80 ms without throttling.

## 5. What was changed

| Change                                                                                                            | Files                                                                                                                                                                                                                                                                       | Why        |
| ----------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Card parts as named utilities (the same classes)                                                                  | `apps/web/src/styles/globals.css` (`card-shell`, `card-swatch`, `card-badges`, `card-pill`, `card-body`, `card-family`, `card-family-icon`, `card-title`, `card-rating`, `card-origin`, `card-chip`, `card-chip-icon`, `card-order`), `components/catalog/product-card.tsx` | finding 1  |
| The card's icons drawn once per page, referenced with `<use>`                                                     | `components/catalog/card-icons.tsx` (new), `app/[locale]/(store)/layout.tsx`, `app/[locale]/admin/products/[id]/preview/page.tsx`, `product-card.tsx`                                                                                                                       | finding 1  |
| A star row is one masked strip                                                                                    | `components/catalog/stars.tsx`, `globals.css` (`star-row`)                                                                                                                                                                                                                  | finding 1  |
| Films stay pictures with data saving or on 3G and slower                                                          | `lib/motion.ts` (`isLightConnection`, `useFilmsAllowed`), `lib/motion.test.ts` (new), comments in `components/content/looping-film.tsx`                                                                                                                                     | finding 2  |
| A card's film waits until the card has stayed on screen 500 ms                                                    | `components/catalog/product-film.tsx`, `product-film.test.tsx`                                                                                                                                                                                                              | finding 2  |
| The front pack of the for-business and about pages' fans stands from the first frame; the other four still arrive | `wholesale/page.tsx`, `about/page.tsx`, `globals.css` (comment), `docs/design/design-system.md`                                                                                                                                                                             | finding 4  |
| `REVIEW_COMMENT_MAX` and `STORE_KINDS` in the Zod-free constants                                                  | `packages/contracts/src/constants.ts`, `reviews.ts`, `content.ts`; `components/product/review-form.tsx`, `components/stores/store-locator.tsx`                                                                                                                              | finding 5  |
| Regression tests                                                                                                  | `e2e/tests/performance.spec.ts` (new), the unit tests above                                                                                                                                                                                                                 | section 10 |
| Documentation                                                                                                     | this file, ADR-064, `docs/testing/test-strategy.md`                                                                                                                                                                                                                         |            |

Nothing was hidden or removed from what a visitor sees: the same cards, pictures, films (on a
connection that can carry them), texts and links. The one visible difference is in the pack fans
of the for-business and about pages: the front pack is there from the first frame while the four
others arrive beside it, as before.

**Tried and not kept.**

- `fetchPriority="high"` on the product page's pouch (finding 3). The picture was requested
  0.45 s sooner (at 0.8 s instead of 1.26 s) and arrived 0.1 s sooner, but the first paint came
  0.13 s later in every run, because the picture then shares the link with the styles, and the
  largest paint did not move (2.61 → 2.62 s): it waits for the styles and for the page's streamed
  part to be parsed (a 230 ms task on the slowed processor). On the for-business page it made no
  difference (LCP 2.12 s against 2.13 s, motion reduced, three runs each, builds in turn). It was
  withdrawn there, and from the about page's pack and the home and contact pages' fallback
  pictures, where it had not been measured on its own.
- For the for-business fan, the about page's arrival (`set-down`) without a fade: its front pack
  then starts at 94 %, a side pack painted later at full size outgrows it, and that one becomes
  the largest paint (3.48–3.61 s in three runs). Then every pack rising without a fade: the about
  page's frame clips a rising pack, so the same would happen there.

## 6. Results

### 6.1 Phone (Lighthouse, median of three runs)

| Page                      | Score   | FCP s       | LCP s       | TBT ms    | CLS           | Speed index s | Transferred kB | Requests |
| ------------------------- | ------- | ----------- | ----------- | --------- | ------------- | ------------- | -------------- | -------- |
| Home                      | 66 → 68 | 2.28 → 2.25 | 5.10 → 5.07 | 467 → 416 | 0.000 → 0.000 | 3.53 → 3.44   | 3,866 → 1,275  | 73 → 64  |
| Catalogue                 | 60 → 73 | 2.61 → 2.14 | 4.43 → 4.54 | 572 → 369 | 0.000 → 0.000 | 9.66 → 2.79   | 4,494 → 1,081  | 64 → 58  |
| Category (tea)            | 87 → 89 | 2.16 → 2.17 | 2.59 → 2.56 | 294 → 272 | 0.000 → 0.000 | 2.67 → 2.63   | 942 → 936      | 71 → 70  |
| Subcategory (green tea)   | 83 → 92 | 2.20 → 2.18 | 2.51 → 2.49 | 237 → 181 | 0.000 → 0.000 | 8.75 → 2.47   | 3,114 → 860    | 72 → 66  |
| Collection                | 92 → 92 | 2.07 → 2.09 | 2.47 → 2.48 | 189 → 201 | 0.000 → 0.000 | 3.32 → 2.63   | 4,188 → 777    | 64 → 58  |
| Product (TERAN 8009) ¹    | 87 → 85 | 1.96 → 2.09 | 2.61 → 2.62 | 328 → 366 | 0.000 → 0.000 | 3.50 → 3.24   | 1,469 → 895    | 62 → 61  |
| Journal                   | 95 → 96 | 1.94 → 1.95 | 2.38 → 2.34 | 120 → 109 | 0.000 → 0.000 | 2.34 → 2.28   | 858 → 860      | 40 → 40  |
| Article                   | 93 → 94 | 1.95 → 1.94 | 2.39 → 2.37 | 203 → 190 | 0.035 → 0.035 | 2.42 → 2.42   | 646 → 646      | 37 → 37  |
| For business ¹            | 86 → 86 | 2.14 → 2.15 | 3.77 → 3.59 | 135 → 169 | 0.000 → 0.000 | 2.40 → 2.37   | 687 → 689      | 48 → 48  |
| Help centre (FAQ)         | 95 → 95 | 2.01 → 2.00 | 2.01 → 2.00 | 148 → 157 | 0.000 → 0.000 | 2.12 → 2.10   | 531 → 533      | 38 → 38  |
| Search                    | 88 → 90 | 2.09 → 2.05 | 2.57 → 2.53 | 321 → 277 | 0.000 → 0.000 | 2.30 → 2.23   | 775 → 770      | 68 → 68  |
| Gallery                   | 93 → 94 | 2.19 → 2.16 | 2.19 → 2.17 | 227 → 187 | 0.000 → 0.000 | 1.75 → 1.71   | 1,469 → 1,470  | 53 → 53  |
| Stores                    | 95 → 97 | 1.95 → 1.94 | 1.95 → 1.94 | 178 → 112 | 0.014 → 0.014 | 2.13 → 2.12   | 597 → 592      | 43 → 42  |
| Contact                   | 95 → 95 | 2.14 → 2.17 | 2.14 → 2.17 | 165 → 150 | 0.000 → 0.000 | 2.23 → 2.25   | 668 → 670      | 37 → 37  |
| Unknown address (`/help`) | 68 → 69 | 1.97 → 1.97 | 4.94 → 5.02 | 461 → 377 | 0.000 → 0.000 | 4.03 → 4.04   | 632 → 634      | 48 → 48  |

Baseline build against the changed build, each page three times in a row (2026-10-29, 00:25–00:57
and 01:10–01:50). Transferred kilobytes include everything the page fetched within the run, films
included.

¹ Measured on an intermediate build that still asked for the pouch and the front pack at high
priority and set the for-business fan down without a fade, both withdrawn since (section 5). The
final build's figures for these pages, and for the about page, are in 6.1b.

### 6.1b Final build, pages whose last change came after the run above

| Page                 | Score   | FCP s       | LCP s       | TBT ms    | CLS           | Speed index s | Transferred kB | Requests |
| -------------------- | ------- | ----------- | ----------- | --------- | ------------- | ------------- | -------------- | -------- |
| Product (TERAN 8009) | 89 → 89 | 1.92 → 1.93 | 2.47 → 2.48 | 290 → 304 | 0.000 → 0.000 | 3.40 → 3.11   | 1,471 → 875    | 62 → 60  |
| For business         | 86 → 95 | 2.12 → 2.15 | 3.75 → 2.15 | 124 → 132 | 0.000 → 0.000 | 2.38 → 2.36   | 687 → 688      | 48 → 48  |
| About                | 86 → 96 | 2.14 → 2.14 | 3.77 → 2.14 | 132 → 100 | 0.000 → 0.000 | 2.48 → 2.45   | 613 → 615      | 44 → 44  |

Baseline build and final build in turn (base, final) three times per page, 2026-10-29 02:05–02:30,
median of three. The final build is the working tree as it stands.

### 6.2 Desktop (Lighthouse, median of three runs)

| Page                 | Score     | FCP s       | LCP s       | TBT ms  | CLS           | Speed index s | Transferred kB | Requests |
| -------------------- | --------- | ----------- | ----------- | ------- | ------------- | ------------- | -------------- | -------- |
| Home                 | 100 → 100 | 0.25 → 0.23 | 0.25 → 0.23 | 28 → 23 | 0.000 → 0.000 | 0.99 → 1.04   | 6,925 → 6,924  | 88 → 88  |
| Catalogue            | 99 → 99   | 0.31 → 0.26 | 0.75 → 0.64 | 36 → 24 | 0.000 → 0.000 | 1.06 → 0.97   | 5,267 → 5,275  | 93 → 93  |
| Product (TERAN 8009) | 100 → 100 | 0.18 → 0.18 | 0.59 → 0.57 | 8 → 13  | 0.014 → 0.014 | 0.94 → 0.91   | 1,573 → 1,565  | 72 → 71  |

The desktop profile is rated 4G, so films still play there and the transferred bytes stay the same.

### 6.3 Page weight (exact, by fetching each page)

Uncompressed HTML (what the phone parses), compressed HTML (what crosses the network), the React
payload inlined in the page, and the JavaScript the page asks for as it loads (compressed). "Before"
is the baseline build, "after" the final one, fetched the same minute.

| Page           | HTML kB     | Compressed kB | Inline payload kB | `<svg>` elements | First-load JS kB (compressed) |
| -------------- | ----------- | ------------- | ----------------- | ---------------- | ----------------------------- |
| Home           | 580 → 514   | 77 → 75       | 259 → 235         | 238 → 139        | 298 → 298                     |
| Catalogue      | 1,065 → 640 | 75 → 68       | 577 → 365         | 703 → 254        | 287 → 286                     |
| Category (tea) | 570 → 383   | 55 → 52       | 312 → 222         | 320 → 141        | 287 → 286                     |
| Subcategory    | 404 → 310   | 50 → 48       | 225 → 181         | 180 → 91         | 287 → 286                     |
| Collection     | 323 → 270   | 48 → 47       | 182 → 156         | 114 → 65         | 287 → 286                     |
| Product        | 360 → 331   | 55 → 54       | 179 → 175         | 149 → 100        | **321 → 288**                 |
| For business   | 248 → 252   | 47 → 48       | 139 → 141         | 51 → 52          | 319 → 319                     |
| Search         | 677 → 445   | 59 → 55       | 366 → 252         | 404 → 165        | 287 → 286                     |
| Stores         | 152 → 155   | 34 → 35       | 95 → 96           | 30 → 31          | **325 → 289**                 |
| Help centre    | 203 → 207   | 39 → 40       | 121 → 124         | 58 → 59          | 283 → 282                     |
| Contact        | 171 → 175   | 37 → 38       | 101 → 103         | 34 → 35          | 319 → 319                     |
| About          | 197 → 201   | 42 → 43       | 116 → 119         | 35 → 36          | 282 → 281                     |
| Journal        | 177 → 180   | 36 → 37       | 106 → 108         | 30 → 31          | 281 → 280                     |
| Gallery        | 249 → 253   | 43 → 44       | 116 → 118         | 71 → 72          | 290 → 290                     |

Pages without product cards carry the shared icon set (about 4 kB uncompressed, 1 kB compressed).
The product and store pages still fetch the validation library later, once loaded and idle, when
the router prefetches the contact page (whose form needs it): at 5–8 s in the Lighthouse runs,
instead of among the first scripts at 3.2–3.7 s, so it no longer competes with the first view and
the contact page then opens at once.

### 6.4 The for-business page's fade, isolated

Same baseline build, the same minute, runs taken in turn (normal motion, then forced reduced
motion, three times):

| For business (baseline build)          | Score | FCP    | LCP    | LCP render delay |
| -------------------------------------- | ----- | ------ | ------ | ---------------- |
| Motion as shipped (`arrive-pack` fade) | 84    | 2.18 s | 3.76 s | 2.02–2.07 s      |
| Reduced motion (no fade)               | 96    | 2.11 s | 2.11 s | 0.39–0.40 s      |

With the front pack standing from the first frame, the final build paints the largest picture
with the first paint: 2.15 s on the for-business page and 2.14 s on the about page (6.1b).

### 6.5 Interaction latency

Taps measured with the Event Timing API (the duration INP reports: input delay, processing and
the next paint) in Chromium through Playwright, phone-sized (412 × 823 at 1.75×), processor 4×
slower, five loads per tap and build, builds in turn, median (ms; the API rounds to 8 ms):

| Tap                         | Baseline | Final |
| --------------------------- | -------- | ----- |
| Catalogue: open the filters | 232      | 232   |
| Catalogue: open the menu    | 248      | 248   |
| Home: open the menu         | 288      | 272   |
| Product: next picture       | 96       | 120   |

No change beyond noise: this pass worked on loading, not on what a tap runs. Opening the menu and
the filters takes 230–290 ms on the slowed processor, above the 200 ms budget (section 11, item 2).

### 6.6 Server

The API in production mode on the perf database, measured directly with curl (one cold request,
then the median of five):

| Read                                              | Warm median | Size  |
| ------------------------------------------------- | ----------- | ----- |
| `GET /catalog/products?locale=uz` (the catalogue) | 19 ms       | 30 kB |
| `GET /catalog/products?locale=uz&q=choy` (search) | 22 ms       | 30 kB |
| `GET /catalog/products?locale=uz&category=tea`    | 20 ms       | 24 kB |
| `GET /catalog/products/teran-8009?locale=uz`      | 11 ms       | 4 kB  |
| `GET /catalog/categories?locale=uz`               | 6 ms        | 5 kB  |
| `GET /catalog/collections?locale=uz`              | 6 ms        | 2 kB  |
| `GET /content/settings?locale=uz`                 | 4 ms        | 17 kB |
| `GET /catalog/sitemap`                            | 8 ms        | 7 kB  |

The storefront's pages answer their first byte in 3–4 ms on both builds (the prerendered shell)
and finish streaming in 16–81 ms without throttling; the final build finishes the search page in
35 ms instead of 58 ms and the collection in 27 ms instead of 37 ms (less markup to render). With
46 products the database is not a bottleneck: no query plan was needed to explain any delay, and
none was run. Indexes should be reviewed with real query plans (`EXPLAIN ANALYZE` on a copy, never
on production) once the catalogue is several times larger.

## 7. Caching

Response headers of the production build (unchanged):

| Response                                   | `Cache-Control`                                           | Notes                                                                               |
| ------------------------------------------ | --------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Pages                                      | `private, no-cache, no-store, max-age=0, must-revalidate` | prerendered shells with streamed parts (`x-nextjs-postponed: 1`); compressed (gzip) |
| `/_next/static/*` (scripts, styles, fonts) | `public, max-age=31536000, immutable`                     | content-hashed names                                                                |
| `/uploads/*` (API renditions, films)       | `public, max-age=31536000, immutable`                     | every rendition has its own address (ADR-009)                                       |
| `/_next/image` (brand pictures only)       | `public, max-age=315360000, immutable`                    | AVIF or WebP by the browser's `Accept`                                              |

Decisions: no caching rule was changed. Pages stay uncached because their streamed parts hold
stock, prices (when shown) and the visitor's session; nothing user-specific or price-related was
made cacheable. Observation (not changed): the Next.js image cache lives inside the web container
(`/app/apps/web/.next/cache/images`, writable by the `node` user, not a volume), so each deploy
starts it empty and the first visitors after a deploy wait for the brand pictures to be encoded
again. A volume for it is an infrastructure choice for the owner (section 11).

## 8. Slow networks

- **Films:** none is fetched with data saving on, or where the browser rates the connection 3G
  or slower (`navigator.connection.effectiveType`, Chromium-based browsers). The pictures they
  start from stay, so nothing is missing. Chrome rates Lighthouse's phone profile 3G (it reports
  `effectiveType: "3g"`, rtt 550 ms, downlink 1.4 Mbit/s; checked through the DevTools protocol
  with the same settings), so its runs after the change fetch no film; the desktop profile is
  rated 4G (rtt 50 ms, 10 Mbit/s) and plays the films as before. A real 4G connection (round
  trips under about 270 ms) is rated 4G. Browsers that do not report the connection (Safari, Firefox) behave as before.
- **Cards:** a card's film starts only after the card has stayed on screen for half a second; a
  visitor flicking through a listing no longer starts a film per card passed.
- **The first picture:** announced in the document (preload) as before. Asking for it at high
  priority was measured and not kept (section 5): on this profile the largest paint waits for the
  styles, which the picture would then compete with.
- **Unchanged and already in place:** films only after the page's `load` event and only near the
  screen; GSAP only on the first scroll; below-the-fold pictures lazy; fonts with `swap` and
  fallback metrics; the shell answered in milliseconds and the rest streamed.

## 9. Security, SEO and accessibility

- **SEO:** no metadata, robots, sitemap, canonical, hreflang or structured-data code changed;
  the work of 52dd433 (one indexing decision per build) is untouched. The `noindex` of unknown
  addresses is unchanged. Pages keep their full server-rendered content.
- **Security:** no header, CSP, authentication, validation or rate limit changed. The star mask is
  a `data:` SVG in CSS, which the existing `img-src 'self' data: …` already allows; the API still
  validates every review and store with the same schemas (the constants moved, the rules did not).
- **Accessibility:** the icons stay `aria-hidden` decorations next to their text; the stars stay
  `aria-hidden` beside the rating text; films stay decorative and still under reduced motion and
  the footer's pause switch; the for-business fan still keeps still with reduced motion.
- **Visual check:** before and after screenshots (412 px phone, 1.75×) of a product card, the
  product page's still life and the for-business fan: the card differs in 45 of 213,408 pixels
  (anti-aliasing), the still life only in the cup's moving film, the fan not visibly (its end
  position is the same).
- **Dependencies:** none added or upgraded.

## 10. Tests

New checks that guard this work, deterministic enough for continuous integration (they run with
the end-to-end suite on the production build):

- `e2e/tests/performance.spec.ts`: the home page, the catalogue and a TERAN tea's page load no
  validation library (no first-load script contains `ZodError`); the tea's pouch is announced in
  the document (`<link rel="preload">`) and never lazy; on the for-business and about pages the
  front pack (the one loaded at once) has no animation while the four others do; the catalogue's
  cards point at the shared icon set (`<use href="#card-icon-…">`, five symbols on the page).
- `apps/web/src/lib/motion.test.ts`: which connections count as slow (data saving, `slow-2g`,
  `2g`, `3g`) and which do not (`4g`, none reported).
- `apps/web/src/components/catalog/product-film.test.tsx`: no film fetched on a slow connection;
  none for a card only scrolled past (on screen 300 ms, then gone); a card's film once it has
  stayed on screen.
- The existing stars test (`stars.test.tsx`) still checks the filled width and that the stars are
  hidden from assistive technology.

Lighthouse is not gated in CI: its timings vary too much on shared runners (section 11, item 11).

Results of the gates on this working tree:

| Command                                                     | Result                                                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `pnpm format:check`                                         | passed                                                                                            |
| `pnpm lint`                                                 | passed (ESLint in every package, the message catalogue check: 1,998 keys × 3 languages in sync)   |
| `pnpm typecheck`                                            | passed                                                                                            |
| `pnpm test`                                                 | passed: contracts 34, API 170, storefront 174 tests                                               |
| `pnpm test:integration`                                     | passed: 18 files, 148 tests (PostgreSQL in Docker, ffmpeg through the local wrapper)              |
| `pnpm --filter @teran/e2e build:stack` then `pnpm test:e2e` | passed: 68 tests (desktop Chrome and a Pixel 7 profile), the four new ones included, none retried |

The production build of the storefront was built three times for the measurements (baseline, an
intermediate build, the final one) and once more by the end-to-end stack.

## 11. Remaining bottlenecks and follow-ups

In order of expected effect on a phone. Items 1 and 2 were taken up the same day (ADR-065 and
ADR-066, integrated and measured in section 13); the others were not started. The first item's
data step and the infrastructure items need the owner's decision.

1. **Done in ADR-065 (section 13).** **Lighter first pictures (API, server data).** The home page's and the catalogue's largest paints
   (5.1 s and 4.5 s on the phone profile) are bound by one picture each: 264 kB and 203 kB at 960 px
   for a 412 px phone. Adding an intermediate width (720 or 800 px) to the API's picture widths
   (`IMAGE_WIDTHS`, `apps/api/src/media/image-processing.ts`), and AVIF next to WebP for page
   pictures, then making the new renditions of the existing pictures (new objects only, nothing
   deleted from R2), would shrink these by roughly the share of pixels saved (about 30 % at 800 px,
   44 % at 720 px). This changes stored data on the server, so it is the owner's decision. Capping
   the first view at 2× on 3× phones would save more but makes it softer, which the owner asked to
   avoid (ADR-040).
2. **Done in ADR-066 (section 13).** **Taps that open the menu and the filters.** On a processor 4× slower than this machine's,
   opening the menu takes 250–290 ms and the filters 230 ms from tap to the next paint (section
   6.5), above the 200 ms budget; a mid-range phone is in that range. Profiling what these taps
   render (the header and the drawers) is the next step for interaction speed.
3. **Schemas on submit for the contact and for-business forms.** Both pages load Zod (32 kB
   compressed) on first view because their forms validate on the device. Loading the schema on
   submit, as the newsletter form does, removes it; the form must then block a second press while
   the schema loads and say so if it cannot load, and the for-business form needs
   `BUSINESS_TYPES` and `REGIONS` in the constants first. Not done now: the contact page, where
   every card's "Order" leads, already meets every budget (score 95, LCP 2.1 s, TBT 165 ms), and
   the order form is not worth risking a double submission for 32 kB.
4. **Interface messages per page.** Every store page ships 30 kB of messages; the account,
   checkout and payment texts (11 kB) are used only on their own pages. Giving those pages their
   own provider (the unmerged branch `perf/scoped-intl-messages` split all of them per page) would
   save about 3 kB compressed per page and some parsing.
5. **The not-found suggestions in every payload (8 kB).** The store's not-found boundary renders
   eight product cards and is part of every page's React payload. Loading them when the boundary
   shows would remove them from the other pages.
6. **The product page's streamed part.** The pouch and its preload arrive after about 185 kB of
   the page's streamed payload, because the page reads the chosen pack (`?variant=`) and its
   product at request time, and the largest paint then waits for that part to be parsed. A
   prerendered shell per product (with stock and prices kept in the streamed part) would put the
   picture in the first bytes; it needs care with freshness, so it is a design task of its own.
   Asking for the picture at high priority alone did not help (section 5).
7. **The image cache across deploys (infrastructure).** A volume for
   `/app/apps/web/.next/cache/images` in `docker-compose.prod.yml` would keep the encoded brand
   pictures across deploys. Not changed here: production configuration is the owner's.
8. **Field data and real phones.** Check PageSpeed Insights (Chrome UX Report) for terantrade.uz
   once it has enough visits, and test a mid-range Android phone on 3G and 4G and an iPhone; this
   audit is lab data only.
9. **Unknown addresses and visitors' browsers.** Crawlers already get 404 (finding 8); a
   visitor's browser gets the streamed page with 200 and `noindex`. A 404 for browsers too would
   mean giving up streaming for every page (or rejecting unknown slugs before rendering, with the
   catalogue's list at hand); no search engine is affected, so it is not recommended.
10. **The article page's small shift (CLS 0.035).** The heading font is not preloaded (on purpose:
    few pages paint a heading first), so the article's cover moves a little when it arrives. Well
    under the 0.1 budget; preloading it on article pages only would remove it.
11. **A scheduled Lighthouse run against staging** with this method (applied throttling, medians
    of three) and the budgets of section 3. Not in pull-request CI: on shared runners the numbers
    vary too much to gate on; the deterministic checks of section 10 run there.

## 12. Rollback

The changes are uncommitted in the working tree of `perf/integration-2026-10-29` (the three
source trees, `feat/admin-uploads`, `claude/beautiful-mccarthy-f71aaa` and
`claude/brave-euler-0e95d9`, are kept as they were). Each group can be
reverted on its own with `git restore <files>` (section 5 lists the files); the new files
(`card-icons.tsx`, `motion.test.ts`, `performance.spec.ts`, this audit) are deleted instead. The
card utilities, the icon set and the star mask go together. Moving the two constants back needs
the contracts package rebuilt (`pnpm --filter @teran/contracts build`). Nothing on a server, in a
database or in a configuration needs undoing; a deploy of these changes runs no migration.

## 13. Integration with ADR-065 and ADR-066 (2026-10-29, evening)

**What was integrated.** Three working trees, each from c0903cf, which contains the SEO work of
52dd433 (checked with `git merge-base --is-ancestor`): `feat/admin-uploads` (ADR-064, this
audit), `claude/beautiful-mccarthy-f71aaa` (ADR-065: an 800 px file for phones, and
`apps/api/scripts/add-renditions.ts`, a dry run unless given `--apply`) and
`claude/brave-euler-0e95d9` (ADR-066: drawers that open at once). Their changes were applied, as
patches and new files, to a new branch `perf/integration-2026-10-29` at c0903cf in a working tree
of its own; the three source trees are kept as they were. The only conflict was the end of
`docs/architecture/decisions.md`, where ADR-065 and ADR-066 had each been added after ADR-063:
ADR-064, ADR-065 and ADR-066 now follow one another, each word for word as written (compared),
with their status lines naming the integration. `docs/design/design-system.md` took two edits in
different sections.

### 13.1 Gates on the integrated tree

Run on the integrated working tree, the same code for every step (2026-10-29, 18:40–19:20):

| Command                                                      | Result                                                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `pnpm format:check`                                          | passed                                                                                      |
| `pnpm lint`                                                  | passed (ESLint in every package; the message check: 1,998 keys × 3 languages in sync)       |
| `pnpm typecheck`                                             | passed                                                                                      |
| `pnpm test`                                                  | passed: contracts 34, API 190, storefront 178 tests                                         |
| `pnpm test:integration`                                      | passed: 19 files, 153 tests (PostgreSQL in Docker, ffmpeg through the local Docker wrapper) |
| `pnpm build`                                                 | passed (every package, production builds)                                                   |
| `pnpm --filter @teran/e2e build:stack`, then `pnpm test:e2e` | passed: 69 tests (desktop Chrome and a Pixel 7 profile), none retried                       |
| `git diff --check`                                           | clean; no trailing whitespace in the new files either                                       |

The first end-to-end run had four film tests fail (a video's length and poster, shorts and iPhone
films in the feed): the local ffmpeg wrapper mounts only the development uploads folder, so ffmpeg
could not read this working tree's `apps/api/storage/e2e-uploads`. With a copy of the wrapper
that mounts that folder (the same image and restrictions: no network, read-only, no
capabilities), the complete suite passed. A test machine's setting, not the code.

### 13.2 SEO regression check

Both builds were built with the same settings (the live site's, with the address
`http://localhost:3200`, so the indexing decision `auto` keeps this copy out of search engines)
and read with four user agents: Googlebot, YandexBot, bingbot and a phone's Chrome. For 42
addresses (public pages in three languages, private and filtered pages, unknown, renamed and
trailing-slash addresses) the two builds answered alike: status, `Location`, `X-Robots-Tag`,
robots meta, canonical, `hreflang` alternates, `og:url` and structured data (JSON-LD, parsed;
picture widths in its addresses set aside). `robots.txt` is identical. `sitemap.xml` has the
same 321 entries with the same language alternates; the `lastmod` of 15 addresses moved (the
`/tea` category and four articles, in three languages), because the backfill recorded the new
width on those rows, which carry their pictures: an effect of running the script, which the live
site will see once too.

Unknown addresses (`/help`, `/no-such-page`, `/products/does-not-exist`, `/tea/no-such-kind`, in
two languages): **404** for Googlebot, YandexBot and bingbot (`htmlLimitedBots`, ADR-060), and
200 with `noindex` for a visitor's browser, whose page streams. Addresses outside the language
tree (`/xx/yy/zz`): 404 for everyone. A renamed product and a trailing slash: 308 to the right
address. All of it is the same on the baseline: **no regression**, and the SEO requirement (real
404s for search engines) holds; finding 8 and item 9 of section 11 were corrected. No file of the
indexing policy, `robots`, `sitemap` or `next.config.ts` changed; their unit tests (`lib/seo`)
and `e2e/tests/seo.spec.ts` (read as Googlebot: head tags, reciprocal `hreflang`, 404 and 308,
JSON-LD, `robots.txt`, `sitemap.xml`, headers) pass.

### 13.3 How the two builds were measured

Two complete stacks side by side, each with its own API and its own copy of the data:

- **Baseline:** the storefront built from c0903cf, its API on the perf database `teran_perf` and a
  copy of the local uploads (no 800 px files).
- **Integrated:** the storefront and API built from this branch, on `teran_perf_int` (a copy of
  `teran_perf`) and its own copy of the uploads, after `add-renditions.ts --apply` on that copy:
  161 files added (10.6 MB), 161 pictures recorded, nothing replaced or deleted; a second run
  found nothing left to add. A dry run before had written nothing (the uploads listing and a
  data-only dump of the database compared before and after). This is the live site's state after
  a deploy and the script.

Both storefronts were built with the same settings as in section 2 (no demonstration content,
prices hidden, three languages, the same site address). Lighthouse 12.8.2, the same phone and
desktop profiles (applied throttling), the same pages; for each page the two builds in turn
(baseline, then integrated), three pairs, medians. Before measuring, each server's pages and
image optimiser were warmed (visitor's and crawler's variants); every Lighthouse run starts a new
browser profile, so the browser cache is cold, as in section 6. Machine as in section 2, load
average 3–12 during the runs.

### 13.4 Phone, Lighthouse's own user agent (the crawler's page), comparable with section 6

Baseline → integrated, median of three runs each (the "Runs" column; one integrated run of the
store locator ended in a Lighthouse error and is left out), measured 2026-10-29, 19:20–21:00:

| Page                      | Runs | Score   | FCP s       | LCP s       | TBT ms    | CLS           | Speed index s | Transferred kB | Requests |
| ------------------------- | ---- | ------- | ----------- | ----------- | --------- | ------------- | ------------- | -------------- | -------- |
| Home                      | 3/3  | 58 → 66 | 2.02 → 2.01 | 5.84 → 4.67 | 792 → 559 | 0.002 → 0.002 | 3.58 → 3.28   | 3,864 → 1,214  | 73 → 64  |
| Catalogue                 | 3/3  | 61 → 80 | 2.11 → 2.16 | 4.57 → 3.24 | 484 → 428 | 0.000 → 0.000 | 9.30 → 2.62   | 4,494 → 1,017  | 64 → 58  |
| Category (tea)            | 3/3  | 86 → 85 | 2.17 → 2.22 | 2.61 → 2.81 | 367 → 346 | 0.000 → 0.000 | 2.69 → 2.73   | 941 → 937      | 71 → 70  |
| Subcategory (green tea)   | 3/3  | 83 → 93 | 2.14 → 2.20 | 2.54 → 2.50 | 223 → 185 | 0.000 → 0.000 | 8.74 → 2.48   | 3,112 → 853    | 72 → 66  |
| Collection                | 3/3  | 91 → 93 | 2.10 → 2.09 | 2.49 → 2.49 | 212 → 182 | 0.000 → 0.000 | 3.38 → 2.63   | 4,188 → 778    | 64 → 58  |
| Product (TERAN 8009)      | 3/3  | 86 → 85 | 1.93 → 1.95 | 2.51 → 2.53 | 356 → 397 | 0.000 → 0.000 | 3.42 → 3.13   | 1,471 → 878    | 62 → 60  |
| Journal                   | 3/3  | 95 → 94 | 1.97 → 1.98 | 2.37 → 2.39 | 136 → 177 | 0.000 → 0.000 | 2.35 → 2.35   | 858 → 858      | 40 → 40  |
| Article                   | 3/3  | 93 → 93 | 1.95 → 1.99 | 2.38 → 2.44 | 215 → 199 | 0.035 → 0.035 | 2.42 → 2.48   | 645 → 647      | 37 → 37  |
| For business              | 3/3  | 84 → 93 | 2.18 → 2.19 | 3.75 → 2.19 | 171 → 196 | 0.000 → 0.000 | 2.44 → 2.40   | 687 → 688      | 48 → 48  |
| Help centre (FAQ)         | 3/3  | 96 → 95 | 1.97 → 2.00 | 1.97 → 2.00 | 155 → 166 | 0.000 → 0.000 | 2.08 → 2.11   | 534 → 534      | 38 → 38  |
| Search                    | 3/3  | 87 → 88 | 2.07 → 2.10 | 2.57 → 2.57 | 363 → 323 | 0.000 → 0.000 | 2.27 → 2.28   | 773 → 771      | 68 → 68  |
| Gallery                   | 3/3  | 92 → 91 | 2.17 → 2.16 | 2.18 → 2.16 | 245 → 278 | 0.000 → 0.000 | 1.73 → 1.74   | 1,469 → 1,292  | 53 → 53  |
| Stores                    | 3/2  | 95 → 96 | 2.01 → 1.98 | 2.01 → 1.98 | 175 → 136 | 0.014 → 0.014 | 2.19 → 2.17   | 597 → 593      | 43 → 42  |
| Contact                   | 3/3  | 94 → 93 | 2.17 → 2.18 | 2.17 → 2.18 | 163 → 201 | 0.000 → 0.000 | 2.25 → 2.27   | 668 → 641      | 37 → 37  |
| About                     | 3/3  | 85 → 95 | 2.17 → 2.18 | 3.77 → 2.18 | 125 → 140 | 0.000 → 0.000 | 2.50 → 2.49   | 613 → 615      | 44 → 44  |
| Unknown address (`/help`) | 3/3  | 65 → 67 | 1.98 → 1.98 | 4.86 → 4.79 | 530 → 490 | 0.000 → 0.000 | 4.01 → 3.97   | 632 → 636      | 48 → 48  |

What moved, and why:

- **The pictures of ADR-065:** the home page's largest paint 5.84 → 4.67 s and the catalogue's 4.57
  → 3.24 s, the phone now fetching the 800 px file (211 kB instead of 264 kB, and 138 instead of
  203 kB).
- **The fans of ADR-064:** for business 3.75 → 2.19 s and about 3.77 → 2.18 s (scores 84 → 93 and
  85 → 95).
- **Films on a slow connection (ADR-064):** the home page, the catalogue and the listings transfer
  0.8–1.2 MB instead of 3.1–4.5 MB, and the speed index of the catalogue and the subcategory falls
  from about 9 s to 2.5 s.
- **Total blocking time** fell on the listings and the home page (catalogue 484 → 428 ms, home
  792 → 559 ms) and rose by 11–41 ms on seven other pages. The same long tasks ran at the same
  moments in both builds; their lengths vary from run to run (the journal's integrated runs: 118,
  177 and 207 ms), so these differences are within the noise of three runs.
- **The category page** (`/tea`) painted its largest picture (the first card's photo, the same file
  at the same moment in both) 0.2 s later: 2.61 → 2.81 s, in all three runs. The cause is looked
  at in 13.12.

### 13.5 Desktop

Baseline → integrated, medians of the valid runs (three pairs, and a fourth pair run later because
Lighthouse stopped four runs with its own errors, `NO_NAVSTART` and `PROTOCOL_TIMEOUT`, while
the machine's Docker virtual machine briefly used five processors; those runs are left out):

| Page                 | Runs | Score     | FCP s       | LCP s       | TBT ms   | CLS           | Speed index s | Transferred kB | Requests |
| -------------------- | ---- | --------- | ----------- | ----------- | -------- | ------------- | ------------- | -------------- | -------- |
| Home                 | 3/3  | 100 → 99  | 0.29 → 0.23 | 0.29 → 0.23 | 57 → 94  | 0.010 → 0.010 | 0.98 → 1.01   | 6,775 → 6,919  | 76 → 88  |
| Catalogue            | 4/3  | 99 → 99   | 0.45 → 0.24 | 0.95 → 0.64 | 107 → 22 | 0.000 → 0.000 | 1.24 → 0.98   | 5,292 → 5,278  | 93 → 93  |
| Product (TERAN 8009) | 3/3  | 100 → 100 | 0.15 → 0.17 | 0.54 → 0.59 | 11 → 7   | 0.014 → 0.014 | 0.88 → 0.93   | 1,569 → 1,573  | 72 → 71  |

The desktop profile is rated 4G: films play on both builds, and the bytes stay the same. Both
builds stay at 99–100.

### 13.6 Phone, a visitor's user agent (the streamed page), a separate setup

**Not measured: Lighthouse could not finish this setup.** With a phone's user agent (no
`Chrome-Lighthouse`, so the streamed page), every run took about 16 minutes and ended with "The
page loaded too slowly to finish within the time limit" and no total blocking time, on both builds;
the set was stopped after four such runs and no figure from it is reported.

The page itself does finish. In Chromium through Playwright, with the same throttling (562.5 ms per
request, 1.47 Mbit/s, processor 4× slower) and the same user agent, the integrated home page's
document finished at 2.4 s and its load event came at 7.6 s; in the 40 s after, 33 requests ran (17
pictures below the first screen, 13 route prefetches, 3 scripts) and the last one finished at
17.3 s. The crawler's page, for comparison: document 1.0 s, load 6.5 s, 15 requests after, the last
at 13.2 s. So the timeouts are Lighthouse's, with a streamed response under its throttling, not a
page that never settles; the visitor's page should be measured with another tool (WebPageTest, or
the field data of item 7 in section 11).

### 13.7 Taps (interaction to next paint)

The method of section 6.5 and ADR-066 (Event Timing in Chromium through Playwright, 412 × 823
at 1.75× with touch, processor 4× slower, load, 1.5 s, tap, 1.2 s, the longest pointer, click or
touch entry), seven loads per tap and build, the builds in turn, median in ms (the API rounds to
8 ms; each load's value listed):

| Tap                          | Baseline | Integrated | Loads (baseline / integrated)                             |
| ---------------------------- | -------- | ---------- | --------------------------------------------------------- |
| Catalogue: open the filters  | 208      | 152        | 216/208/248/192/224/200/200 · 120/152/120/136/168/152/168 |
| Catalogue: open the menu     | 232      | 136        | 216/232/264/216/240/232/216 · 104/136/136/136/152/136/152 |
| Home: open the menu          | 240      | 144        | 240/216/240/232/256/248/232 · 144/152/136/152/136/136/160 |
| Product: next picture        | 104      | 120        | 88/88/120/96/120/104/120 · 104/120/88/120/104/120/120     |
| Home: close the menu         | 192      | 120        | 192/224/184/184/224/192/208 · 104/120/112/136/120/128/128 |
| Catalogue: close the filters | 224      | 112        | 224/240/224/224/288/224/240 · 104/104/112/112/112/96/112  |

Every tap that opens or closes a drawer is now under the 200 ms budget. Against a third build with
ADR-066 alone (the same data as the integrated one), measured afterwards in the same way:

| Tap                          | Baseline | ADR-066 alone | Integrated |
| ---------------------------- | -------- | ------------- | ---------- |
| Catalogue: open the filters  | 256      | 112           | 136        |
| Catalogue: open the menu     | 232      | 120           | 136        |
| Home: open the menu          | 248      | 144           | 144        |
| Home: close the menu         | 208      | 120           | 136        |
| Catalogue: close the filters | 240      | 112           | 120        |

The integrated build stays within 0–24 ms of ADR-066 alone (the API's 8 ms steps; ADR-066's own
setup had 112–136 ms for the same taps). A trace of the filters' tap (three loads each) shows the
same work: Chrome restyles 942–961 elements in 47–52 ms on the integrated page and 855–916 in
38–51 ms on ADR-066's, although the integrated catalogue has 2,748 elements against 3,826 (the
cards' icons are references now, 130 `<use>`). Where the remaining difference comes from was not
isolated; it leaves every tap well under budget.

### 13.8 Picture files chosen by phones

Which file of the first picture a phone fetches (the browser's own choice from `srcset`),
baseline → integrated, measured in Chromium with each device's width and density:

| Page             | Device                       | Baseline fetches | Integrated fetches |
| ---------------- | ---------------------------- | ---------------- | ------------------ |
| Home first view  | 412 px at 1.75× (Lighthouse) | 960.webp 263 kB  | 800.webp 210 kB    |
| Home first view  | 375 px at 2× (iPhone SE)     | 960.webp 263 kB  | 800.webp 210 kB    |
| Home first view  | 390 px at 3× (iPhone 14)     | 1080.webp 303 kB | 1080.webp 303 kB   |
| Home first view  | 360 px at 2× (720p Android)  | 960.webp 263 kB  | 800.webp 210 kB    |
| Catalogue banner | 412 px at 1.75× (Lighthouse) | 960.webp 202 kB  | 800.webp 137 kB    |
| Catalogue banner | 375 px at 2× (iPhone SE)     | 960.webp 202 kB  | 800.webp 137 kB    |
| Catalogue banner | 390 px at 3× (iPhone 14)     | 1280.webp 360 kB | 1280.webp 360 kB   |
| Catalogue banner | 360 px at 2× (720p Android)  | 960.webp 202 kB  | 800.webp 137 kB    |

Phones at 1.75× and 2× (the commonest densities in the 360–412 px range) now take the 800 px file:
20 % fewer bytes for the home page's first view and 32 % for the catalogue's banner. 3× phones
still take 1080 or 1280 px, as before (ADR-065 keeps them sharp). The pictures added by the
script were made from wider files of the same picture; new uploads get 800 px from the original.

### 13.9 Page weight

The visitor's page (no crawler's user agent), fetched directly, baseline → integrated:

| Page           | HTML kB     | Compressed kB | Inline payload kB | `<svg>` elements | First-load JS kB (compressed) |
| -------------- | ----------- | ------------- | ----------------- | ---------------- | ----------------------------- |
| Home           | 580 → 518   | 77 → 75       | 259 → 237         | 238 → 139        | 298 → 299                     |
| Catalogue      | 1,065 → 649 | 75 → 69       | 577 → 370         | 703 → 254        | 287 → 287                     |
| Category (tea) | 570 → 387   | 55 → 52       | 312 → 224         | 320 → 141        | 287 → 287                     |
| Subcategory    | 404 → 313   | 50 → 49       | 225 → 183         | 180 → 91         | 287 → 287                     |
| Collection     | 323 → 272   | 48 → 47       | 182 → 158         | 114 → 65         | 287 → 287                     |
| Product        | 364 → 337   | 55 → 55       | 179 → 175         | 149 → 100        | 321 → 289                     |
| For business   | 248 → 252   | 47 → 48       | 139 → 141         | 51 → 52          | 319 → 320                     |
| Search         | 677 → 450   | 59 → 56       | 366 → 254         | 404 → 165        | 287 → 287                     |
| Stores         | 152 → 155   | 34 → 35       | 95 → 96           | 30 → 31          | 325 → 289                     |
| Help centre    | 203 → 207   | 39 → 40       | 121 → 124         | 58 → 59          | 283 → 283                     |
| Contact        | 171 → 175   | 37 → 38       | 101 → 104         | 34 → 35          | 319 → 320                     |
| About          | 197 → 201   | 42 → 43       | 116 → 119         | 35 → 36          | 282 → 282                     |
| Journal        | 177 → 181   | 36 → 37       | 106 → 109         | 30 → 31          | 281 → 281                     |
| Gallery        | 249 → 255   | 43 → 44       | 116 → 119         | 71 → 72          | 290 → 290                     |

Every `srcset` now lists the 800 px file, which adds a few kilobytes of HTML to listing pages
(the catalogue is 649 kB, against 640 kB for ADR-064 alone); the drawers' code adds about 1 kB of
first-load JavaScript.

### 13.10 Not measured, or not available

- **Production images.** The API, tools and storefront Docker images were not built in this pass
  (CI's "Production images" job and `deploy.sh` build them); `pnpm build` and the end-to-end
  stack's standalone build passed. The tools image is built from the whole `apps/api` with its
  development dependencies (`apps/api/Dockerfile`, stage `tools`), so `tsx
scripts/add-renditions.ts` has what it imports.
- **The backfill on R2.** Run only on a local copy (the folder store). Its R2 path (`HEAD`, and
  `PUT` with `If-None-Match: *`, so an object is never replaced) is covered by unit tests with a
  stubbed R2; no bucket was touched. On the server the dry run lists the plan before `--apply`.
- **An indexable build.** Both builds were measured with the indexing decision `auto` on
  `localhost` (kept out of search engines); a build with the production address or
  `NEXT_PUBLIC_SEARCH_INDEXING=on` was not made. The policy's code is unchanged and its unit tests
  pass.
- **A cold server.** Server caches were warmed before every set, as in section 6; the first visits
  after a deploy (empty image optimiser cache) were not measured.
- **Real phones, the live network path and field data**, as in section 2: not available here;
  Safari and Firefox were not run.
- The audit's own earlier numbers (section 6) were measured under another hour's machine load; the
  tables of this section compare the two builds measured in turn, in the same hour.

### 13.11 Deployment, when the owner decides

Nothing below was run. The changes are not committed; committing and pushing are the
owner's steps:

```bash
# On the development machine, after review (the owner's decision). In the integration tree:
cd .claude/worktrees/perf-integration
git add -A
git commit
# In the main checkout, which is on feat/teran-design-refinement:
cd ../../..
git merge --ff-only perf/integration-2026-10-29
git push origin feat/teran-design-refinement
```

On the server, in the deployment checkout (`deploy.sh` updates the branch saved at installation
by fast-forward only, backs up the database before migrations, and this release has none):

```bash
./deploy.sh
# A manual backup before the pictures' script (section 10 of docs/deployment/production.md):
mkdir -p backups
teran exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom' \
  > "backups/teran-$(date +%F-%H%M).dump"
# List what is missing (writes nothing), then add it (new files only, recorded in the database):
teran run --rm migrate tsx scripts/add-renditions.ts
teran run --rm migrate tsx scripts/add-renditions.ts --apply
```

(`teran` is the deployment guide's alias for `docker compose -p teran-production -f
docker-compose.prod.yml --env-file .env.production --env-file .deploy.env`.) With R2 configured,
the script adds about 160 objects (about 10 MB) beside the existing ones and replaces none; the
storefront's cache is refreshed by the script when it has recorded something.

### 13.12 The category page, measured again

The 0.2 s of 13.4 on `/tea` was looked at with three builds in turn (baseline, ADR-066 alone on
the integrated data, integrated), three runs each, after the other sets (2026-10-30, 00:00):

| Category (`/tea`)   | Baseline | ADR-066 alone | Integrated |
| ------------------- | -------- | ------------- | ---------- |
| Largest paint       | 2.52 s   | 2.52 s        | 2.52 s     |
| First paint         | 2.10 s   | 2.12 s        | 2.15 s     |
| Total blocking time | 229 ms   | 209 ms        | 207 ms     |
| Score               | 91       | 91            | 92         |

The difference did not repeat: in 13.4 the integrated runs had their second parsing task start
about 0.3 s later than the baseline's, with the same requests at the same moments, during a busier
hour. No change of this branch is held responsible for it.

## 14. Final pass (2026-10-30, ADR-067)

The last round of the audit, on the integrated tree (ADR-064 to ADR-066, base c0903cf with the SEO
work 52dd433), in the working tree of `perf/integration-2026-10-29`, not committed. Everything
below was done and measured on this machine. Nothing was committed, pushed or deployed; no live
database, bucket, Nginx, DNS or container was touched. What needs the owner is in 14.17.

### 14.1 How it was measured

- **Two builds side by side**, both standalone production builds configured as the live site (no
  demo content, prices hidden, three languages, indexing `auto`), each with its own API and its
  own copy of the local data: _before_ = the integrated tree as it stood at the start of this pass
  (`:3202`, database `teran_perf_int`), _after_ = this pass (`:3204`, database `teran_perf_final`,
  a copy of `teran_perf_int` with the 1080 px files added by the backfill).
- **Crawler variant (Lighthouse 12.8.2):** Lighthouse's user agent is one of `htmlLimitedBots`, so
  it measures the page crawlers get (not streamed). Phone profile, applied throttling: 4× slower
  processor, 562.5 ms per request, 1.47 Mbit/s down, 675 kbit/s up, 412 × 823 at 1.75×; three
  pairs per page, before and after in turn, medians.
- **Visitor variant (Playwright + Performance API):** the streamed page a visitor gets, same
  throttling through CDP, a phone's user agent; FCP, LCP and its element, long tasks, "blocking
  after FCP" (the sum of each long task's part over 50 ms after FCP, as TBT counts it), bytes by
  type. A different method from Lighthouse: the two sets of numbers are never mixed.
- **Caches:** every load starts with an empty browser cache (cold); the servers' data caches were
  warm (they had served the pages before), which is what a visitor meets on a running site.
- **A caveat found on the way:** during this pass the _before_ build (built 15 hours earlier)
  served the home page and the gallery without their prerendered shell (no `x-nextjs-prerender`
  header, and so no `Link` header preloading the two text fonts), while the _after_ build (fresh)
  served every page from its shell. With the fonts preloaded, they load beside the stylesheet:
  first paint on those two pages comes 0.25 to 0.35 s later, on both builds alike (`/media` while
  both served their shells: FCP 2.21 to 2.24 s on both, fonts requested at 0.68 to 0.73 s on both).
  Pages served from the shell by both builds show the same FCP within 0.1 s. The home page's
  shell is revalidated every hour (`initialRevalidateSeconds` 3600); whether a long-running
  server keeps serving it after that hour is worth a look on the server (14.16).

### 14.2 What still limited the pages

| Finding                                                                                                            | Evidence                                                                    | Done                                                              |
| ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| The home page's first picture (211 kB) loaded for 3.4 to 4.3 s while 486 to 616 kB of other files loaded beside it | Lighthouse requests overlapping the LCP request, three runs                 | Feed posters lazy (−72 kB beside it); fewer bytes in the document |
| Three posters of the film feed, about 8,000 px down the home page, loaded eagerly                                  | `loading="eager"` for the first three cards                                 | All lazy                                                          |
| Pictures inside the page's margins said `sizes="100vw"`                                                            | Drawn width 312 to 380 CSS px against `sizes` 360 to 412 (`naturalWidth`)   | Drawn width in `sizes`                                            |
| Covers, the gallery and page pictures on 3× phones took 1280 px files for 960 to 1080 needed                       | Per picture and phone, eight phones                                         | 1080 px files for those kinds only                                |
| The 404 row of teas was fetched and sent with every page                                                           | 8 of 8 featured products in the HTML of `/contact`, `/wholesale`, `/stores` | Fetched by the browser on the 404 page only                       |
| Every page sent every page's client messages                                                                       | 28 to 43 kB of messages per page                                            | Per page (14.8)                                                   |
| Zod in the first bundle of form pages                                                                              | `@teran/contracts` imported for its schemas and lists                       | Loaded on submission; lists Zod-free                              |
| The backfill moved the sitemap's `lastmod`                                                                         | `updatedAt` set by Prisma on update                                         | Kept as it was                                                    |

Not changed, with the reason: the five packs of the signature teas (122 kB beside the first
picture in two of three slow runs; ADR-051 carries the change between teas with them), the fonts
(130 kB, the text's own), `fetchPriority` and AVIF (no new evidence since ADR-064 and ADR-065).

### 14.3 Pictures

**Which file each phone takes** (`sizes` read from the browser; the file the browser fetched):

| Picture                                                                     | Phone                          | Before     | After     |
| --------------------------------------------------------------------------- | ------------------------------ | ---------- | --------- |
| Home story steps (`home.feature`, `home.banner.3`, 1215 px phone crops)     | 360 px at 3×                   | 1215       | 960       |
|                                                                             | 375 and 390 px at 3×           | 1215       | 1080      |
|                                                                             | 412 px at 1.75×                | 800        | 640       |
| Home range tile (`home.bento.1` phone crop)                                 | 360 px at 3× / 412 px at 1.75× | 1080 / 800 | 960 / 640 |
| Journal cover in cards (home, journal)                                      | 412 px at 1.75×, 375 px at 2×  | 1280       | 1080      |
| Contact picture                                                             | 360, 375 and 390 px at 3×      | 1280       | 1080      |
| Gallery pictures                                                            | 375 and 390 px at 3×           | 1280       | 1080      |
| Catalogue banner (phone crop, drawn 449 CSS px wide by the header's height) | 360 px at 3×                   | 1280       | 1080      |
|                                                                             | other phones                   | unchanged  | unchanged |
| First view's phone crop (1080 px source, the home page's LCP)               | all                            | unchanged  | unchanged |

The home page's first picture and the catalogue banner on Lighthouse's phone (412 px at 1.75×)
keep their 800 px files (ADR-065): the 1080 px width changes nothing on the measured LCP
pictures; it serves 3× phones and the lazy pictures. In each case the file is still at least as
wide as the picture is drawn in device pixels, except the catalogue banner on a 360 px 3× phone
(1080 for 1347 drawn: 2.4 device pixels per CSS pixel instead of 2.85).

**The backfill on the local copy** (`scripts/add-renditions.ts`, 172 pictures):

| Step        | Result                                                                                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dry run     | 84 pictures with every width, 80 files to make (all 1080 px), 14 widths only a new upload can give (small product photos without 800 px, from ADR-065) |
| `--apply`   | 80 files added, 7,878 kB (about 98 kB each), 0 already there, 80 pictures recorded, exit 0                                                             |
| Files       | 1,255 → 1,335; every file that was there has the same size; the 80 new ones are all `1080.webp`                                                        |
| `updatedAt` | unchanged on all 82 rows (categories, collections, articles, gallery items, settings)                                                                  |
| Run again   | 0 files to make, 0 added, exit 0                                                                                                                       |
| Made from   | 47 from a file at least twice as wide (45 of them from 2560 px), 33 from a narrower one (1125 to 1921 px)                                              |

**Fidelity:** luma SSIM (8 × 8 blocks) of each new file against its source file resized to 1080
without re-encoding: median 0.977 (minimum 0.952) for the 47 made from a file twice as wide,
0.982 (minimum 0.968) for the 33 others. Phones were shown the 1280 px file shrunk to the same
size before; against the same reference that scores 0.980 (median of the 69 with a 1280 px file),
the new files 0.978; the new file is as close or closer in 39 of the 69. No visible difference was
looked for beyond these numbers.

### 14.4 Phone, Lighthouse's user agent (the crawler's page)

Three pairs per page, before and after in turn, medians (the 404 page measured again after its request started with the page, the contact and wholesale pages again after their forms' contract moved to loading on first use: the final code in each case):

| Page                  | Score   | FCP s       | LCP s       | TBT ms    | Transferred kB | Requests |
| --------------------- | ------- | ----------- | ----------- | --------- | -------------- | -------- |
| Home                  | 57 → 63 | 2.08 → 2.33 | 4.91 → 4.43 | 953 → 724 | 1,214 → 1,129  | 64 → 62  |
| Catalogue             | 77 → 76 | 2.24 → 2.23 | 3.25 → 3.20 | 521 → 550 | 1,017 → 1,008  | 58 → 59  |
| Category (tea)        | 85 → 82 | 2.23 → 2.24 | 2.84 → 2.92 | 333 → 407 | 939 → 899      | 70 → 70  |
| Product (TERAN 8009)  | 82 → 79 | 2.00 → 1.99 | 2.67 → 2.71 | 497 → 585 | 870 → 830      | 59 → 59  |
| Contact               | 92 → 95 | 2.23 → 2.17 | 2.23 → 2.17 | 222 → 145 | 641 → 600      | 37 → 37  |
| For business          | 95 → 95 | 2.16 → 2.17 | 2.16 → 2.17 | 136 → 142 | 688 → 650      | 48 → 48  |
| Gallery               | 91 → 91 | 1.92 → 2.20 | 1.92 → 2.20 | 334 → 288 | 1,290 → 1,282  | 53 → 54  |
| Unknown address (404) | 64 → 62 | 2.03 → 2.05 | 4.94 → 5.56 | 560 → 532 | 633 → 603      | 48 → 49  |

- **Home:** LCP −0.48 s (load of the first picture 3,933 → 3,643 ms, render delay 312 → 129 ms in
  the median run; images 652 → 575 kB), TBT −229 ms. FCP +0.25 s and the gallery's +0.28 s are
  the fonts' preload of 14.1, not this pass's changes.
- **Category and product:** TBT +74 and +88 ms in the medians, within the spread of the runs
  (product before 474 to 580, after 486 to 619); their first-load JavaScript fell by 31 kB.
- **The 404 page** is slower to its largest picture: its row of teas now comes after the page's
  code has run (5.95 s before the request started with the page; 5.56 s after). Its text and its
  links are there at once; crawlers still get the real 404 status.

### 14.5 Phone, a visitor's user agent (the streamed page)

Before and after in turn on every run, three runs, medians (Playwright and the Performance API, a
separate method, see 14.1):

| Page                  | FCP s       | LCP s       | Blocking after FCP ms | JS kB     | Images kB | Total kB      |
| --------------------- | ----------- | ----------- | --------------------- | --------- | --------- | ------------- |
| Home                  | 2.00 → 2.29 | 4.76 → 4.43 | 178 → 198             | 237 → 240 | 640 → 565 | 1,156 → 1,072 |
| Catalogue             | 2.20 → 2.21 | 3.20 → 3.17 | 146 → 146             | 237 → 240 | 452 → 452 | 963 → 953     |
| Category (tea)        | 2.26 → 2.21 | 2.77 → 2.44 | 188 → 178             | 295 → 264 | 378 → 378 | 878 → 837     |
| Product (TERAN 8009)  | 2.00 → 2.01 | 2.56 → 2.56 | 175 → 217             | 295 → 264 | 278 → 259 | 846 → 784     |
| Contact               | 2.24 → 2.20 | 2.24 → 2.20 | 149 → 109             | 276 → 245 | 86 → 86   | 600 → 558     |
| Unknown address (404) | 1.99 → 2.01 | 4.80 → 5.37 | 220 → 222             | 285 → 245 | 70 → 70   | 598 → 555     |

Measured one build after the other (three runs each, not in turn, so less comparable):
wholesale 2.20 → 2.22 s LCP and 642 → 603 kB; journal 2.36 → 2.35 s and 824 → 741 kB; search
2.49 → 2.52 s and 713 → 703 kB; store locator 2.03 → 2.02 s and 550 → 509 kB. "Blocking after
FCP" moved by up to ±40 ms between runs of the same build; every page measured stays at or under
222 ms, and the catalogue, category and contact pages under 200 ms.

### 14.6 Product page

Measured in the visitor's page (streamed), three loads per build, median: first paint 2.01 →
2.02 s, title and breadcrumb 2.49 → 2.49 s, largest picture 2.57 → 2.58 s, reviews 2.49 s on
both. The first picture (the pack, the LCP) is in the first part of the HTML; the title, the
breadcrumb and the main information arrive in the same response about 0.1 s before it, so nothing
was moved: splitting the page differently would not bring the largest paint earlier, and the
streaming and Cache Components stay as they are.

### 14.7 Main-thread work

The long tasks of the crawler's page are mostly the document's own work (style, layout and paint of
a long page: on the home page 818 ms of style and layout and 543 ms of paint in one run) and the
framework's chunk (`29niy…`, 524 to 647 ms of script). Removing the 404 row and two thirds of the
messages makes the document 24 to 28 kB smaller (uncompressed) on every page, and Zod (33 kB
transferred) is no longer loaded by the contact, wholesale, category, product and 404 pages.
Nothing else was split: the remaining work is rendering a long page, which content-visibility
(ADR-066) addresses only while a drawer is open.

### 14.8 Client messages

What each page family sends to the browser (bytes of JSON, the same in every page of a family):

| Pages                                   | uz before → after        | ru before → after        | en before → after        |
| --------------------------------------- | ------------------------ | ------------------------ | ------------------------ |
| Home, product, bag, journal, about, 404 | 30,281 → 12,824          | 42,994 → 18,244          | 28,070 → 11,877          |
| Store locator                           | 62,485 → 14,747          | 88,745 → 21,001          | 57,822 → 13,559          |
| Catalogue listings                      | 30,281 → 15,144          | 42,994 → 21,392          | 28,070 → 13,966          |
| Contact                                 | 30,281 → 16,645          | 42,994 → 23,525          | 28,070 → 15,386          |
| For business                            | 30,281 → 16,894          | 42,994 → 23,840          | 28,070 → 15,622          |
| Account sign-in pages                   | 30,281 → 20,389          | 42,994 → 29,229          | 28,070 → 18,883          |
| Account addresses and orders            | 30,281 → 25,420          | 42,994 → 36,265          | 28,070 → 23,589          |
| Checkout / demonstration payment        | 30,281 → 14,016 / 14,791 | 42,994 → 20,204 / 21,322 | 28,070 → 13,191 / 13,933 |

(The store locator sent the layout's set twice before: its own provider repeated it.) The
uncompressed HTML of the pages measured fell by 23.8 to 28.2 kB (home 531,951 → 506,128 bytes,
product 346,093 → 318,062, contact 180,231 → 156,414), the 404 row included. The guard
`scripts/check-client-messages.mjs` (115 route files, 132 client components and hooks) runs with
`pnpm lint`, and `e2e/tests/messages.spec.ts` walks every page family in the three languages,
opening the parts that render later (validation, the 404 row), failing on a message the page
lacks.

### 14.9 Forms

The contact and wholesale forms no longer carry their contract in the page: it is loaded when the
form is first used (focus inside it, `prepareContract`), so a submission validates at once,
exactly as before (errors on the fields, focus on the first one); a visitor who never uses the
form never loads it. Submitted before it has arrived, the form
waits for it, says it is sending only if that takes more than 150 ms, and then shows the errors
and focuses the first invalid field as usual. A second press sends nothing (a ref, set at once),
a contract that cannot be loaded is reported as a connection failure with every field kept,
invalid values are refused with the contract's codes (shown in the page's language by
`useValidationMessage`), and the API still validates everything, its verdict shown on the fields
(`use-form-submission.test.tsx`, five cases; the e2e contact and accessibility tests). Zod's chunk
(115.5 kB, 33 kB transferred) is no longer in the first scripts of the contact and wholesale
pages, nor loaded later on the category, product and 404 pages: first-load JavaScript contact 300
→ 269 kB, wholesale 307 → 276 kB (Lighthouse, transferred).

### 14.10 The 404 page

- A page that is found no longer fetches or carries the row: 0 of 8 featured products in the
  HTML of found pages (8 of 8 before), no request to `/api/suggestions` (`not-found.spec.ts`).
- The missing page: crawlers (Googlebot, YandexBot, bingbot) get 404 with `noindex` for an
  unknown product, category and article (`not-found.spec.ts`, and the SEO comparison below); a
  browser gets the branded page with `noindex`, then the row, with one request (the request
  starts with the page, the fetch takes its answer). `/api/suggestions` answers the storefront's
  cached list, prices removed as on the pages while they are hidden, with `noindex, nofollow`.

### 14.11 SEO

The before and after builds were compared on 42 addresses as Googlebot, YandexBot, bingbot and a
visitor (status, redirect, `X-Robots-Tag`, robots meta, canonical, language versions, structured
data): **0 differences**. `robots.txt` identical; `sitemap.xml` byte-identical, 321 addresses,
213 `lastmod`, 1,284 language links, after the backfill added 80 files (the `lastmod` that moved
with ADR-065's first backfill came from that older code; this pass keeps it from moving again).

### 14.12 The image optimiser's cache on a volume

`web-image-cache` (compose) on `/app/apps/web/.next/cache/images` only; the image creates that
folder owned by `node`. Tested in an isolated project (`teran-perfcache-20261030`, its own volume,
loopback port 3998, the web image alone, `no-new-privileges`, all capabilities dropped):

| Step                                                                  | Result                                                                                                                                      |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Start                                                                 | healthy (its own `/api/health` check)                                                                                                       |
| Wordmark at 256 px, first and second request                          | `X-Nextjs-Cache: MISS`, then `HIT` (AVIF)                                                                                                   |
| On the volume                                                         | the file, owned by 1000:1000 (`node`), named with its lifetime (one year for `/_next/static/media`, whose names carry their content's hash) |
| `up --force-recreate` (a new container)                               | healthy; the same picture `HIT`, from the volume                                                                                            |
| Another width, another quality, WebP instead of AVIF, another picture | `MISS` each: a changed source or transformation is a new entry, never the old one                                                           |
| An unknown source                                                     | 404                                                                                                                                         |
| Logs                                                                  | no error, no permission failure                                                                                                             |

Next.js only optimises the brand pictures imported in the code (ADR-009), whose addresses change
with their content, so a release never meets a stale entry for a changed picture. The volume was
left in place (`teran-perfcache-20261030_web-image-cache`, a few kilobytes) rather than deleted.

### 14.13 Production images, built locally

`docker compose -p teran-perfbuild-20261030 -f docker-compose.prod.yml --env-file <synthetic
values> build web api migrate` (no real secret, `PUBLIC_ORIGIN=https://teran.example`, no push,
no container of the production project started):

| Image                           | Size    | Runs as       | Checked                                                                                                                                                                                                                                          |
| ------------------------------- | ------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `teran-web:perf-20261030`       | 412 MB  | `node` (1000) | `server.js`, `.next/static`, `public` present; cache folder owned by `node`; the site address in the browser code, no `localhost`; healthy                                                                                                       |
| `teran-api:perf-20261030`       | 657 MB  | `node` (1000) | healthy against a local copy of the data (`/api/v1/health/ready`: database up), serves the catalogue and the 1080 px widths; refuses a production environment without `COOKIE_SECURE=true` or with demonstration payments not allowed explicitly |
| `teran-api-tools:perf-20261030` | 1.83 GB | `node` (1000) | `tsx scripts/add-renditions.ts` against the local copy, pictures mounted read-only: exit 0, "0 rendition(s) to make"                                                                                                                             |

None of the synthetic secrets is in any image's files or build history, and no `.env` file is in
any image. The site address and the flags (`NEXT_PUBLIC_*`) are fixed at build time, as before.

A second storefront image built for an indexable address (`https://teran-perf-check.uz`, only a
build value) and pointed at the local API: `robots.txt` allows the site and keeps `/api/` and the
private pages out; the home page, the catalogue, a product, contact and the journal answer 200
with no `X-Robots-Tag`, robots `max-image-preview:large` and their canonical address; an unknown
product, category and article answer 404 with `noindex`; `/api/suggestions` says `noindex,
nofollow`; the sitemap lists 321 addresses; the product's structured data has no `offers`, no
`aggregateRating` and no `review` (prices hidden), with a four-step breadcrumb. No `noindex`
reaches a found page.

### 14.14 Device and network checks

Emulated only (Chromium through Playwright and Lighthouse): eight phone sizes and densities for
the pictures (360 to 412 px, 1.75× to 3×), the slow-phone profile above, touch. Not done: real
devices, Safari/WebKit timings, a real 3G or 4G network. Before deploying, by hand on a real
phone (the owner's or a tester's):

- [ ] Home on mobile data: the first picture appears, the feed's posters appear as it is reached.
- [ ] Catalogue, a category, a product: banner, cards and pictures sharp; filters drawer opens.
- [ ] Contact and wholesale: send empty (messages in the page's language), then valid (one
      inquiry arrives; pressing twice sends one), then with the connection off (a connection
      message, fields kept).
- [ ] An unknown address: the 404 page, then its row of teas.
- [ ] Store locator, journal, gallery: pictures sharp on a 3× phone.
- [ ] Each of these in Uzbek, Russian and English.

### 14.15 Gates on the final tree

All on the same working tree as measured above (`gates-final.sh` in the session's scratchpad: the
root scripts in order, then `git diff --check`):

| Gate                                                      | Result                                                                          |
| --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `pnpm format:check`                                       | pass                                                                            |
| `pnpm lint` (ESLint, message keys, client messages guard) | pass                                                                            |
| `pnpm typecheck`                                          | pass                                                                            |
| `pnpm test`                                               | contracts 34, API 192, web 192: all pass                                        |
| `pnpm test:integration`                                   | 153 of 153 (19 files)                                                           |
| `pnpm build` and `build:stack`                            | pass (Turbopack cache cleared first)                                            |
| `pnpm test:e2e`                                           | 75 of 75 (9.9 min), with the ffmpeg wrapper that mounts this tree's e2e uploads |
| `git diff --check`                                        | pass; the new (untracked) files have no trailing spaces either                  |

The first full run found four failures, all dealt with before the run above: the contact form did
not focus its first invalid field, and axe caught its button mid-fade, when the contract arrived
after the press (the state was set outside the press, and the button flashed "sending"; now the
contract is loaded when the form is first used, a late one commits the errors at once, and
"sending" shows only after 150 ms); the new 404 test looked for a single robots tag where the page
has four; and one integration test (`publishing.int-spec.ts`, a film handed over twice at once)
failed once, then passed in two runs of its own and in the full run above.

### 14.16 Remaining issues

- **The home page's LCP on a slow phone is still 4.4 s**, the 800 px first picture (210 kB) sharing
  the line with the text fonts, the stylesheet and the framework's scripts. Next steps, each to
  measure first: a lighter encoding of that one picture, or the signature teas' packs after it.
- **The home page's and the gallery's prerendered shells** (revalidated hourly): on a server that
  has run for hours, check whether they are still served from the shell
  (`curl -sI https://…/ | grep -i x-nextjs-prerender`).
- **The 404 page's largest picture comes 0.6 s later** than when the row was rendered on the
  server (the cost of not sending it with every page).
- **Category and product TBT** varied by ±0.1 s between runs; a WebPageTest or field (CrUX) check
  after the deploy would settle it.

### 14.17 Deployment, owner approvals and rollback

Done and verified locally (no approval needed to review): every change above, the gates (14.15),
the image builds and the cache test (14.12, 14.13), the backfill on a copy of the data.

Needs the owner, in this order:

1. Review the working tree; commit it as AzimovAsadbek (ADR-064 to ADR-067 together); merge into
   `feat/teran-design-refinement`; push.
2. On the server: `./deploy.sh` (it backs the database up before migrations; this pass adds none).
   The compose file adds the `web-image-cache` volume, created by the first `up`.
3. A manual backup of the database (production guide, section 10), then the rendition listing
   and, if it is what was expected, `--apply` (guide, section 6): this writes new files to the live R2 bucket (about 243 files, 18.5 MB, on the development copy: 15.6). Never without the owner.
4. After the deploy: the checklist of 14.14, and `curl -sI https://<site>/api/suggestions` shows
   `x-robots-tag: noindex, nofollow`.

Rollback: the code is one merge (revert it and run `./deploy.sh`); the new 1080 px files are new
keys beside the old ones (nothing was replaced), so a revert of the code leaves them unused, and
restoring the database backup removes the widths from the pictures; the `web-image-cache` volume
is a cache and can be removed when the web container is stopped.

## 15. Final review (2026-10-30, evening)

A last look for bottlenecks left after section 14, on the same working tree and the same setup
(14.1). The decision first: **no further code change was made**; none of what remains has a
cause that a safe change would measurably shorten. The reasons, measured, are below.

### 15.1 The figures reproduced

The final build again, three Lighthouse runs per page (crawler variant), medians:

| Page                  | FCP s | LCP s | TBT ms | CLS   | Transferred kB | Requests |
| --------------------- | ----- | ----- | ------ | ----- | -------------- | -------- |
| Home                  | 2.24  | 4.32  | 380    | 0.000 | 1,129          | 62       |
| Catalogue             | 2.15  | 3.19  | 350    | 0.000 | 1,008          | 59       |
| Category (tea)        | 2.16  | 2.53  | 229    | 0.000 | 898            | 70       |
| Product (TERAN 8009)  | 1.99  | 2.74  | 649    | 0.000 | 826            | 59       |
| Contact               | 2.15  | 2.15  | 136    | 0.000 | 599            | 37       |
| For business          | 2.13  | 2.13  | 118    | 0.000 | 650            | 48       |
| Gallery               | 2.13  | 2.13  | 135    | 0.000 | 1,281          | 54       |
| Unknown address (404) | 1.98  | 5.40  | 426    | 0.000 | 603            | 49       |

LCP reproduces within 0.1 to 0.2 s of section 14; TBT does not (home 724 then 380 ms, catalogue
550 then 350 ms): on this machine TBT moves by a few hundred milliseconds between sessions, so only
paired runs compare builds. The category page's Lighthouse LCP (2.84 → 2.92 s in the pairs of
14.4) is 2.53 s here: variance, not a regression; the visitor measurement in turn gave 2.77 →
2.44 s.

### 15.2 Home page: what the first picture waits for

In all three runs the first picture (the phone crop's 800 px file, 211 kB, the LCP element) is
requested at 0.65 s, with the document's head, and arrives at 4.29 s. Over those 3.6 s the
1.47 Mbit/s line carries 482 kB of other files (24 requests): 236 kB of scripts (the framework's
React DOM chunk 71 kB, the Next.js runtime 45 kB, the page's own chunks, GSAP 11 kB), 130 kB of
fonts (Nunito and Oswald preloaded by the `Link` header at 0.61 s, Fraunces from the stylesheet at
2.3 s), the document (71 kB) and the stylesheet (39 kB). The feed's posters and the signature
teas' packs are no longer among them. The picture is not discovered late (it is in the head), is
not lazy, and is painted 0.12 to 0.16 s after it arrives. What is left is the sum of bytes the page
needs, at that speed.

The levers, and why none was taken:

- **The picture's bytes.** Encoded again from its source, at the same size: quality 82 (as stored
  renditions are) 189 kB, SSIM 0.984 against the unencoded resize; 78: 163 kB, 0.979; 75: 147 kB,
  0.975; 70: 139 kB, 0.972. About 0.2 s less at quality 75, but every rendition would change
  (or the first view would need a quality of its own): a visual decision for the owner, not taken
  here. (The stored 800 px file is 215 kB: it was made from the upload, as ADR-065 makes them.)
- **The fonts' preload.** Without it the stylesheet arrives sooner (14.1) but the text fonts load
  later and the type changes on screen later; not taken without the owner.
- **The scripts.** They are the framework and the page's own components (none is a library that
  could be dropped); route prefetches start only after the page is interactive (5.1 to 7.1 s).
- **The document.** 70 kB compressed: 37 kB of the page's data for hydration and 32 kB of markup
  (2,170 elements). The largest repeated markup is the ribbon's stickers (four drawings, 8 to 10
  copies each, about 420 SVG elements): references to one copy would make the HTML about 1 kB
  smaller once compressed, but each copy is still drawn, so the rendering work stays.

### 15.3 Catalogue, product and category: the long tasks

Chrome traces of the loads (slow-phone profile; tracing slows the page, so only the proportions
count), every main-thread task over 50 ms broken down:

| Page (crawler variant) | Long tasks per load | Style and layout | Script | Paint |
| ---------------------- | ------------------- | ---------------- | ------ | ----- |
| Home                   | 6                   | 50 %             | 34 %   | 12 %  |
| Catalogue              | 6                   | 43 %             | 37 %   | 13 %  |
| Category               | 6                   | 47 %             | 35 %   | 8 %   |
| Product                | 4                   | 40 %             | 49 %   | 8 %   |

Most of the script time is the page's own data (the inline payload) being read and the page
hydrated; Lighthouse attributes 563 to 567 ms (catalogue, category), 702 ms (home) and 976 ms (product)
of script to the React DOM chunk. Prefetching starts after the page is interactive, and the menus'
and search's code is loaded when idle (ADR-066). The visitor's page, measured in turn, stays at
109 to 222 ms of blocking after the first paint (14.5). What remains is rendering and hydrating
long pages (about 4,800 elements on the catalogue, 2,170 on the home page, 1,394 on the product
page): changing that means fewer elements or fewer client components on those pages, a design
change, not a fix.

### 15.4 The 404 page

The message, the way home and the link to the teas are in the HTML and painted first (FCP 1.98 s);
nothing waits for the row of teas. The row's place is held by its placeholder (no shift), and the
row arrives once the page's code runs: one request, started as the page renders, answering 1 to 2
kB compressed (7 to 8 kB, eight teas) in about 3 ms on the server. Its largest picture is the LCP
(5.4 s). There is no user-facing problem to fix: the useful part comes first, and the rest is no
longer paid for by every other page.

### 15.5 Menu and filter taps (laboratory, not field INP)

ADR-066's method: 412 × 823 at 1.75× with touch, processor 4× slower, load, wait 1.5 s, tap, wait
1.2 s; Event Timing entries with an `interactionId`, the interaction's longest one split into
input delay, processing and presentation; opening and closing measured separately (closing after
an opening tap); the build before this pass and the final build in turn, seven loads each, median
(ms; the API rounds durations to 8 ms):

| Tap                          | Before (input / processing / presentation) | Final (input / processing / presentation) |
| ---------------------------- | ------------------------------------------ | ----------------------------------------- |
| Catalogue: open the filters  | 168 (54 / 63 / 48)                         | 168 (52 / 63 / 50)                        |
| Catalogue: close the filters | 112 (43 / 42 / 29)                         | 112 (44 / 41 / 29)                        |
| Catalogue: open the menu     | 168 (54 / 62 / 49)                         | 152 (51 / 60 / 45)                        |
| Catalogue: close the menu    | 144 (44 / 49 / 49)                         | 144 (44 / 51 / 43)                        |
| Home: open the menu          | 192 (27 / 3 / 139)                         | 168 (28 / 3 / 140)                        |
| Home: close the menu         | 144 (13 / 1 / 130)                         | 136 (13 / 2 / 122)                        |

Every tap is under 200 ms on both builds; this pass changed none for the worse (the filter bar now
sits in its own messages provider: the same 168 ms). Against ADR-066's own figures (filters 152,
catalogue menu 136, home menu 144 ms, another session) the final build measures 16 to 24 ms more,
as the integration did (section 13.7). On the catalogue about 50 ms of each tap is input delay (the
page still finishing its own work 1.5 s after loading under a 4× slower processor); on the home
page the cost is presentation (the drawer's first frame). These are laboratory numbers on one
machine; field INP needs real visitors' data (CrUX or RUM) after the deploy.

### 15.6 Pictures, cache and the R2 backfill

- **1080 px renditions** are made for page pictures, journal covers and the gallery only
  (`WIDE_IMAGE_WIDTHS`, `GALLERY_IMAGE_WIDTHS`); product, category and collection pictures keep
  their widths (14.3). Phones pick them as measured in 14.3.
- **The image optimiser's cache**, tested again with the web image rebuilt from the final tree:
  entries left in the volume by the earlier image were served (`HIT`), a new width was a `MISS`
  and then a `HIT` after `up --force-recreate`, six files owned by 1000:1000, no error in the
  logs, the volume kept (`down` without `-v`).
- **Why 80 files and why about 160:** the 160 were ADR-065's 800 px files; the run of 14.3 was on
  a copy that already had them, so it added only the 1080 px ones. Listed (dry run, nothing
  written) on the copy taken before any backfill: 172 pictures, 241 files to make (161 of 800 px,
  80 of 1080 px), 14 widths only a new upload can give. On the development database itself (read
  only, pictures in its folder, R2 switched off): 174 pictures, **243 files (162 of 800 px, 81 of
  1080 px)**, about 10.6 + 7.9 = 18.5 MB, no source file missing. That is what the production
  listing should show, plus two files for each picture uploaded since with the old widths.
- **What gets which width:** product photos, categories and collections get 800 px when they are
  wider than 800 px; page pictures, journal covers and gallery items get 800 and 1080 px when wider;
  a picture only gets a width narrower than a file it already has, never an enlargement.
- **Safety, as tested in 14.3:** the run repeats without effect (second run: 0 to make), a file
  already present is never replaced (local folder: written then linked; R2: `If-None-Match: *`)
  nor deleted, a picture changed meanwhile is left to the next run, `updatedAt` stays on every row
  and the sitemap stays byte-identical.

### 15.7 What was not changed, and why

Nothing in sections 15.2 to 15.4 met the bar (a measured bottleneck, a clear cause, a safe change
with a benefit that can be checked). The working tree is as section 14 left it; the gates of
14.15 apply unchanged, and the checks re-run for this review are in 15.8.

### 15.8 Checks for this review

- No code changed: the code is byte-identical to the state the full gates of 14.15 ran on
  (compared with the backup taken after them); only `docs/` changed since. Those results stand:
  integration 153 of 153, production build and `build:stack` pass, e2e 75 of 75 (three languages,
  menus, filters, forms, the 404 page, SEO: robots.txt, sitemap, canonical, hreflang, JSON-LD).
- Re-run now: `pnpm format:check`, `pnpm lint` (with the client messages guard), `pnpm typecheck`
  and `pnpm test` (contracts 34, API 192, web 192) pass, and `git diff --check` passes.
- Re-measured for this review: the eight pages (15.1), the home page's waterfall (15.2), traces of
  four pages (15.3), the taps on both builds (15.5), the image cache with an image rebuilt from
  the final tree (15.6), and the backfill listing on two copies of the data (15.6).
- Not done: real devices, Safari, a real mobile network, field INP; the live bucket and database
  were not touched.

### 15.9 The live site's PageSpeed report (2026-10-30)

The owner's PageSpeed Insights run on terantrade.uz measured the code deployed before this audit.
Its items, against the branch as it now stands:

| Report item                                                      | Status                                                                                                                                                    |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First picture 960 px (263 KiB) for a 412 px phone                | The 800 px file (ADR-065) and the 1080 px one (ADR-067) exist only after the backfill on the live bucket (production guide, section 6); the code is ready |
| Product cards in the family rows: 640 px files for 262 px        | Fixed: `sizes` says 72 % of the row inside the margins; 480 px at 412 px 1.75×, 800 px (was 960) at 390 px 3×                                             |
| The signature teas' cup: 640 px file for 131 px                  | Fixed: `sizes` says 36 % of the stage on phones; 320 px at 412 px 1.75×                                                                                   |
| Range tiles, packs, the leaves (384 to 480 px for 166 to 262 px) | Correct for the phone's density (Lighthouse compares with CSS pixels); unchanged                                                                          |
| "Increase the compression" of the first picture (80 KiB)         | A visual decision (quality 75 would save about 20 %, 15.2); not taken                                                                                     |
| Legacy JavaScript (14 KiB of polyfills)                          | Next.js's own polyfill module; no setting removes it in Next.js 16                                                                                        |
| Render-blocking CSS (2 files, 41 KiB)                            | Next.js's stylesheets; inlining them was tried and rejected (perf pass of 2026-10-17)                                                                     |
| `cdn-cgi/…/email-decode.min.js` in the critical chain            | Cloudflare's Email Address Obfuscation (Scrape Shield): the owner can switch it off in Cloudflare                                                         |
| The hero film (1.9 MB) in the payload                            | Off on slow or data-saving connections (ADR-064, in the new code); PageSpeed's lab connection is not throttled for real, so it may still load there       |
| Non-composited animations (`clear-in`, `pour-in`)                | Design animations (ADR-051); no layout shift measured                                                                                                     |

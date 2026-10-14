# Final QA and performance report

Date: 2026-10-14. Scope: the official brand content, the functional demo mode, a final visual and
functional review of storefront and admin, and the mobile performance regression reported by
Lighthouse after the redesign.

Environment: macOS (Intel), Node.js 24.21, Chromium 1243 through Playwright 1.63, Lighthouse
13.5.0, PostgreSQL in Docker. Production builds (`pnpm --filter @teran/e2e build:stack`, served
on localhost) for performance, accessibility and end-to-end tests; the development servers with
the full demonstration data (`db:seed:demo`) for the demo journey and the admin review.

Screenshots of the result: [`docs/design/screenshots/demo/`](../design/screenshots/demo/).

## Browser and device coverage

| Environment                               | Result                                                                                                                                                                        |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chromium (Playwright, headless)           | Tested: every automated check, the demo journey, screenshots at 390 × 844 and 1440 × 900, device emulation (Pixel 7)                                                          |
| Chromium (browser pane of the Claude app) | Tested: visual spot checks                                                                                                                                                    |
| Safari / WebKit                           | **Not tested.** Playwright's WebKit is not installed (it needs a download), and driving Safari needs "Allow Remote Automation", a setting only the machine's owner can enable |
| Firefox                                   | **Not tested.** Not installed                                                                                                                                                 |
| Real phones and tablets                   | **Not tested.** None available. Phone layouts were checked with Chromium's device emulation (390 px, Pixel 7); tablet widths were not re-checked in this review               |
| iOS simulator                             | **Not available** (no Xcode on this machine)                                                                                                                                  |

Before launch, at least Safari on an iPhone and Chrome on an Android phone should be checked by
hand: the menu drawer, the filter drawer, the sticky purchase bar, checkout and the admin order
screens.

## Concept comparison

The original TERAN concept screenshot is not in the repository or the workspace, so it could not
be compared side by side. Checked against the written brief instead:

- The homepage does not reproduce the concept's three-card composition. Its order is: hero with
  the official tagline, tea-type rail, the TERAN premium collection (official heading, the five
  identifiers, the five products), the philosophy as a numbered list, the product showcase, the
  brewing guide, the partnership band and the journal.
- The header follows the structure that DAVIDsTEA's header is known for (navigation on the left,
  centred logo, search, account and bag on the right, mega menus for teas and collections), with
  TERAN's own content, colours and type. No DAVIDsTEA asset, text or layout file is used.

## Defects found and fixed in this review

| #   | Defect                                                                                                                                                                             | Where                                 | Fix                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | The main "Add to bag" button collapsed to about 24 px high on phones and on laptops 1024–1279 px wide (`flex-1` gives a 0 % basis in the column layout)                            | Product page                          | `grow` instead of `flex-1`                                                                   |
| 2   | The sticky purchase bar did not appear when the page jumped past the main button in one go (End key, a fast fling), because the observer never saw the button intersect the screen | Product page, phones and tablets      | The observer's root reaches far below the screen, so leaving past the top is always reported |
| 3   | Text typed or autofilled before the page became interactive stayed visible but was not in the form's state: sign-in said "Enter a valid email address" for a visibly valid address | Every form built on the shared fields | Fields hand pre-hydration values to the form once hydrated; end-to-end regression test       |
| 4   | Invalid definition list on the contact page's company card (axe: `definition-list`, `dlitem`)                                                                                      | Contact page                          | The icon moved inside the `<dt>`                                                             |
| 5   | Phone numbers shown raw (`+998900000108`) in the customer list, customer page and enquiries, but formatted on order pages                                                          | Admin                                 | Formatted everywhere (`+998 90 000 01 08`)                                                   |
| 6   | The footer repeated the tagline that the homepage already leads with                                                                                                               | Footer                                | Shows the brand descriptor instead                                                           |
| 7   | The brewing guide offered "Herbal infusion" although the range is Chinese tea                                                                                                      | Homepage                              | Pu-erh (general guidance)                                                                    |
| 8   | The collection products' copy said the brewing guidance is "below" it; on the product page it is above                                                                             | Demo product copy                     | "on this page"                                                                               |
| 9   | After a demo reset, cached storefront pages could point at deleted images for up to an hour                                                                                        | Demo tooling                          | Seed and reset ask the storefront to refresh its cache                                       |

Defects 1 and 2 came from the redesign (`f4e5419`); 3 from the original forms; 4 to 9 from this
change set or earlier content work.

## Remaining defects and observations

- **Simulated LCP on catalogue and product pages** (Lighthouse "simulate" mode, 4.2–4.5 s): the
  largest element is a product image in content streamed after the static shell, and on localhost
  Lighthouse's model charges all JavaScript to it. With applied throttling the same pages measure
  2.2–2.3 s (good). Prerendering product pages (`generateStaticParams`) would move the image into
  the static shell, but needs the API at build time — a deployment decision, not made here.
- **Cyrillic font on Uzbek and English pages:** the language switcher writes "Русский" in its own
  script, so those pages also download the 16 kB Cyrillic subset of the interface font (after
  load; no effect on the metrics).
- **Admin names:** product and journal lists show the Uzbek (primary) name in every admin
  language, while delivery methods follow the admin language.
- **Pu-erh illustration:** the pu-erh category shares the black-tea medallion; a dedicated one
  needs a new illustration key (a contract change).
- **Local development database:** holds test records from earlier sessions (five "E2E Customer"
  orders, a "Test Mijoz" order, accounts and enquiries made by end-to-end runs). They were left in
  place because they may not be ours to delete; `db:demo:reset` does not touch them by design.

## Typography

- Uzbek apostrophes render correctly in both typefaces and at every size: ʻ (U+02BB) and ʼ
  (U+02BC) in the catalogue and journal, ‘ (U+2018) and ’ (U+2019) in the official brand copy, as
  supplied.
- The only change to the supplied text is a no-break space before each dash, so no line starts
  with "—".
- Wrapping checked at 390 px in Uzbek, Russian and English: hero (the Russian tagline takes three
  lines), collection identifiers (they wrap after a separator), philosophy items, partnership
  band, wholesale header ("Растите вместе / с TERAN."), buttons and product names. No overflow,
  no sideways scrolling (also asserted by `mobile.spec.ts`).

## Keyboard and screen readers

- Tab order on the homepage: skip link, announcement, languages, navigation, logo, search,
  account, bag, hero actions, tea types, collection. The skip link moves focus to `<main>`. Every
  focus stop shows a 2 px outline.
- The phone menu is a native modal dialog: focus stays inside it (between cycles it only passes
  to the browser's own interface), Escape closes it and focus returns to the menu button.
- Headings: one `h1` per page, then `h2` sections and `h3` items (products, principles, articles).
  Landmarks: banner, main, contentinfo and labelled navigation regions.
- axe-core (WCAG 2.0, 2.1 and 2.2 A and AA), end to end: storefront pages in three languages, the
  open bag, checkout and form errors, admin pages, the phone menu and filters — all pass.

## Consistency of controls

Text fields, text areas and selects all use the shared field components (visible label, hint and
error linked with `aria-describedby`, `aria-invalid`, "optional" marker, the same heights and
focus ring); selects and checkboxes stay native. Dialogs, the bag, the menu and the phone filters
use the same sheet built on the native `<dialog>`. Catalogue filters use the same chip, popover
and drawer patterns on every listing, search included.

## Demonstration journey

Run on the development stack with the full demonstration data, Chromium 1440 × 900.

| #   | Step                                                                                                                              | Result |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Homepage shows the official brand content and the five identifiers                                                                | Pass   |
| 2   | Catalogue lists the 20 published products                                                                                         | Pass   |
| 3   | Search finds "TERAN XC2025" by identifier (suggestion and results page) and "Jasmine green tea" by name                           | Pass   |
| 4   | Pu-erh → in stock only → price low to high → minimum price 100 000; URL kept the state, reload restored it, "clear" kept the sort | Pass   |
| 5   | Product page opens from the catalogue                                                                                             | Pass   |
| 6   | Pack size 100 g: price 124 000 UZS and `?variant=` in the URL                                                                     | Pass   |
| 7   | Add to bag opens the bag drawer                                                                                                   | Pass   |
| 8   | Quantity 2: subtotal 248 000 UZS, confirmed in the server cart                                                                    | Pass   |
| 9   | Empty checkout shows field errors; fictional details accepted; total 273 000 UZS (delivery 25 000)                                | Pass   |
| 10  | Order placed (cash on delivery), confirmation page                                                                                | Pass   |
| 11  | Database: order, item snapshot, pending cash payment, stock 12 → 10 with an `ORDER_PLACED` ledger entry                           | Pass   |
| 12  | Administrator signs in to the dashboard (demo note visible)                                                                       | Pass   |
| 13  | The order is found by number                                                                                                      | Pass   |
| 14  | Status changed to "Confirmed" (stored)                                                                                            | Pass   |
| 15  | The draft "Spring green tea" is published                                                                                         | Pass   |
| 16  | It appears in the catalogue (21 products) and on its own page                                                                     | Pass   |
| 17  | Empty search, empty filter result, 404 page, empty bag; invalid checkout request refused (400)                                    | Pass   |
| 18  | Visitors are redirected from `/admin` to sign-in; admin API answers 401                                                           | Pass   |

## Performance

See the measurements below. The method: Lighthouse 13.5 mobile profile against the production
build on localhost, three runs per page, median reported; "applied" = DevTools throttling (the
network and CPU are really slowed during the load), "simulated" = Lighthouse's default model.

### Results

Applied throttling (closest to a real phone on a slow 4G connection):

| Page                    | Before: score · LCP · TBT | After: score · LCP · TBT | JavaScript transferred |
| ----------------------- | ------------------------- | ------------------------ | ---------------------- |
| Homepage (Uzbek)        | 92 · 1.91 s · 306 ms      | 92 · 1.96 s · 269 ms     | 235 → 236 kB           |
| Catalogue               | 91 · 2.28 s · 296 ms      | 93 · 2.31 s · 227 ms     | 231 → 203 kB           |
| Product (Classic black) | 91 · 2.25 s · 290 ms      | 93 · 2.27 s · 236 ms     | 235 → 207 kB           |

Simulated (Lighthouse's default; the figure the regression was reported in):

| Page               | Before the redesign¹ | After the redesign¹ | Before this work     | After this work      |
| ------------------ | -------------------- | ------------------- | -------------------- | -------------------- |
| Homepage (Uzbek)   | 98                   | 91                  | 89 (runs 98, 89, 88) | 90 (runs 91, 90, 89) |
| Homepage (Russian) | 90                   | 88                  | 85                   | 88                   |
| Catalogue          | 85                   | 85                  | 83                   | 84                   |
| Product            | 87                   | 84                  | 85                   | 86                   |

¹ Measured earlier with the same method (`cec1e72` and `4706ba4`).

Desktop: 100 (homepage), 99 (catalogue), 99 (product). Cumulative layout shift is 0 on every
page in every mode. SEO scores 58–69 only because demonstration mode asks search engines not to
index the site. Desktop "best practices" is 96 because of one console error caused by
`upgrade-insecure-requests` on a plain-HTTP localhost server; it cannot occur behind HTTPS.

### What was measured

- **LCP.** The largest element is the hero description on the homepage (static HTML) and the
  first product image on catalogue and product pages (in content streamed after the static
  shell). Unthrottled, LCP happens 0.25–0.5 s after navigation. In the simulated mode the
  homepage swings between 1.8 s and 3.7 s from run to run: when scripts happen to run before the
  first paint, Lighthouse's model charges them to LCP. With applied throttling (real ordering)
  LCP is 1.9–2.3 s on all three pages — "good".
- **JavaScript.** Main-thread cost under 4× CPU slowdown: React DOM and hydration ~420 ms, the
  Next.js runtime ~235 ms, next-intl's ICU message formatter ~110 ms. Avoidable: Zod and all
  shared schemas (~36 kB gzip) loaded on every page, though only forms need them.
- **HTML.** 62 kB compressed, 400 kB to parse on the homepage; half of it is the inline React
  Server Components payload, which Next.js sends twice with partial prerendering (prerendered
  shell, then the resumed stream). Framework behaviour; not changed.
- **Images.** WebP at five widths with `srcset`; the LCP image is eager with high fetch priority.
  Lighthouse estimates 13 kB of possible savings on the catalogue: not material.
- **Fonts.** The two Latin variable fonts are preloaded (HTTP `Link` header) and swap in over
  size-adjusted fallbacks. Uzbek and English pages also load the 16 kB Cyrillic subset for the
  word "Русский" (after load).

### What was changed

| Optimisation                                                                                        | Measured effect (applied throttling, TBT)                                                         | Decision                                                                |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Zod-free `@teran/contracts/constants` entry for browser code; the newsletter schema loads on submit | Homepage −48 ms, catalogue −64 ms, product −71 ms; 28 kB less JavaScript on catalogue and product | **Kept**                                                                |
| next-intl precompiled messages (experimental `messages.precompile`)                                 | −3 kB JavaScript; TBT −5, −6 and −29 ms                                                           | **Reverted**: experimental, and it bundled a second copy of the runtime |

Not attempted, with reasons: prerendering product pages (needs the API during the build, a
deployment decision); trimming React or Next.js runtime work (framework); per-page translation
bundles (the client namespaces are already limited to what storefront components use).

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

## Performance pass of 2026-10-17 (reference redesign release)

Method: the production build of this release and of the live release (`087eb10`) served in turn
on the end-to-end stack (fresh seeded database), measured in Chromium with applied throttling
(Pixel 7, 1.6 Mbit/s, 150 ms latency, CPU 4× slower), three loads per page, median. Lighthouse's
simulated mode was used only to find problems: on this Mac under load it charged hydration to
TBT three to four times over (a CPU profile of the same build showed about 70 ms of blocking).

Phone, largest contentful paint (CLS in brackets where it was not 0):

| Page            | Live (`087eb10`) | This release | Change |
| --------------- | ---------------- | ------------ | ------ |
| Homepage        | 2.16 s           | 1.55 s       | −28 %  |
| Category (Tea)  | 1.24 s           | 1.36 s       | +10 %  |
| Product         | 3.12 s           | 2.47 s       | −21 %  |
| About           | 1.27 s           | 1.38 s       | +9 %   |
| Journal         | 1.22 s           | 1.42 s       | +17 %  |
| Bag             | 2.80 s (0.108)   | 1.27 s (0)   | −55 %  |
| Photos & videos | 3.36 s           | 1.37 s       | −59 %  |

About and Journal open on a full-width painting, as the reference does (the previous release
opened on text); the category page is within run-to-run noise. Desktop LCP is 0.18–0.47 s on
every page. Idle main-thread time on the homepage: phone 106 → 73 ms per 10 s; desktop
283 → 402 ms (the autoplaying hero and the moving ribbons of the redesign).

### What was changed

| Change                                                                                                                                                                                                                                                      | Effect                                                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `experimental.cachedNavigations: false`. With Cache Components and Partial Prefetching, Next.js 16.4 renders every page a second time and inlines that copy into the HTML (a Uint8Array row in `self.__next_f`) so the browser can cache it while hydrating | Homepage HTML 80 → 60 kB compressed (550 → 450 kB to parse); one render per request instead of two |
| The bag drawer, the search dialog and the media viewer load when the page is idle (or when their button is pointed at or focused), not with the page                                                                                                        | 11 kB of JavaScript moves after `load`                                                             |
| `sizes` that match the boxes: product cards `calc(50vw - 1.75rem)` on phones, the hero pack from its own proportions, media tiles per layout, the product page's infographic                                                                                | Phones fetch 320 px card images instead of 480 px, 640 px posters instead of 960 px                |
| Search: matching categories and articles reveal together with the products                                                                                                                                                                                  | CLS 0.104 → 0 on phones (the sidebar sits above the grid)                                          |
| Media tiles are named by their visible title (screen-reader text around it, no `aria-label`); the announcement's "Learn more" link names its message                                                                                                        | Lighthouse accessibility 100; no "link text" warning                                               |
| The bag page's suggestions fetch their first two images at once (with an empty bag they are the page)                                                                                                                                                       | No lazily loaded LCP image                                                                         |

Measured and rejected:

- next-intl `messages.precompile` again: Turbopack emitted two versions of the translation runtime
  under the same module id in two chunks, both loaded on every page (49 kB → 58 kB raw).
- `experimental.inlineCss`: the 26 kB (gzip) stylesheet would travel twice per page (style tag and
  React payload) and never be cached between pages.
- Answering Lighthouse's "meta description missing" on product, category and journal pages: the
  descriptions are there, streamed into the body because the metadata is dynamic. Next.js
  documents that search engines which render JavaScript read them; forcing blocking metadata
  (`htmlLimitedBots`) would delay every page.

Correction to the 2026-10-14 notes above: the second copy of the React Server Components payload
in the HTML came from cached navigations, not from partial prerendering, and is now removed.

## Release check of 2026-10-18 (owner content, legal texts, SEO and security)

Released as e4e50cd and 920526b to terantrade.uz (both projects rebuilt; the production seed and
the 27 unbranded reference pictures loaded afterwards; `NEXT_PUBLIC_DEMO_CONTENT=false`).

**Automated tests**, all passing: web unit 49 (10 files), API unit 102 (20 files), contracts 29,
API integration 136 (15 files, including the new closed-ordering suite), end-to-end 51 on the
production build (axe WCAG 2.2 AA included, plus the new store-map and picture tests).

**Live crawl** of terantrade.uz after the release (scratchpad `perf/site-crawl-live.mjs`): 44
storefront addresses × Uzbek, Russian and English × phone 390 px, tablet 820 px and desktop
1440 px = 396 loads, **0 problems** — no error status, console or page error, failed request,
error text, visible price, price in attributes, structured data or the page's data, broken image
or sideways scrolling. Crawlers get a real 404 for an unknown product, category, article,
collection or help page and a 308 for a renamed tea; visitors keep the streamed page.

**Speed**, phone LCP (Pixel 7, 1.6 Mbit/s, 150 ms, CPU 4×; median of three on the end-to-end
stack, served over HTTP/1.1):

| Page                   | Before this pass | Now             |
| ---------------------- | ---------------- | --------------- |
| Homepage               | 1.57 s           | 1.59 s          |
| Category (Tea)         | 1.56 s           | 1.57 s          |
| Product (XC2025)       | 3.92 s           | 2.89 s          |
| Store locator          | 3.84 s           | 2.06 s          |
| About                  | 1.52 s           | 1.53 s          |
| Journal / article      | 1.49 s / —       | 1.51 s / 1.40 s |
| Bag                    | 1.40 s           | 1.42 s          |
| Tea 101 / For business | 1.47 s / —       | 1.48 s / 1.58 s |

Product page: a cut-out's `sizes` follow the width it is drawn at, with 5 % slack, so a 412 px
phone takes the 640 px file (108 KB) instead of the 960 px one (175 KB); the first thumbnail reuses
that file and the others wait for the page to load. Store locator: the first map tiles are
rendered on the server and the tile host is preconnected. The article page without a cover had a
desktop CLS of 0.29 (its placeholder had another shape); now 0.

**Found and fixed in this pass**: online ordering still open at the API while the storefront
takes orders by phone (closed with `CHECKOUT_ENABLED`, ADR-035); placeholder prices in the pages'
data; soft 404s for crawlers; breadcrumb structured data with a step without an address;
next-intl's hreflang `Link` header on every response; announcement links to `//host`; the
Russian footer row 112 px too wide at 1024 px; unconfirmed delivery times shown while ordering by
phone; 60 `[placeholders]` in the legal texts; about 70 wording fixes across the three languages.

**Open recommendations** (not blocking): a shared rate-limit store or Vercel Firewall rules (the
in-memory limits are per function instance); a per-(account, IP) login lock and a second factor for
staff; a nonce-based CSP for `/admin`; double opt-in for the newsletter once e-mail is configured;
purging abandoned direct uploads; registering the site in Google Search Console and Yandex
Webmaster with the sitemap.

## Home pictures of 2026-10-18 (tea photographs)

Four home places (`home.hero.2`, `home.banner.2`, `home.banner.3`, `home.feature`) now show tea
photographs (docs/design/reference-assets.md, section 3). Checked on the page at 390, 820, 1024,
1280, 1440 and 1920 px: the subject whole from 1280 px up (at 1024 px the last cup or the teapot's
handle is cut, as with the reference's pictures), the words on dark ground everywhere.

**Found and fixed**: from 750 to 899 px (tablets held upright) a home slide keeps its phone
proportions (about 820 × 1130 px) but showed the wide picture's middle quarter, blown up and
blurred. The slide's picture now switches to its phone crop below 900 px, where the slide's height
does (`VisualPicture` `phoneBelow`); the other page pictures keep 750 px.

## Tea only (2026-10-18)

Every page picture that showed another product now shows tea (32 files, docs/design/reference-
assets.md section 4), and empty categories and collections are out of the menus, the home page,
the catalogue's chips, search, the sitemap and search suggestions until they have products
(ADR-036).

Checked locally: the menus, the home ribbon and the tiles list only "Tea", "Green tea" and the
premium collection in all three languages; home, about, help centre, contact, for business and the
catalogue at 1440 px, home and for business at 390 px, the hero at 360, 390 and 820 px. Under the
words the pictures stay dark enough for the yellow, white and pink titles (measured average
luminance 0.05–0.13 under light text, 0.75–0.88 under dark text).

Tests: storefront unit 52 passed (a new test for the navigation tree), API integration
catalog-tree and publishing 20 passed (the sitemap and suggestions leave empty categories and
collections out), end-to-end 51 passed (a new category or collection joins the menus with its
first product).

**Found and fixed**: on phones the first slide's words sat on a bright green photograph (contrast
1.6:1): its phone crop now has deep green under the words and the glass below them. From 750 to
989 px the for-business hero showed a slice of its wide picture; its phone crop shows there now.

## Films on the home page (2026-10-18)

The first view is one view over the owner's film, and the three large banners play films (ADR-037,
docs/design/reference-assets.md section 5).

Checked locally in Google Chrome at 1440 and 390 px: each film is fetched when its place comes
near, fades in over its first frame, plays only on screen and repeats; its pause button stops and
resumes it (the first view's at the bottom left; the banners' at the bottom left on phones and the
top right from 1024 px); with reduced motion only the first frames show. The loops: the step from
each file's last frame to its first is no larger than its ordinary frame steps; halfway through
each dissolve no rim or outline doubles; in Chrome the banner films repeat without a held frame,
and the first view's held one frame once in two repetitions (about 70 ms). Colours match the source
frames within 1 %, except the owner's film, which Chrome showed slightly greener than its own colour
tags say: the prepared film follows its tags (greens about 6 % deeper).

Tests: storefront unit 55 passed (3 new for the looping film), API unit 102, contracts 30, API
integration 136 (a new picture in Admin replaces a place's film and deletes its file), end-to-end
51 passed.

**Found and fixed**: a helper exported from the film's client module was called on the server and
broke the home page's banners (an error page); it lives in `lib/visuals.ts` now. The first version
dissolved the film's end into its start in the browser with two players taking turns: the moving
footage showed two moments half-transparent for 1.6 s; the loops are prepared in the files now. An
end-to-end test expected the product's address without the pack the product page adds
(`?variant=…`) and failed when the page loaded quickly; it accepts the pack now.

## Tea cups and leaves (2026-10-18)

Each tea's first picture is now the tea brewed in one blue-and-gold cup, a different liquor for
each, and its second the tea's dry leaves; the DAVIDsTEA leaf and cup photographs are gone; the
Tea 101 page's five bands show their kind's dry leaves (docs/design/reference-assets.md section 6).

Checked locally in Google Chrome: the catalogue at 1440 px (five cups, five liquors, told apart at
card size), the product pages of TERAN 8009 at 1440 px and TERAN 8830 at 390 px (the cup, the
leaves, then the three pack photographs), Tea 101 at 1440 and 390 px. On the cup, at 2× zoom: no
trace of the vase or brooch, the cup's and saucer's outlines single, the backdrop's grain matching
(σ 2.4 against 2.1 around it).

**Changed at the owner's request** (the same day): the first view's dark veil on the left from
1024 px is gone, so the film keeps its own light; a soft shadow behind the letters keeps the yellow
headline and the white words readable over the leaves (checked at 1440 and 1824 px). Phones keep
their veil at the top, where the words lie over the bright sky.

**Repainted at the owner's request** (the same day): the cups now hold freshly poured tea, with
rings on the surface, a few bubbles and steam rising, a different pattern for each tea. Checked on
the live site in Google Chrome: the catalogue at 1440 px (the steam reads at card size) and the
product page of TERAN 8009 at 390 px (the cup first, then the leaves and the packs).

## Living cups, masked films and crisper videos (2026-10-18)

Each tea's first picture is the owner's steaming cup, the tea in its own colour, alive (steam
rising, the tea's rings running out); the "A choice for every taste" banner shows three gaiwans
with steam; the first view's and two banners' films are twice as sharp; no film has a pause button
(ADR-038, docs/design/reference-assets.md sections 7 and 8).

Checked locally in Google Chrome: the catalogue at 1440 px (five cards playing their 512 px films,
masked, faded in), the product page (the gallery's film playing on the slide shown), the four home
films at 1440 and 390 px (sources by width, masks applied), no pause buttons, the footer's switch
stopping every film. The living films' content loops without a seam (the step from the last frame
to the first equals the ordinary steps), and with their masks the still parts show the picture
itself, so the encoder's refinement of still areas no longer flickers at each restart. Banner film
against its poster: they differ only where the steam is.

Tests: contracts 31 (a film on a product picture), storefront unit 58 (the product film: cards,
gallery, reduced motion, the footer's pause), API admin integration 15 (a picture's film is shown
with it and goes when the picture is replaced or deleted).

**Found and fixed**: the first cinemagraph dragged the cup's rim up into the steam (the flow
sampled below the cup's outline; it is now held above it); a plain loop flickered in its still
parts at each restart (fixed by the masks, after one key frame per loop and a second encoding pass
did not help); the first recolouring painted the tea flat (it now turns the hue in OKLab).

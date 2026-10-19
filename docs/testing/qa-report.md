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

## Speed and sharper pictures (2026-10-18)

The owner asked for a faster site and crisper pictures (ADR-039).

Lighthouse 12.8.2 on the live site (mobile and desktop presets, simulated throttling), before
(97946c3) and after (8836bf2):

| Page                                  | Phone before                        | Phone after                             | Desktop |
| ------------------------------------- | ----------------------------------- | --------------------------------------- | ------- |
| Home (`/`)                            | 75: LCP 4.0 s, TBT 380 ms, SI 5.0 s | 90: LCP 2.6 s, TBT 250 ms, SI 3.7 s     | 98 → 98 |
| Catalogue (`/en/tea`)                 | 89: LCP 3.3 s, TBT 180 ms           | 87 to 90 in four runs: LCP 3.2 to 3.5 s | 99 → 99 |
| Product (`/en/products/teran-xc2025`) | 85: LCP 3.7 s, TBT 170 ms           | 88: LCP 3.0 s, TBT 220 ms               | 99 → 98 |

Accessibility on the home page went from 99 to 100 (heading order). The first view's picture is
now 23 KB into the home page's HTML and preloaded from the head, each crop for its widths (before:
200 to 300 KB in, after the streamed parts); no banner artwork is fetched unseen.

Sharpness, measured in Chrome as each picture's file width against the device pixels it fills:
pictures drawn from a file at least 20 % too narrow went from 19 to 9 on a phone (390 px, 3×,
eight pages), and on the home, About, media and Tea 101 pages from 7 to 1 at 1440 px and from 12
to 5 at 1440 px 2×. Those left are drawn from the largest file their source allows: the first view's
phone poster (780 px, from the owner's 596 × 336 film), the gallery photographs (1280 px), one
About picture (705 px), the category tiles' photographs (1400 px) and the wide banners on 2×
screens (1920 to 2560 px).

Checked locally on a production build against the e2e API: a picture uploaded in Admin → Settings
for the first view showed in the regenerated page 3.5 s later, from the page's prerendered part,
and went on removal; the same for a banner, whose packs then were not in the page at all. A build
without an API, as in CI, streams the pictures as before. Checked live in Google Chrome: the five
catalogue cards and the product gallery play their films, masked; the first view's film plays;
the footer's switch stops all sixteen films of the home page; no console errors.

Tests: storefront unit 60 (two new for `coverSizes`), end-to-end 51 passed on the build without an
API, API unit 102 and integration 137 (this batch's API changes).

**Found and fixed**: a cached loader that throws stops `next build` even when the caller catches
the error (the home page's settings loader returns null instead); a build reused an earlier build's
API answers from `.next/cache/fetch-cache` (API reads are now `no-store`); with a Suspense fallback
in the page's shell, each banner's artwork was fetched although its photograph replaced it during
prerendering (the photographs are now handed to the banners directly).

**Measured, not changed**: `content-visibility` on the home page's lower sections (no gain in main
thread time on a phone slowed four times); the catalogue's five card films load after the page
(about 1.35 MB on a phone; none with data saving or reduced motion). The catalogue and product
pages still stream their main content, as they read the address's query.

## Sharp on the largest screens, and the project cleaned (2026-10-18)

The owner found the live first view and banners blurry in Chrome on a large Retina screen, asked
for a better film than the gaiwans, for every picture and film to be sharp on every screen (the
largest included), and for the project to be cleaned of what it no longer uses (ADR-040; released
in f10fd24, c3cc3aa and 2efe357, pictures imported into production from `storage/hd-films`,
`storage/hd-pictures` and `storage/hd-rerender`).

Sharpness, measured in Google Chrome on the live site as each picture's or film's own width against
the device pixels it fills (eleven pages; map tiles left out):

| Drawn from a file at least 20 % too narrow | Before (8836bf2) | After (2efe357) |
| ------------------------------------------ | ---------------- | --------------- |
| 1875 px window, 2×                         | 44 of 160        | 7 of 149        |
| 1440 px window, 2×                         | 26 of 161        | 4 of 154        |
| 390 px phone, 3×                           | 20 of 135        | 8 of 127        |

What each screen gets now: the first view's film at 3840 px in a 2560 px window at 2× and in a
1875 px window at 2×, 3200 px at 1440 px 2×, 1920 px at 1× and 1080 × 1920 on a phone (its poster
at 4096, 3840, 3200, 1600 and 1215 px); the product cards the tea's 1024 px film at 2× and the
512 px copy at 1× and on phones; the journal cards files of 1600 to 2560 px at 2× and 3× (0.88 to
1.12 of what they fill, from 0.33 to 0.68 before), but for the two covers whose sources are 1921
and 1254 px.

Left short, each at its source's limit: the product gallery on 2× desktops (the owner's 1024 px
cup: 0.69 to 0.78), the teas category's banner (a 1200 px cover, renditions to 960 px), those two
journal covers, the story band and the wholesale flavour band in a 1875 px window at 2× (2560 px
files: 0.68 to 0.73), and the dealer section's backdrop on phones (a landscape photograph behind a
2,400 px tall column, 0.11; 0.66 to 0.79 on 2× desktops). The About page's four icons are SVG
(sharp at any size; the audit reads their nominal width).

Checked locally first, on a production build against the e2e API: the journal cards and the
catalogue cards pick the files above; screenshots of the first view, the banners, the bento, the
pair, the values band and the wholesale page on a desktop and a phone (the values band's words
needed a deeper veil over its brighter photograph, added). Checked live in Google Chrome: the films
and posters each screen gets (above), the home page on a desktop and a phone, no console errors.

**Found and fixed on the live site**: Vercel's CDN kept a two-byte part of a product film (asked
for as a range, as Safari asks first) under the file's address and gave it to every later request,
so the film failed with a format error for everyone using that edge (seen as the catalogue cards'
1024 px films at 2×, and the product gallery's film). Range requests to `/uploads` are no longer
cached (2efe357, docs/deployment/vercel.md) and the CDN cache was purged; checked: with a two-byte
request first, every later range and the whole file come back right.

Cleanup: 15 unused files in `public/brand` (the botanical atmosphere's layers, the logo set's WebP
copies, the calligraphy, the seal and the waves), three unused components (`CategoryThumb`,
`Reveal`, `SectionHeading`), unused exports (the logo plate and stacked logo, six ornaments,
`leafCategories`, `SIGNATURE_TAGLINE`, the Decimal helpers), 84 lines of CSS only they used and two
unused dev dependencies, found with an import graph from the Next.js entries and a reference search
of every export (the API has no unused files). The asset generators make only what the site uses;
their outputs are byte-identical. Import folders no longer needed went to the macOS Trash
(`~/.Trash/teran-storage-2026-10-18`), not deleted.

Tests: contracts 31, storefront unit 64, API unit 102, API integration 137 (the two files touched
by the journal-cover change again: 23), end-to-end 51 on the final build. **Open**: CI's "Format,
lint, types and unit tests" job fails at `pnpm test` on c3cc3aa and 2efe357 without a failing test
reported (its only annotation is the exit code); the same steps pass here, in a fresh checkout and
in Linux containers (Alpine arm64; Debian x64 with CI's environment). Its log needs a signed-in
GitHub account. Vercel did not deploy 2efe357 from the push (no status on GitHub, no incident
reported), so it was deployed from the CLI as docs/deployment/vercel.md describes, from a clean
export of the commit.

## The owner's second look: films, values band, header, phones (2026-10-19)

The owner found the first view's film "strange" and soft, Samarkand odd as the values band's
picture on a tea site, the first view too tall on phones with its words at the top, and a person
icon where visitors expect "Sign in" and "Register"; and asked for a pass over the whole site.

**Films.** Frames taken across one loop showed the cause: each home film's dissolve loop blended
two camera positions for 1.5 s at every restart (doubled trees, pitcher, teapot, hand). Made again
without blending (ADR-040 revised; `storage/hd-films-2`, imported into production): the first view
plays forwards and back with eased turns, the banners restart with a plain cut. Their copies have
more bitrate (the first view's 3200 px copy 16.9 MB for 9.5 s, from 10.7 MB for 7.7 s); a 100 %
crop comparison showed the source footage itself is soft, so more bitrate or HEVC changes little
beyond this.

**Values band.** Longjing tea terraces in Hangzhou with tea pickers (Pexels, chosen by the owner
from six mock-ups of the band), 5120 px with a phone crop (`storage/hd-values`).

**Whole-site pass** (live screenshots of 14 pages on a 390 px phone and at 1440 px; no page
scrolls sideways). Found and fixed:

- The header showed visitors a person icon whose menu held sign-in and registration: they are now
  two links in the bar (and in the drawer); the icon is the signed-in customer's menu.
- Phones: the first view was 540 to 607 px tall (1060 px on a tablet) with its words at the top;
  now 464 to 672 px with the words in the middle, and the promo strip above it keeps to two lines
  (about 90 px instead of 130), so the first products show on the first screen.
- A bento tile's pale pink name was unreadable on its bright photograph (a soft shade now).
- The footer's cup covered its fourth value on phones ("Sifatli tan…").
- The wholesale flavour band's dark words sat on the dark leaves of its phone crop (a light panel
  now).
- The drawer's tile names broke inside words ("MAHSULOTL-AR"); they now shrink to fit.
- The media page showed an empty "Videos coming soon" part and a 0 tab; hidden until a film is
  published.
- The home page showed the same five teas in three rows; a row that would only repeat the first
  is left out until the catalogue outgrows one row.
- At 1440 px the promo strip's line wrapped beside the collection's name (its sticker now shows
  from 1600 px).

Checked locally on a production build against the e2e API (all of the above on a phone and a
desktop), then live in Google Chrome: the phone hero 464 px high at 390 px with its words centred,
the drawer and bar links, one product row with tabs on the home page. CI: the unit-test job had
failed since c3cc3aa on a test race (a film test could reach jsdom's unimplemented `play()` after
its mocks were restored; fixed in 12222a0, all five jobs green again). End-to-end 51 passed (the
journey test now takes "Register" from the bar).

## Phone banners, the promo strip again, a sharper first view (2026-10-19, later)

The owner asked for the home page's campaign banners on phones to be lower, with their words in
the middle and space between them as on wide screens; for the black strip under the header back;
and for a sharper, brighter film in the first view.

- **Banners on phones.** They were full width, 538 px high and touching each other, their words at
  the top. Now inset between the page's gutters with rounded corners and 24 px between them, 448 px
  high, the words in the middle (over a film, the veil sits behind them); the brewing band takes the
  same shape below 1024 px. Banners with TERAN's packs below their words still grow to fit.
- **The promo strip.** It had not been removed: it shows the "TERAN premium" collection, which was
  deleted in the admin area at 01:28 (the audit log: three cover changes, then `collection.delete`);
  the other collections had been inactive since 10-17. The collection was recreated as seeded (same
  id and slug, its three names, the five teas; an audit entry records it), and the strip no longer
  depends on it: without a collection it keeps TERAN's own words and leads to the catalogue. The
  gallery banner's pill likewise leads to the catalogue while the collection is missing (it led to
  a missing page).
- **The first view.** Eight 4K Pexels clips were shown to the owner as mock-ups of the first view on
  a desktop and a phone; the owner chose sunlit tea gardens in Bangladesh (a 69 Mbit/s source,
  sharper than the first clip at 100 %). Prepared without blending (forwards and back, eased), its
  copies at 0.14 bits per pixel (`storage/hd-hero-3`, docs/design/reference-assets.md section 9).

The production database's port 5432 stalled from this network on the day (the connection opened
but the handshake never finished, while the site and Neon's HTTPS endpoint answered): the read-only
checks and the collection's restore went through Neon's SQL over HTTPS, the import through a local
relay carrying the Postgres protocol over a secure WebSocket to Neon's proxy, as Neon's own
serverless driver does. Neither needed a new package or a change to the project.

## A longer first view, films in the tiles, fuller menus, ratings on the cards (2026-10-19, evening)

The owner found the first view's film too short and disliked it turning back, asked for the bento's
first two tiles to move, for the menus to show more categories (coffee, confectionery and the
like, whether stocked or not), and for a richer, more modern product card with ratings.

- **The first view.** The same Bangladesh tea-garden shot now plays whole (19.3 s) and only
  forwards, starting again with a plain cut (`storage/hd-hero-4`). Its copies hold only what the
  view shows (2.4:1 wide, 3:4 on phones); a 100 % comparison of one frame at 0.09, 0.11 and 0.13
  bits per pixel set them at 0.10 to 0.14 (3200 px 37 MB, phone 10 MB).
- **The tiles.** "Green tea" and "TERAN premium collection" play tea poured into a glass pitcher
  and into a glass teapot (`storage/hd-bento-films`): short dissolves where nothing moves or the
  kettle stands still at both ends (a 50 % blend was checked frame by frame), the vessel cut to sit
  right of the tile's words; the tile code now passes `film`.
- **Menus.** The header panel and the phone drawer list every active category, an empty one marked
  "coming soon" with a note and its own medallion (new coffee, sweets and teaware art); the home
  sections, chips and search still show stocked ones only (ADR-041). Production gets Coffee,
  Confectionery and Teaware with subcategories, and the demo catalogue's tea and gift categories
  active again with their products still archived (one transaction, audit rows).
- **Ratings and the card.** Real reviews only (ADR-042): signed-in customers rate 1–5 stars with a
  comment, once per tea; staff hide, show or delete them in Admin → Reviews; each product keeps its
  totals. The card adds the stars and count (or "Rate it"), the origin, brewing temperature, time
  and pack chips, a lift and slow zoom, and a permanent "Order" button; the product page adds stars
  under the name, a "Customer reviews" section (average, star bars, form or sign-in, the reviews)
  and `aggregateRating` in its JSON-LD.

Checks: contracts 34, web 67 and API 103 unit tests; API integration 140 (3 new: a customer's
review and the totals, verified purchase and refused input, staff refused and moderation with the
audit trail); end to end 52 (new: a visitor registers from the reviews, rates a tea, sees it on the
page and the card, staff hide it, the author sees it hidden, staff show and delete it; the new
category journey now expects "coming soon"); ESLint, TypeScript and the message check (1843 keys ×
3 languages). The cards were looked at with prices hidden, as production shows them, at 1440 px
and on a 390 px phone (the "Order" button was shortened on phones so the word stays whole).

Live after the release (3345bdb, 03a33bc; both projects deployed, the API applying
`20261019120000_product_reviews`): the category changes went in as one transaction (56 inserts,
6 updates), `storage/hd-hero-4` and `storage/hd-bento-films` were imported (the database port
answered again, so directly), and the storefront's caches were invalidated twice: the Uzbek home
page had been regenerated between the import and the first invalidation and still pointed at the
deleted films until the second. Then 267 files used by ten pages (home in three languages,
catalogue, Tea, Coffee, a product in two languages) answered 200. In Chrome at 1440 px × 2 the
first view plays the 3200 px copy (19.3 s) and the tiles their 1280 px films (9.4 and 16.9 s); a
390 px phone at 3× gets the 1080 × 1440 first view and the square tile films. The menus show Tea
(green tea, then black, white, oolong and pu-erh "coming soon"), Coffee, Confectionery, Teaware and
Gift sets "coming soon"; the cards show "Rate it", the origin, the brewing chips and "Order"; the
Coffee page shows its banner and "Products coming soon".

## Pictures and films moved to Cloudflare R2 (2026-10-19, night)

At 16:02 Vercel suspended the Blob store (the Hobby plan's allowance was used up), so every picture
and film on the site answered 403. The owner chose Cloudflare R2, keeping only what the site uses,
and asked for a tea plantation film in the home page's gallery band (ADR-043).

- **Rebuilt.** `restore-media.ts --stand-ins` from `storage` and the Trash folder stored 423 files
  (377.1 MB): the 59 page places with their phone crops and films, and the 15 pictures of the five
  TERAN teas with their films, card copies and masks (each tea's second photograph is a stand-in,
  the local file of the same place, as the owner had uploaded those again). The 16 archived
  demonstration products' 32 code-drawn pictures were drawn again at their stored sizes (128
  files).
- **Lost.** Sixteen pictures uploaded in the admin area had no local copy: the covers of 7
  categories (tea, green, black, white, oolong, pu-erh, gift sets) and 4 articles (how to store
  tea, brewing basics, types of tea, tea at the Uzbek table), and the gallery's 5 "Teran Qadoq"
  photographs. Their old values were saved (`apps/api/storage/blob-lost-2026-10-19.json`, not in
  git), then one transaction removed the covers and made the photographs drafts without their
  picture (32 statements, each touching one row, with audit rows). Category and article cards
  show their tea medallion.
- **Gallery.** "Tea plantation" (the first view's Pexels shot, whole, 1920 × 1080, 19 s) was added
  in front of the gallery's films (`storage/gallery-films`).
- **Vercel.** `UPLOADS_ORIGIN` on the storefront now names the bucket; the storefront, then the API
  were deployed again and the data cache invalidated.

Checks: all 558 files the database names are in R2, none missing and none unreferenced. 345
picture and film addresses on 18 live pages (home and catalogue in three languages each, the five
teas, journal, gallery, Tea 101, about, wholesale, contact, stores) come from R2 and answer 200
(films 206 to a range). In the browser the home page's 10 films play from R2 (the first view and
banners fetched whole across origins, the product cards' films with their masks), with no CSP or
CORS errors; the gallery band shows "Videos" with "Tea plantation" (0:19), whose viewer streams
the 1920 × 1080 file; a product page plays its five masked films; the journal shows the four
articles without covers on their medallion.

Open: the owner uploads the lost covers and photographs again (the drafts keep their titles);
`r2.dev` is Cloudflare's rate-limited development address, so a custom domain on the bucket is the
production step (`R2_PUBLIC_URL` and `UPLOADS_ORIGIN` change, nothing else).

## A tea plantation in the first view (2026-10-19, night)

The owner asked for the home page's film to show a real tea plantation (the Bangladesh garden under
shade trees did not read as one) and, from four 4K Pexels clips shown as mock-ups of the first view
on a computer and a phone, chose the curving rows of the Moc Chau tea hill (Vietnam); the gallery's
"Tea plantation" film was to become the same.

- **The film.** Frames every second, then every 0.4 s at both ends, showed a visitor in the rows at
  the start and a building with a large national flag from 8.4 s; the clean part, 0.4–7.8 s, is kept
  whole and played at 24 fps (`loop-film.swift` gained `play=`: every filmed frame once, 0.8×, 222
  frames, 9.25 s). Frame 100 of the result matched frame 112 of the source (mean difference 1 of
  255; its neighbours 17), so nothing was dropped or repeated. The 2.4:1 copies keep the middle
  band and the phone and gallery parts start 12 % below the top, so the small flag on the hilltop
  is never in view (checked on frames at 0, 3, 6 and 9.2 s of each).
- **In production.** `storage/hd-hero-5` imported through R2 (`home.hero.1`, the old files removed);
  the gallery item kept its place, titles and caption and got the new file with
  `add-gallery-film.ts --replace` (new in this change). `storage/hd-hero-4` and the Bangladesh
  gallery files went to the Trash folder.

Checks: R2 holds 558 files, all named by the database, none missing. After two cache invalidations
(the Uzbek home page was regenerated between the first one and the import's save, as before) the
home page in three languages names the new film; 247 picture and film addresses on 8 pages answer
200 from R2. In the browser at 1120 px the first view plays the 2560 px copy (9.25 s) and on a 375
px phone at 2× the 720 × 960 one, both fetched whole across origins; the gallery band shows the new
poster.

## Store addresses in the admin area, and a better store page (2026-10-19, night)

The owner gave TERAN's first address (Namangan viloyati, Namangan shahri, Dashtbogʻ MFY,
Turaqoʻrgʻon koʻchasi, 200-uy), asked for stores to be added and their addresses changed in the
admin area, and for the store page to look better (ADR-044).

- **Admin → Store addresses** (`/admin/stores`) replaces the panel inside Settings: folded cards
  per store; the place set by clicking the map, by searching the address (the API asks
  OpenStreetMap's Nominatim) or by typing coordinates; new stores start with the contact phone and
  hours; the store pictures sit under the list.
- **The store page**: one store has no search row and starts chosen beside the map (above it on
  phones); cards gained icons and a Yandex Maps link; a band under the stores offers the phone,
  Telegram and wholesale partnership; the banner is the ordinary height.
- **Production**: the `stores` setting holds "TERAN Namangan" at OpenStreetMap's house 200 on
  Toʻraqoʻrgʻon koʻchasi (40.990448, 71.641952), with the contact phone and hours (09:00 - 18:00),
  as a shop, shown; written in one transaction with an audit row.

Checks: contracts 34, web 70 (3 new: a click on the map picks the place, a drag does not, the
storefront map stays a map) and API 111 unit tests (5 new for the address search); API integration
141 (new: the search for administrators only, 400 for a one-letter address, 403 for managers, 401
for visitors); end to end 53 (new: one store placed by a click on the admin map is shown chosen,
without the search, with the Yandex link and the help band; the store journey now starts at
Admin → Store addresses); ESLint, TypeScript and the message check (1874 keys × 3). On the local
stack the real search for the owner's address found Turaqoʻrgʻon's side lanes in Namangan (the
house itself is clicked on the map); coordinates typed into the field moved the map to them, a click
kept the view. Screenshots at 1440 px and 390 px: the card beside (above) the map with its bubble,
the help band, and the admin card's sections.

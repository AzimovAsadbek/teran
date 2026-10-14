# Reference Audit — DAVIDsTEA (UX reference) and TERAN concept (brand reference)

> Audit date: 2026-10-13. Inspected live with a real browser (built-in browser pane, desktop emulation
> 1440×900 and mobile emulation 375×812, plus an initial 800 px-wide viewport).
> This document records only what was actually observed. Anything that could not be inspected is listed
> under [Limitations](#6-limitations-of-this-inspection).

## 0. Two references, two different jobs

|                    | Reference A — DAVIDsTEA (`https://davidstea.com/`)                                                                                                                                | Reference B — supplied TERAN concept screenshot                                                                                                                                                                    |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Purpose**        | Primary source for **website structure and shopping UX**: information architecture, navbar behaviour, product discovery, listing/detail pages, cart, conversion patterns, footer. | **Brand identity only**: logo usage, deep-green + gold palette, premium tea imagery atmosphere, typography direction, tone.                                                                                        |
| **We adapt**       | The _reasons_ its navigation and shopping flow work, re-implemented with TERAN's catalogue, language set, market and visual identity.                                             | Colours, logo, serif + thin gold line-icon aesthetic, misty-nature imagery mood, brand values wording.                                                                                                             |
| **We do NOT copy** | Source code, brand, copy, product photos, illustrations, playful saturated palette, condensed display type.                                                                       | Its navbar layout, its hero layout (text left / product photo right), headline placement, the side-mounted trilingual slogan, the three horizontal "class 30/32/43" cards, section proportions, image arrangement. |

Priority order used for every design decision:

1. DAVIDsTEA decides **structure and UX**.
2. TERAN assets decide **identity, colour, logo usage and atmosphere**.
3. Professional judgement combines them into an original, modern, responsive TERAN site.

---

## 1. What was inspected (and observed)

### 1.1 Global chrome

- **Utility/announcement bar** (brand teal): rotating single messages ("Free shipping $75+ · SHOP NOW", "Proudly Canadian · LEARN MORE", "Find a Store Near You · LOCATE NOW"); right side holds a region selector (CA) and language selector (EN).
- **Main header** (white): left = category triggers with chevrons (_Shop Tea, Shop Matcha, Learn, About_); centre = wordmark; right = _Find a Store_, search icon, account icon with chevron, cart icon. The header is `position: sticky` and moves out of view when scrolling down on long pages (top offset changes), reappearing near the top.
- **Promo strip** (black) under the header: campaign name, offer, secondary offer, "Count Down" pill CTA.
- At an 800 px-wide viewport the full desktop navigation was still shown.
- **Mega menu** opens **on click** (hover alone did not open it in testing). It is a full-width panel with: a left vertical tab list in a rounded card (_Collections, Shop by, Teaware, Gifts, Sale, Shop all_), link columns with lowercase serif sub-headings (_trending_, _classics_), and a promotional image card on the right ("New arrivals"). The active top-level item gets an underline.
- **Accessibility detail:** the top-level triggers are `<a href="#">` elements carrying `aria-expanded` (links used as toggles). Inside the mega menu the vertical tabs are proper `tab`/`button` elements.
- Overlays observed simultaneously on first load: cookie banner (only an "Accept" button visible; we did **not** accept it), a floating campaign popup bottom-left, and a chat bubble bottom-right.

### 1.2 Homepage — section order observed (desktop)

1. Promo strip (campaign + countdown CTA).
2. Full-bleed hero: very large condensed uppercase headline left, pill CTA ("Shop Fall"), product photography right. Single `<h1>` = hero headline.
3. Marquee ticker strip (repeating text links with small illustrations).
4. Product carousel with **tabs** ("new arrivals" / "best sellers"); cards show badge (_New_, _I'm Back!_), category label, name, review count, price · size, and an "Add to bag $X" quick-add.
5. Seasonal feature block ("Just landed … Shop Holiday") + product carousel.
6. Feature block with bullet benefits + product carousel + "Discover the newest…" link.
7. Category image tiles (four).
8. Editorial/recipe block with CTA.
9. Category navigation tiles (_loose leaf teas, matcha, gifts, sachets, teaware, caffeine-free_).
10. Certifications band ("Certified in the good stuff").
11. Social feed, ambassador programme, loyalty programme.
12. Donation counter marquee.
13. Footer.

### 1.3 Product listing (`/collections/shop-all`, `/collections/green-tea`)

- Breadcrumbs (_Home / Shop All_).
- Rounded **category banner** with title, one-line description and an image on the right.
- **Filter toolbar** of dropdown pills with tea-specific facets: _Tea Type, Tea Format, Flavour, Benefits, Caffeine Level, Dietary Preference_; right side shows the item count ("437 items") and a _Sort_ dropdown. Mobile/collapsed variant exposes "Filter", "Clear all" and a "See 37 items" confirmation.
- 4-column grid of white cards on a light grey page; a **promotional tile** is inserted into the grid.
- Card hover reveals a teal "Add to bag $29.00" pill over the bottom of the image.
- Pagination via "Show more / Show less".
- SEO: canonical present; only `Organization` JSON-LD on the listing; the meta description claimed "885 loose leaf teas" while the page showed 437 items (inconsistent copy).

### 1.4 Product detail (`/products/organic-silk-dragon-jasmine-tea`)

- Breadcrumbs (trail changed with navigation context: _Shop All_ on one visit, _Wellness Teas_ on another).
- Left: large image (loose leaf in a scoop on white), arrows, thumbnails (including video thumbnails), corner badge ("100% Organic"/"Bulk"). Gallery column stays in view while the right column scrolls.
- Right: tag pills (_ORGANIC_, _GREEN TEA_), lowercase serif title, star rating + review count, price · weight, loyalty points line, **tabs** (_About the blend, Taste, Ingredients, Highlights_), servings line, **caffeine level** (3-dot scale) and **sweetness** scale.
- **Variant selector**: _Format_ = native radio inputs styled as segmented buttons (_50 g, 250 g, 15 Sachets_).
- Volume-discount box ("Buy more, save more").
- Quantity stepper + **"Add to bag $price"** button side by side; express wallet button; "More payment options"; estimated delivery box ("Deliver to … choose your location").
- Trust strip ("Free shipping over $75", "30-day guarantee", reviews count), share, _preparation_ guide, _they go together_ cross-sell, brand difference block, reviews.
- **Variant switching** (50 g → 250 g) updated price ($53.91 with strike-through $59.90), servings text, badges ("Bulk", "−10 %") and the URL (`…-250-g-bag?variant=…`), keeping scroll position.
- JSON-LD: `Product` with `name, url, image, description, sku, brand, aggregateRating, offers{Offer: price, priceCurrency, availability, sku, url}`.
- Mobile: breadcrumbs wrap to two lines; image full-width with thumbnails underneath; lower sections are lazily rendered (blank during fast scroll); **no sticky mobile add-to-bag bar was observed**.

### 1.5 Cart drawer and checkout entry

- Clicking _Add to bag_ opens a **right-side drawer implemented with a native `<dialog>`** labelled by its heading; focus moves into the dialog.
- Contents: title with item count, **free-shipping progress bar** ("You're only $21.09 away from free shipping!"), line item (thumbnail, name, size, price with compare-at strike-through and −10 % badge, quantity stepper, _Remove_, line total), "You may also like" carousel with add buttons, footer with **Subtotal, Savings, Total (CAD)**, "Taxes, discounts and shipping calculated at checkout", **Secure checkout** button and express wallet buttons.
- **Empty state**: "Let's find the right tea for you" with large collection cards (_Halloween Collection, New Arrivals, Best Sellers, Shop All_).
- Checkout (first step only, viewed without entering data): single page with _Express checkout, Contact (email + marketing opt-in), Delivery (country, first/last name, address, apartment, city, province, postal code, phone + SMS opt-in), Shipping method, Payment (card, billing same as shipping, PayPal), gift card, Order summary (cart, discount code, cost summary)_.
- The test item was removed afterwards (cart emptied, item count 0).

### 1.6 Search

- Results page (`/search?q=jasmine`): coloured band with large rounded search input and clear button; left column with **search suggestions**, matching **categories** and **blog posts**; right column with filters (_Price, Availability_), result count, sort, and product cards.
- `<meta name="robots" content="noindex, follow">` on search results; `robots.txt` disallows `/search`.

### 1.7 Information pages

- **About**: welcome hero, stats band, horizontal timeline, certifications, assortment chips, community, recipes carousel, store CTA, press logos, social.
- **Wholesale**: dedicated header variant (logo centred, no shop navigation), wholesale-login bar, hero "Partner with…", **three segment entry points** (_distributors; hotels, spas, restaurants & offices; boutiques_) each with _Apply now_, product-format overview, four value propositions, partner logos, **FAQ accordion** (who can apply, minimum order, shipping, payment methods, etc.).
- **Contact**: chat availability hours and a phone line; no contact form on that page.
- **Help center / FAQ**: rendered by a third-party embedded help-desk widget; page exposes `FAQPage` JSON-LD.

### 1.8 Footer

- Brand-colour background; four columns: (1) wordmark + "Nice to tea you" blurb, (2) _About us_ links (story, impact, rewards, ambassador, matcha, Tea 101, blog, careers, wholesale), (3) _Contact us_ links (contact, store locator, FAQ, shipping & returns, gift card balance, contests, accessibility, investors, track order), (4) newsletter with first-order incentive, email field + button, social icons, "feel-good promise" trust icons.
- Bottom bar: copyright, Terms & Conditions, Privacy Policy, region + language selectors.

### 1.9 Technical/SEO observations

- Unique `<title>` patterns: "DAVIDsTEA - Buy Loose Leaf Teas Online", "Shop All – DAVIDsTEA", "Green Teas – DAVIDsTEA", "Product name – DAVIDsTEA", "Search: 30 results found for jasmine – DAVIDsTEA".
- Canonical links on every inspected page; `hreflang` alternates (`x-default`, `en`, `fr`, `en-US`) on the homepage.
- `robots.txt` disallows admin, cart, checkout, orders, account, search, sorted and multi-filtered collection URLs, policies; references `sitemap.xml`.
- Homepage after load: **~520 resource requests from 37 third-party hosts** (commerce platform, e-mail marketing, chat, reviews, loyalty, tag manager, ad scripts, session recording, font services). Largest Contentful Paint could not be read in the inspection browser (see limitations), so no LCP value is claimed.
- Fonts: a rounded sans for UI/body, a condensed gothic for display, and a soft serif for sub-headings.

---

## 2. What works well (worth keeping as _patterns_)

1. **Three-tier header** that separates _promises_ (utility bar), _navigation_ (main bar) and _campaigns_ (promo strip). Centred wordmark with category triggers on the left and utilities on the right is instantly readable.
2. **Mega menu with grouped links + a visual feature card** and a permanent "Shop all" escape hatch.
3. **Product-first cards**: large product imagery on a neutral surface, small badges, price + pack size on one line, quick-add on hover.
4. **Tea-specific faceting** (type, format, caffeine level) and visible result counts.
5. **PDP information architecture**: tag pills → title → price/size → short story → variant → quantity + add-to-bag with live price → reassurance → preparation guide → related products.
6. **Variant changes update everything consistently** (price, compare-at, badges, servings, URL).
7. **Cart drawer** with progress toward free delivery, inline quantity editing, and an empty state that routes back into discovery.
8. **Native `<dialog>` for the drawer** (proper top-layer, focus moved inside).
9. **Search results that also surface categories and articles**, and correct `noindex, follow` on search.
10. **Wholesale page organised by customer segment** with an FAQ.
11. **Footer** that doubles as a sitemap plus newsletter and trust promises.
12. **Crawl hygiene**: canonicals, hreflang, Product/Offer JSON-LD, robots rules for cart/checkout/account/search/sort/filters.

## 3. UX patterns adapted for TERAN (pattern → TERAN version)

| DAVIDsTEA pattern                                          | TERAN adaptation                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Utility bar with rotating promise + region/language        | Slim **deep-forest announcement bar**: one configurable message (admin-managed, per locale, can be disabled) + accessible **UZ / RU / EN** switcher. No region selector (single market, UZS).                                                                                                                                                                                                                                              |
| Header: left triggers · centred wordmark · right utilities | Same reading order, TERAN identity: ivory surface, **real TERAN logo centred**, left triggers _Choy (Teas) ▾, Kolleksiyalar (Collections) ▾, Biznes uchun (Wholesale), Biz haqimizda (About) ▾_, right _search, account, bag with count_. Becomes a **subtle glass surface** (translucent ivory + blur) once the page scrolls; degrades to solid ivory without `backdrop-filter`.                                                          |
| Mega menu opened by click, links as toggles                | **Real `<button>` disclosure triggers** (`aria-expanded`, `aria-controls`), open on click/Enter/Space, hover-intent on pointer devices, Esc closes and returns focus. Panel = tea-type column + collections column + feature card.                                                                                                                                                                                                         |
| Mobile drawer with image tiles + drill-down + bottom bar   | Left drawer (native dialog): **tea-type tiles with TERAN illustrations**, expandable sections, bottom bar for account + language.                                                                                                                                                                                                                                                                                                          |
| Hero: full-bleed photo, giant condensed headline           | **Full-bleed hero** over an original layered landscape illustration (tea terraces, mist, gold sun) with a **centred serif headline**, a short line and two actions; the tea-type cards overlap its lower edge (redesign, 2026-10-14; the earlier version used an inset panel with a frosted card). Not the concept screenshot's text-left/product-right composition, and not DAVIDsTEA's left-aligned condensed headline over photography. |
| Marquee ticker                                             | Optional **slow ribbon of tea-type links** with a visible pause button; static under `prefers-reduced-motion`.                                                                                                                                                                                                                                                                                                                             |
| Tabbed carousel "new arrivals / best sellers"              | **Tabbed product showcase** (_Bestsellerlar / Yangi_), horizontal scroll-snap on mobile, grid on desktop, data from collections managed in admin.                                                                                                                                                                                                                                                                                          |
| Category tiles                                             | **Shop by tea type** tiles with TERAN tea-type illustrations.                                                                                                                                                                                                                                                                                                                                                                              |
| Seasonal feature block + carousel                          | **Featured collection block** (e.g. gift sets) driven by an admin collection.                                                                                                                                                                                                                                                                                                                                                              |
| Certifications band                                        | Replaced by an **honest "art of brewing" guide** (general temperature/time guidance per tea type). Certifications appear only when TERAN supplies verified ones.                                                                                                                                                                                                                                                                           |
| PLP banner + filter pills + count + sort                   | Rounded **category banner** + filter pills (_tea type, format, price, in stock_) + count + sort; mobile filter sheet with "Show N products". Server-rendered numbered pagination (crawlable).                                                                                                                                                                                                                                              |
| PDP layout with sticky gallery, tabs, scales               | Sticky gallery, category pill, serif title, price in soʻm (+ compare-at), **package-size radio cards**, quantity stepper, add-to-bag with live total, **stock status**, delivery & payment facts from configuration, brewing panel (temperature · time · amount), ingredients, related products. **Sticky mobile add-to-bag bar** (missing in the reference).                                                                              |
| Variant deep link                                          | `?variant=<sku>` preselects the package size; URL updated with `replaceState`.                                                                                                                                                                                                                                                                                                                                                             |
| Cart drawer + free-shipping progress + empty state         | Native-dialog **glass cart drawer**, progress toward the **configured** free-delivery threshold (hidden when none configured), empty state with tea-type shortcuts. Full `/cart` page as fallback.                                                                                                                                                                                                                                         |
| Shopify one-page checkout                                  | **Single-page TERAN checkout** tailored to Uzbekistan: name, **phone (+998)** first, optional email, **region (viloyat) → district/city → address → landmark (moʻljal)**, delivery method, payment method (**cash on delivery** initially), order review; server recalculates everything.                                                                                                                                                  |
| Search results with suggestions/categories                 | Search dialog with instant product suggestions + full results page with categories; `noindex, follow`.                                                                                                                                                                                                                                                                                                                                     |
| Wholesale segments + FAQ                                   | **Biznes uchun** page: segments (_cafés & restaurants, hotels, retailers, distributors, corporate gifts_), inquiry form, process FAQ limited to facts we control (how to apply, response flow).                                                                                                                                                                                                                                            |
| Footer columns + newsletter + trust                        | Deep-forest footer: logo on an ivory plate, _Shop / Company / Help_ columns, newsletter (no invented incentive), contact channels **only when configured**, legal links, language switcher.                                                                                                                                                                                                                                                |

## 4. What TERAN redesigns (weaknesses observed in the reference)

1. **Toggles as links** (`<a href="#">` + `aria-expanded`) → semantic buttons.
2. **Third-party weight** (≈520 requests, 37 third-party hosts on the homepage) → TERAN ships **no third-party scripts at launch**; fonts self-hosted via `next/font`.
3. **Competing overlays** (promo strip + popup + cookie banner + chat bubble on first view) → at most one announcement bar; no pop-ups. TERAN uses only essential cookies (session, cart, locale), so no consent wall is required until analytics are added — and then with equal _Accept / Reject_ choices.
4. **Cookie banner offered only "Accept"** → never acceptable for TERAN.
5. **Late hero paint on mobile** (background colour and CTA visible before the hero image) → hero art is inline/priority-loaded and sized to avoid layout shift.
6. **Blank lazy sections during scroll** → server-rendered sections; only images lazy-load, with reserved aspect ratios.
7. **Inconsistent meta copy** ("885 teas" vs "437 items") → metadata generated from real data.
8. **Context-dependent breadcrumbs** → stable breadcrumbs from the product's primary category (also used in `BreadcrumbList` JSON-LD).
9. **Playful saturated palette and condensed display type** → calm premium identity: deep forest, botanical green, restrained gold, warm ivory; serif headlines; refined motion.
10. **Reviews/ratings everywhere** → TERAN has **no verified reviews yet**; no ratings or `aggregateRating` are shown until real reviews exist.

## 5. Relevance for a tea manufacturer in Uzbekistan

**Relevant now**

- Trilingual UI (Uzbek Latin default, Russian, English) with correct handling of `oʻ`/`gʻ` (U+02BB) and the apostrophe (U+02BC).
- Prices in **soʻm (UZS)** without fake decimals; server-authoritative totals.
- Package-size variants (e.g. 50 g / 100 g / 250 g, tea bags) with stock status.
- **Phone-first** checkout and contact; Telegram as an optional configured contact channel.
- Delivery by **region (viloyat)** with an address **landmark** field, configurable delivery methods and fees.
- **Cash on delivery** as the initial, explicit payment method; integration boundary for Payme / Click / Uzum Bank once contracts and credentials exist.
- **Wholesale / HoReCa inquiries** (the concept screenshot references trademark classes 30, 32 and 43 — tea & food products, non-alcoholic beverages, food & hospitality services — which suggests B2B and hospitality are strategic).
- Brewing guidance per product (only where product data provides it).
- Tea journal / news (the concept navigation includes _Yangiliklar / News_).

**Unnecessary for the initial release**
Loyalty points, ambassador programme, gift cards, store locator (no verified retail locations), reviews/ratings (none verified), express wallets (Shop Pay/PayPal/GPay are not local options), volume-discount tiers (a pricing policy TERAN has not defined), countdown campaigns, social-feed embeds, chat widget, donation counters, region/currency selector, bundles builder, subscriptions.

## 6. Limitations of this inspection

- The cookie banner offered only **Accept**; it was **not accepted**. Behaviour that depends on consent (personalisation, some third-party widgets) may differ.
- The **header search overlay** did not open in my attempts; the search _results page_ was inspected directly instead.
- In the **mobile menu**, the top level was inspected; tapping a tile (_Tea type_) did not visibly open a sub-level during testing.
- **Mobile PDP** lower sections rendered blank during fast scrolling (lazy rendering); a sticky add-to-bag bar was not observed, but its absence under all conditions is not proven.
- The **FAQ/help centre** is a third-party embed; its content was not inspected.
- **Largest Contentful Paint** could not be read in the inspection browser (no LCP entry was returned); only request counts were observed. No Lighthouse run was performed against the reference.
- **Checkout**: only the first step's structure was viewed; no personal data was entered and no order was placed.
- Not inspected in detail: account dropdown and account pages, shipping/returns, terms, privacy, blog, store locator, tablet-specific layouts beyond the 800 px viewport observation.

## 7. Reference B — TERAN concept screenshot (brand identity only)

**Observed identity signals**

- Very dark forest-green header surface; gold-accented horizontal logo lockup; gold thin-line icons; ivory/cream content surfaces; dark charcoal text.
- Classical serif headlines; navigation labels set in serif.
- Dark-green pill CTA with an arrow.
- Imagery mood: misty tea terraces at sunrise, warm backlight, amber tea in a glass cup, green tin with a gold lid, loose leaf on wood, fresh leaves in the foreground.
- Brand values written trilingually: **Tabiiy · Sifat · Nafislik** — _Natural · Quality · Elegance_ — _Природная · Качество · Изысканность_.
- A kicker reading "Premium Chinese Tea" — an **origin claim that is not verified**; TERAN copy stays origin-neutral until the owner confirms it.
- Three cards referencing trademark classes 30/32/43 (business scope signal, see §5).
- The Russian copy in the concept contains typos, so its wording is not reused.

**Not reproduced (by instruction):** navbar layout, hero composition and image placement, headline placement, side-mounted trilingual slogan, the three horizontal promo cards, section proportions, arrangement of images and buttons.

**Logo asset:** only a raster logo (1774×887 WebP, stacked lockup on white) was supplied. It is used as-is (transparent cut-out derived from the original pixels; no tracing, no re-typesetting). Measured logo colours: deep greens `#01250D`–`#0F4119` with botanical highlights `#406D1E`/`#55A92A`; golds `#AE781D`, `#C58D35`, highlights `#EAB248`/`#F9E988`. These seed the token system in [design-system.md](./design-system.md).

## 8. Homepage composition check (to repeat before sign-off)

Before the homepage is declared complete it must be compared against both references:

- [x] Structure/UX recognisably follows DAVIDsTEA's flow (utility bar → header with centred logo → hero → product showcase with tabs → category tiles → feature block → story/education → business CTA → newsletter/footer).
- [x] Nothing reproduces the TERAN concept screenshot's composition (no text-left/product-right hero, no side slogan, no three class cards, no copied nav layout).
- [x] No DAVIDsTEA copy, imagery, illustration style or palette is reused.

**Result (re-checked after the redesign, 2026-10-14, production build, 1440 px and 390 px):** all
three checks pass. The homepage runs announcement bar → header (category menus left, centred logo,
utilities right) → full-bleed hero with a centred serif headline over the illustrated landscape →
tea-type cards overlapping the hero edge → tabbed product row → featured collection → story →
brewing guide (in place of a certifications band) → business call to action → journal → footer
with newsletter. There is no product photography beside the headline, no side slogan and no row
of three class cards; colours, illustrations and copy are TERAN's own.

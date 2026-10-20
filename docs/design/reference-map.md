# Reference map — storefront structure (DAVIDsTEA, observed 2026-10-16)

The owner's brief makes the reference site's **structure and interaction model** the layout
specification for TERAN's storefront. On 2026-10-17 the owner tightened it to a 1:1 clone of the
reference's layouts, motion and typography, then — stating written permission from DAVIDsTEA —
of its colours and pictures too: the palette follows the reference (ADR-029), its pictures fill
the page-picture places (ADR-028; branded campaign and product photographs only in a local
presentation mockup, see reference-assets.md). The logo and texts remain TERAN's own, and the
reference's commercial fonts are replaced by open-licence look-alikes (see "Typography and motion"). This file records what was measured on the live reference (davidstea.com, Shopify
"Horizon"-based theme, region CA/EN) at 1440×900 and 390×844, so the TERAN implementation can be
compared against numbers rather than memory. No reference text, logo or code is reused, and no
reference picture is committed: screenshots and the permitted pictures are kept outside the
repository (the pictures in git-ignored folders, reference-assets.md).

## Global frame

| Element          | 1440 px                                                                                                                                                                                                                                                                                                                  | 390 px                                       | TERAN mapping                                                                                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Announcement bar | 50 px, brand-colour band, centred message + underlined uppercase link, locale controls right                                                                                                                                                                                                                             | 40 px, message only                          | `bg-forest-900`, configured announcement (Settings), language switcher right                                                                                                                                         |
| Header           | 88 px, white, 1 px bottom rule; 4 menu triggers left (16 px / 600), logo centred (180×32), utilities right: text link with icon, search, account + chevron, cart                                                                                                                                                         | 44 px row: menu, logo centred, search + cart | Same geometry; utility link = "Biznes uchun" (wholesale), Onest 16/600                                                                                                                                               |
| Sticky behaviour | Whole header (announcement + bar) stays on top while scrolling                                                                                                                                                                                                                                                           | same                                         | `sticky top-0` on the combined header                                                                                                                                                                                |
| Mega menu        | Full width directly under the header, 380–400 px, **own tint per menu**; left: rounded tab card (243 px) with uppercase condensed tabs, active = filled pill; middle: columns with display headings (32 px) and links (15–18 px, 32 px rhythm); right: featured image card 258×310, radius 16, overlay label bottom-left | —                                            | Catalogue: top-level categories as tabs → their subcategories + "browse" column; Collections: collection list; Learn: journal, guides, media; About: about + help. Featured card = category/collection/article image |
| Mobile menu      | Left drawer ~85 % width; close ×; heading; 2-column image tiles (radius 16, overlay uppercase labels); grey rounded rows for secondary sections with chevrons (sub-levels); bottom bar: sign in + locale                                                                                                                 | —                                            | Tiles = top-level categories + collections + "all"; rows = Learn, About; bottom = account + language                                                                                                                 |
| Search           | Overlay replacing the header: pill input (2 px brand border) + close; left column: suggestions, categories, blog posts; right: products 3-up                                                                                                                                                                             | full screen                                  | Existing SearchDialog restyled: suggestions + categories + articles left, products right                                                                                                                             |
| Footer           | Brand-colour band; 4 columns: logo + greeting + blurb / "about" links / "contact" links / newsletter (pill input + outline pill button) + social icons + service-promise icons; bottom rule, centred legal links, locale right                                                                                           | stacked                                      | Real TERAN links, newsletter, social links from settings, pack values as the promise row                                                                                                                             |

## Homepage section order (1440 px heights)

1. Promo strip — 80 px dark band with offer copy and a pill CTA → TERAN: featured collection strip (real collection, no invented offer); hidden without one.
2. Feature banner / slider — 560 px, slides with a peek of the next slide, huge condensed headline left, pill CTA, dots → TERAN hero (words left, product stage right) kept, 560 px rhythm.
3. Marquee — 67 px tinted band, condensed uppercase words separated by icons → category names + brand words with leaf marks.
4. Tabbed product rail — 710 px: centred tab headings (display, active underlined), 4 cards (322 px) and a centred pill CTA → "Yangi" / "Tanlangan" (featured flag, no sales ranking claimed).
5. Campaign banner — 486 px inset (64 px margins), radius 24, centred headline + pill → collection/campaign banner from collection images or brand art.
6. Category shortcut tiles — 5 tiles 210×193, radius 12, tinted, coloured condensed labels → top-level/sub categories from the API.
7. Campaign banner (repeat of 5) → second banner (media gallery).
8. Collection rail — 489 px, 4 cards → products of a collection (tabs = collections).
9. Campaign banner — 548 px, text left, product composition right → wholesale / business.
10. Category rail — 569 px, 4 cards + CTA → products of a top-level category (tabs = categories).
11. Bento 2×2 — 840 px, tiles 644×384, radius 24, solid colour, headline + pill left, product right → 4 categories/collections with their product images.
12. Full-bleed feature banner — 560 px, tag label + headline + paragraph + pill left, image right → brewing (real pack brewing data).
13. Category collage — 744 px: rows of wide (640×308) and narrow (304×308) tiles, grey, radius 16, display heading, image, pill → category tree.
14. Full-bleed statement banner — 560 px, centred headline, row of marks, pill → TERAN values (the pack's four values), no certifications claimed.
15. Social video band — 723 px, tinted, centred heading, horizontal portrait cards (270×420; centre card 270×480), arrows below → TERAN films (videos) or, without films, photographs; never mixed.
16. Pair — 643 px: two columns, image 648×364 radius 16, heading, paragraph, pill → wholesale + journal.
17. Large marquee band — 226 px, small caps line, giant repeating words, line + link → brand tagline marquee (no statistics).
18. Footer.

Phone (390): same order; product rails become a 2×2 grid with a round quick-add button on each image; bento and collage tiles stack (wide tile, 2-up tiles, wide tile).

## Product card

White card, soft shadow, radius ~6; square image area; outline pill badge top-left ("New"), filled badge top-right (discount); italic category line; bold name (16 px); rating row (TERAN's: customers' stars and count from real reviews, an invitation to rate before the first, ADR-042); price + "· pack size"; quick add = round cart button over the image's lower-right corner (always on touch screens).

## Category / collection page

Breadcrumbs (65 px row) → rounded tinted banner (196 px: condensed h1 50 px + description left, image right) → filter row: outlined dropdown buttons (popover with checkboxes, instant apply) left, item count + Sort right → 4-column grid (322 px cards, 8 px gaps) → more results. Phone: banner with overlaid text, "Filter" button opening a full-screen drawer (accordion groups, sticky "See N items" pill), 2-column grid.

## Product page

Breadcrumbs → two columns: gallery (main image with side arrows, thumbnail row) | info (type pill, display title, price · size, tabs: about / taste / ingredients / highlights, icon attribute rows, quantity pill + add-to-bag pill with price) → floating sticky add-to-bag pill once the main button scrolls away → "they go together" rail → product-type infographic → "recently viewed" rail. Phone: full-width image, thumbnails, info stacked, sticky bar.

## Other templates

- Search results: tinted band with title + large pill input; left sidebar (suggestions, categories, articles); right filters + grid.
- Cart: empty state centred (heading, sign-in hint, pill) + "you may also like" rail; drawer from the right.
- About: full-bleed photo hero with centred condensed headline; "our story" heading and cards; story sections.
- Learn / guide: full-width tinted hero with centred serif title and intro; centred text sections on alternating tints.
- Blog: full-bleed hero with centred title; tag chip row; 4-column article cards with tag pill.
- Article / recipe: split hero (image left half, tag pill + condensed title + intro right), centred 736 px body.

## Typography and motion (measured 2026-10-17)

| Reference role                          | Reference font (measured)                                | TERAN font (open licence)                         | Utilities                                        |
| --------------------------------------- | -------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------ |
| Banner, hero, ribbon and tile headlines | Alternate Gothic (ATF / Condensed ATF) 600–900, capitals | Oswald (variable, Latin + Cyrillic)               | `font-headline`, `text-display-xl/lg/md`         |
| Section and card headings               | Oxtail 600–900, lowercase                                | Fraunces (SOFT 100) + Merriweather 900 (Cyrillic) | `font-heading`, `text-display-sm/xs` (lowercase) |
| Body, navigation, buttons               | Omnes 400–700                                            | Nunito (variable)                                 | `font-sans` (default)                            |

Sizes used at 1440 / 390 px: hero headline 100 / 72 px; campaign banners 110 / 56 px; bento 80 /
48 px; feature band 80 / 36–44 px; marquee 56 / 34 px; slogan ribbon 64 / 38 px; rail headings
28–36 px serif; footer greeting 32 px condensed; page titles 50 px condensed (category), 64 px serif
(blog), 40 px serif (policy pages).

Page frames (measured at 1920 and 2560 px, 2026-10-18): the home page, catalogue and category
pages use 1792 px between 64 px margins (`container-page`); the product page, the bag, contact,
the store locator, the help centre, the journal list, Tea 101's bands, the missing page and the
for-business hero's words use the reference's 1440 px frame between 40 px margins, 16 px on phones
(`container-frame`); policy columns are 920 px (the accessibility statement 1000 px); the footer
is 1600 px; an article's split hero spans the window at any width.

Motion: hero slides glide sideways (300 ms ease-out), autoplay every 4 s — the owner asked for
quicker changes than the reference's 5 s — (paused on pointer, focus, off screen and with reduced
motion); marquees 48.1 s and 36.8 s per loop; buttons brighten with a
shadow (filter, box-shadow 0.2 s ease); links 0.22 s cubic-bezier(0.32, 0.72, 0, 1); product cards
rise with a deeper shadow (0.25 s ease-out, base shadow 0 0 40px rgb(0 0 0 / 5 %)) and swap to the
product's second picture, with an "Add to bag · price" pill on pointer devices (round bag button on
touch screens); mega-menu panel fades and slides 4 px (0.22 s cubic-bezier(0.22, 1, 0.36, 1));
image tiles scale 1.03–1.05 over 0.35 s. No scroll-triggered reveals (the reference has none).

Owner's adjustments (2026-10-17): headings keep sentence case (the reference's all-lowercase serif
headings were dropped: brand and product names such as "TERAN XC2025" must keep their capitals);
every picture is shown whole — the terraces painting, which the pack fades into white, is cropped to
the part that is painted edge to edge (scripts/packaging); each hero slide stands on one of the
packs' paintings under a veil of its colour; the gallery band has "Videos" and "Photos" tabs and
opens the viewer in place, with three short films made from the packaging artwork
(scripts/films/generate-films.mjs, seeded as demonstration media).

## TERAN implementation (2026-10-16, branch `feat/reference-redesign`)

Where each reference element lives in TERAN, and what deliberately differs.

| Reference                                      | TERAN                                                                                                                                              | Notes                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Announcement bar + header (sticky together)    | `layout/announcement-bar.tsx`, `site-header.tsx`, `sticky-header.tsx`, `header-actions.tsx`, `account-menu.tsx`                                    | Message and link come from Settings; nothing invented. Account is an icon menu (sign in / register or the customer's links).                                                                                                                                                                                                                                              |
| Mega menus (4, own tints)                      | `layout/desktop-nav.tsx`                                                                                                                           | Shop (category tabs → subcategories + browse links + picture), Collections, Tea school (journal + guides), About (brand + help). All lists from the API.                                                                                                                                                                                                                  |
| Phone drawer                                   | `layout/mobile-menu.tsx`                                                                                                                           | Five picture tiles + "all products", then Shop / Tea school / About rows one level deeper; sign-in and language at the bottom.                                                                                                                                                                                                                                            |
| Home sections 1–17                             | `app/[locale]/(store)/page.tsx`, `home/editorial-sections.tsx`, `rail-sections.tsx`, `product-rail.tsx`, `category-collage.tsx`, `media-band*.tsx` | Promo strip = a real collection; certifications row = the pack's four values; social band = TERAN films or photographs (never mixed); no statistics.                                                                                                                                                                                                                      |
| Hero slider                                    | `home/hero.tsx`, `hero-slider.tsx`, `sparkles.tsx`                                                                                                 | First slide: the pack's tagline over the lake artwork (prerendered); then featured products that have a cut-out, on brand colours.                                                                                                                                                                                                                                        |
| Product card + quick add                       | `catalog/product-card.tsx`, `quick-add.tsx`                                                                                                        | Stars from customers' own reviews (ADR-042). Discount pill only from real compare-at prices. Hover picture = the product's second image (`hoverImage`).                                                                                                                                                                                                                   |
| Category banner, filter dropdowns, count, sort | `catalog/listing-header.tsx`, `filter-bar.tsx`, `filter-dropdown.tsx`, `filter-styles.ts`, `sort-select.tsx`, `catalog-results.tsx`                | Dropdown choices are links (work without JavaScript, shareable URLs). Phones keep the existing filter drawer.                                                                                                                                                                                                                                                             |
| Product page                                   | `products/[slug]/page.tsx`, `product/product-gallery.tsx`, `product-tabs.tsx`, `product-info.tsx`, `purchase-panel.tsx`, `recently-viewed.tsx`     | Tabs and rows only for data the product has; brewing infographic only with brewing values; recently viewed stays on the device (local storage).                                                                                                                                                                                                                           |
| Search, cart, about, journal, article, gallery | `search/page.tsx`, `cart/page.tsx`, `content/page-header.tsx`, `article-card.tsx`, `article-content.tsx`, `media/media-archive.tsx`                | Heroes use TERAN's own packaging artwork (lake, terraces); no reference photography.                                                                                                                                                                                                                                                                                      |
| About template                                 | `about/page.tsx`, `brand/pack-images.ts`, `home/business-section.tsx` (`BusinessCloser`)                                                           | Since round 4 (ADR-051) an editorial story in TERAN's own words: the meaning of the name beside the five pouches, the history at a reading measure, the three ideas, the pack's tagline and values once (the band's colour steeps in with scrolling), the range and its kinds, the request for businesses, the journal and Tea 101. No stock pictures, stamps or figures. |
| Help centre (embedded Gorgias)                 | `faq/page.tsx`, `faq/articles`, `faq/[group]`, `faq/[group]/[article]`, `faq/search`, `components/help/*`                                          | The FAQ groups are the categories, each question an article; search runs over the same answers. Ratings are not recorded (ADR-031).                                                                                                                                                                                                                                       |
| Contact (embedded form + option cards)         | `contact/page.tsx`, `forms/contact-form.tsx`, `content/contact-options.tsx`                                                                        | TERAN's fields (phone as well as e-mail, subjects from a list); no attachments or reCAPTCHA note. The chat card became "Write to us" (ADR-047).                                                                                                                                                                                                                           |
| Policy pages (shipping, privacy, terms)        | `content/page-header.tsx` (light tone), `promise-card.tsx`, `legal-page.tsx`, `long-form.tsx`, `delivery/page.tsx`                                 | The "promise" card shows the pack's values and the brand line, not shipping or review claims; delivery's table lists the configured methods.                                                                                                                                                                                                                              |
| Wholesale landing                              | `wholesale/page.tsx`, `content/pages/wholesale.ts`                                                                                                 | Login bar → contact; certifications card → the pack's values; press logos → the teas' names; the request form sits in the dealer section.                                                                                                                                                                                                                                 |
| Chat (Gorgias) and offer card (Klaviyo)        | `social/social-launcher.tsx`, `layout/promo-popup.tsx`                                                                                             | No chat: TERAN's networks button takes its corner (ADR-047); the offer card shows a real collection (ADR-030).                                                                                                                                                                                                                                                            |
| Footer                                         | `layout/site-footer.tsx`                                                                                                                           | Contact details and social links appear only once entered in Settings.                                                                                                                                                                                                                                                                                                    |
| Store locator (Storepoint on Google Maps)      | `stores/page.tsx`, `stores/store-locator.tsx`, `stores/store-map.tsx`, `admin/stores-form.tsx`, `admin/location-picker.tsx`                        | Stores from Admin → Store addresses, placed on a map there (ADR-044; none invented; an empty list points to contact); OpenStreetMap tiles instead of Google's (ADR-032).                                                                                                                                                                                                  |
| Tea 101                                        | `tea-101/page.tsx`                                                                                                                                 | The Chinese teas TERAN deals in; pills and product rows only where the catalogue has that kind.                                                                                                                                                                                                                                                                           |
| Accessibility page                             | `accessibility/page.tsx`, `content/pages/accessibility.ts`                                                                                         | TERAN's own website statement instead of the reference's employer policy.                                                                                                                                                                                                                                                                                                 |

Not reproduced, because TERAN has no such content or capability (and none is invented): loyalty
programme, promotions/discount banners, ambassador programme, gift cards,
recipe tags, wholesale accounts, order tracking and file attachments in the contact form, nor the
reference's company pages (impact report, careers, contests, investor relations). The reference's
wholesale page has its own header; TERAN's keeps the store's, and its footer columns change on that
page as the reference's do. The photo and video gallery has no counterpart on the reference: it
stays behind `NEXT_PUBLIC_SHOW_GALLERY` (off by default, ADR-033).

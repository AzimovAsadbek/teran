# Reference assets — DAVIDsTEA pictures in TERAN's storefront

On 2026-10-17 the owner stated that TERAN holds written permission from DAVIDsTEA to reuse its
site's pictures, and asked for the storefront to match the reference (davidstea.com) one to one,
pictures included, so it can be shown to TERAN's client first and adjusted afterwards. A copy of
that permission belongs with the owner's records; it does not cover the reference's fonts (they are
licensed by their foundries, so the open-licence look-alikes stay, see typography.md).

The GitHub repository is public, so **no picture is committed**. The files live in two folders
under `apps/api/storage/`, which git ignores, each with a `manifest.json` listing every file, the
place it fills and the reference address it was taken from. Both are loaded with
`apps/api/scripts/import-visuals.ts` (ADR-028).

## 1. `storage/reference-assets/` — unbranded pictures (14 entries left, go live)

Photographs and illustrations without the DAVIDsTEA name, packs or products, and none shown as a
TERAN product. They are the pictures that go to the live site with the design (the owner asked on
2026-10-18 for the pictures to stay when the site goes live); on 2026-10-18 fourteen of the
mockup's pictures were reviewed and moved here (the globe band, three menu pictures, the black
tea cover, the contact, help, flavour and Tea 101 pictures):

| Place                                          | Files                | Shown on                                                         |
| ---------------------------------------------- | -------------------- | ---------------------------------------------------------------- |
| `about.hero`, `about.showcase`                 | 1 each               | Not shown since round 4 (About tells its story with the pouches) |
| `about.idea.1` … `about.idea.3`                | 1 each               | Not shown since round 4                                          |
| `banner:catalog`                               | desktop + phone crop | All products: the header banner                                  |
| `banner:category:green-tea`                    | desktop + phone crop | Green tea: the header banner                                     |
| `article:<slug>` (4 journal articles)          | 1 each               | Journal cards, the home pair and article pages (covers)          |
| `home.values`                                  | desktop + phone crop | Home: the values band (the globe)                                |
| `menu.collections`, `menu.learn`, `menu.about` | 1 each               | Desktop menus' cards (where the item has no picture of its own)  |
| `cover:category:black-tea`                     | 1                    | Black tea: menus and category tiles                              |
| `contact.picture`, `help.returns` (one file)   | 1                    | Contact page (the help centre shows no pictures since round 4)   |
| `help.banner`, `help.tea`, `help.payment`      | 1 each               | Not shown since round 4 (the help centre shows its answers)      |
| `wholesale.flavour`                            | desktop + phone crop | Not shown since round 4 (the for-business page was rebuilt)      |
| `tea101.amount`                                | 1                    | Not shown since round 4 (the pouch and its cups stand there)     |

```bash
corepack pnpm --filter @teran/api visuals:import --dir storage/reference-assets
```

On the live site this runs against the production database with the production store's settings
(R2 since ADR-043; at the time, Vercel Blob), only when the owner asks for a deploy. Done on
2026-10-18 with the release: 23 places filled from the 27 files (four are phone crops).

## 2. `storage/reference-mockup/` — the reference's campaign and product pictures (11 entries)

**Live since 2026-10-18.** On 2026-10-18 TERAN asked for tea photographs instead of the
reference's drinks and merchandise in four home places (`home.hero.2`, `home.banner.2`,
`home.banner.3`, `home.feature`): they now come from section 3, and their eight entries were taken
out of this manifest and of `storage/reference-partner/` (43 → 35), so a later import of either
folder cannot bring the old pictures back there. The files themselves were kept. The second batch (section 4) replaced or removed the rest of the campaign pictures: what remains of this folder is the teas' leaf and cup photographs (TERAN 8009 without its genmaicha photograph), the green-tea category cover and the premium collection's cover. TERAN and the owner decided that the live site shows these pictures as
the local presentation does (TERAN preferred the leaf and cup photographs to its own pack
photographs as the first pictures of its teas, and the owner wants to advertise DAVIDsTEA, under
the written permission the owner states TERAN holds). They were loaded into production from
`storage/reference-partner/`, a copy of this folder whose manifest is not marked `localOnly`
(26 page places, 4 covers, 2 photographs before each tea's own pack photographs). The text below
describes the earlier arrangement, when they stayed on this machine.

The reference's campaign photographs and product photographs, which show DAVIDsTEA's name, packs,
merchandise, staff and shops, other teas as TERAN's five teas, or its store map. They are for a
presentation of the look on this machine only: shown on TERAN's pages they would present another
company's brand and products as TERAN's, so they never go to the live site, where those places
show TERAN's own pictures (its pouches, the pack paintings) until TERAN uploads photographs. The manifest is marked `"localOnly": true`, and the import refuses to load it unless
`NODE_ENV` is not `production`, the database runs on this machine and no `R2_*` setting is set
(before ADR-046: no `BLOB_READ_WRITE_TOKEN`).

| Place                                                                                                              | Files                               | Shown on (and what the live site shows there instead)                                                                                         |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `home.hero.1`, `home.hero.2`                                                                                       | desktop + phone crop                | Home: the two slides (live: the pack paintings)                                                                                               |
| `home.banner.1` … `home.banner.3`                                                                                  | desktop + phone crop                | Home: story, gallery and ordering banners (live: TERAN artwork)                                                                               |
| `home.bento.1` … `home.bento.4`                                                                                    | 1 each                              | Home: the four bento tiles (live: TERAN's pouches on colour)                                                                                  |
| `home.feature`                                                                                                     | desktop + phone crop                | Home: the brewing band (live: the brewing guide card)                                                                                         |
| `home.pair.1`, `home.pair.2`                                                                                       | 1 each                              | `home.pair.1` is no longer shown (the article card shows its article's cover); `home.pair.2`: the business card (live: the terraces painting) |
| `menu.shop`                                                                                                        | 1                                   | Shop menu card, for a category without a picture (live: the category's own)                                                                   |
| `product:<slug>` (the five TERAN teas)                                                                             | 2 each                              | Product cards and galleries (live: TERAN's own pouch photographs)                                                                             |
| `cover:category:<slug>` (tea, green tea, gift sets)                                                                | 1 each                              | Category covers (live: the category illustrations)                                                                                            |
| `cover:collection:teran-premium`                                                                                   | 1                                   | The premium collection's cover (live: its illustration)                                                                                       |
| `help.ordering`, `help.delivery`                                                                                   | 1 each                              | Not shown since round 4 (the help centre shows its answers)                                                                                   |
| `wholesale.hero`, `wholesale.card.1` … `wholesale.card.3`, `wholesale.why`, `wholesale.community`, `wholesale.map` | desktop + phone crop (hero), 1 each | For business (live: TERAN's pouches and paintings)                                                                                            |

```bash
corepack pnpm --filter @teran/api visuals:import --dir storage/reference-mockup
```

**Before any public launch** (or before showing the site anywhere but this machine), take it out
again and replace the pictures with TERAN's own:

```bash
corepack pnpm --filter @teran/api visuals:import --dir storage/reference-mockup --remove
```

`--remove` deletes the mockup's page pictures (recognised by their source), the product
photographs (recognised by their content; TERAN's own photographs stay) and the covers recorded in
`storage/reference-mockup/applied.json` when it set them, unless an editor has replaced them
since. The places it filled are empty again, so the storefront falls back to TERAN's artwork.

## 3. `storage/tea-photos/` — free tea photographs for four home places (8 files, go live)

Photographs from Unsplash under the
[Unsplash License](https://unsplash.com/license) (free for commercial use, no attribution or
permission needed), each checked on its page to be a free photograph, not an Unsplash+ one. Only
tea and tea ware, no brand or product; nothing generated.

| Place           | Photograph (photographer)                                                                                                                                                                                                           | Words over it                    |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `home.hero.2`   | [Carved green teapot](https://unsplash.com/photos/a-decorative-green-teapot-with-ornate-carvings-6BEDV1dECaI) (Adi Albulescu)                                                                                                       | The premium collection slide     |
| `home.banner.2` | [Three gaiwans of green tea](https://unsplash.com/photos/three-glasses-of-green-tea-on-a-tray-3KxnrtEEI-4) (Fenghua)                                                                                                                | "A choice for every taste"       |
| `home.banner.3` | [Clay teapot and cup](https://unsplash.com/photos/a-tea-pot-and-a-cup-on-a-table-5QRlve1YaaE); phone crop: [the same set, steaming](https://unsplash.com/photos/a-steaming-tea-pot-and-a-cup-on-a-table-UuLhgdfVTa0) (Seven Colors) | "Contact us to order"            |
| `home.feature`  | [Tea poured into a white cup](https://unsplash.com/photos/a-cup-of-tea-being-poured-into-a-teapot-vCdC4Tz-dFU) (Georg Niggli)                                                                                                       | "Tea school: the art of brewing" |

Each is composed as the reference's banners are: on the wide picture (2560 px) the subject stands
between about 47 % and 85 % of the width, so it stays whole from 1280 px up, even where a long
Uzbek title makes a banner taller, and the words keep the dark left side; on the phone crop
(1200 × 1657) it stands in the lower half, under the words. Where a photograph is narrower than the
place, its own dark background and table continue it and fall off like the light round the
subject; nothing else is painted in. Under the words the pictures' average luminance stays below
8 %, so the yellow, ivory and pink words keep a contrast of 5:1 and more.

```bash
corepack pnpm --filter @teran/api visuals:import --dir storage/tea-photos --force
```

`--force` because the places already held the reference's pictures (they are replaced, and their
stored files deleted). On the live site this ran on 2026-10-18, as section 1 describes. Later that
day `home.banner.2`, `home.banner.3` and `home.feature` got films (section 5); their entries were
taken out of this manifest, so importing it again cannot replace the films, and `home.hero.2` is
no longer shown (the first view does not rotate, ADR-037).

## 4. `storage/tea-photos-2/` — every other picture that showed another product (32 files, go live)

On 2026-10-18 the owner asked for tea only everywhere: the rest of the reference's campaign
pictures (mugs, tins, gift boxes, branded cups, bags and staff, lattes, iced and fruit drinks) were
replaced, and the empty demonstration categories hidden (ADR-036). Bright and coloured photographs
were chosen as well as dark ones, all free under the Unsplash License and checked on their pages;
the manifest lists each file's place, source and photographer.

| Place                                            | Photograph (photographer)                                                                            |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `home.hero.1`                                    | Green tea in a tall glass beside a bowl of leaves (Tang Don)                                         |
| `home.banner.1`                                  | White kyusu teapot and a cup of green tea, from above (Vincent Roman)                                |
| `home.bento.1`, `home.bento.2`                   | Leaves poured into a clay teapot (Danish Prakash); glass teapots on a tray (Nguyễn Bình)             |
| `home.pair.2`                                    | Tea pickers with a red umbrella on a hillside (Ama Journey)                                          |
| `menu.shop`, `menu.learn`                        | Longjing on a tea table (Tang Don); tea poured into glass cups (Raychan)                             |
| `menu.collections`, `menu.about`                 | A tea tasting (Nepal Tea Collective); tea gardens in Munnar (Vivek Kumar)                            |
| `banner:catalog`                                 | Rows of tea bushes (Colin Roe)                                                                       |
| `about.hero`                                     | A picker in a tea plantation (一只猫的橘)                                                            |
| `help.banner`                                    | Leaves round a cup of tea (T ed) and the white teapot (Vincent Roman), on light grey                 |
| `help.ordering`, `help.payment`, `help.delivery` | Glass teapot in a garden (Jessie Maxwell); cups of tea (Dmitriy Sarychev); pickers (Long Nguyen)     |
| `help.tea`, `help.returns`                       | A gaiwan of green tea (Jia Ye); a tea table set (五玄土 ORIENTO)                                     |
| `contact.picture`                                | Tea poured from a glass teapot (Prefix)                                                              |
| `wholesale.hero`                                 | A white teapot and cup, from above (Wengang Zhai)                                                    |
| `wholesale.card.1` … `wholesale.card.3`          | Baskets of loose tea (MChe Lee); a teapot on a tray (Content Pixie); tea canisters (Jonathan Phelps) |
| `wholesale.why`, `wholesale.community`           | Pickers on a hillside (feifei liang); a tasting table (ogkgo)                                        |
| `wholesale.flavour`, `wholesale.map`             | Glasses of loose tea (Maria Kovalets); misty tea hills (Ravi Pinisetti)                              |
| `cover:category:tea`                             | Leaves round a cup of tea, cut out (T ed)                                                            |

```bash
corepack pnpm --filter @teran/api visuals:import --dir storage/tea-photos-2 --force
corepack pnpm --filter @teran/api visuals:import --dir storage/remove-batch-2 --remove
```

`storage/remove-batch-2/` takes out what had no tea replacement: the bento's third and fourth
campaign pictures (those tiles show their own category's product when there are four stocked
categories), the pair picture no longer shown, the gift-sets cover (another brand's tin; its
`applied.json` names the cover to remove, per database) and the genmaicha photograph shown first
for TERAN 8009. The eight-plus-five places replaced here were taken out of the manifests of
sections 1 and 2, so importing those folders again cannot bring the old pictures back. `home.hero.1`
plays the owner's film since (section 5); its entries were taken out of this manifest the same way.

## 5. `storage/hero-video/` and `storage/banner-films/` — films (replaced by section 9)

The home page's first view plays the owner's film of tea gardens; its three large banners play
films the owner chose from Pinterest pins they sent (ADR-037). Each place's picture is its film's
first frame (shown at once, and instead of the film with reduced motion); phones (under 750 px) get
a portrait film and its first frame where there is one.

| Place           | Wide screens                                                                                                            | Phones                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `home.hero.1`   | The owner's file (`e5fc48b6396126521790b49cdd8c5401.mp4`, 596 × 336): all 14.2 s, the last 2 s dissolved into the start | The same film                                                                                     |
| `home.banner.2` | Pin 303500462412572098, a glass teapot brewing (736 × 414), mirrored: 2.0–7.9 s, 1.8 s dissolve, push-in matched        | Pin 658721883031198221, a full glass by a garden window (720 × 1280): 16.5–23.2 s, 1.6 s dissolve |
| `home.banner.3` | Pin 303500462412916136, tea poured into a glass cup, mirrored: 2.0–7.2 s, 1.6 s dissolve                                | Pin 479914904048894517, tea poured into a floral porcelain cup: 7.9–13.7 s, 1.4 s dissolve        |
| `home.feature`  | Pin 597008494397410310, an evening tray with a book and candles: 8.0–9.95 s forwards and back, 25 fps                   | Pin 308496643241119471, tea poured from a glass teapot: 5.1–13.2 s, 2 s dissolve                  |

(Pins: `https://www.pinterest.com/pin/<number>/`.) Each film was prepared as a loop with
`apps/api/scripts/loop-film.swift` (macOS, AVFoundation), so the storefront only has to repeat it:

1. **The part.** Frames every 0.1 s were compared, by colour and by edges, for the start and end
   whose surroundings differ least: the calm part of each clip (a full glass, a steady pour, the
   candles after the pour), never a cup emptying or a teapot appearing.
2. **The seam.** The part's last 1.4–2 s dissolve into its first (smoothstep), in the file, so its
   last frame flows into its first. The teapot film's camera pushes in (2.4 % a second about the
   teapot): both layers are scaled during the dissolve so the outlines stay single, and the whole
   film is magnified 10 % to keep the edges filled. The evening tray barely moves: it plays forwards
   then backwards instead.
3. **The file.** Muted H.264 (High profile), Rec. 709, a key frame every 2 s, 1.2–2 Mbit/s
   (0.5–2.2 MB; the owner's 4.1 MB film is 2.2 MB); mirrored where the subject must stand on the
   side the words leave free.
4. **Checked.** The dissolve's middle frame shows no doubled rim or outline; the step from the
   file's last frame to its first is no larger than its ordinary frame-to-frame steps; colours
   match the source frames (within 1 %); the first frame, upscaled to 1920 (1080 on phones), is
   the poster.

```bash
swift apps/api/scripts/loop-film.swift in=pin.mp4 out=banner-2-film.mp4 start=2.0 end=7.9 \
  fade=1.8 flip=1 bitrate=1400000 zoom=0.024,0.475,0.44
corepack pnpm --filter @teran/api visuals:import --dir storage/hero-video --force
corepack pnpm --filter @teran/api visuals:import --dir storage/banner-films --force
```

**Rights.** The first view's film was supplied by the owner. The banner films are other creators'
work found on Pinterest, used at the owner's request: a pin grants no licence, so TERAN should get
the creators' permission or replace them with its own footage (the places keep working with any
prepared film, or with a picture uploaded in Admin, which replaces the film).

## 6. `storage/tea-cups/` — each tea brewed in one cup, then its dry leaves (go live)

On 2026-10-18 the owner asked for each tea's first picture to show it brewed in a fine porcelain
cup, a different liquor for each, followed by the tea's dry leaves (photographs they supplied).
These replace the DAVIDsTEA leaf and cup photographs shown before each tea's pack photographs.

- **The cup**: [a blue-rose teacup with gold rims](https://unsplash.com/photos/ToXwAwrpRKU) by
  Larisa Birta (Unsplash License), square-cropped. The vase behind it was replaced by the backdrop
  mirrored from beyond it (its light matched along the edges, the cup's outline re-blended), the
  brooch beside the saucer by the table's own light and grain.
- **The tea** is painted in, just poured (the owner asked for it to look freshly brewed and hot,
  as in a reference photograph they sent): a surface 125 px below the rim in the cup's taper; its
  colour from light crossing the tea to the far inner wall and back (Beer–Lambert, pale at the far
  edge, deepest at the front); rings spreading from where the stream landed (wider outwards, as
  real ripples), which bend the mirrored far wall and gold rim, change the surface's sheen
  (Fresnel) and catch the window's light; a few bubbles; steam rising in wisps above the rim; a
  slightly warmer light, the wall a shade deeper behind the steam. Each tea has its own rings,
  bubbles and steam. The liquors are an illustration, not a photograph of the teas: fresh jade
  green (8830), olive green-gold (XC2025), lemon yellow (8800), golden (G8810), golden amber (8009,
  roasted). Photographs of the real brews should replace them. The scripts that made them were
  one-off and are not kept; the method is this list.
- **The leaves** (the owner's 1254 px studio photographs): XC2025 thin curled leaves, G8810 downy
  Yunnan leaves, 8800 large twisted leaves, 8830 straight needles, 8009 flat roasted leaves. The
  Tea 101 page's round frames show the owner's white, oolong, black and pu-erh leaves in their
  bands and the flat green leaves in the green band (`apps/web/public/brand/leaves/`); the jasmine,
  mint, fruit and gunpowder photographs are kept for teas TERAN may add.

```bash
corepack pnpm --filter @teran/api visuals:import --dir storage/remove-partner-products --remove
corepack pnpm --filter @teran/api visuals:import --dir storage/tea-cups
```

The first, still versions of the cups (the same day) are in `storage/remove-tea-cups-v1/`, imported
with `--remove` before the steaming ones. The removal folder holds the DAVIDsTEA product photographs
(matched by content); their entries were
taken out of `storage/reference-partner/`'s manifest (section 2), so importing it again cannot bring
them back.

## 7. `storage/tea-films/` — each tea's living cup (go live)

Later on 2026-10-18 the owner sent a photograph of a steaming cup of tea (a reference photograph
with its teapot taken out; 1024 × 1536) and asked for it to be each tea's first picture, the tea
moving and the steam rising, each tea in its own colour (ADR-038). It replaces the painted
blue-and-gold cups of section 6 (`storage/remove-tea-cups-v2`, imported with `--remove` first);
the dry leaves stay the second picture.

- **The picture**: squared (the cup, its saucer and the lower steam: rows 230–1254); the tea's hue
  turned from the photograph's black tea to each tea's in OKLab, its lightness lifted for the green
  teas, the window's reflection and the rings kept: fresh green (8830), green-olive (XC2025),
  yellow-green (8800), olive-gold (G8810), amber (8009).
- **The film** (5 s, 24 frames a second, seamless): the steam flows upward and leans left as in
  the photograph, in two copies half a cycle apart (each fading out before it starts over), with a
  gentle swirl that returns to itself; it never samples the cup (its rim stays still); the rings
  on the tea run outwards and the reflection shimmers with them. One key frame per loop.
- **The files**: `<tea>-film.mp4` (1024 px, 1.2 Mbit/s, about 670 KB) for the product page,
  `<tea>-card.mp4` (512 px, 0.5 Mbit/s, about 270 KB) for cards, `<tea>-mask.png` (where it
  moves), `<tea>-poster.jpg` (its first frame, the picture itself). Outside the mask the frames
  hold a blur (never seen).

```bash
corepack pnpm --filter @teran/api visuals:import --dir storage/remove-tea-cups-v2 --remove
corepack pnpm --filter @teran/api visuals:import --dir storage/tea-films
```

## 8. `storage/banner-2-gaiwans/` — "A choice for every taste" with steam (replaced by section 9)

The owner asked for another film than the teapot in this banner. Its section 3 photograph — three
gaiwans of green tea (Fenghua, Unsplash License), composed for the place at 2560 px and 1200 px
for phones — now has steam painted rising from each cup, a seamless 6 s living picture: wisps of
domain-warped noise flowing up in two copies half a cycle apart, warm against the dark. The films
are 1920 × 620 (590 KB) and 720 × 994 (390 KB), each with a mask of the steam; the posters are the
full-size first frames. Its entries were taken out of `storage/banner-films/`'s manifest.

The first view's film and the order and tea-school banners' wide-screen films (section 5) were
re-encoded twice their size the same day (Lanczos, a little sharpening:
`apps/api/scripts/upscale-film.swift`), the banners with masks of where they move (measured over their frames), and the
first view got a phone film of the middle a phone shows.

## 9. `storage/hd-films/` and `storage/hd-pictures/` — sharp on the largest screens (go live)

The owner found the first view and the banners blurry in Chrome on a large Retina screen, asked for
a better film than the gaiwans, and for every picture to stay sharp on the largest screens too
(ADR-040). The first view's film (596 × 336 at its source) and the two Pinterest banner films
(736 px) could not be made sharper, so the four home films are now 4K Pexels footage (Pexels
License: free to use, no attribution required; the authors are named in the manifests):

| Place           | Film (Pexels)                                                                       | Source              | Loop            |
| --------------- | ----------------------------------------------------------------------------------- | ------------------- | --------------- |
| `home.hero.1`   | Tea bushes before mountains, #8191045 (Roman Odintsov); replaced on 2026-10-19      | 4096 × 2160, 30 fps | 7.7 s, dissolve |
| `home.banner.2` | Teas on a tray, tea poured into a pitcher, #6540437 (Tima Miroshnichenko), mirrored | 3840 × 2160, 25 fps | 13.3 s          |
| `home.banner.3` | Tea poured from a celadon teapot, #6691563 (RDNE Stock project)                     | 3840 × 2160, 24 fps | 9.9 s           |
| `home.feature`  | Gongfu tea with a gaiwan, #6540435 (Tima Miroshnichenko)                            | 3840 × 2160, 25 fps | 12.6 s          |

On 2026-10-19 the films were made again (`storage/hd-films-2/`, replacing `storage/hd-films/`):
their first loops dissolved the last 1.4–1.6 s into the first, and as the camera or a hand moves in
all four, two views showed at once at every restart. Now no frame is blended. The first view plays
1.0–4.5 s of its clip forwards and back, its speed easing to a stop at each end (`loop-film.swift
mode=bounce ease=1.15`, 9.5 s); the banners play from the two frames most alike and start again
with a plain cut (`mode=cut`: the gaiwan tray 1.48–11.48 s, mirrored, 10 s; the celadon pour
0.33–8.34 s, 8 s; the gongfu tray 0.56–14.60 s, 14 s). Each is copied with `upscale-film.swift`
(Lanczos and some sharpening) at 1280, 1920, 2560, 3200 and 3840 px, and as the 9:16 part phones
show at 1080 × 1920 and 720 × 1280, at 0.09 bits per pixel for the first view and 0.06 for the
banners. The storefront plays the narrowest copy that fills its frame's device pixels: for the
first view, 1920 px (6.1 MB) on a 1× screen, 3200 px (16.9 MB) in a 1440 px window at 2×, 3840 px
(24 MB) only on the largest screens, 1080 × 1920 (5.8 MB) on phones; each film is fetched once the
page has loaded and its place comes near. Posters are each film's first frame at full size (4096 or
3840 px, the phone's 1215 × 2160).

`storage/hd-pictures/` replaces the page pictures that were smaller than large screens need with
Pexels photographs of the same subjects, cropped to each place's proportions so the layout stays:
the values band (Shah-i-Zinda, 900 px → 5120 px; replaced on 2026-10-19, below), the two bento tiles (films since
2026-10-19, below) and the business card (up to 1536 px → 3200 px), the wholesale first view (cups on the right, clear of the words; 5120 px) and
the dealer section's backdrop (5120 px), and an About timeline picture (705 → 2400 px). Not
replaced: the story band (the only fitting photograph put its tea set where the words are), the
wholesale flavour band (its words are dark and sit on the picture's light top) and the Tea 101
cups (the photograph found showed coffee too).

Later on 2026-10-19 the owner asked for a sharper, brighter first view and chose, from eight 4K
Pexels clips shown as mock-ups of the first view, a drone drifting over sunlit tea gardens in
Bangladesh (#31025015, Somogro Bangladesh; 3840 × 2160 at 60 fps, a 69 Mbit/s source, much
crisper than the first one). `storage/hd-hero-3/` holds it: 0.4–4.4 s forwards and back with eased
turns (`mode=bounce ease=1.25`, 30 fps, 10 s; the later seconds pass tree trunks close to the
camera), copied at 0.14 bits per pixel (0.12 at 3840 px; a 100 % comparison showed 0.085 smudging
the leaves): 1920 px 10.9 MB, 3200 px 30.2 MB, 3840 px 37.3 MB, the phone's 1080 × 1920 8.5 MB.
The first view's entries left `storage/hd-films-2/`.

The same day the owner found that film too short and disliked it turning back. `storage/hd-hero-4/`
replaces `storage/hd-hero-3/` (moved to the Trash folder): the whole 19.33 s shot, forwards only, at
30 fps (`mode=cut`; the browser starts it again with a plain cut, a change of scene every 19 s).
Its copies keep only what the first view shows: wide screens the middle 2.4:1 band of the frame
(the view is 1.6:1 to 3.1:1 from 900 px), 1280 to 3840 px at 0.10 to 0.14 bits per pixel
(1920 px 14.5 MB, 2560 px 23.8 MB, 3200 px 37.3 MB, 3840 px 44.7 MB); phones a 3:4 part
(0.78:1 to 1.1:1 there) at 1080 × 1440 (10.2 MB, 0.09) and 720 × 960 (5 MB). Posters are the
first frame cut the same way (3840 × 1600, 1080 × 1440).

That evening the owner asked for a real tea plantation instead (the Bangladesh garden reads as
trees with bushes under them) and chose, from four 4K Pexels clips shown as mock-ups of the first
view, the curving rows of the Moc Chau tea hill in Vietnam (#17973477, Tin Nguyen; 3840 × 2160 at
30 fps, 10.75 s). `storage/hd-hero-5/` replaces `storage/hd-hero-4/` (moved to the Trash folder):
0.4–7.8 s, between a visitor leaving the frame and a building with a large national flag coming in.
Every filmed frame is kept and played at 24 fps (`loop-film.swift mode=cut fps=30 play=24`: 0.8×,
222 frames, 9.25 s), so the flight is calmer and longer with nothing repeated or blended; it plays
forwards only and starts again with a plain cut. Wide screens get the middle 2.4:1 band (the small
flag on the hilltop stays above it), 1280 to 3840 px at 0.11 to 0.14 bits per pixel at 24 fps
(1920 px 5.6 MB, 2560 px 9.1 MB, 3200 px 14.2 MB, 3840 px 18.9 MB); phones a 3:4 part from 12 %
below the top (so the flag stays out) at 1080 × 1440 (4.3 MB) and 720 × 960 (1.9 MB). Posters are
the film's first frame cut the same way.

`storage/hd-bento-films/` (2026-10-19) turns the bento's first two tiles into films, the owner's
picks from six Pexels candidates each (mock-ups of the tiles with their names): tile 1, hot water
poured from a gooseneck kettle into a glass pitcher of green tea (#26202140, 3840 × 2160 at 60 fps):
10.15–20.36 s at 30 fps, its last 0.8 s dissolving into its first, 9.4 s (the kettle and the
stream stand in the same place at both ends, so nothing doubles); tile 2, water poured into a glass
teapot of loose herbal tea with its bamboo lid beside it (#19537776, 4096 × 2160 at 25 fps):
3.5–21.4 s, the brewed pot dissolving back into the dry leaves over 1 s while no hand is in view,
16.9 s. The wide copies are 16:9 parts with the vessel right of the tile's words (tile 1 the left
3200 px of the frame, tile 2 its left 3840 px; focus 65 %), 960, 1280 and 1920 px at 0.07 to 0.08
bits per pixel (1.5 to 7.6 MB); phones get square parts at 1080 and 720 px (1.5 to 4.3 MB). The
two photographs these replace left `storage/hd-pictures/` (Trash folder).

```bash
corepack pnpm --filter @teran/api visuals:import --dir storage/hd-films-2 --force
corepack pnpm --filter @teran/api visuals:import --dir storage/hd-hero-5 --force
corepack pnpm --filter @teran/api visuals:import --dir storage/hd-bento-films --force
corepack pnpm --filter @teran/api visuals:import --dir storage/hd-pictures --force
corepack pnpm --filter @teran/api visuals:import --dir storage/hd-values --force
corepack pnpm --filter @teran/api visuals:import --dir storage/hd-rerender --force
```

`storage/hd-values/` (2026-10-19) holds the values band's photograph: the owner found Samarkand's
Shah-i-Zinda odd on a tea site and chose Longjing tea terraces in Hangzhou, China, with tea pickers
(Pexels #16325662, Bluesea Tea), 16:9 at 5120 px and a 0.93:1 phone crop from the terraces on the
left. Its entries left `storage/hd-pictures/`, so importing that folder again cannot bring
Samarkand back.

`storage/hd-rerender/` holds the catalogue and help-centre banners of section 4 again (3700 and 3800
px) and the four journal covers of `storage/reference-assets/` (1921 to 2560 px): imported anew,
their renditions reach their own width instead of stopping at 2560 px (banners) or 1600 px (covers,
which the tall journal cards show only a slice of).

## 10. `storage/gallery-films/` — the gallery's tea plantation film (go live)

The owner asked for a tea plantation film in the home page's gallery band ("Lavhalar"), titled
"Choy plantatsiyasi" / "Чайная плантация" / "Tea plantation" with a caption that names no place
and claims no garden. It first held the Bangladesh shot of `storage/hd-hero-4`; with the new first
view it holds the same Moc Chau part (section 9: 0.4–7.8 s, every frame at 24 fps, 9.25 s) as a
16:9 picture from 12 % below the top (so the hilltop flag stays out), 1920 × 1080 (6.9 MB), its
first frame as the poster. The gallery's viewer plays it with its controls, streamed in ranges. It
went in with `scripts/add-gallery-film.ts`, then `--replace` gave the same item the new file and
poster (its place, titles and caption kept; the old files removed). A gallery film is not a page
place, so the folder's `manifest.json` is a record, not an import manifest; the Bangladesh files
are in the Trash folder (`gallery-films-bangladesh`).

```bash
corepack pnpm --filter @teran/api exec tsx scripts/add-gallery-film.ts \
  --film storage/gallery-films/moc-chau-1920.mp4 --poster storage/gallery-films/moc-chau-poster.jpg \
  --title-uz "Choy plantatsiyasi" --title-ru "Чайная плантация" --title-en "Tea plantation"
# a new file for an existing gallery film
corepack pnpm --filter @teran/api exec tsx scripts/add-gallery-film.ts --replace <id> \
  --film storage/gallery-films/moc-chau-1920.mp4 --poster storage/gallery-films/moc-chau-poster.jpg
```

Since 2026-10-19 the stored pictures and films live in Cloudflare R2 (ADR-043);
`scripts/restore-media.ts --dirs storage,<Trash folder> --stand-ins` rebuilds the ones in use from
these folders under the keys the database holds (gallery films excepted: they are added again with
the script above).

## 11. `storage/range-photos/` — the wider demonstration range (2026-10-20, local only)

Photographs for the demonstration products of `apps/api/prisma/seed/demo-range.ts` and two gift
boxes for the earlier gift sets, shortlisted by a research pass (content, branding, people and an
AI/CGI look checked on each photo page, licence read there) and approved by the owner on
2026-10-20. Each was downloaded once at 2400 px wide from the site's own image server into the
git-ignored `apps/api/storage/range-photos/` with a `manifest.json` (source, photographer,
licence, bytes, dimensions, sha256). Pexels License and Unsplash License: free commercial use, no
attribution required; the credits are kept anyway. They reach a database only as square crops of
`scripts/build-demo-photos.ts` (`DEMO_PHOTOS_DIR`, presentation databases); production does not
load the demonstration range.

| Crop                | Product               | Shows                                                  | Source, photographer                                                                                                                              | Size                         |
| ------------------- | --------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `apple-juice`       | apple-quince-juice    | an amber apple drink in a cut-glass cup with apples    | Pexels [29632177](https://www.pexels.com/photo/refreshing-apple-tea-with-sliced-apples-on-table-29632177/), Rahime Gül                            | 2400 × 4264 → 2400 px square |
| `apricot-juice`     | apricot-nectar        | a pale apricot drink with apricots on a white block    | Pexels [10508297](https://www.pexels.com/photo/glass-and-decorations-on-white-table-10508297/), Ron Lach                                          | 2400 × 1600 → 1600 px square |
| `chamomile`         | chamomile-apple       | a glass teapot of chamomile, dried flowers before it   | Unsplash [k94FbpisWto](https://unsplash.com/photos/clear-glass-tea-pot-on-white-ceramic-saucer-k94FbpisWto), Irene Ivantsova                      | 2400 × 1535 → 1535 px square |
| `discovery-box`     | discovery-box         | a wooden box of tea flowers and spices in compartments | Pexels [29133249](https://www.pexels.com/photo/aromatic-herbs-and-spices-box-from-dalat-29133249/), Kien Khong Ngu                                | 2400 × 1600 → 1600 px square |
| `gift-box-white`    | gift-set (two teas)   | a white gift box with a black ribbon                   | Pexels [5872188](https://www.pexels.com/photo/close-up-shot-of-a-gift-box-wrapped-with-black-ribbon-5872188/), Max Fischer                        | 2400 × 1600 → 1600 px square |
| `gift-boxes-black`  | gift-set (three teas) | two black gift boxes with white ribbons                | Pexels [5872362](https://www.pexels.com/photo/close-up-shot-of-black-gift-boxes-5872362/), Max Fischer                                            | 2400 × 1600 → 1600 px square |
| `hibiscus`          | hibiscus-pomegranate  | hibiscus tea in a glass cup, dried petals around it    | Pexels [8431379](https://www.pexels.com/photo/opened-book-and-cup-of-fresh-tea-8431379/), Beyza Efe                                               | 2400 × 3600 → 1700 px square |
| `iced-green-tea`    | cold-brew-green-tea   | swing-top bottles of a pale green drink in a crate     | Pexels [8540993](https://www.pexels.com/photo/clear-glass-bottles-in-a-wooden-crate-8540993/), RDNE Stock project                                 | 2400 × 1600 → 1600 px square |
| `iced-jasmine`      | jasmine-cold-brew     | a chilled glass of iced green tea                      | Pexels [33526974](https://www.pexels.com/photo/refreshing-iced-green-tea-on-wooden-table-33526974/), Sóc Năng Động                                | 2400 × 3600 → 2400 px square |
| `iced-peach`        | iced-peach-oolong     | iced peach tea beside half a peach                     | Pexels [9230288](https://www.pexels.com/photo/photo-of-a-drink-beside-a-sliced-peach-9230288/), Tanner Barrott                                    | 2400 × 3000 → 2400 px square |
| `matcha-bowl`       | ceremonial-matcha     | whisked matcha in a terracotta bowl, from above        | Pexels [29574692](https://www.pexels.com/photo/aesthetic-matcha-tea-preparation-with-bamboo-whisk-29574692/), Anna Androshuk                      | 2105 × 3743 → 2105 px square |
| `matcha-powder`     | everyday-matcha       | matcha powder, a wooden scoop and a bamboo whisk       | Pexels [8474058](https://www.pexels.com/photo/bamboo-whisk-on-the-table-8474058/), Cup of Couple                                                  | 2400 × 3600 → 2400 px square |
| `matcha-whisk`      | matcha-whisk          | a bamboo matcha whisk                                  | Pexels [8474062](https://www.pexels.com/photo/bamboo-whisk-on-white-background-8474062/), Cup of Couple                                           | 2400 × 3600 → 2400 px square |
| `mint-tea`          | mint-lemongrass       | mint tea in glass cups before a glass teapot           | Pexels [36228288](https://www.pexels.com/photo/fresh-mint-tea-in-glass-teapot-and-cups-36228288/), Masuma Rahaman                                 | 2400 × 3200 → 2400 px square |
| `piyola-set`        | piyola-set            | two piyolas of tea, a paxta teapot, spices and non     | Pexels [4589178](https://www.pexels.com/photo/food-ingredients-on-the-table-4589178/), ArtHouse Studio                                            | 2400 × 3598 → 1650 px square |
| `pomegranate-juice` | pomegranate-juice     | a tall glass of pomegranate juice                      | Pexels [18142601](https://www.pexels.com/photo/glass-of-pomegranate-juice-with-lemon-slice-18142601/), Denys Gromov                               | 2400 × 1600 → 1600 px square |
| `rosehip`           | rosehip-quince        | a glass of rosehip tea beside a bowl of fresh rosehips | Pexels [39963126](https://www.pexels.com/photo/rose-hip-tea-with-fresh-rose-hips-39963126/), Raymond Petrik                                       | 2400 × 3600 → 2400 px square |
| `sparkling-water`   | sparkling-water       | sparkling water over ice in a tall glass               | Pexels [12987478](https://www.pexels.com/photo/soda-sparkling-with-ice-cubes-12987478/), Srattha Nualsate                                         | 2400 × 1602 → 1602 px square |
| `spiced-tea`        | spiced-black-tea      | black tea in a glass cup with cinnamon and star anise  | Pexels [38958417](https://www.pexels.com/photo/elegant-glass-teapot-and-cup-with-spices-38958417/), Masuma Rahaman                                | 2400 × 3200 → 2400 px square |
| `still-water`       | still-water           | a clear glass bottle of water with a blank label       | Pexels [6612380](https://www.pexels.com/photo/close-up-shot-of-a-bottle-6612380/), Tima Miroshnichenko                                            | 2400 × 3600 → 2400 px square |
| `tea-caddy`         | tea-caddy             | two bamboo tea caddies, one open                       | Unsplash [cMGCAY4hZxM](https://unsplash.com/photos/a-couple-of-wooden-containers-sitting-next-to-each-other-cMGCAY4hZxM), Raghavendra V. Konkathi | 2400 × 1600 → 1600 px square |

Crops avoid what does not belong to the product: the hibiscus cup is cut clear of an open book, the
piyola set clear of a national flag beside the teapot. The text follows the photograph where they
differed: the tea caddy (bamboo), the discovery box (flowers, fruit and spices in compartments,
not tins of tea), the piyolas (white, no gold rim), the still water (no screw cap). The
"TERAN premium" gift box has no photograph, so a stock box never reads as TERAN's own packaging,
and the two-tea gift set no longer uses the tea canisters of section 4 (their labels are a
Japanese shop's, priced in yen). Not downloaded: the sparkling black tea's photograph (Pexels #40594: its
file could not be reached without a bot check, which is not passed by hand); that product is not
created in presentation databases until it has one.

## 12. `storage/tea-films-3/` and the chocolates — each tea's own film (2026-10-22, local)

The owner asked for each of the five teas to open on a picture of its own, alive and modern,
instead of the same steaming cup (section 7), and for a chocolates category with high-quality
photographs (ADR-053). Pexels shortlists were shown to the owner (thumbnails and moving
previews in the browser) and approved before anything was downloaded; the files were taken once
at full size (4K films, original photographs) into git-ignored folders. Pexels License: free
commercial use, no attribution required; the authors are named anyway.

**Films** (`storage/tea-films-3/source/`, then square loops beside them). Each pairs with its
pack's colour; each loop's camera drift is measured on the subject (`scripts/track-drift.swift`)
and followed by the square, so the subject stays put and the end dissolves into the start
without doubling (`scripts/square-loop.swift`; the exact parts, squares and grades are in the
folder's `manifest.json`):

| Tea    | Shows                                                      | Source, author                                                                 | Loop          |
| ------ | ---------------------------------------------------------- | ------------------------------------------------------------------------------ | ------------- |
| XC2025 | tea poured from a clay teapot over a red and gold runner   | Pexels [40137841](https://www.pexels.com/video/40137841/), 夕云 简             | 6.5 s, 24 fps |
| G8810  | a gaiwan's lid lifted and set down, steam, the low sun     | Pexels [8233766](https://www.pexels.com/video/8233766/), Roman Odintsov        | 9.6 s, 25 fps |
| 8830   | a hammered silver teapot pouring into a blue-and-white cup | Pexels [40137842](https://www.pexels.com/video/40137842/), 夕云 简             | 7.6 s, 24 fps |
| 8800   | whole green leaves drifting in a glass kettle              | Pexels [8255164](https://www.pexels.com/video/8255164/), ArtHouse Studio       | 7.3 s, 24 fps |
| 8009   | fresh leaves in the roasting pan, steam rising             | Pexels [32586150](https://www.pexels.com/video/32586150/), Jaturapond Pungtong | 5.3 s, 24 fps |

Each tea has `<tea>-film.mp4` (1440 px, 3.8 Mbit/s, 2.5–4.6 MB) for its page, `<tea>-card.mp4`
(720 px, 0.9 Mbit/s, 0.6–1.1 MB) for cards and `<tea>-poster.jpg` (the film's first frame, the
picture itself). No mask: the whole frame moves.

**Chocolates** (`storage/range-photos/`, listed in its manifest with section 11's): square crops
written at 2400 px by `scripts/build-demo-photos.ts`; two have plain paper mirrored above and
below so the square holds the whole subject.

| Crop               | Product                | Shows                                          | Source, photographer                                                                                            | Size                         |
| ------------------ | ---------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `dark-chocolate`   | dark-chocolate-70      | pieces of a dark chocolate bar on cocoa powder | Pexels [6261691](https://www.pexels.com/photo/close-up-shot-of-black-chocolate-6261691/), Eva Bronzini          | 4000 × 6000 → 4000 px square |
| `milk-chocolate`   | milk-chocolate         | two milk chocolate bars on white paper         | Pexels [6167340](https://www.pexels.com/photo/chocolate-bars-in-close-up-photography-6167340/), Vie Studio      | 6240 × 4160 → 4600 px square |
| `matcha-chocolate` | matcha-white-chocolate | matcha chocolate bars on a white table         | Pexels [6341412](https://www.pexels.com/photo/photo-of-matcha-chocolates-6341412/), Marta Dzedyshko             | 3456 × 5184 → 3456 px square |
| `tea-truffles`     | earl-grey-truffles     | cocoa-dusted truffles in a blue bowl           | Pexels [10313341](https://www.pexels.com/photo/photo-of-a-bowl-with-chocolate-truffles-10313341/), Skyler Ewing | 9504 × 6336 → 6336 px square |
| `chocolate-box`    | chocolate-gift-box     | a black box of assorted bonbons                | Pexels [13278153](https://www.pexels.com/photo/a-box-of-chocolate-pralines-13278153/), Egor Komarov             | 6240 × 4160 → 4560 px square |

```bash
corepack pnpm --filter @teran/api visuals:import --dir storage/remove-tea-cups-v3 --remove
corepack pnpm --filter @teran/api visuals:import --dir storage/tea-films-3
corepack pnpm --filter @teran/api exec tsx scripts/build-demo-photos.ts --out <demo photos folder>
DEMO_PHOTOS_DIR=<demo photos folder> SEED_TEST_CATALOGUE=true corepack pnpm --filter @teran/api db:seed
```

The seed adds only what a database lacks (here the chocolates); on the presentation database it
was first run on a copy and compared row by row. A backup of the database and of the cups' files
is in `~/teran-backups/tea-films-2026-10-22/`.

## 13. `storage/gallery-2026-10-23/` — the gallery and the home page's feed (2026-10-23)

The owner asked for the reference's "sip & scroll on social" band and a gallery page with 4K
photographs and films (ADR-056). A Pexels shortlist (37 files, 673 MB) was shown in the browser and
approved before anything was downloaded; the originals are in `originals/` (git-ignored) with
`credits.tsv` (SHA-256, title, author, source). Pexels License: free commercial use, no attribution
required; the authors are named anyway. One approved film (38351337, a skywalk tower over tea
fields) was left out: the tower and its visitors fill the frame.

Films were re-encoded by `apps/api/scripts/web-film.swift` into `web/` (upright 1080×1920 at
6 Mbit/s, 3.9–10.3 MB; landscape 2560×1440 at 12 Mbit/s, 12–24 MB; first frame = poster).
Photographs larger than 5120 px were scaled to 5120 (`photos/`, the API refuses more than 40 MP).
`gallery.json` is the import manifest (titles and descriptions in three languages).

| Kind           | Source                                                    | Author              | Used as                                       |
| -------------- | --------------------------------------------------------- | ------------------- | --------------------------------------------- |
| Upright film   | Pexels [40137840](https://www.pexels.com/video/40137840/) | 夕云 简             | Choynakdan piyolaga — feed                    |
| Upright film   | Pexels [8233766](https://www.pexels.com/video/8233766/)   | Roman Odintsov      | Gaiwan qopqogʻi — feed, 0–12 s                |
| Upright film   | Pexels [5976232](https://www.pexels.com/video/5976232/)   | Roman Odintsov      | Birinchi damlama — feed                       |
| Upright film   | Pexels [8282268](https://www.pexels.com/video/8282268/)   | 宇航 钱             | Kichik choynak — feed                         |
| Upright film   | Pexels [8233935](https://www.pexels.com/video/8233935/)   | Roman Odintsov      | Bugʻ va iliqlik — feed                        |
| Upright film   | Pexels [5976233](https://www.pexels.com/video/5976233/)   | Roman Odintsov      | Choy hayvoni — feed, 2–14 s                   |
| Upright film   | Pexels [35489605](https://www.pexels.com/video/35489605/) | Rahulkumar R        | Choy bogʻlari — feed                          |
| Upright film   | Pexels [40137842](https://www.pexels.com/video/40137842/) | 夕云 简             | Choy marosimi — feed                          |
| Landscape film | Pexels [35344835](https://www.pexels.com/video/35344835/) | Sergey Guk          | Choy bogʻlarida tong — gallery header, 0–16 s |
| Landscape film | Pexels [39566938](https://www.pexels.com/video/39566938/) | Ravi Roshan         | Barg terish                                   |
| Landscape film | Pexels [6540517](https://www.pexels.com/video/6540517/)   | Tima Miroshnichenko | Choynakni chayqash                            |
| Landscape film | Pexels [6691563](https://www.pexels.com/video/6691563/)   | RDNE Stock project  | Seladon piyolalar                             |
| Landscape film | Pexels [35368956](https://www.pexels.com/video/35368956/) | Özgür Sürmeli       | Ikki choynak                                  |
| Landscape film | Pexels [6540437](https://www.pexels.com/video/6540437/)   | Tima Miroshnichenko | Choy stoli                                    |
| Landscape film | Pexels [5983917](https://www.pexels.com/video/5983917/)   | Tima Miroshnichenko | Shisha stakanga                               |

**Photographs** (21, Pexels): [36253266](https://www.pexels.com/photo/36253266/) (TBD Tuyên), [6136356](https://www.pexels.com/photo/6136356/) (Quang Nguyen Vinh), [5975975](https://www.pexels.com/photo/5975975/) (Roman Odintsov), [8952612](https://www.pexels.com/photo/8952612/) (Ivan S), [11669662](https://www.pexels.com/photo/11669662/) (Quang Nguyen Vinh), [33851960](https://www.pexels.com/photo/33851960/) (Yi Ren), [31756539](https://www.pexels.com/photo/31756539/) (Gu Ko), [6545419](https://www.pexels.com/photo/6545419/) (Tima Miroshnichenko), [6872257](https://www.pexels.com/photo/6872257/) (Quang Nguyen Vinh), [8952094](https://www.pexels.com/photo/8952094/) (Ivan S), [5988043](https://www.pexels.com/photo/5988043/) (Eva Bronzini), [9795403](https://www.pexels.com/photo/9795403/) (Mikhail Nilov), [16325662](https://www.pexels.com/photo/16325662/) (Bluesea Tea), [20051169](https://www.pexels.com/photo/20051169/) (Nadin Sh), [8952106](https://www.pexels.com/photo/8952106/) (Ivan S), [31528044](https://www.pexels.com/photo/31528044/) (Caleb Ishaya), [6545369](https://www.pexels.com/photo/6545369/) (Tima Miroshnichenko), [5976074](https://www.pexels.com/photo/5976074/) (Roman Odintsov), [34344554](https://www.pexels.com/photo/34344554/) (Betül Nur Akyürek), [38307066](https://www.pexels.com/photo/38307066/) (Peter Xie), [230477](https://www.pexels.com/photo/230477/) (Mykola Osmachko).

## Home places after ADR-050 (2026-10-20)

The home page's narrative (ADR-050) uses the pictures already imported; nothing new was copied:

| Place           | Now shown as                                                                                  | Picture (section)                               |
| --------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| `home.hero.1`   | The first view's film (the pouches over it until ADR-053)                                     | Moc Chau tea hill film (9)                      |
| `home.bento.1`  | The range's first tile (tea)                                                                  | Water poured over leaves in a glass pitcher (9) |
| `home.values`   | Story step 1, "Grown in the mountains" (phone crop)                                           | Longjing tea terraces, Hangzhou, China (9)      |
| `home.feature`  | Story step 3, "Brewed as it should be" (phone crop)                                           | Gongfu tea with a gaiwan, film (9)              |
| `home.banner.3` | Story step 4, "Poured for every guest" (phone crop)                                           | Tea poured from a celadon teapot, film (9)      |
| `wholesale.*`   | The business index: hotels (card 2), cafés and restaurants (community), distributors (card 1) | (4), (9)                                        |

`home.banner.1`, `home.banner.2`, `home.bento.2` … `home.bento.4` and `home.pair.2` keep their
stored pictures but are no longer shown or offered in Admin → Settings; the values band left the
home page (what TERAN stands for is in the footer). Shops and corporate gifts show the five
pouches (`public/brand/packs`), standing on a shelf and fanned out, not a photograph: card 3's tea
canisters carry a Japanese shop's labels priced in yen. The first view's film shows a tea hill in Vietnam under
"Premium Chinese Tea": the owner's choice of 2026-10-19, to review with ADR-050.

## Not copied

- The reference's logo, texts, prices, reviews and ratings: TERAN keeps its own.
- Certification and award marks, and the press logos of the reference's wholesale page: TERAN does
  not hold them, so showing them would be a false claim (its teal card shows the pack's four values
  and its band the names of the five teas instead).
- The reference's social videos (streamed, not downloadable as files).
- The reference's fonts (see above).

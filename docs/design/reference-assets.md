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

| Place                                          | Files                | Shown on                                                        |
| ---------------------------------------------- | -------------------- | --------------------------------------------------------------- |
| `about.hero`, `about.showcase`                 | 1 each               | About page: top band, showcase band                             |
| `about.idea.1` … `about.idea.3`                | 1 each               | About page: the three idea pictures                             |
| `banner:catalog`                               | desktop + phone crop | All products: the header banner                                 |
| `banner:category:green-tea`                    | desktop + phone crop | Green tea: the header banner                                    |
| `article:<slug>` (4 journal articles)          | 1 each               | Journal cards, the home pair and article pages (covers)         |
| `home.values`                                  | desktop + phone crop | Home: the values band (the globe)                               |
| `menu.collections`, `menu.learn`, `menu.about` | 1 each               | Desktop menus' cards (where the item has no picture of its own) |
| `cover:category:black-tea`                     | 1                    | Black tea: menus and category tiles                             |
| `contact.picture`, `help.returns` (one file)   | 1                    | Contact page; the help centre's returns card                    |
| `help.banner`, `help.tea`, `help.payment`      | 1 each               | Help centre: its banner and two category cards                  |
| `wholesale.flavour`                            | desktop + phone crop | For business: the wide flavour band                             |
| `tea101.amount`                                | 1                    | Tea 101: beside "how much do I need?"                           |

```bash
corepack pnpm --filter @teran/api visuals:import --dir storage/reference-assets
```

On the live site this runs against the production database with the Blob token (the same way as
the production seed, docs/deployment/vercel.md), only when the owner asks for a deploy. Done on
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
`NODE_ENV` is not `production`, the database runs on this machine and `BLOB_READ_WRITE_TOKEN` is
not set.

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
| `help.ordering`, `help.delivery`                                                                                   | 1 each                              | Help centre: two category cards (live: TERAN artwork)                                                                                         |
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
stored files deleted). On the live site this ran on 2026-10-18, as section 1 describes.

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
sections 1 and 2, so importing those folders again cannot bring the old pictures back.

## Not copied

- The reference's logo, texts, prices, reviews and ratings: TERAN keeps its own.
- Certification and award marks, and the press logos of the reference's wholesale page: TERAN does
  not hold them, so showing them would be a false claim (its teal card shows the pack's four values
  and its band the names of the five teas instead).
- The reference's social videos (streamed, not downloadable as files).
- The reference's fonts (see above).

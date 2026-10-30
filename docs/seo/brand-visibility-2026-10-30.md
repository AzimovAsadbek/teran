# TERAN brand visibility: baseline, findings and plan (2026-10-30)

What search engines and AI assistants show for TERAN today, why, what was changed in the site
(ADR-068), and what needs the owner's accounts or approval. Every position below was observed, with
its query, language, engine and date; nothing is estimated.

## 1. How the evidence was gathered

| Source                                     | How                                                                                               | Limits                                                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Google                                     | The owner's Chrome (signed in), `hl` and `gl=uz`, 2026-10-30 13:10–13:40 (UTC+5), from Uzbekistan | Personalised to that account; another user may see other positions                                                                         |
| Google, automated browser                  | Same queries                                                                                      | Blocked by Google's "unusual traffic" page (not bypassed)                                                                                  |
| Bing, Yandex                               | Owner's Chrome and the automated browser                                                          | Both showed a robot check (not solved); no observation recorded                                                                            |
| Search Console (`sc-domain:terantrade.uz`) | Owner's Chrome, read only                                                                         | Property new: performance shows only 2026-10-27 with no data, page indexing "processing data"; sitemap read 2026-10-29: Success, 321 pages |
| Live site                                  | HTTP requests as Googlebot                                                                        | Read only                                                                                                                                  |
| Web search tool (a US index)               | Same brand queries                                                                                | No result for TERAN or the domain                                                                                                          |
| Perplexity                                 | Query by address, signed out                                                                      | Asked to sign in; no answer                                                                                                                |

## 2. Branded queries (Google, Uzbekistan)

| Query                  | Language | TERAN         | Page Google chose                               | Others on page 1                                                      |
| ---------------------- | -------- | ------------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| TERAN choy             | uz       | 1             | `/` (then `/catalog`, `/tea/white-tea`)         | an Instagram post using "teran rang" (deep colour)                    |
| TERAN чай              | ru       | 1             | `/en/tea` (an English page for a Russian query) | ozon.uz (blackthorn tea, "терн")                                      |
| Теран чай              | ru       | 1             | `/ru/about`                                     | ozon.uz                                                               |
| TERAN tea              | en       | **not in 10** | —                                               | translate.google.com, tenren.com, tenrenfinetea.com, en.wikipedia.org |
| TERAN Chinese tea      | en       | 1             | `/en/tea`                                       | ozon.uz                                                               |
| terantrade             | uz       | 1             | `/`                                             | myorg.uz (business register)                                          |
| TERAN Trade            | ru       | 1             | `/ru/contact`                                   | myorg.uz, ihamkor.uz                                                  |
| TERAN Namangan         | uz       | 1             | `/en/privacy`                                   | myorg.uz, facebook.com                                                |
| TERAN yashil choy      | uz       | 1             | `/tea/green-tea`                                | arzonapteka.uz                                                        |
| TERAN 8009             | uz       | 1             | `/` (not the product page)                      | —                                                                     |
| teran choy sotib olish | uz       | 1             | `/`                                             | uzum.uz                                                               |

`site:terantrade.uz`: about 76 results; the sitemap lists 321 addresses. The first ten product
pages Google lists are other products (milk chocolate, ceremonial matcha, white tea, rosehip and
quince, mint and lemongrass, glass teapot, roasted oolong, pomegranate juice, matcha white
chocolate, pu-erh), not the five TERAN teas.

### The bare name (checked again the same afternoon)

| Query     | Language | TERAN    | Page 1                                                                                                                                                                             |
| --------- | -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| teran     | uz       | not in 7 | translate.google.com, uz.wiktionary.org (the word), uzmovi.tv (the film "Teran ildizlar"), imlo.uz, savodxon.uz, a Yandex Maps entry for another company ("Teran Marketing Group") |
| teran tea | en       | not in 8 | translate.google.com, tenren.com, tenrenfinetea.com, en.wikipedia.org (Ten Ren Tea), amazon.com                                                                                    |

No knowledge panel. For "teran" Google answers what the Uzbek word means; it starts to show a
brand only when it has independent evidence of one (a Business Profile, profiles and mentions that
name TERAN with tea, people searching for it and choosing it).

### Search Console, URL Inspection (owner's approval, 2026-10-30)

| Page                   | Before                                                                                         | Action                                                            |
| ---------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| /products/teran-8009   | URL is unknown to Google                                                                       | Indexing requested (priority crawl queue)                         |
| /products/teran-8800   | URL is unknown to Google                                                                       | Indexing requested                                                |
| /products/teran-8830   | Not indexed                                                                                    | Indexing requested                                                |
| /products/teran-g8810  | URL is unknown to Google                                                                       | Indexing requested                                                |
| /products/teran-xc2025 | Indexed; Product snippets: 1 invalid item (no price, review or rating while prices are hidden) | None; the snippet becomes valid with real reviews or shown prices |

Request the Russian and English versions, and the English home page once the "TERAN Tea" titles
are deployed (Google allows about ten requests a day).

## 3. Non-branded queries (Google, Uzbekistan)

| Query                        | Language | TERAN | Who ranks                                                            |
| ---------------------------- | -------- | ----- | -------------------------------------------------------------------- |
| xitoy choyi                  | uz       | —     | uz.wikipedia.org, trulytea.org, uzum.uz, instagram.com               |
| xitoy choyi sotib olish      | uz       | —     | uzum.uz, bigmart.uz, chinateahunan.com, glotr.uz                     |
| китайский чай купить         | ru       | —     | reddragon.uz, siam.uz, ozon.uz, olx.uz                               |
| китайский чай Ташкент        | ru       | —     | reddragon.uz, siam.uz, instagram.com                                 |
| yashil choy sotib olish      | uz       | —     | market.yandex.uz, prom.uz, uzum.uz, bigmart.uz                       |
| зеленый чай оптом Узбекистан | ru       | —     | obkeber.uz, ozon.uz, bizkim.uz, olx.uz                               |
| xitoy choyi turlari          | uz       | —     | uz.wikipedia.org, hoututea.com, trulytea.org, ingredients-lonier.com |
| виды китайского чая          | ru       | —     | chazhidao.org, rusteaco.ru, drakonchai.ru, laomars.com               |
| choyni qanday damlash kerak  | uz       | —     | daryo.uz, facebook.com, zira.uz, instagram.com                       |
| как заваривать зеленый чай   | ru       | —     | artoftea.ru, thetea.ua, dachatea.ru, adalbertstea.com                |

Buying queries are held by marketplaces (Uzum, Yandex Market, Ozon, OLX) and two Tashkent tea
shops; Russian information queries by Russian tea shops; Uzbek information queries by Wikipedia,
machine-translated pages of Chinese exporters and news sites. Good Uzbek writing about Chinese tea
is scarce: TERAN's best chance outside its own name.

## 4. The brand as an entity

- **Name collisions:** "Teran" is an Istrian red wine grape (wine sites and Wikipedia hold the bare
  name); "teran" is an everyday Uzbek word ("deep", as in the tagline "Teran taʼm. Teran
  taassurot."); "TERAN tea" reads as Ten Ren (天仁), a large Taiwanese tea house. TERAN wins only
  when the query adds choy/чай/Chinese tea/trade, so every signal should pair the name with those.
- **Official profiles** (already in the site's `sameAs`): t.me/TeranTrade, instagram.com/terantea.uz,
  youtube.com/@terantrade. Business registers already list the company: myorg.uz, ihamkor.uz.
- **On the site before this round:** OnlineStore with legal name, logo, Namangan, phones, e-mail
  and profiles; Product with brand, SKU, GTIN and category; Breadcrumbs, Article, FAQ; canonical
  and language links; robots and sitemap (ADR-035, ADR-060). Missing: other names, a brand node the
  products share, a sentence saying TERAN is a Chinese tea brand, the points of sale.
- **Knowledge panel:** none observed. Structured data alone does not create one; consistent
  profiles, register entries and independent mentions over time do.

## 5. Findings and plan

| #   | Priority | Problem and evidence                                                                                                          | Solution                                                                                                                                                                                 | Where                                         | How it is measured                                          |
| --- | -------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------- |
| 1   | P0       | Only ~76 of 321 pages indexed; the TERAN teas' pages not among the products Google shows; "TERAN 8009" lands on the home page | URL Inspection → Request indexing for the five TERAN teas in three languages (15 addresses, a few a day); IndexNow for Bing and Yandex                                                   | Search Console (owner's approval); site: done | `site:` counts, Page indexing report, the query table above |
| 2   | P0       | Bing and Yandex: no observation possible; no Webmaster accounts known                                                         | Verify the site in Bing Webmaster Tools (it can import from Search Console) and Yandex Webmaster; submit the sitemap                                                                     | Owner's accounts                              | Indexed pages there                                         |
| 3   | P1       | Identity only in a poetic line; no other names; products not tied to the organization                                         | Identity sentence, `alternateName`, `Brand` node, product brand by id                                                                                                                    | Site: **done** (ADR-068)                      | Rich Results Test; branded positions                        |
| 4   | P1       | "TERAN tea" (English) taken by Ten Ren                                                                                        | Pair the name with "Chinese tea" and "Uzbekistan" in profiles and titles; English pages for each TERAN tea; mentions in English (export/tea communities)                                 | Content + external                            | Position for "TERAN tea"                                    |
| 5   | P1       | "TERAN Namangan" lands on the privacy page; no point of sale described                                                        | `Store` schema from Admin → Store addresses (**done**, shows once a store is active); Google Business Profile and Yandex Business for the Namangan shop if it serves customers in person | Admin + owner's accounts                      | Local pack, Maps, the query                                 |
| 6   | P1       | "TERAN чай" lands on an English page                                                                                          | Russian titles and texts that say "китайский чай" on `/ru/tea` and the TERAN teas; request indexing of the Russian pages                                                                 | Admin SEO fields + Search Console             | Landing page for the query                                  |
| 7   | P2       | Buying queries held by marketplaces                                                                                           | Sell the TERAN teas on Uzum Market (and Yandex Market) with the same names, photos and links to the site                                                                                 | Owner                                         | Marketplace listing positions                               |
| 8   | P2       | Uzbek information queries held by Wikipedia and machine translations                                                          | An Uzbek topic cluster in the journal (below), linked from Tea 101, the categories and each TERAN tea                                                                                    | Owner writes/approves; Admin publishes        | Impressions per article in Search Console                   |
| 9   | P2       | Few independent mentions                                                                                                      | Local press and tea communities (below); partner and distributor sites linking to the official site                                                                                      | Owner                                         | Referring domains, brand mentions                           |
| 10  | P3       | Pictures served from `pub-…r2.dev`                                                                                            | A custom domain for the bucket (for example `media.terantrade.uz`), as the R2 note already plans                                                                                         | Infrastructure (owner)                        | Image search impressions                                    |

## 6. Content plan (Uzbek first, then Russian and English)

Each piece written or approved by TERAN, with facts it can stand behind; no health claims, origins
or attributes beyond what the packs and the owner state.

| Cluster page                                                           | Target questions                                    | Links to                               |
| ---------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------- |
| Xitoy choyi turlari (rename or extend "Choy turlari: qisqa qoʻllanma") | xitoy choyi turlari, yashil/oq/qora/ulun/puer farqi | the categories, each TERAN tea         |
| Yashil choyni qanday damlash (extend "Kichik choynakda damlash")       | choyni qanday damlash kerak, harorat va vaqt        | Tea 101, the TERAN teas' brewing notes |
| Puer nima                                                              | puer choyi nima, qanday ichiladi                    | `/products/pu-erh-tea`                 |
| Sifatli choyni qanday tanlash                                          | yaxshi choyni qanday tanlash                        | the TERAN teas, wholesale              |
| Choyni saqlash (exists)                                                | choyni qanday saqlash kerak                         | the 400 g zip pouches                  |
| TERAN haqida (about)                                                   | TERAN qaysi kompaniya, qayerda                      | contacts, store locator, profiles      |

### Generic words ("choy", "tea", "shokolad")

Uzum, OLX and Yandex Market rank for single words because they hold millions of pages, years of
links and reviews and constant visits; a shop's own site does not overtake them by its pages alone.
The ways TERAN appears for those words: its products listed on those marketplaces (their pages
rank), paid search (Google Ads, Yandex Direct; a budget decision), and its own site for the longer
queries where it can be the best answer ("xitoy yashil choyi 400 g", "Hunan yashil choyi",
"premium choy Namangan", the Uzbek articles above).

## 7. Outside the site

| Platform                                                   | Relevant                              | Exists         | Action                                                                                                    |
| ---------------------------------------------------------- | ------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------- |
| Google Business Profile                                    | If the Namangan shop serves customers | Unknown        | Owner creates and verifies; same name, address, phones, link                                              |
| Yandex Business / Maps, 2GIS                               | Yes (used in Uzbekistan)              | Unknown        | Same as above                                                                                             |
| Bing Places                                                | Low                                   | Unknown        | After Bing Webmaster                                                                                      |
| Telegram, Instagram, YouTube                               | Yes                                   | Yes (`sameAs`) | Bios say "TERAN — premium Xitoy choyi" and link to terantrade.uz; YouTube videos on brewing the five teas |
| myorg.uz, ihamkor.uz                                       | Yes                                   | Listed         | Check the address, phones and site link match                                                             |
| Uzum Market, Yandex Market                                 | Yes (buying queries)                  | Unknown        | Owner decides                                                                                             |
| Local press (kun.uz, daryo.uz, gazeta.uz), tea communities | Yes                                   | —              | A story on Chinese tea in Uzbekistan with TERAN's expertise; never paid links                             |
| Wikidata                                                   | Not yet                               | —              | Only once independent sources exist                                                                       |

Never: bought links, link networks, mass directories, fake reviews or followers.

## 8. AI assistants

| Platform                 | Question                                                                     | Result (2026-10-30)                                  |
| ------------------------ | ---------------------------------------------------------------------------- | ---------------------------------------------------- |
| Perplexity               | TERAN choy brendi qaysi kompaniyaga tegishli va qayerdan sotib olish mumkin? | Sign-in required; not answered                       |
| Google AI Overview       | TERAN чай (ru, Uzbekistan)                                                   | No overview shown at the time                        |
| ChatGPT, Copilot, Gemini | —                                                                            | Not tested: they need the owner's signed-in accounts |

Assistants cite what search engines index and what independent sources say; the identity sentence,
the profiles and the Uzbek articles above are what can make TERAN citable. No markup guarantees a
mention.

## 9. Measurement

- **Every month,** the same queries as sections 2 and 3, same settings, recorded with date and place.
- **Search Console** once it has data: branded (TERAN, теран, terantrade) and non-branded clicks,
  impressions, CTR and position; indexed pages; the five TERAN teas' pages.
- **Bing and Yandex Webmaster** once verified; the storefront's `indexnow` log lines.
- **Mentions:** new referring domains and profile links.

## 10. Requirements and task register

| Task                                                | Priority | Status                          | Needs                                                         |
| --------------------------------------------------- | -------- | ------------------------------- | ------------------------------------------------------------- |
| Identity, other names, brand node, product brand id | P1       | Completed (working tree)        | Review, commit, deploy                                        |
| Store schema from store addresses                   | P1       | Completed (working tree)        | An active store in Admin                                      |
| IndexNow on revalidation                            | P0       | Completed (working tree)        | Deploy                                                        |
| Request indexing of the TERAN teas                  | P0       | Requires user approval          | The owner's word to use Search Console's URL Inspection       |
| Bing Webmaster Tools, Yandex Webmaster              | P0       | Awaiting user access            | The owner adds the site (Bing can import from Search Console) |
| Google Business Profile, Yandex Business, 2GIS      | P1       | Awaiting user access            | Verified address and hours, the owner's accounts              |
| SEO titles in Admin (`/ru/tea`, the TERAN teas)     | P1       | Requires user approval          | Owner approves the wording                                    |
| Uzbek topic cluster                                 | P2       | Requires user approval          | Owner writes or approves each article                         |
| Profile bios and links                              | P2       | Requires user approval          | Owner's accounts                                              |
| Marketplace listings                                | P2       | Requires user approval          | Owner's decision                                              |
| Media domain for pictures                           | P3       | Requires user approval          | Infrastructure change                                         |
| AI assistant tests                                  | P2       | Blocked by platform limitations | Sign-in                                                       |
| Bing and Yandex position checks                     | P1       | Blocked by platform limitations | Robot checks; Webmaster data instead                          |

## 11. Risks

- Positions above are one account's view on one day; they move.
- The non-TERAN products stay on the site at the owner's wish; the TERAN teas need their own
  links, texts and requests to be the pages Google shows.
- IndexNow reaches Bing and Yandex only; Google keeps its own pace.

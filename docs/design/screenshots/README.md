# Before and after screenshots

The same states captured on the production build before the redesign (commit `cec1e72`) and
after it, with the same seeded demonstration data, English unless the name says `uz`, and
`prefers-reduced-motion: reduce` so captures are stable. All images are TERAN's own pages; no
third-party screenshots are stored in the repository.

| Prefix            | Viewport                                                |
| ----------------- | ------------------------------------------------------- |
| `desktop-`        | 1440 × 900 (`-full`: whole page, scaled to 720 px wide) |
| `mobile-`         | 390 × 844, touch                                        |
| `t1024-`, `t768-` | Tablet widths, 1000 px tall                             |

| Name                                                                    | State                                                               |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `home`, `home-full`                                                     | Homepage, first screen and whole page                               |
| `nav-mega-menu`, `nav-drawer`                                           | Teas menu open (desktop), menu drawer (phone)                       |
| `search-dialog`                                                         | Search overlay with "green" typed                                   |
| `catalog`, `category`, `catalog-filters`                                | All teas, green tea, phone filter drawer                            |
| `catalog-filtered`, `catalog-price-popover`                             | After only: active filters and the price popover                    |
| `product`, `product-sticky-bar`                                         | Classic black tea; phone purchase bar after scrolling               |
| `bag-drawer`, `cart`                                                    | Bag after adding a pack; bag page                                   |
| `checkout`, `checkout-errors`                                           | Checkout, and after submitting it empty                             |
| `order-confirmation`                                                    | Guest order just placed                                             |
| `about`, `contact`, `privacy`                                           | Content and legal pages                                             |
| `uz-home`                                                               | Uzbek homepage                                                      |
| `admin-dashboard`, `admin-orders`, `admin-dialog`, `admin-product-edit` | Admin overview, order list, stock adjustment dialog, product editor |

The full capture set (97 before, 100 after) was reviewed during the redesign; this folder keeps
a representative subset to stay small.

# Page `10 · Full-screen hero + comment fixes` — build spec

New Figma page. Pages `01`–`09` are left untouched; `10` is built by duplicating `09`
and applying the 24 comment threads plus the five priority items.

## Priority items

### 1. Header + hero = one full viewport
Frame viewport treated as 1440 x 900. Menu bar 88 tall (`bg/menu` #A2DFF9), hero plate 812 tall
directly beneath it, so the first content section starts at y=900 on every page — Home's slider and
all seven inner-page banners alike. Inner pages keep the banner treatment (image, deep-blue scrim,
eyebrow + accent rule, title, sub) but at the new height, with the eyebrow block sitting on the
lower third so it clears the arch.

### 2. Arch cut into the hero's bottom edge
From the hand sketch at node `312:3` ("Current One" flat vs "New" with a dome). Interpreted as a
flat bottom edge with a single soft dome rising into the plate, right of centre:

    M0,0 H1440 V812 H1120 C1030,812 1020,692 930,692 C840,692 830,812 740,812 H0 Z

i.e. arch 380 wide, 120 deep, centred at x=930 (64% across), cubic on both flanks so the flat edge
runs into the curve with no visible corner. Drawn as a real vector in Figma; in code it becomes a
bottom-anchored SVG with `preserveAspectRatio="none"`.

### 3. Footer
- **Home only:** no social icons. Every other page keeps them.
- PRODUCTS and COMPANY link columns removed, **their grid space kept empty** — the four-column
  rhythm and the logo/address and contact columns stay exactly where they are.
- Backdrop doodles: smaller and more numerous. From ~14 icons at 40–56px to ~40 at 18–26px,
  still Lucide line-art at ~9–13% white, scattered off the text columns.

### 4. `bg-splash` as the ground for every white area
`docs/client/references/bg-splash.svg` is 4,115 traced paths / 2 MB — unusable as vector.
Rasterised to `public/images/brand/bg-splash-2000.webp` (60 KB) and `-1200.webp`.
A cyan/green watercolour vignette with a clear white centre, so body copy stays on the clear zone
and the wash frames the 1200 column. Placed as a page-level image fill behind white sections.
**Open question:** the green is a saturated lime that is not in the owner palette and sits next to
the red footer. Proposal is to run it at reduced opacity as a tint rather than at full strength.

### 5. Header dropdown = five-column mega-menu
From the reference at node `303:3`. Full-width white panel under the menu bar, one column per
category, sub-categories listed beneath a bold category heading. New data from that reference:
**File & Folder now has sub-categories** — Clear Bag, Liner Bag, Document Carrier, Report Cover,
Ring File, Clip File, L-Folder — where the wireframes and the current build have none.
Also confirms the sub-category sets for Pen (Ball Pen), School Stationery, Office Stationery and
Exercise Book (Student Large, Standard Large).

## Comment threads folded in

Copy: #25 hero headline, #27 vision, #28 mission, #29 values, #30 About Us body, #23 email
`info@gradebd.com`, #22 logo lockup, #36 wordmark trimmed to "Grade".
Structure: #37 FAQ collapsed behind a button, #38 full-width map, #33 gallery without pagination,
#32 image hover pop, #17 Client Feedback section hidden, #16 client slider with 15 named
pharmaceutical companies, #20 and #31 social icons, #19 and #35 text removals.
Imagery: #34 Drive product photos, #24 slider image order, #15 combined category images,
#26 more relevant image, #13 cheap-pen photography, #14 plain local exercise books.

## Blocked on the client
- **#22** — tagline becomes "Empowering Your Potential", replacing "For Every People". Every
  lockup asset carries the old tagline; new artwork needed. Their spelling is "Stationary" where
  the trade word is "Stationery".
- **#16** — 15 real pharmaceutical trademarks. Needs written permission before it can ship.
- **#34** — product photos live in a client Drive folder; downloading needs the user's go-ahead.

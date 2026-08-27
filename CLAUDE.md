# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

This is a **greenfield project — no application code exists yet.** The repository currently holds only
`readme.md` and client-supplied design inputs under `docs/client/`. There is no `package.json`, no build
tooling, no tests, and no git repository. Any "how to build/lint/test" answer must come from scaffolding
that a future session creates, not from something already here.

When scaffolding, create the project in the repository root (this directory *is* the project), and
initialize git.

## The deliverable

A marketing/catalog website for **Grade Limited** of Dhaka, Bangladesh (Akram Manjil, H-8/A/8,
Rd-14 (New), Dhanmondi R/A, Dhaka 1205). The site is a browsable product catalog with no e-commerce:
no cart, no checkout, no prices in the wireframes. Purchase intent is funneled to the contact form.

**Grade is a supplier/distributor, not a manufacturer — and never describe them as "B2B".** The
client was explicit: that label is wrong and must not appear anywhere, in copy or in these notes.
Their existing site describes a marketplace
that "directly sources products from manufacturers" to cut out intermediaries — it never claims to
produce anything. Do not write "manufactured by Grade" copy, and do not use owned-factory imagery,
unless the client confirms otherwise. (An earlier version of this file called them a manufacturer; that
was an unverified inference and is corrected here.)

### Facts recovered from the existing site (`gradebd.com`, Wayback snapshots Apr–Sep 2024)

- Founded **2019**. "Over 300 work orders completed", "trust from 50+ companies".
- Phone **01842-024378**, email **sales@gradebd.com** — the wireframes leave both blank.
- Tagline **"For Every People"** — the same white text inside the supplied logo lockup.
- Slogan: "Breaking the Chain, Bringing You Quality Products at Prices that Make Sense."
- Only **Facebook and LinkedIn** exist; the wireframe footer shows five social icons.
- The old site's testimonials are dummy placeholders ("Jackson P. Mondela, Founder of CNG") with
  identical filler text. Never reuse them.

### Out of scope (explicit client instruction)

The old site has a **Shop** and a "Grade Employee Mart" discounted-purchase platform, and also sells
foods and corporate gifts. **None of that carries over.** This build is catalog + enquiry only, scoped
to the five stationery categories in the wireframes. Do not add a shop link.

### `gradebd.com` appears compromised

The live origin returns `504 Gateway Time-out` (nginx/1.18.0). The Wayback index for the domain contains
a large volume of injected spam published under it — 1xbet gambling pages in Turkish and Russian, adult
content, German fitness spam — with snapshots dated 2022 through 2026, so it is ongoing. Older captures
show an unrelated industrial gas-detector business on the same domain. Treat this as an SEO-injected or
hijacked WordPress install: **do not migrate the existing site**, and audit the domain and DNS before
pointing anything live.

## Planned stack (from `readme.md`)

- **Astro** for the frontend.
- **Directus** as headless CMS, using **Directus Visual Editor / Visual CMS** so non-technical
  moderators can edit content in-place on the rendered page.

The Visual CMS requirement is the main architectural constraint, not an afterthought: every editable
region has to carry Directus visual-editing attributes back to its collection/item/field. Design
components so content flows from Directus through typed fetch helpers into components that annotate
their own editable fields — avoid hardcoding copy, images, or lists that moderators will want to change
(hero sliders, category names, vision/mission text, client logos, gallery images, FAQs).

## Planned workflow (from `readme.md`)

1. Generate a brand guideline. **Done** — see Design below.
2. Design in Figma: wireframe → low-fi → hi-fi. **Done**, then revised — see the client verdict below.
3. Then build with Astro + Directus. **Astro build done and running in Docker**; Directus not wired yet.

## Design (Figma)

File: `https://www.figma.com/design/wO94lV6gN0lfKHQT9zAkrJ/Website` (fileKey `wO94lV6gN0lfKHQT9zAkrJ`).
Ten pages: `01 · Foundations` (brand guideline), `02 · Wireframes (low-fi)` (nine page frames),
`03 · Wireframe kit` (shared low-fi components), `04 · Hi-fi kit`, `05 · Hi-fi screens`,
`06 · Client presentation`, `07 · Wireframe-exact (hi-fi)`, `08 · Colour revision (call)`,
`09 · Brand palette (owner vision)`, `10 · Full-screen hero + comment fixes` —
**`10` is the current direction**; every earlier page is kept as the record and left alone.

### `09 · Brand palette (owner vision)` — from the owner meeting

The business owner's vision is the **product packaging**: the Champ geometry box (light blue, line-art
geometry doodles, confetti bands) and the Neo highlighter carton (red + white, rainbow accents). That
is the brand, not the sober navy corporate look we had been proposing.

Tokens live in their own Figma collection, **`Brand v2 (owner palette)`** — bind to these on this page;
the older `Semantic` collection still drives pages `05`–`08`.

| token | value | role |
| --- | --- | --- |
| `bg/menu` | `#A2DFF9` | menu bar — their blue at 80%. Ink on it 11.3:1 |
| `bg/footer` | `#C4141F` | footer — a *shade* of their red so white clears AA at 6.06:1 |
| `bg/brand` | `#EE1E2C` | the Pantone at 100% — buttons, rules |
| `bg/deep` | `#0A5273` | **replaces navy** — a deep shade of their own blue, white 8.5:1 |
| `text/ink` | `#1B2026` | neutral charcoal, deliberately no navy cast |
| `accent/*` | cyan/orange/green/purple/pink/yellow | one per product category, from the highlighter range |

**Navy is dropped from this direction.** That includes photography: a navy *photo* keeps a section navy
no matter what the tokens say, so the hero and Gallery banner were swapped for brighter shots.

**The logo problem is solved.** `public/images/brand/grade-logo-white.png` (generated by forcing every
non-transparent pixel of the supplied PNG to white) is a proper reversed all-white lockup — wordmark,
swoosh, ™ and tagline all render on red. Figma imageHash `a786dc25b3c6ad1f7e8f90036f959bd0cd1daa85`.
Still worth asking the client for a real vector version.

Other decisions on this page: the hero returns to the **full-bleed `05` composition** (owner approved
it), the footer follows the **`05` four-column layout** in the red shade, and line-art doodles in the
spirit of their geometry box sit in the footer and in white space. A `Palette — owner vision` board at
the right of the page documents every token for the client conversation.

**Doodles come from [Lucide](https://lucide.dev) (ISC licence, commercial use fine)** — stationery and
drawing-instrument icons, built with `figma.createNodeFromSvg` (note: the `…Async` variant does not
exist). They sit at ~13% white in the footers, in accent colours beside "Who We Are", and at ~14% deep
blue as texture in the menu bar.

`docs/client/references/doddle.svg` is a 7 MB full-colour illustration with a watercolour wash and
"Back to School" lettering. Stripping the `BACKGROUND` group and the three `<text>` nodes, then
rasterising, yields the transparent artwork used in Home's "Brand band" (Figma imageHash
`faa75c150945adc7900323b5af82cfdae4d33fed`). **Its licence is unverified — confirm the client owns it
before go-live.** Note `figma.createImage(bytes)` from an `exportAsync` round-trip returns a hash that
does not render; upload through the `upload_assets` MCP tool instead.

Header (page `09`): logo, centred-right nav with a red underline on the active item, an icon-only search
button, and a hairline bottom rule. An earlier version had a six-segment accent stripe and a faint icon
texture; **the client asked for both to go** — don't reinstate them. Every inner page uses the hi-fi
banner treatment: image, deep-blue scrim, eyebrow with the category's accent rule, title and sub.

Page `09` is **fully wired as a prototype** — 165 links, every frame reaching all eight others, start
frame Home, `DISSOLVE` 0.15s `EASE_OUT` throughout. Wired: header nav + logo, footer logo + the
PRODUCTS and COMPANY columns, Home's category cards and *See all*, the hero CTA, and every product card
(→ Contact, matching the built site's `?item=` behaviour). Deliberately unwired, because no destination
frame exists: the Contact **Send** button, the header search, and the gallery images.

Two Plugin API facts worth keeping: `scrollBehavior` is **not** in the typings, so a prototype-pinned
header cannot be set from a script; and a NAVIGATE action's `transition` takes
`{type:'DISSOLVE'|'SMART_ANIMATE'|'SCROLL_ANIMATE', easing:{type:'EASE_OUT'|…}, duration:<seconds>}`.
Rebuilding a node **destroys its reactions** — rewire after any header or footer rebuild.

### `10 · Full-screen hero + comment fixes` — **the current direction**

Built by cloning `09` (which is untouched, as are `01`–`08`) and applying the 24 Figma comment
threads plus five priority instructions. Comment text is transcribed in
`docs/feedback/figma-comments-page09.md`; the build plan is `docs/feedback/page10-build-spec.md`.

- **Header + hero fill the viewport.** 86 menu bar + 814 hero = 900, so content starts below the
  fold on all nine frames. Inner-page banners grew from 420 to the same 814.
- **The hero bottom edge is cut by an arch.** The client drew it themselves as `Vector 5` inside the
  `09` Home frame; it was cleaned to a symmetric dome — 340 wide, 100 deep, centred at x=720, cubic
  flanks. Path: `M0,0 H1440 V814 H890 C805,814 805,714 720,714 C635,714 635,814 550,814 H0 Z`.
  It is implemented as a **mask**, not a white overlay, so the ground behind shows through the dome —
  which is what lets the `bg-splash` wash sit under it without a seam.
- **`bg-splash`.** `docs/client/references/bg-splash.svg` is 4,115 traced paths / 2 MB — a raster in
  vector clothing, unusable as SVG. Rasterised to `public/images/brand/bg-splash-2000.webp` (60 KB)
  and `-1200.webp`; in Figma it is imageHash `79b2d75d02e4050a78c7e62aff53b7b1b2452111`, applied at
  **42% over the existing white fill** behind all 21 white sections. Its green is a saturated lime
  outside the owner palette — kept deliberately low so it reads as tint, not picture.
- **Footer.** PRODUCTS and COMPANY columns removed with their grid space held open by fixed-width
  placeholders, so nothing reflowed. Doodles went from 12 at 36–64px to **42 at 16–26px**. Social
  icons are removed **from Home only**. Removing those two columns is why the prototype dropped from
  165 links to 89 — the 81 removed links were theirs.
- **Mega-menu** (from reference node `303:3`): five columns, every sub-category listed.
- **Logo.** Comment #22 changes the lockup to GRADE / Stationary / *Empowering Your Potential*,
  replacing *For Every People*. Every supplied asset carries the old tagline, so the footers now use
  a type proposal pending real art. **Superseded:** the client supplied proper single-colour marks and
  the footer now uses the real reversed lockup — see "The logo problem is solved" below. Their artwork
  spells it "Stationary" where their content documents say "Stationery"; still unresolved.

**New product data from the mega-menu reference** — File & Folder *does* have sub-categories:
Clear Bag, Liner Bag, Document Carrier, Report Cover, Ring File, Clip File, L-Folder. The wireframes,
`CLAUDE.md`'s IA section and the Astro build all still treat that range as items-only.

**The comment panel virtualises its list.** A first read rendered only the newest 24 threads and the
older ones looked deleted. The file actually holds **35**: #1–#9 and #11–#38, with #10, #18 and #21
gone. #1–#9 are the user's own build notes and are where the five priority instructions came from.
To read them all, scroll the panel with real wheel events and accumulate, or use
`GET /v1/files/:key/comments` with a `file_comments` token — which also returns each thread's
`client_meta` anchor. The Plugin API exposes no comment data at all.

Also built from those threads: **#4 a product detail pop-up** (main image, four thumbnails, name,
spec line, description, enquiry CTA) with all 30 product cards rewired to open it instead of jumping
to Contact; and **#8 a WhatsApp row** under the email in every footer contact block.

**Client logos are real now.** Nine of the fifteen companies' own marks were pulled from their
websites into `public/images/clients/` (originals) and `…/processed/` (trimmed, normalised): Renata,
Square, SK+F, SMC, Beximco, Aristopharma, Incepta, ACME, Ibn Sina. Square and Incepta publish
white-only logos, so those two are inverted to a dark one-colour version. Six could not be fetched —
Nuvista, Popular, Health Care, Opsonin, Beacon, JMI — because those sites render the logo in JS or
refuse automated requests. Note Clearbit's logo API is dead; scrape the site's own markup instead.
The trademark permission caveat still stands.

Eight threads remain unactionable because a comment only means something against the frame it is
pinned to: #11, #12, #19, #20, #26, #31, #35, #36. They are listed on the page's own
`Review notes — page 10` board.

**Iconography:** no text glyphs for icons. Slider controls use Lucide chevrons as vectors with round
caps; the CTA knob uses arrow-right. Note `vectorPaths` rejects compressed SVG path syntax (implicit
commands, `.967-.273` runs) — use `figma.createNodeFromSvg` for anything from an icon set. And
`overlayPositionType` is **read-only** from a script, so a true Figma overlay cannot be configured;
build the modal as a full frame and NAVIGATE to it.

### The client's content documents — the source of truth for copy and products

`docs/client/references/` gained three Word files: `Page Wise Text (18.8.26).docx`,
`SKU Wise Details (13.8.2026).docx`, `Pen (23.8.26).docx`. Transcribed and analysed in
`docs/feedback/content-plan.md`. **Phases 1–4 of that plan are built** in code and mirrored on Figma
page `10`; phase 5 is the client-blocked gap list and is deliberately untouched.

**Grade has four product sub-brands, and the SKU naming is built on them** — `Grade <sub-brand>
<product> <variant>`. Champ (11 SKUs, school), Dox (11, filing), Neo (6, utility), Xtreme (6, office
hardware), plus four individually-named pen lines: Classmate, Finepoint, Mentor, Glow. **38 products
in total.** This is a real browse axis, not a label, and it confirms the owner's packaging-led
direction: the Champ geometry box and Neo highlighter carton are sub-brands, not one-offs.

Schema additions (`src/lib/schema.ts`): item gains `sub_brand`, `features[]`, `pack_inner`,
`pack_carton`, `images[]`; category gains `banner_lines[]` and `sub_brands[]`; home slides gain
`lines[]`; a shared `bannerSchema` now carries `lines[]` for About/Gallery/Contact.

**Banner copy is two or three short lines, never a headline plus paragraph.** `PageBanner.astro` and
`HeroSlider.astro` render `lines` with tight leading and no sub-paragraph, falling back to
title/sub only where a moderator has not migrated. Every page's lines are tabulated in the plan.

**Product detail is a native `<dialog>`** (`ProductDialog.astro`) — the client's "product details on a
POP UP" from comment #4. Features are the description, pack sizes the spec line, thumbnails appear
only when a second image exists. `ProductCard` renders as a `<button>` when given `dialogId` and an
`<a>` otherwise, because a card that opens a dialog goes nowhere. Two things worth keeping: the CSS
reset zeroes the `margin: auto` a native dialog centres itself with, so the panel pins to the
top-left without an explicit `margin: auto`; and scoped styles must live in the component that
renders the element, not the page that imports it.

**Category pages filter on both axes at once** — Range (sub-brand, shown only when a category has
more than one) and sub-category — with a live item count.

The client's voice is aspirational and learner-focused ("Every Tool, Every Dream"), not the
trade-supply voice the earlier copy used. All invented trade claims are gone from the seed — no more
"order by the carton, not the piece", no "cut the intermediaries", no manufacturer claims. Vision,
Mission and the five Values (Empowerment, Innovation, Reliability, Continuous Improvement, Customer
First) are the client's own words; where they supplied a title with no description, nothing was
invented to fill it, so components guard against empty bodies.

**Real product photography arrived** in `docs/client/products/` — 18 Grade-branded packaging
mockups, mostly 1024–2880px squares with alpha. Because the product cards are 4:3 and `object-cover`
would crop a pack, each one is composited onto a consistent `#f6f8f9` ground at 1200x900 with ~14%
padding and written to `public/images/products/*.webp`: **63 MB of PNG down to 585 KB**. 18 of the 38
SKUs now have their own pack shot; `Grade Neo Pencil 2B` has two views, so it is the first item whose
detail dialog actually shows the thumbnail strip. The Champ geometry box is the School Stationery
range image, and the Gallery is now twelve real packaging shots instead of stock.

Still on stand-in imagery: all four pens, all eleven Dox filing lines, and five Neo school items.
The Neo geometry box, the Neo highlighter and both Neo markers have **no SKU sheet**, so they appear
only in the Gallery — which is itself evidence those ranges exist.

**Figma gotcha: WebP uploads through `upload_assets` return a valid-looking `imageHash` that renders
blank.** The upload reports success, the fill accepts the hash, and the frame paints nothing —
the same failure mode as a `figma.createImage` round-trip. Re-encode as JPEG or PNG before uploading.

**Another one worth keeping:** when walking a product grid, `findAll` matches the *row* frames as well
as the cards (both are frames containing text), so a naive card loop writes each SKU into the wrong
node and silently overwrites the previous one. Walk `items.children` (rows) then `row.children`
(cards) instead, and filter cards by width.

The five Values now carry descriptions written for them from the client's own material — their
feature bullets and About text — because they supplied names only. They are ours, not the client's,
so they are the one piece of body copy on the site that should be run past them.

**Still unresolved and needing the client** (do not invent these): no Exercise Book SKUs at all, no
Highlighter/Marker/Cutter Knife despite the mega-menu listing them, no product photography for any of
the 38 SKUs, and "Aristow Pharmaceutical Ltd" almost certainly meaning Aristopharma. The documents
consistently spell it **Stationery**, which contradicts comment #22's "Stationary" in the logo.

### Page `10` is now ported to the Astro build

The code and the design no longer diverge. What changed, and the reasoning worth keeping:

- **Header + hero fill one viewport.** `--header-h: 86px` in `tokens.css` is the single source of the
  bar height; `.h-viewport-minus-header` is `calc(100svh - var(--header-h))`. `svh` not `vh`, so a
  mobile browser's collapsing toolbar does not push the fold.
- **The arch is a CSS mask, not a painted shape** — a real cut, so whatever sits behind shows through
  with no seam to keep aligned. **Do not build it from a `radial-gradient`.** An ellipse meets the flat
  baseline with *vertical* tangents, so the dome joins the edge at two hard corners and reads as an
  oval stuck onto the plate — it was built that way first and the client rejected it on sight. The
  drawn shape has cubic flanks tangent to the horizontal: the edge stays flat, then swells.
  `.arch-bottom` therefore composites four mask layers — the plate above the strip, the dome as an
  inline SVG at a fixed pixel size (so it never stretches with the viewport), and a flat rectangle
  either side. Current geometry is 640x72 (full width x depth), stepping down at 900px and 560px.
  **The layers must overlap by a pixel.** Each antialiases its own edge and mask layers composite
  additively, so two half-covered edges sum to about three-quarters coverage, not full — abutting them
  exactly leaves hairline seams along every join. Overlapping is safe because the SVG is fully opaque
  at its left and right edges.
- **The splash is one fixed layer on `body::before`,** not a per-section background — and at full
  strength, on the client's instruction. It covers the viewport once, never tiles, and does not move
  with the scroll, so a 4000px page shows one picture rather than the same one band after band. The
  page colour had to move from `body` to `html` for this: a background on `body` would hide a layer
  sitting at `z-index: -1`. Anything with its own background (menu bar, `bg-subtle` bands, clients,
  footer) paints over it; everything else is transparent and lets it through. It was previously 0.2
  and desaturated, because the artwork's green is outside the owner palette — that is no longer true,
  so watch body copy contrast over the greener corners.
- **Client logos are normalised with `filter: brightness(0) invert(1)`** — a one-colour white
  silhouette. Fifteen logos from fifteen brand palettes cannot share a row any other way. The six
  without artwork render as dashed outlines, so a missing logo still reads as pending.
- **Footer:** the Products and Company columns are gone with two empty grid cells holding their space,
  so nothing reflowed (`comment #7`). Socials are suppressed on Home only via a `showSocials` prop
  from `Base.astro` (`#9`). WhatsApp row added (`#8`). The lockup is set in type (`#22`) and needs
  `normal-case`, because the label token uppercases and the client writes "Stationary" in title case.
- **Doodles** are generated from a seeded LCG — 42 marks at 16–26px (`#6`) — so the texture is
  identical on every build rather than hand-placed.
- **Contact:** map moved out of the sidebar into its own full-width 21:9 section (`#38`); the FAQ is
  collapsed behind a button (`#37`) built as progressive enhancement — the button is `hidden` in the
  markup and only unhidden by script, so without JavaScript the full list stays readable.
- **Client Feedback is not rendered** (`#17`). The markup is in git history, not deleted.
- Tagline is now **"Empowering Your Potential"** everywhere, and the address is `info@gradebd.com`
  including the form's error copy.

Note: requesting the literal `/404` URL against the node adapter throws `FailedToFindPageMapSSR`.
This is the known `output: 'static'` + SSR-adapter quirk, not a fault in the page — a genuine unknown
path returns the 404 page correctly, and on Netlify the static `404.html` is served directly.

### Motion (`src/scripts/motion.ts`)

All client-side motion lives in one module, imported once by `Base.astro`. GSAP + ScrollTrigger.
Two rules: motion is for orientation, not decoration, so entrances travel a short distance and
settle; and **everything is skipped under `prefers-reduced-motion`**, with `settle()` leaving the page
in its finished state rather than part-way through a tween that never runs.

What it does: masked line-by-line reveal on the hero and every page banner (each line sits in its own
`overflow-hidden` box, so it slides up from behind its own edge — the signature entrance); a stagger
for the eyebrow, body and buttons; a 2.4s push-in on the lead photograph; scrubbed parallax on banner
imagery; grouped scroll reveals via `[data-reveal-group]`; counting the credibility figures up; and a
scroll-scrubbed drift on the client's doodle marks across three planes.

Gotchas paid for once:

- **Never tween `scale` on the first hero `<img>`.** It carries an inline `transform: scaleX(-1)`
  mirror, and GSAP reads that as a 180-degree rotation with a negative scale — tweening scale on top
  flips the photograph on *both* axes. Scale the `[data-slide-media]` container instead.
- **Counters must mirror the source's own number formatting.** `toLocaleString` turns "Since 2019"
  into "Since 2,013" while counting. Group only when the written figure already groups.
- The slider dispatches `slide:change` so the motion layer can re-run the line reveal per slide
  rather than the generic children stagger.
- TypeScript will not carry a `querySelector` null-narrowing into a nested function declaration —
  capture the element in a local first.
- rAF pauses in a backgrounded tab, so a screenshot taken while the window is occluded catches tweens
  frozen part-way. That is the harness, not a bug; GSAP resumes on focus.

Polish in the same pass: gallery plates lift and scale on hover (comment #32); the client track is
edge-masked so a half-cut logo reads as "there is more"; the header takes a shadow past 24px of
scroll but never changes height, because the hero measures itself against `--header-h`; and the
splash layer is desaturated to 0.72, since its lime green is outside the owner palette.

### Colours agreed on the client call (page `08`)

Menu bar **light blue**, footer **red**, from client-supplied Pantone swatches. Values sampled from
their swatch image and stored as new `Semantic` variables — bind to these, don't hardcode:

| variable | value | note |
| --- | --- | --- |
| `bg/menu` | `#A2DFF9` | PANTONE P 115-5 C `#8BD7F7` at the 80% tint they specified |
| `bg/footer` | `#EE1E2C` | PANTONE P 48-8 C at 100% |
| `text/on-menu` | `#0D2038` | navy, 11.3:1 on the blue |
| `text/on-menu-muted` | `#1B3B65` | inactive nav, 7.8:1 on the blue |

Two consequences of the red footer, both unresolved and needing the client:

- **The logo had to come out of the footer.** Its wordmark *is* this red, so on a red band it vanishes
  and only the white tagline would survive. Page `08` footers are text-only until a reversed all-white
  logo arrives. This is the same lockup defect described above, now blocking a second placement.
- **White on `#EE1E2C` is 4.32:1** — under the 4.5:1 AA floor for body text (fine for large/bold). The
  14px footer address lines are the affected text. Fixes, in order of preference: darken the footer red
  slightly (`#D2141B` gives 5.45:1), or set that text ≥18.66px semibold so the 3:1 large-text rule
  applies. Do not "fix" it by tinting the white down — that makes it worse.

Note the brand red on page `07` and elsewhere is `#EA1F27`, sampled from the logo; the call's
`#EE1E2C` is a slightly different red. Ask the client whether the Pantone should now become the brand
red everywhere, or stay a footer-only colour.

### The client rejected the layout improvements on `05 · Hi-fi screens`

They want the paper wireframes followed literally. `07 · Wireframe-exact (hi-fi)` is that version and is
**the current design direction** — brand palette and type applied to the client's own layout, nothing
added. Do not "improve" its layout again without being asked. What that page does differently:

- Header is logo + centred-right nav + search icon only. **No utility bar, no "Request a quote" button.**
- The hero slider sits inside the 1200 content column — it is not a full-screen hero.
- Product/category cards put the **name above the image**, as drawn.
- Category pages have no page title; the "Art Work" band is image-only.
- Contact: labels sit *inside* the fields (`Name:`), Send is a wide centred bar, Head Office sits beside
  the map, and the FAQ section opens with a centred dark bar.
- Footer is a **navy band** — full logo lockup above the address block on the left, five social icons
  right. The wireframe drew it white, but navy is the only ground that renders the supplied lockup
  whole (red wordmark + white "For Every People" tagline), so the client approved navy here.
  Home also carries a navy band for "Our Corporate Clients", one step lighter (`bg/inverse-soft`)
  than the footer so the two adjacent navy blocks don't merge into one mass.

Frames `05`/`06` are kept as the record of what was proposed and turned down; leave them alone.
The Astro build still matches `05`, so the code and `07` have diverged — reconciling them is a separate
job the user has not asked for yet.

Design tokens live as Figma variables in two collections — `Primitives` (raw ramps, scoped `[]` so they
stay out of pickers) and `Semantic` (aliases onto primitives, each carrying its `var(--…)` WEB code
syntax). Build against the semantic layer, never the raw ramps. The CSS variable names in Figma are the
contract for the Astro stylesheet.

- **Brand red `#EA1F27`** — sampled pixel-exact from the client logo, sits at `color/red/500`.
- **Navy secondary** (`color/navy/*`, H=214) — client-agreed supporting colour; headings, footer, dark
  bands. Neutrals share the navy hue so greys don't look muddy beside it.
- **Type**: Fraunces SemiBold for display/headings, Raleway Regular/Medium/SemiBold for interface and
  body. Both are Google fonts. Note the exact Figma style strings are `SemiBold` (no space) for these
  families — verify with `listAvailableFontsAsync` rather than guessing.
- Layout rails: 1440 artboard, 1200 content column, 120 gutters, 24 grid gap, 3-up product grid.

The low-fi frames carry inline red-bordered `Note` callouts recording every interpretation made where
the paper wireframes were ambiguous. Read those before changing a layout — they are the record of what
was assumed and what still needs the client.

### Vectors arrived, and the footer lockup is still a two-part mark

`docs/client/references/SVG/` holds the client's Illustrator exports, copied into
`public/images/brand/` and seeded into the CMS: `grade-logo.svg` in every header,
`grade-lockup.svg` (their "Artboard 1") in every footer, `favicon.svg` as the site icon, and
`grade-lockup-white.svg` (their "white.svg") on `logo_reversed` as an alternative.

**The footer lockup renders red-on-red.** `grade-lockup.svg` is the same two-part construction as the
original PNG — red wordmark, near-black "StationerY" — so on the brand-red footer the wordmark all
but disappears. It is what the client asked for and it is what is live; the alternatives, in order of
how well they read on red, are `grade-logo-white-stationary.png` (a true reversed mark, still in the
repo), then `grade-lockup-white.svg`. Swapping is one field on the `site` singleton.

Two other things worth carrying: the vectors' red is **`#ee212e`**, a third value alongside the
`#EA1F27` in the tokens and the `#EE1E2C` from the client call — nobody has said which is
authoritative. And a proxied `/cms/<id>` URL has no file extension, so the favicon's `type` comes
from the file's own media type, carried through `imageSchema.mime`; deriving it from the URL silently
produced no type at all.

### The earlier logo problem — proper raster marks arrived

**`docs/logos/` holds three clean single-colour PNGs with real alpha**, and they are now what the site
uses. This closes a defect that shaped a lot of earlier decisions, so ignore any older note that works
around it:

| file | in `public/images/brand/` | used on |
| --- | --- | --- |
| `grade-logo.png` | same name | header — red wordmark on the light blue menu bar |
| `grade-logo-white-with-word-stationary.png` | `grade-logo-white-stationary.png` | footer — reversed lockup carrying "STATIONARY" |
| `grade-logo-white.png` | same name | spare reversed mark for any other dark ground |

Consequences worth knowing:

- **Give a fixed-height logo `self-start` inside a flex column.** The footer's brand column is
  `flex flex-col`, whose default `align-items: stretch` pulls a `w-auto` image out to the full column
  width — with the height pinned, that stretches the mark to more than twice its aspect. It looks
  plausible enough in a thumbnail to survive a review, so it is worth checking against the source file
  rather than by eye.
- **The header's clipping hack is gone.** It used to render the two-part lockup inside an
  `overflow-hidden` box with a `-translate-y-[4px]`, to crop off a white tagline that vanished on the
  light blue. Now it is just an `<img>`.
- **Comment #22 is delivered as artwork, not type.** The footer showed a type-set GRADE / Stationary
  while we waited; it now uses the client's own reversed lockup. The tagline is *not* part of the
  mark, so "Empowering Your Potential" stays as a line of type beneath it, from `site.tagline`.
- The old `public/images/brand/grade-logo-white.png` — generated by forcing every non-transparent
  pixel of the supplied lockup to white, and still carrying "For Every People" — has been overwritten
  by the client's real file. Nothing needs that trick any more.
- Note the artwork spells it **"STATIONARY"**. The client's own content documents spell it
  "Stationery" throughout. That contradiction is now baked into a logo and still needs settling.

### The original defect, for context

`docs/client/brands/Grade Logo 1024x367.png` is a **two-part lockup, not a single-colour mark**: the
"GRADE" wordmark is red `#EA1F27` (rows 31–274) and the "For Every People" tagline beneath it is pure
white (rows 275–335, containing zero red pixels). No single background rendered the whole lockup — on
white the tagline vanished, on brand red the wordmark vanished, and only navy showed both. Superseded
by the files above; kept because the Figma pages `05`–`09` were designed around it. Still outstanding
from the client: a **vector** original and confirmation of the ™ claim.

### Figma API gotcha worth remembering

Figma **instances do not materialize invisible children** — a node hidden in a component is absent from
the instance tree entirely and cannot be found with `findOne`. To toggle something per-instance, bind a
BOOLEAN component property to `visible` and drive it with `instance.setProperties()`. `wf/Header` uses
this for its five `Active <page>` nav markers.

## Directus is wired up — the site renders from the CMS

Content, images, logo, favicon and SEO all come from Directus now, and moderators edit them in place
on the rendered page. `docs/cms.md` is the guide; what is worth carrying forward:

- **`npm run directus:bootstrap` builds the whole backend from nothing** — 20 collections, every
  relation, 58 images uploaded from `public/images/`, and `src/content/*.json` written in as content
  (5 ranges, 44 products, 15 clients). Nobody retypes the catalogue. It is idempotent; `--schema-only`
  re-applies model changes, `--force` re-seeds. The model is declared once in
  `scripts/directus/model.mjs` and mirrors `src/lib/schema.ts`.
- **`output: 'server'`.** Prerendering cannot coexist with "edit what you can see": a save would need
  a rebuild and a redeploy. `getStaticPaths` is therefore gone from `[category].astro`, and
  `@astrojs/sitemap` was replaced by `src/pages/sitemap.xml.ts`, which reads the same source the
  pages do — a sixth range added in the CMS appears in the sitemap without a build.
- **Images are proxied at `/cms/<file-id>`,** not served from the Directus host. Directus then needs
  no public read permission, the admin host need not be reachable from a visitor, and pictures share
  the site's certificate and cache. Directus' transforms pass through unchanged.
- **Configuration is read at run time — `process.env` before `import.meta.env`.** Vite inlines
  `import.meta.env` when the bundle is built, so an image built once carries the build box's settings
  forever. This was a real bug: the container rendered seed content with no warning because
  `DIRECTUS_URL` had been baked in as undefined. `SITE_URL` is the genuine exception; Astro bakes it
  into canonical tags.
- **Three settings make in-place editing work, and two fail silently.** `DIRECTUS_PUBLIC_URL` tells
  the site the admin's origin; `CONTENT_SECURITY_POLICY_DIRECTIVES__FRAME_SRC` lets Directus frame
  the site (its `frame-src` otherwise falls back to `default-src 'self'` and the editor shows an
  empty panel); `frame-ancestors` in `nginx/gradebd.conf` lets the site be framed. Only the first
  produces anything visible when it is wrong.
- **`editable()` emits `data-directus="collection:…;item:…;fields:…;mode:…"`** — semicolons, colons,
  commas, confirmed against the library's own parser. Singletons need no `item`: the readers stash
  each singleton's row id. Catalogue rows carry `directus_id` through the Zod schema for the same
  reason. Repeated things (slides, FAQs, values, gallery) are edited as a list through a `drawer` on
  the parent field, because only one slide is on screen at a time.
- **The editing library is a dynamic import behind `window.self !== window.top`,** so Vite splits it
  and an ordinary visitor never downloads it. Verified: the chunk loads only when framed.
- **Every string array is a textarea, one value per line** — address lines, banner lines, story
  paragraphs, product features. **Alt text lives on the file**, in Directus' `description`.
- Directus API notes paid for once: nested file columns must each carry their prefix
  (`image.id,image.width`, not `image.id,width`) or Directus answers **403**, not a validation error;
  a machine user's email cannot use a `.local` TLD; and `visual_editor_urls` on `/settings` is what
  registers the site with the Visual Editor module.

Deployment adds one hostname: `nginx/admin.gradebd.com.conf` puts Directus on `admin.gradebd.com`
with its own certificate, which the Visual Editor needs because a browser will not frame http inside
https. If in-place editing is not wanted, do not publish the admin at all — an SSH tunnel is enough.

## The client's second round of cuts

Nine instructions, all applied. The ones that change what a future session should expect:

- **"B2B" is banned.** Not a rewording — the client says the label is simply wrong for them. Gone
  from the copy, the seed, the footer, the readme and this file.
- **Home is much shorter.** The credibility strip ("Since 2019", "300+ work orders"), the sub-brand
  band (Champ · Neo · Xtreme · Dox) and "Our Values" are all no longer rendered. Following the
  precedent set by Client Feedback (comment #17): the data stays in the CMS and the markup stays in
  git history, so restoring any of them is a revert rather than a rebuild. Values still has its own
  section on About, which is where the client's own copy for it lives.
- **The arch is gone.** Every hero and page banner is a plain rectangle now, and the `.arch-bottom`
  mask and its long explanation are deleted from `global.css`. Worth knowing because that shape was
  drawn by the client themselves and rebuilt twice; if it ever comes back, the geometry and the
  reasoning are in the history of that file, not lost.
- **`show_cta` on each hero slide, defaulting OFF.** A boolean in `home_slides`. The client wants the
  hero to carry its copy alone, so "Request a quote" only appears where a moderator switches it on;
  a null reads as off, matching the default. The range link is separate and still follows
  `range_slug`. Note the bootstrap's `ensureField` is create-only, so changing a field's default in
  `model.mjs` does **not** update an instance that already has the field — patch
  `/fields/<collection>/<field>` directly, or re-bootstrap from empty.
- **Patching Directus content from the shell mangles non-ASCII.** A `curl -d` body carrying a middle
  dot arrived as U+FFFD, twice, and the page rendered a diamond — the shell re-encodes the byte before
  curl sees it, and `--data-binary` does not save you. Use a small Node script with `JSON.stringify`
  when a value has anything outside ASCII in it.
- The "Request a quote" button in `QuoteBand` is a different thing and is untouched: that band is a
  whole section with its own heading, on About, Gallery and every category page.
- **Home's closing band is now "Our Social Media Contacts"** with the real platform logos in their
  own brand colours, from a new `brand` tone on `SocialLinks` (white disc, coloured glyph — fifteen
  brand colours on one row need a neutral ground). `socialColours` in `src/lib/social-icons.ts`.
  Note only **confirmed** socials render, so today that is Facebook and LinkedIn; the other three
  are `confirmed: false` in the CMS and will appear the moment real URLs are set.
- **Footer:** the "Supplying pens… since 2019" strapline is gone, and the social row moved out of the
  brand column into its own centred row above the copyright bar.

## Fourth round of client changes

- **Replacing an image in Directus keeps the same file id**, so `/cms/<id>` never changed and the
  site kept serving the old picture from cache for up to a day while the admin showed the new one.
  `assetUrl` now carries `?v=<modified_on in base36>`; the proxy ignores the param, it exists only to
  make the URL change when the bytes do. Reproduced before fixing and re-tested after.
- **Sub-category tabs are back on the category pages** — no "All", the first is the default. They are
  real links to `?sub=…` and the server filters, so they work with no JavaScript, paint the right
  group on the first frame instead of flashing the whole grid, and can be linked to. A script
  upgrades them to switching in place with `history.replaceState`.
- **The clients row auto-advances** every 3.5s, pausing on hover and on focus within, skipped under
  `prefers-reduced-motion` and while the tab is hidden, and wrapping at the end rather than stopping
  with a half-cut logo against the edge. The arrows restart the clock.

## Fifth round of client changes

- **The closing band's artwork is anchored to the bottom-right corner** and pushed slightly past it,
  so it reads as coming out of the corner rather than sitting in a box beside the text. The tilt
  turns around `origin-bottom-right`: rotating about the centre lifts the drawing off the edge and
  reopens the gap the anchoring just closed. Absolute from `md` up only — on a phone there is no room
  beside the copy, so it falls back to a plain block underneath.
- **Footer:** "Get in touch" needed its colour spelled out. It is an `<h2>`, and the base stylesheet
  gives every heading `--text-primary` — dark ink — which beats the footer's inherited white. Worth
  remembering for any other heading placed on a dark ground. The WhatsApp row and the opening hours
  are gone from the address block, and the social row moved from its own centred strip at the bottom
  into the empty middle columns of the top row.
- **A floating WhatsApp button** sits outside `<footer>` on purpose: the footer is
  `relative overflow-hidden`, and a `fixed` child of an ancestor like that is at the mercy of how the
  browser resolves its containing block. It fades in only while the footer is in view. The number
  comes from `phone_href`, not `phone` — `phone` is the local form (01842-024378) and wa.me would
  send people looking for that number in their own country.

## Sixth round of client changes

- **The range cards on Home are the category name alone.** `meta` is optional on `ProductCard` now
  and renders nothing when empty; the field is still in the CMS and still used on the item cards,
  where it carries the pack size.
- **The header search button is a CMS switch, `show_search` on the site record, and it ships off.**
  There is still no search page for it to open — it navigated to Contact — so off is the honest
  default. A null reads as off.

## Everything visible is CMS content now

The remaining hardcoded copy moved into Directus in one pass. What was left, and where it went:

- **`site`** gained `footer_contact_heading`, `footer_note`, `footer_rights` (the bottom bar's
  "© 2026 Grade Limited." is composed, so only the trailing sentence is a field), `price_note` for
  the product dialog, and two files: `doodle_image` for the closing band and `background_image` for
  the watercolour behind every page.
- **`nav_items`** is the main menu. Labels and order are editable; destinations are not. Each row
  names a *page key* and the href is looked up in `Header.astro`, so a moderator can reword "Product
  Categories" or move Gallery ahead of it with no way to point the menu at a URL that does not exist.
  An empty nav falls back to the five defaults rather than rendering no menu.
- **`not_found`** is a new singleton for the 404 page — SEO, eyebrow, heading, body, and both link
  labels. It was the last page with no CMS record at all.
- **`home`** gained `categories_cta_label` ("See all") and the `brand_band_*` trio.
- **`contact`** gained every remaining label: the two eyebrows, the four field placeholders, the Send
  button, "Head Office", "Google Map Location" and the FAQ pill.

**The page background is a custom property, not an inline style.** It is painted by `body::before` in
the stylesheet, which nothing in the markup can reach, so `Base.astro` injects
`:root{--site-background:url(…)}` and `global.css` falls back to the bundled file when it is unset.

Left in code deliberately: `aria-label`s on controls, the honeypot's hidden label, and the card
`action` strings — those are accessibility text describing what a control does, not copy anyone would
translate or rewrite, and they are not visible on the page.

## Adding a CMS field is two steps on a live install, not one

`ensureField` is create-only and `seedContent` bails out once content exists, so
`--schema-only` leaves a live Directus holding new columns with nothing in them. The site then
renders the new markup against nulls and the section comes out as an empty shape — this actually
shipped: Home's social band went to production with no heading, no artwork and the pre-change two
icons, while the same commit looked correct locally. Reproduced by blanking those fields in a local
Directus, which reproduced the production screenshot exactly.

`npm run directus:bootstrap -- --fill-empty` (`--dry-run` to look first) fills only fields whose
current value is empty, so it cannot overwrite a moderator's edit; `--force` would, and is the wrong
tool. `socials.confirmed` is the one deliberate exception — `false` is a real stored value, not an
empty one, so the empty-only rule can never reach it and an older install keeps its original icon
set forever; which platforms appear is configuration, so the seed wins there and every change is
logged.

**Editing `src/content/*.json` changes nothing for a running Directus.** The seed is only the
fallback for when Directus is unreachable. Content changes have to be made against the instance —
locally *and* on the server — or written into the seed and then applied with `--fill-empty`.

## Information architecture

`docs/client/wireframe/` holds nine photographed paper wireframes (WhatsApp images, filenames are not
meaningful — read them to identify the page). They cover, in order:

- **Home** — 6 hero sliders (All items, Pen, Exercise Book, School Stationery, Office Stationery,
  File & Folder), "Who We Are", "Product Categories" strip with a *See all* link, "Our Corporate Clients".
- **About Us** — thematic image, then Our Vision / Our Mission / Our Values / About Us sections.
- **Five category pages**, one per product category, all sharing one template: thematic "Art Work"
  image, a horizontal row of sub-category filters, then a 2×3 item grid.
  - Pen → Ball Pen (…)
  - Exercise Book → Student Large, Standard Large (…)
  - School Stationery → Pencil, Eraser, Sharpener, Color Pencil, Scale, Pencil Box, Clipboard
  - Office Stationery → Stapler, Punch, Pin Remover, Staples, Highlighter, Marker, Cutter Knife
  - File & Folder → Clear Bag, Liner Bag, Document Carrier, Report Cover, Ring File, Clip File,
    L-Folder (from the mega-menu reference on page `10`; the paper wireframes showed none)
- **Gallery** — thematic image plus a 2-column image grid.
- **Contact** — "Query Zone" form (Name, Email, Mobile No, Message → Send), Head Office block, Google
  Map embed, and an FAQ section.

The five category pages are one Astro route driven by Directus data, not five hand-written pages. The
data model needs roughly: category → sub-category → item (each with images), plus singletons for the
Home/About/Contact copy, and collections for corporate clients, gallery images, and FAQs.

Persistent chrome on every page: header with logo + nav (Home, About Us, Product Categories, Gallery,
Contact) + a search affordance; footer with the contact block and social icons (Facebook, Instagram,
YouTube, X, LinkedIn).

## Conventions

- `docs/client/` is client-supplied source material. Treat it as read-only reference.
- Content is authored in Directus by moderators — when in doubt about whether something should be a
  hardcoded constant or a CMS field, prefer the CMS field.

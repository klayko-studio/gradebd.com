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

**Grade is a B2B supplier/distributor, not a manufacturer.** Their existing site describes a marketplace
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
Nine pages: `01 · Foundations` (brand guideline), `02 · Wireframes (low-fi)` (nine page frames),
`03 · Wireframe kit` (shared low-fi components), `04 · Hi-fi kit`, `05 · Hi-fi screens`,
`06 · Client presentation`, `07 · Wireframe-exact (hi-fi)`, `08 · Colour revision (call)`,
`09 · Brand palette (owner vision)` — **the current direction**.

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

### Known problem with the supplied logo

`docs/client/brands/Grade Logo 1024x367.png` is a **two-part lockup, not a single-colour mark**: the
"GRADE" wordmark is red `#EA1F27` (rows 31–274) and the "For Every People" tagline beneath it is pure
white (rows 275–335, containing zero red pixels). Consequence: no single background renders the whole
lockup — on white the tagline vanishes, on brand red the wordmark vanishes, and only navy shows both.
A white-background site cannot use this file as-is in the header. Assets still needed from the client:
vector original, wordmark-only variant, a light-background tagline variant, a reversed all-white
variant, and confirmation of the ™ claim.

### Figma API gotcha worth remembering

Figma **instances do not materialize invisible children** — a node hidden in a component is absent from
the instance tree entirely and cannot be found with `findOne`. To toggle something per-instance, bind a
BOOLEAN component property to `visible` and drive it with `instance.setProperties()`. `wf/Header` uses
this for its five `Active <page>` nav markers.

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
  - File & Folder → (no sub-categories; items only)
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

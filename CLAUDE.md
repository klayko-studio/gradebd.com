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
Seven pages: `01 · Foundations` (brand guideline), `02 · Wireframes (low-fi)` (nine page frames),
`03 · Wireframe kit` (shared low-fi components), `04 · Hi-fi kit`, `05 · Hi-fi screens`,
`06 · Client presentation`, `07 · Wireframe-exact (hi-fi)`.

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
- Footer is plain white — address block left, five social icons right.

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

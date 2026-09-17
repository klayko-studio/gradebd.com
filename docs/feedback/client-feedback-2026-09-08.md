# Client feedback, 8 September 2026 — triage and plan

Source: `docs/client/feedback/08 Sept Feedback.pdf` (5 pages, 12 items across Home, Product
Category, Contact and "Common").

Sorted the same way as the two earlier rounds — **layout** is a code change shipped by a deploy,
**content** is a value in Directus, **blocked** needs something from the client first. See
`client-feedback-2026-08-29.md` for why that split matters.

Every item below was checked against the running build before being written down, so "real" and
"already fixed" are measurements, not readings of the wording.

---

## Already done

Shipped in the working tree on 17 September, before this PDF was read — they were asked for
verbally first.

| # | Item | What changed |
| --- | --- | --- |
| Home 2 | "View the range" more see-through, Next/Prev as the reference | The button now carries the arrows' own values: deep blue at 22%, white/50 hairline, 2px blur, white ink. `Button.astro`, `on-dark` variant. |
| Home 3 | Search backdrop lighter and less blurry | `rgb(6 20 28 / 0.86)` + 3px → `rgb(10 82 115 / 0.55)` + 2px, which is the product dialog's own backdrop. |
| Home 4 | Hero and client slider at ~3s | 6500ms → 3000ms, and the client row 3500 → 3000. Measured at 2.9–3.1s. |
| Home 5 | Zoom on hover, Product Categories on Home | 1.03 over 500ms, copied from the product dialog. |
| Category 1 | Zoom on hover, product images | The same change — both card grids are one component. |

Home 5 and Category 1 are the same item written twice, which is why one edit closed both.

---

## The plan

Four batches, ordered by severity and by what blocks what. Batches 1 and 2 are deploy-only;
batch 3 adds CMS fields, which is a two-step release on a live install (see the note at the end).

### Batch 1 — done, 17 September

| # | Item | Where | Change |
| --- | --- | --- | --- |
| 1 | **WhatsApp button is invisible but still clickable** | `Footer.astro:224` | ✅ `pointer-events: none`, restored on `.is-visible`. Verified: the hero next arrow is hit-testable again and the button still works at the footer. |
| 2 | Contact page Address block needs `Phone:` / `Email:` labels | `contact.astro:184` | ✅ Both labelled, matching the footer, label outside the link. |
| 3 | Product card hover — red border | `ProductCard.astro` | ✅ Dropped. The resting hairline stays; only the red hover state is gone. |

**On item 1.** This is the highest-severity thing in the round and the cheapest to fix.
`.whatsapp-fab` sets `opacity: 0` and nothing else, and opacity hides paint, not hit-testing — so a
live 56px link sits at the bottom-right of *every* page until the footer scrolls into view. On Home
that is directly over the hero's **next** arrow, which is exactly what their screenshot shows: the
status bar reading `wa.me/8801842024378` while the cursor is on the arrow. It eats clicks on a real
control on every page of the site.

The label on item 2 belongs outside the anchor, for the same reason as in the footer: "Phone:" is
not a phone number, and putting it inside the link makes a screen reader announce it as part of the
destination.

### Batch 2 — done, 17 September

| # | Item | Where | Change |
| --- | --- | --- | --- |
| 4 | **Hero exceeds the viewport on short screens, pushing next/prev out** | `HeroSlider.astro` | ✅ `py-16` → `py-[clamp(1rem,7svh,4rem)]`, plus a height-aware cap on the headline. All six slides fit at 1280x560 and up; phones unchanged. |
| 5 | Header and hero should keep fixed side margins on wide screens | `global.css` `.rail` | ✅ The `max-width` cap is gone; the margin is 5vw to a 120px ceiling, the value the client chose. 1440 and below unchanged; 1920 goes 336px → 96px and 2560 goes 680px → 120px. |
| 6 | Full-screen image viewer should zoom on mouse scroll | `src/scripts/lightbox.ts` | ✅ Wheel zoom 1–4x about the cursor, drag to pan, clamped to the picture, `+`/`-`/`0` on the keyboard, reset on slide change and close. |

**Item 4 is the one that collides with a same-day instruction, so read this before starting it.**

Measured on the current build:

```
1440 × 800    hero fits
1366 × 768    hero fits
1366 × 640    hero bottom at 645px   →   5px past the fold
1280 × 600    hero bottom at 636px   →  36px past the fold
```

The client's reading of it is right: slide 1 has no button (no `range_slug`), slides 2–6 do, and
that button is ~62px — enough to tip the hero past the viewport on a short screen. Hence "first
image has perfect height, rest have more heights".

But on the same day the client asked for this, we were asked to **reserve** the button's space on
the button-less slides so the six slides stop changing height. That shipped, and it means slide 1 is
now as tall as the rest — so on a short screen every slide overflows rather than five of six. The
two instructions pull in opposite directions and the reserved space is the newer of the two.

The fix that satisfies both is to make the **tall** version fit at 600px, not to unreserve the
space. What is costing the height is fixed against the viewport's width, not its height:
`py-16` (128px top and bottom) on the copy block, and the display type. Clamping both against
`svh` — or simply letting the copy block shrink and the type step down under a height media query —
gives equal heights *and* nothing pushed below the fold. Verify at 1280×600, 1366×640 and 1440×800,
and check the phone breakpoint has not moved.

**Item 5** is a real change of rule, not a tweak. `.rail` is
`max-width: calc(1200px + 2 × gutter); margin-inline: auto`, so past about 1416px the content stops
moving outward and the side gap keeps growing — which is the "moves toward center" they describe.
They want a constant margin instead. The client chose **120px**, the artboard's own gutter, and it is
applied as a ceiling rather than as a hard value everywhere: pinning it would have narrowed the 1440
artboard from 1296px of content to 1200px, changing a layout nobody complained about and which they
have approved in every screenshot so far. As a ceiling, nothing at or below 1440 moves at all.

Measured at eight widths from 390 to 2560 — the logo, the hero headline and the first section
heading share one left edge at every one of them, body copy holds at 568px, and nothing scrolls
horizontally.

**Show them 1440 / 1920 / 2560 before calling it signed off.** At 2560 the five-up client logo row
gives each mark a very wide cell and the six pending placeholders read as long empty bars. Airy
rather than broken, but it is a different page from the one they have been approving.

**Item 6** — the screenshot is the full-screen `ImageLightbox`, not the product dialog. Wheel to
zoom about the cursor, a reset on close and on changing slide, and drag to pan once zoomed past 1.
Keep the page behind from scrolling while the pointer is over the image. Pinch-zoom on touch is the
obvious neighbour and is not asked for; leave it unless they ask.

### Batch 3 — done, 17 September

| # | Item | Where |
| --- | --- | --- |
| 7 | ✅ Home page footer button | `Footer.astro`, `schema.ts`, `model.mjs`, `backfill.mjs`, `site.json` |

Their arrow points at the empty middle of the footer's top row. That space exists because the social
row is suppressed on Home only (comment #9), and the container is still rendered so the columns
either side do not close up — so there is already a home for this with no layout change:

```astro
<div class="flex items-center justify-center md:col-span-2">
  {showSocials && <SocialLinks … />}
</div>
```

"Customizable label and link" means two fields on the `site` singleton —
`footer_cta_label` and `footer_cta_href` — not hardcoded copy. The button renders only when both are
filled, so an empty pair leaves the footer exactly as it is today rather than showing a button to
nowhere.

**Home only**, on the client's answer — the same `showSocials` prop that suppresses the icons there
selects the button instead, so the two never occupy the slot at once and no page ends up with an
empty middle column.

### Batch 4 — done, 17 September

| # | Item | Where |
| --- | --- | --- |
| 8 | ✅ `/products/` — All Products | `src/pages/products.astro` (new), `all_products` singleton, `Header.astro`, `index.astro`, `sitemap.xml.ts` |

Today both point at `/pen/` — the first range:

```ts
categories: `/${categories[0]?.slug ?? ''}/`   // Header.astro:22
href={`/${categories[0].slug}/`}               // index.astro:72
```

Their hand sketch reads, top to bottom: header → **All Products** with a thematic picture → a row of
all five ranges (Pen, Exercise Book, School Stationery, Office Stationery, File & Folder) with the
active range's sub-categories on a second line (*Student Large*, *Standard Large* drawn under
Exercise Book) → a product grid → footer. They wrote **"Fixed template"** across the bottom.

That is the existing category page with one axis added: the range filter promoted from "whichever
slug is in the URL" to a tab row on the page. So the plan is to build it from `[category].astro`
rather than as a new design — same banner treatment, same sub-category tabs, same card grid, same
`?item=` dialog behaviour, with `?range=` and `?sub=` as real links so it works without JavaScript
exactly as the category pages already do.

It needs its own banner copy, so a small `all_products` singleton on the pattern of `not_found`
(SEO, eyebrow, banner lines, image). Both entry points then repoint at it.

This is the one genuine build in the round; the other seven are edits. Do it last.

---

## Decisions — answered by the client, 17 September

| | Question | Answer |
| --- | --- | --- |
| 1 | Red border on product cards — keep or drop? | **Drop.** The zoom replaces it. Done. |
| 2 | Footer button — Home only or every page? | **Home only**, where they marked it. The inner pages keep the social row in that slot. |
| 3 | How wide is the fixed margin? | **120px** — the artboard gutter. Applied as a ceiling; see item 5. |
| 4 | Does the rest of the site follow the header and hero out of the 1200 column? | **Our call.** Decided below. |

### On question 4 — the whole page follows, with one exception

Measured on the current build, every left edge on the site is the same number:

```
viewport    logo    hero headline    first section heading
1440px       72          72                  72
1920px      336         336                 336
2560px      680         680                 680
```

That shared edge is the strongest alignment the layout has. Giving the fixed margin to the header
and hero *alone* would break it: at 1920 the headline would sit at ~72px while the section beneath
it stayed at 336px — a 264px step, growing to 560px at 2560. It would read as a mistake, and it is
the sort of thing this client reports.

So the rail changes for the whole page. The exception is long prose, which keeps a reading-width cap
of its own — a paragraph set 2300px wide is unreadable however well it aligns. Grids, headings and
banners take the full margin; body copy does not. Review at 1920 and 2560 once the margin value
arrives.

---

## Nothing here is a content change

Unusually for this client, all twelve items are code. The outstanding Directus work is still the
list in `production-content-changes.md` from the two earlier rounds, which is unaffected by this one.

One thing this round quietly confirms: **the Pen photography has landed.** Their Product Category
screenshot shows the four real pen packs, which closes item 16 of that document — the one item that
was blocked on their drive link. Worth checking the same drive for the Pencil Box shots (item 27),
which are still outstanding.

## Releasing batch 3

`ensureField` is create-only and `seedContent` bails once content exists, so a schema change alone
leaves the live Directus holding empty columns and the footer renders no button. Same two-step as
last time:

```bash
npm run directus:bootstrap -- --schema-only     # adds site.footer_cta_label, site.footer_cta_href
npm run directus:bootstrap -- --fill-empty      # writes the seed values where the field is empty
docker compose up -d --build site
```

`--fill-empty` only writes where a field is currently empty, so it cannot overwrite a moderator's
edit. `--force` would, and is the wrong tool.

**It is three steps, not two — corrected from the earlier note.** `backfill.mjs` carries its own
explicit allowlist of the keys it offers per collection, so a field added to `schema.ts`,
`model.mjs` and the seed JSON still reports `site: nothing empty` and stays null forever. The column
exists, the seed has the value, and nothing connects them. Both new fields hit this. CLAUDE.md is
updated.

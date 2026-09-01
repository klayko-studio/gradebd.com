# Content changes to make on production

From the client feedback of 29 August 2026. These are **values in Directus**, not code — none of
them ship with a deploy, and none of them can be done from this repo. Editing
`src/content/*.json` changes nothing for a running Directus: that file is only the fallback used
when Directus cannot be reached.

**Where:** `https://admin.gradebd.com` → log in → the collection named in each row.
Or edit in place on the site itself through the Visual Editor, which is what it is for.

## Do this first

The layout half of this feedback added one CMS field. Apply it before the rest, or item 9 below
will have nothing to switch:

```bash
cd ~/repo/gradebd.com
git pull
npm run directus:bootstrap -- --schema-only     # adds categories.hide_subcategory_tabs
npm run directus:bootstrap -- --fill-empty      # uploads and sets site.footer_pattern
docker compose up -d --build site
```

`--fill-empty` only writes where a field is currently empty, so it cannot touch anything a moderator
has edited. Here it uploads the client's footer artwork and points `site.footer_pattern` at it. The
site falls back to the bundled copy of the same file if the field is left empty, so the footer looks
right either way — but setting it means the next version of that artwork is a drag-and-drop rather
than a deploy.

---

## 1 · Site  → `Content → Site` (single record)

| # | Field | Now | Change to | Why |
| --- | --- | --- | --- | --- |
| 1 | `show_search` | off | **on** | "Search icon is missing, need to add" (deck p.2). There is a real product search behind it now, so this is safe to switch on. It ships on for a fresh install; an existing one keeps whatever it has, hence this row. |
| 2 | `logo_reversed_stationary` | `grade-lockup.svg` (red wordmark) | **`grade-logo-white-stationary.png`** | "Logo needs to full white" (p.6). Upload from `public/images/brand/` if it is not already in the file library. |
| 3 | `footer_note` | `Stationery · Dhanmondi, Dhaka` | **empty** | "Remove this" (p.6). |
| 4 | `price_note` | `price quoted on enquiry` | **empty** | The client replaced that line with "Pack Size —" (p.9). The layout is already changed; this clears the leftover text. |
| 5 | `phone` | `01842-024378` | **`+88 01842-024378`** | "Add Phone: +88" (p.6). Leave `phone_href` as `tel:+8801842024378` — it is already correct and is what the WhatsApp button uses. |

## 2 · Home sliders → `Content → Home → Slides` (open the list, then the slide)

**The eyebrow wording, on all six slides.** The client boxed *half* of each one: the location on the
first slide, the `Range 0N` prefix on the rest. The eyebrow itself stays — it is the half that names
something that they kept.

| # | Slide | Field | Now | Change to |
| --- | --- | --- | --- | --- |
| 6 | All items (1st) | `eyebrow` | `Stationery · Dhaka, Bangladesh` | **`Stationery`** |
| 7 | Pen (2nd) | `eyebrow` | `Range 02 · Pen` | **`Pen`** |
| 8 | Exercise Book (3rd) | `eyebrow` | `Range 03 · Exercise Book` | **`Exercise Book`** |
| 9 | School Stationery (4th) | `eyebrow` | `Range 04 · School Stationery` | **`School Stationery`** |
| 10 | Office Stationery (5th) | `eyebrow` | `Range 05 · Office Stationery` | **`Office Stationery`** |
| 11 | File & Folder (6th) | `eyebrow` | `Range 06 · File & Folder` | **`File & Folder`** |

And the two images:

| # | Slide | Field | Change to | Why |
| --- | --- | --- | --- | --- |
| 12 | **Exercise Book** (3rd) | `image` | the new Grade NEO Exercise Book pack shot | "Need to replace this image" (p.4). |
| 13 | **Exercise Book** (3rd) | `label` | **`Grade NEO Exercise Book`** | "our Exercise Book brand name will be — Greade NEO Exercise Book" (p.4). Their spelling; read as "Grade". |
| 14 | **File & Folder** (6th) | `image` | a shot with no clipboard in it | "Remove this clipboard from this slider, cause it's not part of file & folder category" (p.4). |

The slide order is: All items, Pen, Exercise Book, School Stationery, Office Stationery,
File & Folder.

## 3 · Categories → `Content → Categories`

| # | Row | Field | Change to | Why |
| --- | --- | --- | --- | --- |
| 15 | **File & Folder** | `hide_subcategory_tabs` | **on** | "For this category only no need to item wise segregation. All items will be in one page" (p.11). Leave it off on the other four. |
| 16 | **Pen** → each of the 4 items | `image` | the four photographs from the drive | "In Pen page — replace all 4 products image from the drive we shared" (p.8). Items are Grade Classmate Pen, Grade Finepoint Pen, Grade Mentor Pen, Grade Glow Pen. **Blocked** — the drive link has not reached us. |

## 4 · Contact → `Content → Contact` (single record)

| # | Field | Now | Change to | Why |
| --- | --- | --- | --- | --- |
| 17 | `form_eyebrow` | `Enquiry form` | **`Query Zone`** | "Replace this with — Query Zone" (p.12). |
| 18 | `form_heading` | `Send us your requirement.` | **empty** | "Delete this" (p.12). |
| 19 | `form_sub` | `Include the item, the quantity and the date you need it by — that is enough for us to quote.` | **empty** | Same annotation — the red box covers the heading and this line together. |
| 20 | `visit_eyebrow` | `Visit or call` | **`Address`** | "Replace this with — Address" (p.13). |
| 21 | `map_embed_url` | empty | the **`https://www.google.com/maps/embed?pb=…`** URL | "Google map incorporation" (p.13). **Blocked** — needs the URL from the client's own Google listing; anything else guesses at their pin. |

To get item 21: open the office on Google Maps → **Share** → **Embed a map** → **Copy HTML**, then
paste only the `src="…"` value into the field. The page already renders a real `<iframe>` as soon as
the field has a value, and falls back to a labelled placeholder while it is empty — so nothing looks
broken in the meantime.

`faq_heading` is already `Frequently Asked Questions` and `show_faqs` is already off, which together
give the unclickable button the client asked for. Nothing to change.

---

## Checklist

```
Site
  [ ] 1  show_search              → on
  [ ] 2  logo_reversed_stationary → white PNG
  [ ] 3  footer_note              → empty
  [ ] 4  price_note               → empty
  [ ] 5  phone                    → +88 01842-024378

Home → Slides · eyebrow wording
  [ ] 6  All items                → Stationery
  [ ] 7  Pen                      → Pen
  [ ] 8  Exercise Book            → Exercise Book
  [ ] 9  School Stationery        → School Stationery
  [ ] 10 Office Stationery        → Office Stationery
  [ ] 11 File & Folder            → File & Folder

Home → Slides · images
  [ ] 12 Exercise Book · image    → new pack shot
  [ ] 13 Exercise Book · label    → Grade NEO Exercise Book
  [ ] 14 File & Folder · image    → no clipboard

Categories
  [ ] 15 File & Folder · hide_subcategory_tabs → on
  [ ] 16 Pen · 4 item images      → from the drive        (blocked)

Contact
  [ ] 17 form_eyebrow             → Query Zone
  [ ] 18 form_heading             → empty
  [ ] 19 form_sub                 → empty
  [ ] 20 visit_eyebrow            → Address
  [ ] 21 map_embed_url            → Google embed URL      (blocked)
```

Two of the twenty-one are blocked on the client. The other nineteen are about fifteen minutes of
work in the admin.

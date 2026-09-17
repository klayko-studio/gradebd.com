# Production release — 17 September 2026

What today's work needs in Directus, and nothing else. The older backlog from the 29 August
and 7 September rounds is still open and still lives in `production-content-changes.md`; the two
lists are independent and can be done in either order.

Today added **three new pieces of schema** — two fields on `site`, one new `all_products`
singleton, and a `seo_noindex` switch on every page's SEO group. Everything else was code.

**Most of it fills itself.** The only thing that genuinely needs a person is item 1 below.

---

## Run this first

Order matters. The middle step is the one people skip, and skipping it ships the new markup
against empty columns — which is how Home's social band went to production blank once before.

```bash
cd ~/repo/gradebd.com
git pull

npm run directus:bootstrap -- --schema-only   # creates the columns
npm run directus:bootstrap -- --fill-empty    # puts the seed values in them
docker compose up -d --build site
```

`--fill-empty` writes only where a field is currently empty, so it cannot overwrite anything a
moderator has edited. `--force` would, and is the wrong tool. Add `--dry-run` to the second
command first if you want to see what it will touch.

What that second command writes, for reference — this is what production will hold afterwards:

| Collection | Field | Value it will write |
| --- | --- | --- |
| `site` | `footer_cta_label` | `Talk to us` |
| `site` | `footer_cta_href` | `/contact/` |
| `all_products` | `seo_title` | `All Products — Grade Limited stationery` |
| `all_products` | `seo_description` | `The full Grade Limited catalogue: pens, exercise books, school and office stationery, files and folders, supplied across Bangladesh from Dhanmondi, Dhaka.` |
| `all_products` | `banner_eyebrow` | `All Products` |
| `all_products` | `banner_title` | `Every Range` |
| `all_products` | `banner_sub` | `Every Tool Every Dream` |
| `all_products` | `banner_lines` | `Every Range` / `Every Tool` / `Every Dream` |
| `all_products` | `banner_image` | `all-items.jpg`, uploaded if it is not already in the library |

---

## 1 · The one tick nobody else can do

| # | Where | Field | Now | Change to |
| --- | --- | --- | --- | --- |
| 1 | `Content → All Products` | `seo_noindex` | off | **on** |

**Why the backfill cannot do this.** The field is created with a default of `false`, and `false`
is a real stored value rather than an empty one — so the empty-only rule can never reach it. It is
the same rule that keeps the backfill away from `socials.confirmed`, and it is deliberate: a
switch that ships off should stay off unless a person decides otherwise.

**Why it matters.** `/products/` carries every range's cards and dialogs in one document — that is
what makes switching range instant — so it repeats all five category pages' catalogue in a single
page. Left indexable it competes with the focused category pages for exactly the queries those
pages are written for, and the category page is the better landing page every time. With the tick
it carries `noindex, follow`: search sends people to the focused pages, and the ranking
`/products/` receives still passes through to the pages it links to.

Leave `seo_noindex` **off** on every other page. It now exists on all of them, which is useful if
a page ever needs to be pulled out of search, but Home, About, Gallery, Contact and the five
category pages should all stay indexable.

```
  [ ] 1  all_products.seo_noindex → on
```

---

## 2 · Worth a look, but nothing is broken if you skip it

These are ours, not the client's, and the seed values are placeholders that happen to be
reasonable. Two of them are the sort of thing the client will have an opinion about.

| # | Where | Field | Seeded as | Worth asking |
| --- | --- | --- | --- | --- |
| 2 | `Content → Site` | `footer_cta_label` | `Talk to us` | The client asked for "a button with customizable label and link" and did not say what it should say. `Talk to us` is a guess. It appears on **Home only**, in the middle of the footer. |
| 3 | `Content → Site` | `footer_cta_href` | `/contact/` | The obvious destination, but it is theirs to choose. Any path or full URL works. |
| 4 | `Content → All Products` | `banner_image` | `all-items.jpg` | Their sketch says **"Thematic Pic"**. This is the same photograph the Home hero opens on, so the two pages currently lead with the same image. A picture of its own would be better. |
| 5 | `Content → All Products` | `banner_lines` | Every Range / Every Tool / Every Dream | Written to match the house pattern of three short lines. It echoes the Home hero's "Every Tool / Every Dream / Endless Potential" closely enough that it may read as a repeat. |

Clearing `footer_cta_label` **or** `footer_cta_href` removes the button entirely and leaves the
footer exactly as it was before today — that is deliberate, so an empty pair can never render a
button that goes nowhere.

```
  [ ] 2  site.footer_cta_label      → confirm wording with the client
  [ ] 3  site.footer_cta_href       → confirm destination
  [ ] 4  all_products.banner_image  → a picture of its own
  [ ] 5  all_products.banner_lines  → confirm the wording
```

---

## 3 · Check on the server, not in the admin

Not content, but it belongs to this release and it is invisible until someone shares a link.

**`SITE_URL` must be the real origin.** Canonical tags and `og:url` are built from it, and it is a
**build argument** — baked in when the image is built, not read at run time. If production's
`.env` still says `http://localhost:4321`, every canonical and every share preview on the live
site points at localhost.

```bash
grep SITE_URL .env        # expect SITE_URL=https://www.gradebd.com
```

If it is wrong, fix it and rebuild — changing it without rebuilding the site image does nothing.

---

## How to tell it worked

Five checks, about two minutes.

| | Expect |
| --- | --- |
| Footer on **Home** | A button in the middle of the top row, between the logo and the address. Glass over the red band, like the hero slider's buttons. |
| Footer on **About** | The four social icons in that same slot, **not** the button. |
| `/products/` | Loads. Category row, sub-category row beneath it, product grid. Changing category does **not** reload the page. |
| Menu → **Product Categories** | Goes to `/products/`, not to `/pen/`. Same for **See all** on Home. |
| View source on `/products/` | `<meta name="robots" content="noindex, follow">`. If it is missing, item 1 has not been ticked. |

And one that needs no login: `/sitemap.xml` should list **nine** URLs and `/products/` should not
be among them.

---

## What is not in this release

The 29 August and 7 September content backlog — 28 items in `production-content-changes.md`,
still all unticked. Today's work does not touch any of it and does not depend on it.

Nothing in today's round came from the client as a content change; the whole 8 September deck was
code, which is unusual for this client and worth noting.

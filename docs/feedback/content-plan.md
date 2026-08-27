# Content plan — from the client's three documents

Source (client-supplied, read-only): `docs/client/references/`
`Page Wise Text (18.8.26).docx` · `SKU Wise Details (13.8.2026).docx` · `Pen (23.8.26).docx`

These three files replace almost every piece of placeholder copy and product data in the build.
They also change the information architecture, so read the sub-brand section before touching code.

---

## 1. The headline finding: Grade has four product sub-brands

The SKU list is not a flat set of items. Every product is named
`Grade <sub-brand> <product> <variant>`, and the sub-brands map cleanly onto categories:

| Sub-brand | SKUs | Where it sits |
| --- | --- | --- |
| **Champ** | 11 | School Stationery — pencils, colour pencils, erasers, scale, pencil boxes, clipboards |
| **Neo** | 6 | School Stationery — 2B pencil, sharpener, clipboards, duster |
| **Xtreme** | 6 | Office Stationery — staplers, punch, pin remover, staples |
| **Dox** | 11 | File & Folder — report cover, clear/liner bags, L-folder, ring file, document carriers, clip/court file |
| *(pen line names)* | 4 | Pen — Classmate, Finepoint, Mentor, Glow |

**34 SKUs in the SKU document + 4 pens = 38 products.**

This confirms the owner's brand direction rather than contradicting it: the Champ geometry box and the
Neo highlighter carton he showed are *product sub-brands*, not one-off packaging. Champ reads
school/child, Neo reads older/utility, Xtreme is office hardware, Dox is filing. The site should let a
buyer browse by sub-brand, not only by category — that is the axis the client's own naming is built
on, and it is currently absent from both the design and the data model.

**Recommendation:** add `sub_brand` as a first-class field, and let the category-page filter row show
sub-brands wherever a category has more than one (School Stationery: Champ / Neo). Keep the
sub-category filters from the mega-menu as a second axis.

---

## 2. Every SKU has the same shape

```
name        Grade Champ Pencil HB
features    3–5 bullets, written as benefit statements
pack_size   inner pack + carton, e.g. "12 Pcs Paper Box" + "1728 Pcs Ctn."
```

Pack size arrives in two forms and both need a field: some SKUs give only a carton
(`240 Pcs Ctn.`, `500 Boxes Ctn.`), the school lines give an inner box *and* a carton.
Pens are all `2304 Pcs` with no inner pack.

This is exactly the content the **product detail pop-up (comment #4)** was built for — name,
description, multiple images. The features list becomes the description, and pack size becomes the
spec line. The pop-up currently holds invented copy; it should be driven by this data.

---

## 3. Page copy — thematic banner lines

The client writes banner copy as **three short lines**, not a headline plus paragraph. Every page gets
its own set. This replaces the eyebrow/title/sub currently on the page 10 banners.

| Page | Lines |
| --- | --- |
| Home — All Items | Every Tool / Every Dream / Endless Potential |
| Home slider — Pen | Write Every Idea / Shape Every Future / Empower Potential |
| Home slider — School Stationery | Learn, Create / Explore, Achieve / We're With You |
| Home slider — Office Stationery | Organize / Work Smarter / Achieve More |
| Home slider — File & Folder | Organize Better / Stay Focused / Go Further |
| Home slider — Exercise Book | Write Today / Learn Better / Achieve Tomorrow |
| Pen page | Clear Thoughts / Confident Writing / Endless Possibilities |
| School Stationery page | Learn, Create / Explore, Achieve |
| Office Stationery page | Organize Better / Work Smarter / Achieve More |
| File & Folder page | Organize Today / Stay Organized / Succeed Every Day |
| Exercise Book page | Write Today / Achieve Tomorrow |
| Gallery page | Real Moments / Real Inspiration / Real Potential |
| Contact page | Contact Us / We're here to help! |
| About page | Empowering learners with / the right tools to explore ideas, / build skills and achieve more every day |

Two things to note. The **Home slider and the category pages use different lines for the same
category** — deliberate in the document, and worth keeping, since a slide and a page banner are
different moments. And the About page lines are the same text already applied as the Home hero
headline from comment #25, so the hero currently carries the About page's copy. Worth one question;
my reading is that #25 was pinned to the Home hero and the client wants it in both places.

---

## 4. Two different About texts

- **Short version** (4 sentences, "Grade is a proudly Bangladesh brand…") — sits under
  *Our Corporate Clients* in the Home section of the document, so it belongs in Home's
  **Who We Are**, which still carries invented copy about cartons and middlemen.
- **Long version** (4 paragraphs) — the About page. Already applied on page 10 from comment #30.

Vision, Mission and Values match comments #27–#29 exactly, so those are confirmed. The contact email
is confirmed as `info@gradebd.com`, matching #23.

---

## 5. Gaps to raise with the client

1. **No Exercise Book SKUs at all.** The category exists in the nav, the wireframes, the mega-menu
   (Student Large, Standard Large) and has its own banner copy — but not one product. Comment #14
   ("deshi khata, nothing fancy, no spiral binding") implies the range exists. Ask for the sheet.
2. **Office Stationery is short.** The mega-menu lists Highlighter, Marker and Cutter Knife; the SKU
   document has none of them. Given the Neo highlighter carton is one of the two packs the owner
   showed as his brand vision, its absence is conspicuous.
3. **Pen has no sub-categories.** The mega-menu says "Ball Pen"; the four pens carry no type field.
4. **No images.** 38 products, no photography — the same blocker as comment #34's Drive folder.
5. **"Aristow Pharmaceutical Ltd"** in the client list is almost certainly Aristopharma Ltd — the
   logo pulled for that card is Aristopharma's. Confirm before it ships.
6. **Two spellings to settle:** "Stationary" (comment #22, for the logo) against "Stationery" (the
   trade word, used throughout these documents). The documents support "Stationery".
7. **`Pan Page`** in the copy document is a typo for Pen.

---

## 6. Work plan

> **Status: phases 1–4 are built** (2026-08-24), in code and mirrored on Figma page `10`.
> Phase 5 is deliberately untouched — those items need the client, not us.
>
> | Phase | State |
> | --- | --- |
> | 1 · data model | done — `sub_brand`, `features[]`, `pack_inner`, `pack_carton`, `banner_lines`, `sub_brands[]`, `images[]`; all 38 SKUs in the seed |
> | 2 · copy | done — three-line banners on every page, hero slides, Who We Are, Vision/Mission/Values, About story |
> | 3 · detail dialog | done — native `<dialog>`, features as the description, pack line, thumbnails when a second image exists |
> | 4 · sub-brand browsing | done — Range filter on School Stationery, both axes filter together, sub-brand band on Home |
> | 5 · the gaps | **not started, by instruction** — needs the client |
>
> Since then: the client supplied 18 packaging mockups (`docs/client/products/`), now optimised into
> `public/images/products/`. 18 of 38 SKUs have real photography; pens, all Dox filing and five Neo
> school items are still stand-ins. The five Values gained descriptions written from the client's own
> feature copy — **ours, not theirs, so worth their sign-off**.


**Phase 1 — data model (first; everything else depends on it)**
- Add `sub_brand`, `features: string[]`, `pack_inner`, `pack_carton` to the item schema in
  `src/lib/schema.ts`, and add `sub_brand` as a filter axis on the category schema.
- Transcribe all 38 SKUs into the local seed with features and pack sizes.
- Keep `subcategory` — the mega-menu axis — alongside the new `sub_brand`.

**Phase 2 — copy**
- Replace every banner's eyebrow/title/sub with the three-line treatment, on Figma page 10 and in
  `PageBanner.astro`. Three short lines need a different type ramp from a headline-plus-paragraph:
  large display, tight leading, no sub.
- Home's Who We Are takes the short About text; the six hero slides take their own lines.

**Phase 3 — product detail pop-up**
- Drive it from real data: name, features as the description, pack size as the spec line.
- It is wired to all 30 product cards in Figma; the code equivalent does not exist yet.

**Phase 4 — sub-brand browsing**
- Category pages: filter row shows sub-brands where a category has more than one.
- Consider a sub-brand strip on Home — Champ / Neo / Xtreme / Dox — which would give the
  packaging-led brand direction somewhere to live beyond colour.

**Phase 5 — the gaps**
- Chase Exercise Book SKUs, the missing Office lines, and product photography.

---

## 7. What this supersedes

Everything in the build that reads as invented trade copy: "Built for buyers who order by the carton,
not the piece", "supplied direct… so you don't pay the middleman", the pen and eraser item names on
the category pages, the pop-up's description, and the stats block. These documents are the source of
truth from here.

Note the voice: aspirational and learner-focused ("Every Tool, Every Dream"), not the
trade-supply voice the current copy uses. That is a tone change, not just a text swap.

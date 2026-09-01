# Client feedback, 29 August 2026 — triage

Source: `docs/client/feedback/Website (Feedback)29.8.2026.pdf` (14 annotated screenshots) plus
`WhatsApp Image 2026-08-30 at 9.10.36 PM.jpeg` (their proposed footer background).

Every item is sorted into one of three kinds, because they are done in different places by
different people:

- **Layout** — a code change. Done in this repo, shipped by a deploy.
- **Content** — a value in Directus. Nobody needs a developer; see
  `production-content-changes.md` for the exact field and the exact new value.
- **Blocked** — needs something from the client before anyone can act.

The split matters: a content item fixed in code would be overwritten by the CMS, and a layout item
"fixed" in the CMS cannot be, because there is no field for it.

---

## Layout — done

| # | Page | What they asked for | What changed |
| --- | --- | --- | --- |
| 1 | Home | "Need the sliders within the full screen, still need to scroll down to see the full image" | Real bug. The viewport height was on the copy block with the control row as a sibling below it, so the hero came to one viewport **plus** 76px. Measured 76px of overflow at 1440×800, 1366×640 and 390×780; now 0 at all three. |
| 2 | Home | Search, opening from the header icon | Full-screen dialog over a blurred backdrop, matching all 44 products by name, range, sub-brand, sub-category and pack size. Choosing one opens that product's own detail dialog on its range page. |
| 3 | Home | Remove `01 / 06 — ALL ITEMS` from all sliders | Gone. The dots stay — they are the control, and the only thing that says how many slides there are. |
| 4 | Home | Reduce the opacity, all sliders | The scrim over the photograph drops from 0.93 to 0.72 at its darkest edge, and to full transparency at the right. |
| 5 | Home | Increase the visibility of the two arrows | They had a hairline outline directly on the photograph. Now a solid ground of their own with a stronger border. |
| 6 | Home | Social band heading to the top of the section | Was vertically centred (their earlier instruction); now top-aligned. |
| 7 | Home | All social icons bigger | Home band 28px → **34px**. Footer 17px glyph in a 40px disc → **24px in 48px**. |
| 8 | Home | Menu bar hides on scroll down, returns on scroll up | Done by transform, not by changing the bar's box — the hero measures itself against `--header-h`. |
| 9 | Footer | "Add Phone: / Email:" | Both lines labelled. The label sits outside the link, because "Phone:" is not a phone number. |
| 10 | All pages | Replace the footer social icons with the reference treatment | White discs carrying each platform's real logo, exactly as drawn in the deck. |
| 11 | Product dialog | Remove the category eyebrow from all items in all categories | Gone. `categoryName` is still passed in, so it is a few lines to restore. |
| 12 | Product dialog | "Pack Size —", and carton quantity on its own line, not beside | Now `Pack Size — 12 Pcs Paper Box` with `1728 Pcs Ctn.` on the line below. |
| 13 | File & Folder | No item-wise segregation; all items on one page | A per-range switch in the CMS, not a slug in the template. See the note below. |
| 14 | Contact | Add a "Frequently Asked Questions" button, unclickable for now | Rendered as a real disabled button, so it says it cannot be used to a screen reader as plainly as it does by eye. |
| 15 | Footer | Use their supplied artwork as the footer texture | Their JPEG is stored as white-on-transparent, not as the picture, so the footer colour stays a token instead of being frozen into an image — and so it tiles. All four edges of the drawing are clear of ink, so a seam widens the gaps between marks instead of cutting one in half; verified at 1440, 1920 and 390 with no visible join. 7.8 KB. |

**Why the File & Folder switch is called `hide_subcategory_tabs` and not `show_…`.** The bootstrap's
`ensureField` is create-only, so a new column arrives `null` on every existing row — and `null` is
falsy. Written as `show_subcategory_tabs`, simply applying the schema would have switched the filter
row off for all five ranges at once. Phrased as "hide", the default is the current behaviour and
only the one range that opts in changes.

---

## Content — for production

Listed in full, with the exact field and value, in `production-content-changes.md`. In summary:

| # | Page | Item | Where |
| --- | --- | --- | --- |
| 16 | Home | Eyebrow wording — drop `Dhaka, Bangladesh` and the `Range 0N` prefix | `home_slides.eyebrow` |
| 17 | Home | Search icon missing, need to add | `site.show_search` |
| 18 | Home | Exercise Book slider image + brand name "Grade NEO Exercise Book" | `home_slides` |
| 19 | Home | Remove the clipboard from the File & Folder slider | `home_slides` |
| 20 | Footer | Logo needs to be full white | `site.logo_reversed_stationary` |
| 21 | Footer | Remove "Stationery · Dhanmondi, Dhaka" | `site.footer_note` |
| 22 | Footer | Phone shown with +88 | `site.phone` |
| 23 | Pen | Replace all four product images from the shared drive | `items.image` |
| 24 | Product dialog | Remove "price quoted on enquiry" | `site.price_note` |
| 25 | File & Folder | Turn the one-page setting on | `categories.hide_subcategory_tabs` |
| 26 | Contact | "Enquiry form" → "Query Zone" | `contact.form_eyebrow` |
| 27 | Contact | Delete "Send us your requirement." and its sub-line | `contact.form_heading`, `contact.form_sub` |
| 28 | Contact | "Visit or call" → "Address" | `contact.visit_eyebrow` |
| 29 | Contact | Google map incorporation | `contact.map_embed_url` |
---

## Blocked, or needs a decision

**Footer background** — *resolved.* Their design arrived as
`WhatsApp Image 2026-08-30 at 9.10.36 PM.jpeg` and is now what the footer uses; the marks this used
to generate are gone. See "Footer background" under **Layout — done** above.

For the record, since they asked for the section size: the band is full-bleed by **292px** tall on
desktop and **510px** below 1024px wide, with a separate 56px copyright bar beneath it. Their file
is 1520×348 — 292 of band plus a 56px bar — so they had drawn it straight onto a screenshot of the
real footer at desktop width, and the numbers already matched.

**Pen product photography** — "replace all 4 products image from the drive we shared." The drive
link has not reached this repo. Nothing can be done until the files arrive.

**Google Maps embed** — needs the `https://www.google.com/maps/embed?pb=…` URL from the client's
own listing. Anything else would be a guess at their pin.

**"Google Map Location" heading alignment** — measured on the current build, that heading and
"Head Office" sit on the same line, at y=1631 in both columns, each flush with its own column edge.
Nothing is out of alignment, so this may have been read from an older deploy. Worth re-checking
against the new one before anyone changes it.

**"Greade NEO Exercise Book"** — their spelling in the deck. Taken as "Grade". Note also that the
supplied logo artwork spells the word **Stationary** while every content document they have sent
spells it **Stationery**; that contradiction is still unresolved and is now baked into a logo file.

**The search button now searches.** It had nowhere to go, which is why it shipped switched off.
There is a real product search behind it — see item 2 above — so `show_search` now defaults to on
and the caveat is withdrawn.

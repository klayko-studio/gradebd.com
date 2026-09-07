# Client feedback, 7 September 2026 — triage

Source: `docs/client/feedback/Grade Stationary - Feedbacks & Issues.pdf` (3 pages, 10 items).

Sorted the same way as the 29 August round — **layout** is a code change shipped by a deploy,
**content** is a value in Directus, **blocked** needs something from the client first. See
`client-feedback-2026-08-29.md` for why that split matters.

Their screenshots confirm production is running the 31 August build: the footer carries the supplied
doodle artwork and the white lockup, and the map is embedded. So everything below is new.

---

## Layout — done

| # | Where | What they asked for | What changed |
| --- | --- | --- | --- |
| 1 | Home hero | "All images in the slider need to be fullscreen. 1st one is okay, rest of them are exceeding the viewport height" | Measured, not guessed: the frame is **2.02:1**, and the photographs are 1.38–2.0:1. `object-cover` was therefore throwing away **29–31% of the height** of every slide narrower than the frame, while the two that happen to be 2:1 lost 1%. That is exactly "the 1st one is okay". The photograph is now shown whole, with a blurred over-scaled copy of itself filling whatever is left either side — so nothing is cropped and the frame is still full. |
| 2 | Home hero | Reduce the opacity of "View the Range" | 70% white with a 3px backdrop blur, hovering to 88%. Not lower: the ink has to stay readable over whatever photograph is behind it, and 70% resolves to roughly 8:1 even against a black frame. |
| 3 | Home hero | Reduce the opacity of the arrows, make them larger | Ground from 55% to **22%**, box from 44 to **56px**, glyph from 18 to **24px**. |
| 4 | Home band | Social icons larger — "huge blank spaces" | 34 → **44px**. |
| 5 | Footer | Lockup + motto vertically centred | `justify-center` on the brand column; measured 45px of clearance above and below, so it is centred rather than approximately so. Applies to every page, as asked. |
| 7 | Product modal | Remove "price quoted on enquiry" | Removed from the dialog in code and from the CMS model, rather than left as a field to clear — they had asked twice, and a value that has to be cleared on every install comes back. |
| 6 | Product modal | Pack Size and Ctn styling, per their mock | Now `Pack Size  - 12 Pcs Paper Box` with `- 1728 Pcs Ctn.` beneath it, dashes aligned, in the display serif at 18px. |

### On the hero, one thing worth passing back

The fix makes any aspect ratio work, but a photograph that is **already about 2:1** covers the frame
exactly and never shows the blurred surround at all. If they are shooting or choosing new hero
images, **2400 × 1200** is the size to aim for. Anything squarer will now be shown whole rather than
cropped, which is what they asked for — but it will sit against its own blurred edges rather than
filling the screen edge to edge with real detail.

---

## Content — for production

Two of these are repeats: they were on the 29 August list and have not been done yet, which is why
the client is reporting them again. Both are one field each.

| # | Field | Now | Change to | Note |
| --- | --- | --- | --- | --- |
| 1 | `site.footer_note` | `Stationery · Dhanmondi, Dhaka` | **empty** | **Repeat** — item 3 on the August list. |
| 2 | ~~`site.price_note`~~ | — | — | **Done in code instead.** Asked for twice, so the dialog no longer renders it and the field is gone from the model. Nothing to change in the admin; an existing install keeps an unused column it can delete at leisure. |
| 3 | `contact.map_embed_url` | whatever is set now | **`https://www.google.com/maps?q=Grade+Limited+Dhanmondi+Dhaka&output=embed`** | Was blocked; **now solved**. See below. |
| 4 | School Stationery → sub-category `Geometry Box` | `Geometry Box` | **`Pencil Box`** | Production only — the seed in this repo already says Pencil Box, so their Directus has drifted. |
| 5 | School Stationery → the two box items | `Grade Champ Geometry Box – Big` / `– Medium` | **`… Pencil Box – Big` / `– Medium`** | Same drift. |

The seed is updated for 1 and 2 as well, so a fresh install never carries either line — but the seed
does not touch a running Directus, so production still needs the two fields cleared by hand.

### The map pin is solved, with a verified URL

They reported "Grade is not properly pinned in google map", and their screenshot shows why: the pin
sat on **Akram Manjil**, the building, while their own listing — *Grade Limited* — is a separate
entry a street away.

A `maps?q=<name>&output=embed` URL needs no API key and pins the **business**, not the address.
Loaded it in a browser inside an iframe to check before recommending it: it lands on Grade Limited
and opens their own listing card. That URL is now the seed default and is item 3 above for production.

**Worth asking them:** their Google listing gives the postcode as **Dhaka 1207**. Every document
they have sent, and the site, says **Dhaka 1205**. One of the two is wrong.

---

## Blocked

**The new logo has not arrived.** Item 5 on their page 1 says "Client has provided a new Grade
Stationary Logo with Motto. That needs to be converted to white". Nothing new is in
`docs/client/references/SVG/`, `docs/logos/` or `docs/client/brands/` — the only files there are the
ones from August. The *vertical centring* half of that item is done; the new artwork cannot be until
the file is sent. Preferably as a vector, and preferably one whose motto is part of the file rather
than set in type beside it.

**Pencil Box photography** — "Images are provided in google drive." The drive link still has not
reached this repo, same as the four Pen shots from the August round.

Note the retired name lives on in two image *filenames*
(`/images/products/champ-geometry-box.webp`, `neo-geometry-box.webp`) and nowhere a visitor can see
it. Renaming files would mean re-uploading and re-pointing every reference for no visible gain, so
they are left alone; the Gallery captions that did read "geometry box" are changed to "pencil box".

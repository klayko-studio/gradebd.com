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
| 1 | Home hero | "All images in the slider need to be fullscreen. 1st one is okay, rest of them are exceeding the viewport height" | **Reverted — back with the client.** See the section below. |
| 2 | Home hero | Reduce the opacity of "View the Range" | 70% white with a 3px backdrop blur, hovering to 88%. Not lower: the ink has to stay readable over whatever photograph is behind it, and 70% resolves to roughly 8:1 even against a black frame. |
| 3 | Home hero | Reduce the opacity of the arrows, make them larger | Ground from 55% to **22%**, box from 44 to **56px**, glyph from 18 to **24px**. |
| 4 | Home band | Social icons larger — "huge blank spaces" | 34 → **44px**. |
| 5 | Footer | Lockup + motto vertically centred | `justify-center` on the brand column; measured 45px of clearance above and below, so it is centred rather than approximately so. Applies to every page, as asked. |
| 6 | Product modal | Pack Size and Ctn styling, per their mock | Now `Pack Size  - 12 Pcs Paper Box` with `- 1728 Pcs Ctn.` beneath it, dashes aligned, in the display serif at 18px. |
| 7 | Product modal | Remove "price quoted on enquiry" | Removed from the dialog in code and from the CMS model, rather than left as a field to clear — they had asked twice, and a value that has to be cleared on every install comes back. |

### The hero images — reverted, and why

Measured, not guessed: the frame is **2.02:1** at 1440×800, and the slide photographs are
**1.38–1.43:1**. `object-cover` fills the frame by discarding **29–31% of each photograph's height**
— and the two slides that happen to be 2:1 lose 1%, which is exactly why "the 1st one is okay" and
the rest were not.

Showing each photograph whole fixed that, with a blurred copy of itself filling the leftover width.
It cropped nothing, but every slide then sat at a different width against a blurred surround, and
the client preferred the crop. So it is back to `object-cover`, edge to edge, cropping as before.

**The two cannot both be had with these images.** A 2:1 frame and a 1.4:1 photograph means either a
third of the picture is cut or the width is not filled. The fix is the source files:

> **2400 × 1200** covers this frame exactly — nothing cropped, no filler, full width.

They already have the shots; it is a re-crop, not a re-shoot.

### One thing to fix whichever way that goes

The headline's scrim was accidentally deleted in the revert and has been put back — earlier contrast
figures in this file were measured without it and were wrong. With it restored, white type against
the ground behind it, sampled across three slides:

| | average | lightest 5% |
| --- | --- | --- |
| eyebrow | 3.0–4.2:1 | 1.0–3.0:1 |
| headline | 2.9–3.1:1 | 1.0:1 |

AA wants 3:1 for large text and 4.5:1 for small. The headline is borderline on average and fails
outright wherever a pale part of the photograph runs behind it; the eyebrow is small text and misses
on two of the three slides. The scrim was lightened from 0.93 to 0.72 on the client's own "reduce
the opacity" note, so this is the cost of that.

Options, cheapest first: hold the scrim's left third at its old 0.93 and let it fall away faster, so
the photograph stays bright everywhere it is not carrying type; or keep it light and give the copy
block its own panel. Worth settling alongside the 2400×1200 crop question — a darker photograph on
the left of frame would fix both at once.

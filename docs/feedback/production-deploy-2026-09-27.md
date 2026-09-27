# Production release — 27 September 2026

What this round needs in Directus, and nothing else. The 29 August and 7 September content backlog
is still open and still lives in `production-content-changes.md`; the 17 September release note is
beside this one. All three lists are independent and can be done in any order.

This round added **two new pieces of schema**, both for video, and both empty until someone
uploads something. **Nothing here blocks the release and nothing needs a decision before it goes
live** — which is unusual, so it is worth saying plainly: if you only run the three commands
below, every page renders exactly as it does today.

---

## Run this first

Order matters. The middle step is the one people skip, and skipping it ships the new markup
against empty columns.

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

### What `--schema-only` creates

| Collection | Field | What it is |
| --- | --- | --- |
| `gallery_images` | `video` | One optional video per gallery plate. The plate's existing picture stays as its cover frame. |
| `items` | `videos` | A list of videos per product, ordered, beside the existing `images` list. |
| `items_videos` | — | The junction table behind `items.videos`. Hidden in the admin; you should never need to open it. |

`items_videos` is also added to the website token's read permissions. That matters more than it
sounds: without read access to a junction, Directus does **not** refuse the request — it answers
`200` and silently leaves the nested list out, so the videos would simply never appear and nothing
anywhere would say why. This is the same trap that once made the products look as though they had
lost their extra photographs.

### What `--fill-empty` writes

**Nothing new.** No footage has been supplied, so both new fields are left empty on purpose.

One existing value is worth knowing about — see item 1.

---

## 1 · One line of copy that is now visible for the first time

| # | Where | Field | Production currently holds | Worth changing to |
| --- | --- | --- | --- | --- |
| 1 | `Content → Site` | `response_promise` | `We reply to bulk enquiries within one working day.` | `We reply to every enquiry within one working day.` |

`response_promise` has been on the site record since the first build and **nothing has ever
rendered it**. It now appears under the Send button on the contact page, which means two things
at once:

- **The wording is suddenly public.** "bulk enquiries" is the trade-supply voice that was taken
  out of the rest of the copy in the second round of cuts; it survived here only because nobody
  could see it. The seed has been reworded, but the seed is not the live value.
- **`--fill-empty` will not change it,** and that is correct — the field already holds a value, so
  the empty-only rule leaves it alone. It has to be edited in Directus by hand.

It is also a promise the business is now making in public. If one working day is not right, this
is the field to change, and clearing it entirely removes the sentence and leaves just the phone
number.

```
  [ ] 1  site.response_promise → reword, or clear
```

---

## 2 · Two answers waiting on the client

Neither is a deployment step. Both are questions the client asked and which the build has answered
with something to look at rather than a paragraph — `client-feedback-2026-09-27.md` has the
reasoning and the alternatives.

| # | What | Where to look |
| --- | --- | --- |
| 2 | How to tell the two filter rows apart | `/products/` — pills on white over text on the tinted band, each row labelled |
| 3 | What to do with the Send Message section | `/contact/` — the form on a card, capped width, reply promise under the button |

Item 3 has three further options listed in the feedback note that were deliberately **not** built,
because each of them changes something the client decided earlier or costs real work. The one
worth putting to them is a **subject line** on the enquiry form — it is the single change most
likely to improve what actually arrives in the inbox.

```
  [ ] 2  show the client /products/ and ask if the two rows now read apart
  [ ] 3  show the client /contact/ and put the subject-line option to them
```

---

## How to tell it worked

Six checks, about three minutes. The first four need no uploads.

| | Expect |
| --- | --- |
| Any page, scrolled down | A dark round arrow bottom-right, above the green WhatsApp button, not overlapping it. Pressing it returns to the top. |
| Gallery → open any picture | A zoom control in the top bar: `−` `100%` `+`. The `−` starts dim. Pressing `+` twice reads `225%`. |
| The same picture, zoomed | "Drag to move around" appears over it, then fades. Dragging moves the picture and stops at its own edges. |
| `/products/` | One bordered panel: `RANGE` and pills on white, `TYPE` and text tabs on a tinted band beneath. Choosing **File & Folder** removes the tinted band entirely. |
| `Content → Gallery → any row` | A `Video` field under the picture. |
| `Content → All Products → any product` | A `Videos` field under `Images`. |

Then, once there is footage to try it with:

| | Expect |
| --- | --- |
| Upload a video to a gallery row | The plate keeps its photograph and gains a play mark. Pressing it opens the viewer and the video plays. |
| The same, on an iPhone | It plays, and the timeline can be dragged. If it does not play at all, the proxy is not passing `Range` through — that is the one part of this that fails silently and only on Safari. |
| Upload a video to a product | It appears **after** the photographs in the pop-up's thumbnail strip. Choosing it puts a play mark over the main frame. |

---

## What is not in this release

The 29 August and 7 September content backlog — 28 items in `production-content-changes.md`,
still all unticked — and the four open questions from the 17 September round, which are listed at
the end of that release's note. Nothing here touches or depends on either.

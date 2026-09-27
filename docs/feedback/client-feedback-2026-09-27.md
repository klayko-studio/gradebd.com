# Client feedback — 27 September 2026

Source: `Grade Stationary - Feedbacks & Issues.md`, five bullets across three headings, with two
annotated screenshots. Transcribed verbatim below with what was done against each.

Two of the five are questions rather than instructions — the client asks for *ideas*, not a
specific change. Those are answered with something built rather than a paragraph, on the grounds
that a mock they can look at is worth more than a description, and reverting one commit is cheap.

---

## Product Image Full Screen View

> * Scroll to zoom is working. Additionally add one click to **Zoom In** & one click to **Zoom Out**
> * After zooming, user should be able to move cursor to view different part of the image

**Done. The second point was a real bug, and the first attempt at it got the diagnosis wrong** —
worth recording, because the wrong diagnosis was reached by testing and the test was the problem.

Panning *was* implemented, and an automated drag of a zoomed picture moved it exactly as it
should. That was taken as proof the feature worked and the client had simply not discovered it.
It was not proof of anything: **synthetic pointer events do not start a native drag, and a real
mouse does.** An `<img>` is draggable by default, so pressing one and moving starts the browser's
own drag-and-drop — the ghost image — which fires `pointercancel`, and `pointercancel` is where
the viewer gives the gesture up. The pan therefore died on the first pixel of movement, in every
browser, for every mouse user. Which is exactly what the client described.

It is fixed with three guards, because the mechanisms differ between browsers: `draggable="false"`
on the image, `-webkit-user-drag: none` for WebKit, and a `dragstart` handler that calls
`preventDefault()` and does not depend on either of the other two being honoured.

The discoverability half was real too, and is also fixed:

- **A zoom control that you can see** — minus, the current percentage, plus — in the viewer's top
  bar. The percentage is itself a button and pressing it returns the picture to fit, which is the
  one thing a reader who has zoomed too far actually wants. Both buttons go dim at their limits
  (100% and 400%). The keyboard `+` / `-` / `0` shortcuts still work, and so do the wheel, the
  pinch and the double-tap.
- **A drag hint** — "Drag to move around" appears over the picture the first time it is big enough
  to drag, and takes itself off after a couple of seconds or the moment the reader starts
  dragging, whichever comes first. It is a teaching aid, not permanent furniture; on a phone it
  covers a third of the frame, which is a poor trade for a sentence nobody needs twice.

**The lesson worth keeping:** a browser automation drag is not a mouse drag. Anything that depends
on the pointer stream surviving — panning, drawing, drag-to-reorder — has to be tried by hand
before it is called working.

Double-click to zoom was added for the mouse at the same time. The double-*tap* gesture had always
been there but deliberately skipped a mouse, so a desktop reader had every way in except the one
every other image viewer gives them.

## Video Player

> * User should be able to upload videos alongside product images and in the Gallery.

**Done.** Both surfaces take video now, and nothing about either page changes until someone
uploads one — see the release note for the two Directus fields this adds.

- **Gallery** — each plate gains an optional `video`. The plate keeps its photograph as the cover
  and gains a play mark; pressing it opens the same full-screen viewer, which plays the file with
  the browser's own controls. The photograph doubles as the poster frame, so the viewer never
  opens on black.
- **Products** — each product gains a `videos` list, sitting after the photographs in the detail
  pop-up's existing thumbnail strip. Choosing one puts a play mark over the main frame; pressing
  that opens the viewer on it. Photographs come first on purpose: a reader opening a product wants
  to see the thing before they watch it.

Two things worth knowing about how this had to be built:

- **The image proxy now passes `Range` requests through.** Every file on the site is served
  through `/cms/<id>` rather than from Directus directly, and that proxy answered whole files
  only. A player cannot seek without range support, and Safari refuses to play a video *at all*
  when the response does not advertise it — so without this change video would have looked simply
  broken on every iPhone.
- **Nothing preloads.** A gallery plate shows its photograph, not a `<video>`; a product's video
  thumbnail shows the product's own pack shot. Twelve `<video>` elements fetching their metadata
  on first paint just to draw twelve first frames is a real cost for a page nobody has asked to
  watch yet.

## New See All Category Page

> * The marked 2 rows look the same. Client want ideas on how these two can be differentiated.

**Done.** They did look the same, and the screenshot makes the point: both rows were a line of
words with a coloured rule under the chosen one, separated only by two points of type size.
Nothing said which of them governed the other, so the page opened with ten loose words.

They are now told apart three ways at once:

| | Range row | Type row |
| --- | --- | --- |
| Shape | Pills you can see are pressable | Plain text with a rule under the active one |
| Ground | White | The tinted band beneath it |
| Label | The word `RANGE` | The word `TYPE` |

The two sit inside one bordered panel, so they read as one control with two levels rather than as
two unrelated rows. The tinted band hides itself along with its contents on File & Folder, which
has no sub-categories — an empty strip saying "Type" is worse than no strip.

**Colour is deliberately not one of the three.** The obvious design was to fill the chosen pill
with that range's own accent, and it is not usable: white text clears the 4.5:1 floor on the
purple and only just on the pink, but sits at about 2.4:1 on the cyan, the orange and the green —
three of the five. The accent is a CMS field, so a moderator can put any colour in it and no fixed
text colour is safe against all of them. The chosen pill is therefore the deep blue that is
already a known quantity on this site (white at 8.5:1), and each range's accent rides along as a
dot, which has no text on it to fail.

> * Need suggestions on what can be done with the Send Message section.

**One suggestion built; more listed below.** The section's problem was that it had no edges —
white fields on the near-white watercolour wash, with nothing to say where the form began or
ended, so it read as four boxes adrift rather than one thing to fill in. Three changes:

1. **The form sits on a card.** A surface, a hairline border and a soft shadow. This is most of
   the difference.
2. **It is capped at 980px instead of running the full 1200 rail.** A "Name" field 600px wide
   looks like a mistake, and a form the eye has to cross the screen to read is slower to fill in.
   The message box keeps the space it actually uses.
3. **A line under the Send button** carrying the reply promise and the phone number, for the
   readers who would rather not wait. This uses `site.response_promise`, which has been on the
   site record since the first build and which nothing has ever rendered.

The labels were left inside the fields. That is what the client drew, it was a deliberate decision
recorded at the time, and it is not what they are asking about here.

**Further options, not built — these want the client's opinion first:**

- **A subject line** — "What is this about?" as a short list (Product enquiry, Bulk order,
  Partnership, Other). It is the single change most likely to improve the *quality* of what
  arrives, and it gives the section a reason to exist beyond four empty boxes. It needs a column
  on the `enquiries` collection, so it is a small piece of real work rather than a style change.
- **Floating labels** — the label sits inside the field at rest, exactly as drawn, and shrinks to
  the top of the field once there is something typed in it. It keeps the client's layout and fixes
  the one genuine usability fault in it, which is that today the label disappears the moment
  anyone starts filling the field in.
- **A "what happens next" strip** — two or three short steps beside the form. Fills the space
  honestly and sets expectations. The risk is that the address and map are directly below, so
  anything resembling contact details here would just be a second copy.

> * When user scrolls down, show a "Scroll to Top" floating arrow for all pages.

**Done.** On every page, appearing after about three quarters of a screen of scrolling — any
earlier and it arrives while the hero is still on screen, where "back to top" means nothing.

It sits directly above the WhatsApp button rather than beside it. Both are bottom-right, and the
only page state in which neither is showing is the top of the page, so anything that put them at
the same height would have them overlap the moment a reader reached the footer — which is most of
the time the arrow is on screen.

Two details carried over from the WhatsApp button's own history: it is a sibling of the footer,
not a child, because the footer is `overflow-hidden` and a `fixed` element inside an ancestor like
that is at the mercy of how the browser resolves its containing block; and it is
`pointer-events: none` while faded out, because `opacity: 0` stops the paint but not the
hit-testing, and an invisible-but-live button in the corner is exactly the bug that made the
hero's next arrow unclickable once before.

Under `prefers-reduced-motion` it jumps rather than gliding, and it moves keyboard focus to the
top of the document — scrolling on its own does not, so a keyboard reader would otherwise be left
at the bottom of a page showing its top.

---

## Not asked for, done anyway

- **The two product pages shared eighty lines of duplicated script**, kept in step by hand, and
  the range page's copy had already drifted. They are one module now
  (`src/scripts/product-dialogs.ts`), which is also why the viewer only had to learn about video
  once rather than twice.
- **A real bug in the viewer's top bar**, found while adding the zoom controls: a `display: none`
  grid item is removed from the grid rather than leaving its cell empty, so with auto-placement
  the close button moved up into whatever gap the hidden controls left. On a video — where both
  the counter and the zoom group are hidden — it ended up in the middle of the bar. Each control
  names its own column now.

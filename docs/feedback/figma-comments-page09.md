# Figma comments — page `09 · Brand palette (owner vision)`

Read from the Figma comment panel on 2026-08-24 (filters: all pages, resolved shown).

**The file holds 35 threads, not 24.** The panel virtualises its list, so a first read only ever
rendered the newest rows and the earlier threads looked deleted. Corrected inventory: **#1–#9 and
#11–#38 exist; #10, #18 and #21 are genuinely gone.** Authors: **#1–#9 Ibrahim Sadik Tamim**
(3 days ago — these are where the five priority instructions came from), **#11–#38 Aurpan Dash**
(1–2 days ago, relaying the client).

Lesson for next time: scroll the panel with real wheel events and accumulate, or read
`GET /v1/files/:key/comments` with a `file_comments` token, which returns every thread at once
along with its `client_meta` anchor — the anchor is also the thing the Plugin API cannot see.

## Threads #1–#9 (Ibrahim's own build notes)

| # | Note | Status |
| --- | --- | --- |
| 1 | Banner will be viewport height | applied |
| 2 | There will be a bottom curve | applied |
| 3 | Backdrop — water colour splash | applied |
| 4 | Product details on a POP UP · reply: "Product Name, Desc, Multiple Image" | applied |
| 5 | Full Page Menu like the "full menu" image | applied |
| 6 | Backdrops will be more and more | applied |
| 7 | Products and Company will not be available | applied |
| 8 | Add WhatsApp icon here (pinned in the footer contact block) | applied |
| 9 | Social media won't be available on Home Page only | applied |

## Threads #11–#12 (missed on the first read)

- **#11** — "remove this button along with texts" — needs its pin.
- **#12** — "needs to be remove" — needs its pin.

All of them sit on page `09`, which confirms `09` as the live review surface.

Numbers are Figma's own thread numbers, so they can be quoted back in the file.

## Copy replacements (verbatim, from the client)

**#27 — Vision**
> To become Bangladesh's most loved stationery brand, empowering every learner to reach their potential.

**#28 — Mission**
> To create dependable, innovative stationery that inspires learning, fuels creativity and improves everyday performance.

**#29 — Values**
> Empowerment, Innovation, Reliability, Continuous Improvement, Customer First

**#25 — Hero / headline**
> Empowering learners with
> the right tools to explore ideas,
> build skills and achieve more every day

**#30 — About Us body**
> Grade is a stationery brand built with a simple belief: the right tools can help every learner discover and reach their potential.
>
> With more than a decade of experience in the stationery category, our core team brings deep category knowledge, market understanding and a strong commitment to quality. This experience shapes how we develop and select every Grade product—from everyday writing and school stationery to office essentials and file & folder solutions.
>
> We create dependable, innovative and purposeful stationery designed to support learning, creativity and everyday performance. Whether it is a student's first pencil, a notebook filled with ideas, or the tools that help organize important work, Grade aims to be there at every step.
>
> Our ambition is not simply to make stationery. We want to empower people to learn, create, perform and move closer to their potential.

**#22 — Logo lockup change**
> GRADE / Stationary / Tagline: Empowering Your Potential

**#23 — Email change**
> info@gradebd.com

## Structural / behavioural changes

- **#37 — FAQ:** questions hidden initially; only the button visible; all questions reveal on button click.
- **#38 — Map:** too small, should take full width. Reference given: `https://www.mgi.org/contact`
- **#33 — Gallery:** no pagination — every category/image shown on the one page.
- **#32 — Gallery:** image hover effect, slight pop-up.
- **#17 — Client Feedback section:** hide the whole section for now, may be needed later.
- **#16 — Corporate clients:** use 15 named pharmaceutical companies, logo with the name below it, and `<` `>` arrows for a slide effect on arrow click. Named: Renata, Square, Sk-f, SMC, Nuvista, Popular, Beximco, Health Care, Opsonin, Aristow, Incepta, Beacon, Jmi, Acme, Ibn Sina — all "Pharmaceutical Ltd" except Renata Ltd.
- **#20 — Add social media icons in this section.**
- **#31 — Social media icons here.**
- **#36 — Only "Grade"** (a wordmark/label trimmed to just the name).
- **#35 — remove all texts.**
- **#19 — remove the texts.**

## Imagery

- **#34 — Products:** upload the actual product images from the client's Drive folder
  `https://drive.google.com/drive/folders/1LcPKJl3FEF8ZE5QFX4sZ__p1aJDE9Xmg?usp=sharing`,
  plus some similar images from the web.
- **#24 — Hero slider:** first image a collection of all categories; images 2→6 one per category.
- **#15 —** more relevant images; preferred: combined images of several products from the same category.
- **#26 —** need a more relevant image.
- **#13 — Pen:** client wants cheap-pen photography — "kom daami kolomer pic", a 10-taka pen.
- **#14 — Exercise Book:** client wants local ("deshi") exercise books, nothing fancy, no spiral binding.

## Conflicts with decisions already recorded in CLAUDE.md

1. **#22 vs the supplied lockup.** The logo becomes "GRADE / Stationary" with the tagline
   *Empowering Your Potential*, replacing *For Every People*. Every existing lockup asset —
   including the generated reversed-white PNG — carries the old tagline, so new artwork is needed.
   Also note the client spelling is "Stationary"; the correct word for the trade is "Stationery".
   Worth one question before it goes into a logo.
2. **#23 vs the recovered address.** `sales@gradebd.com` came off the old site; the client now
   says `info@gradebd.com`. Use the client's.
3. **#16 vs the placeholder-client policy.** These are 15 real, trademark-holding pharmaceutical
   companies. Using their logos needs the client to confirm they have permission — the same
   condition already attached to the invented placeholder marks.
4. **#17 resolves the reviews problem.** The feedback section being hidden removes the risk of
   shipping invented testimonials.
5. **#30 says "more than a decade of experience"** while the recovered founding year is 2019
   (7 years). The copy attributes the decade to the team, not the company, so it is defensible —
   but the site should not also claim "founded 2019, a decade of experience" in adjacent copy.

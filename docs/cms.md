# The CMS

Every word and every picture on the site comes from Directus — copy, product
catalogue, gallery, client logos, the logo in the header, the favicon and the SEO
text. Moderators edit it by clicking the thing they want to change on the rendered
page.

Nothing has to be typed in by hand to get started: `npm run directus:bootstrap`
creates the whole data model and fills it with the site's current content and
images.

## Getting a Directus running

```sh
cp .env.example .env          # set the Directus secrets and passwords
docker compose up -d directus # Directus + Postgres
npm run directus:bootstrap
```

The bootstrap:

1. creates 20 collections, their fields and every relation between them,
2. uploads the referenced images from `public/images/` (58 files) into a folder
   per section, with the alt text from the seed as each file's description,
3. writes `src/content/*.json` in as content — 5 ranges, 44 products, 15 client
   logos, the gallery, the FAQs, all the page copy,
4. creates a read-only `Website` role and a static token for the site to use,
5. registers the site with the Visual Editor so the editing module opens it.

It prints a `DIRECTUS_TOKEN`. Put that in `.env` along with the URLs:

```
DIRECTUS_URL=http://localhost:8055           # local dev
DIRECTUS_INTERNAL_URL=http://directus:8055   # inside compose
DIRECTUS_PUBLIC_URL=http://localhost:8055    # what a browser calls the admin
DIRECTUS_TOKEN=…
```

Then `docker compose up -d --build site`, or `npm run dev`.

Re-running the bootstrap is safe. The schema step is "ensure, don't create", and
content is skipped once categories exist — `--force` seeds again on top.
`--schema-only` applies model changes without touching content, which is what to
run after editing `scripts/directus/model.mjs`.

### After a pull that adds fields

`--schema-only` creates the new columns but puts nothing in them, and the content
seeder refuses to run at all once content exists. An installation that has been
live for a while therefore ends up rendering the new markup against columns that
are null — which looks like a broken deploy rather than missing content. Home's
social band shipped to production with no heading and no artwork for exactly this
reason.

```bash
npm run directus:bootstrap -- --fill-empty --dry-run   # see what is missing
npm run directus:bootstrap -- --fill-empty             # fill it
```

It only writes where the current value is empty, so it can never overwrite
something a moderator has written, and it prints every field it fills and counts
the ones it leaves alone. `--force` is the wrong tool here: it re-seeds
everything and discards their edits.

`socials.confirmed` is the one deliberate exception. It decides whether a
platform's icon appears at all, and `false` is a real stored value rather than an
empty one, so the empty-only rule would never reach it and an older installation
would keep showing the original two icons forever. Which platforms appear is
configuration rather than authored copy, so the seed wins — and every change is
printed.

## How the site reads it

`src/lib/cms.ts` is still the only module that knows where content comes from,
and the Zod schemas in `src/lib/schema.ts` are still the contract. What changed
is that the Directus path is now the real one.

- **No Directus configured** → the seed JSON renders, exactly as before. The site
  builds and is reviewable with no backend at all.
- **Directus unreachable at request time** → the reader logs which collection
  failed and falls back to the seed. A CMS outage costs freshness, not the site.
- **Either way** the same schemas parse the result, so a component cannot tell
  the difference and an emptied required field is a clear error rather than
  `undefined` in the markup.

Three decisions worth knowing:

**Pages render per request.** `output: 'server'`. A prerendered build would only
show an edit after a rebuild and a redeploy, which is not "edit what you can
see". `DIRECTUS_CACHE_TTL` (seconds, default 0) exists for a busy box; leave it at
0 while content is being written, or moderators will save and see nothing change.

**Images are proxied through the site**, at `/cms/<file-id>`, not served from the
Directus host. So Directus needs no public read permission — the token stays
server-side — the admin host does not have to be reachable from a visitor's
browser, and the pictures share the site's certificate and cache. Directus'
transforms pass through: `/cms/<id>?width=800&format=webp`.

**Configuration is read at run time.** `process.env` first, `import.meta.env` as
the fallback. Vite inlines `import.meta.env` when the bundle is built, so an image
built once would otherwise carry the build box's settings forever. One image now
runs in dev, staging and production. The exception is `SITE_URL`, which Astro
bakes into canonical tags at build time and genuinely needs a rebuild to change.

## Editing on the page

Open **Visual Editor** in the Directus sidebar. The site loads inside the admin,
and anything editable is outlined; click it and the field opens.

It needs three things to be true, and all three are set up by the bootstrap and
the compose file:

| | where |
| --- | --- |
| The site knows the admin's origin | `DIRECTUS_PUBLIC_URL` |
| Directus is allowed to frame the site | `CONTENT_SECURITY_POLICY_DIRECTIVES__FRAME_SRC` |
| The site is allowed to be framed by the admin | `frame-ancestors` in `nginx/gradebd.conf` |

The middle one is the one that bites: Directus' `frame-src` falls back to
`default-src 'self'`, so without it the editor shows an empty panel and no error.

In code, `editable()` from `src/lib/cms.ts` emits the attribute the editor reads:

```astro
<h2 {...editable({ collection: 'about', fields: 'story_heading', mode: 'popover' })}>
```

It returns nothing at all unless both `DIRECTUS_URL` and `DIRECTUS_PUBLIC_URL` are
set, so a seed-only build carries no attributes pointing at nothing. Singletons
need no `item` — the reader remembers the row id. Catalogue rows pass one:
`item: category.directus_id`.

The editing library is loaded through a dynamic import behind an
`if (window.self !== window.top)` guard, so it is a separate chunk that only ever
downloads inside the admin's iframe. An ordinary visitor never fetches it.

`mode` picks the interaction: `popover` edits one short value in place, `drawer`
opens the full form. Repeated things — hero slides, FAQs, values, gallery images —
are edited as a list through a `drawer` on the parent field, because only one
slide is on screen at a time and per-row hit areas would sit on top of each other.

## The model

Twenty collections, declared once in `scripts/directus/model.mjs` and mirroring
`src/lib/schema.ts` so the two can be read side by side.

| | |
| --- | --- |
| Singletons | `site` `home` `about` `gallery` `contact` |
| Their lists | `socials` `home_slides` `home_stats` `home_pillars` `about_values` `gallery_images` `faqs` |
| Catalogue | `categories` → `subcategories` `sub_brands` `items` (+ `items_files` for extra views) |
| Social proof | `clients` `reviews` |
| Inbound | `enquiries` |

**Every string array is a textarea, one value per line.** Address lines, banner
lines, story paragraphs, product features. A chip input or a repeater producing
`[{value}]` are both worse to edit and worse to map, and someone writing three
lines of a banner wants to see three lines.

**Alt text lives on the file**, in Directus' `description`. One file is one
subject, so one description is the right number, and there is a single place to
fix it rather than a copy beside every field that points at the picture.

Changing the model means editing `model.mjs`, running
`npm run directus:bootstrap -- --schema-only`, and updating the mapping in
`cms.ts`. The Zod schema is what decides whether the two agree.

## Deploying it

The admin needs its own hostname for the Visual Editor to work over HTTPS —
`nginx/admin.gradebd.com.conf` is the config, and `docs/deploy-vps.md` has the
steps. If in-place editing is not needed, do not publish the admin at all: reach
it over `ssh -L 8055:127.0.0.1:8055 user@vps` and leave it on loopback.

## Still to settle

- The seed's client logos and reviews carry `placeholder: true`. They are in
  Directus now with that flag intact, and still need written permission from the
  named companies before go-live.
- `favicon` and `og_image` on the `site` singleton are empty. Uploading a square
  PNG and a 1200x630 image is a two-minute job in the admin and makes every
  shared link look deliberate.
- Enquiry email still needs a real SMTP provider in `.env`; without one Directus
  logs the mail instead of sending it.

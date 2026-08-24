# Grade Limited — website

Marketing and catalogue site for Grade Limited, a B2B stationery supplier in Dhanmondi, Dhaka.
Browsable catalogue, no e-commerce: every purchase intent funnels to the enquiry form.

Astro + Tailwind CSS v4 + GSAP, with Directus planned as the CMS behind the same data layer.

## Quick start

```sh
npm install
npm run dev            # http://localhost:4321
```

Content comes from the seed JSON in `src/content/`, so the whole site builds and is reviewable
without any backend running.

| script            | what it does                                     |
| ----------------- | ------------------------------------------------ |
| `npm run dev`     | dev server with HMR                              |
| `npm run build`   | type-check (`astro check`) then build            |
| `npm run build:fast` | build without the type-check                  |
| `npm run preview` | serve the built output                           |
| `npm run check`   | type-check only                                  |
| `npm run directus:bootstrap` | create the CMS model and seed it from `src/content` |

## Docker

```sh
cp .env.example .env   # then fill in the secrets it names
docker compose up -d --build
```

| service  | url                     |
| -------- | ----------------------- |
| site     | http://localhost:4321   |
| Directus | http://localhost:8055   |
| Postgres | internal only           |

The site container serves the prerendered pages plus the one dynamic route, `/api/enquiry`.
`docker compose up -d site` runs the site alone against the seed content.

`SITE_URL` is baked in at **build** time (canonical tags and the sitemap), so changing it needs a
rebuild, not just a restart.

Both published ports bind to `127.0.0.1`, so nothing is exposed beyond the box. In production nginx
is the only public listener.

## Deploying to a VPS

Docker runs the site on `127.0.0.1:4321`; **nginx on the host** terminates TLS and proxies to it.
nginx is not containerised — `nginx/gradebd.conf` is a plain site config to install on the box.

```sh
docker compose up -d --build

sudo cp nginx/gradebd.conf /etc/nginx/sites-available/gradebd.conf
sudo ln -s /etc/nginx/sites-available/gradebd.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d gradebd.com -d www.gradebd.com
```

certbot rewrites the installed copy in place, adding the 443 block and the redirect. Full runbook —
DNS, redeploys, backups, troubleshooting — in **[docs/deploy-vps.md](docs/deploy-vps.md)**.

## How content is wired

Everything on the site — copy, catalogue, images, logo, favicon, SEO — comes from **Directus**, and
moderators edit it by clicking it on the rendered page. Full picture in
**[docs/cms.md](docs/cms.md)**.

```sh
docker compose up -d directus
npm run directus:bootstrap     # creates the model, uploads the images, seeds the content
```

The bootstrap fills a fresh Directus with what the site already shows — 20 collections, 58 images,
5 ranges, 44 products — so nothing is retyped. It prints the read-only token to put in `.env`.

`src/lib/cms.ts` is still the only module that knows where content comes from. Unset `DIRECTUS_URL`
and it reads `src/content/*.json`; set it and the same functions fetch from Directus. Both paths
validate through the Zod schemas in `src/lib/schema.ts`, so components receive the same shape either
way — and if Directus is unreachable at request time the reader logs it and falls back to the seed
rather than serving an error.

Three things follow from in-place editing:

- **Pages render per request** (`output: 'server'`). A prerendered build would only show an edit
  after a rebuild and redeploy. `DIRECTUS_CACHE_TTL` exists for a busy box; 0 is the default.
- **Images are proxied through the site** at `/cms/<file-id>`, not served from the admin host. So
  Directus needs no public read access and the token stays server-side. Transforms pass through.
- **Config is read at run time**, `process.env` before `import.meta.env` — Vite would otherwise bake
  the build box's settings into the image. `SITE_URL` is the exception and needs a rebuild.

Inside Docker the two Directus URLs differ and both matter:

- `DIRECTUS_INTERNAL_URL` (`http://directus:8055`) — what the server fetches with.
- `DIRECTUS_PUBLIC_URL` (`https://admin.gradebd.com`) — the admin's own origin, used only by the
  in-page editor. Not an asset host.

## Enquiries

`POST /api/enquiry` validates with `enquirySchema`, stores the enquiry in Directus when configured,
and logs it otherwise so nothing submitted during review is lost. Email notification is sent by a
Directus Flow on the `enquiries` collection — set the `EMAIL_*` variables to a real SMTP provider
before go-live, or Directus only logs the mail.

Spam handling: a hidden honeypot field (checked before validation, so a bot gets a plain success
and learns nothing) plus a 5-per-10-minutes-per-IP limit. Behind a proxy, rate-limit upstream too.

## Before go-live

- **`gradebd.com` is serving injected spam** (gambling/adult content dated 2022–2026) from the old
  WordPress install. Do not migrate that install, and audit the domain and DNS before pointing
  anything at it.
- **Client logos and reviews are placeholders.** They carry `placeholder: true` in the seed data and
  must not ship without written permission from the named parties.
- **The logo file is a two-part lockup** — red wordmark, white tagline — so no single background
  shows all of it. The header clips to the wordmark; the navy footer uses the full lockup. Still
  needed from the client: a vector original, a wordmark-only variant, a light-background tagline
  variant, a reversed all-white variant, and confirmation of the ™ claim.
- The Google Map is a labelled placeholder until `map_embed_url` is set — no third-party request is
  made without it.

## Design

Figma: `https://www.figma.com/design/wO94lV6gN0lfKHQT9zAkrJ/Website` — `01 · Foundations`,
`02 · Wireframes (low-fi)`, `03 · Wireframe kit`. The semantic Figma variables are the contract for
`src/styles/tokens.css`; build against the semantic layer, never the raw ramps.

## Layout

```
src/
  components/   header, footer, hero slider, cards, buttons
  content/      seed JSON — the stand-in for Directus
  layouts/      Base.astro (SEO, fonts, chrome, scroll reveals)
  lib/          cms.ts (data layer) · schema.ts (Zod contracts)
  pages/        index · about · gallery · contact · [category] · 404 · sitemap.xml
                api/enquiry · cms/[id] (CMS image proxy)
  styles/       tokens.css (Figma contract) · global.css
scripts/        seed.mjs — regenerates the seed JSON
                directus-bootstrap.mjs + directus/ — creates and fills the CMS
docs/client/    client-supplied source material — read-only
```

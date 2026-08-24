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

`src/lib/cms.ts` is the only module that knows where content comes from. Unset `DIRECTUS_URL` and
it reads `src/content/*.json`; set it and the same functions fetch from Directus. Both paths
validate through the Zod schemas in `src/lib/schema.ts`, so components receive the same shape
either way and never change when the source does.

For the Visual Editor, `editable(collection, field, id)` returns the `data-directus` attribute that
maps a rendered region back to its field. It returns nothing while Directus is unconfigured.

Inside Docker the two Directus URLs differ and both matter:

- `DIRECTUS_INTERNAL_URL` (`http://directus:8055`) — what the server fetches with.
- `DIRECTUS_PUBLIC_URL` (`http://localhost:8055`) — what asset URLs in the HTML must use, since a
  browser cannot resolve a compose service name.

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
  pages/        index · about · gallery · contact · [category] · 404 · api/enquiry
  styles/       tokens.css (Figma contract) · global.css
scripts/        seed.mjs — regenerates the seed JSON
docs/client/    client-supplied source material — read-only
```

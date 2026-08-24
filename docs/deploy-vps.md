# Deploying to a VPS

Two moving parts, and they are deliberately separate:

- **Docker** runs the site (`Dockerfile` + `docker-compose.yml`), listening on `127.0.0.1:4321`.
- **nginx on the host** terminates TLS and proxies to it. Config: `nginx/gradebd.conf`.

Nothing about nginx runs in a container. If the VPS already has nginx and certbot set up, the whole
job is: bring the container up, drop one file into `sites-enabled`, reload.

## What listens where

| | port | reachable from |
| --- | --- | --- |
| nginx (host) | 80, 443 | the internet |
| site (Astro/Node, Docker) | 4321 | `127.0.0.1` only |
| Directus (Docker) | 8055 | `127.0.0.1` only — nginx on `admin.gradebd.com`, or an SSH tunnel |
| Postgres (Docker) | 5432 | the compose network only, never published |

## Before you start

- **Docker Engine + the Compose plugin**, and **2 GB RAM or more**. The image builds with
  `astro check && astro build`, which will OOM on a 1 GB box — add swap, or build elsewhere and pull.
- Ports 80 and 443 open: `sudo ufw allow 'Nginx Full'`.
- **`gradebd.com` is currently serving injected spam from the old WordPress install.** Audit the
  domain and its DNS before pointing anything at this box, and do not migrate that install.

## 1 · Configure

```bash
git clone <repo> gradebd && cd gradebd
cp .env.example .env
```

Edit `.env`. The one that matters most:

```
SITE_URL=https://www.gradebd.com
```

`SITE_URL` is **baked into the image at build time** — it becomes `<link rel="canonical">` and the
sitemap. Changing it needs a rebuild, not a restart. Leave it at the default and the deployed site
will advertise `http://localhost:4321` as its canonical host.

Generate the two Directus secrets, and set real passwords:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # DIRECTUS_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # DIRECTUS_SECRET
```

## 2 · Bring the container up

```bash
docker compose up -d --build
docker compose ps
curl -I http://127.0.0.1:4321/          # 200 before nginx is involved at all
```

The site alone, without Directus and Postgres, is `docker compose up -d --build site`: with
`DIRECTUS_INTERNAL_URL` empty it renders the seed JSON bundled into the image. Useful for a smoke
test before the CMS exists, and it is the same path the site falls back to if Directus goes down.

## 3 · Install the nginx config

```bash
sudo cp nginx/gradebd.conf /etc/nginx/sites-available/gradebd.conf
sudo ln -s /etc/nginx/sites-available/gradebd.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default     # or it wins the bare-IP requests
sudo nginx -t && sudo systemctl reload nginx
```

Point DNS at the box before the next step — certbot's http-01 challenge fails if Let's Encrypt cannot
reach it by name:

```
gradebd.com        A  <vps-ip>
www.gradebd.com    A  <vps-ip>
```

`dig +short www.gradebd.com` from somewhere else confirms it.

## 4 · TLS

```bash
sudo certbot --nginx -d gradebd.com -d www.gradebd.com
```

certbot **rewrites `/etc/nginx/sites-available/gradebd.conf` in place** — it adds the 443 server, the
certificate paths and an 80 → 443 redirect. From then on, that installed copy is ahead of the one in
this repo: edit it directly, or re-run certbot after replacing it.

Renewal is the system certbot timer, already on a stock Ubuntu install:

```bash
systemctl list-timers | grep certbot
sudo certbot renew --dry-run
```

Once HTTPS is confirmed, uncomment the `Strict-Transport-Security` line in the config and reload.
The header comment in `nginx/gradebd.conf` also carries an optional apex → www redirect (www is the
canonical host, because that is what `SITE_URL` bakes in) and the two lines that switch on edge rate
limiting for the enquiry form.

Check it:

```bash
curl -I http://www.gradebd.com/          # 301 to https
curl -I https://www.gradebd.com/         # 200
```

## Redeploying

```bash
git pull
docker compose up -d --build site
```

nginx is untouched and keeps serving; downtime is the container swap. Changed `SITE_URL`? Same
command — it is a build arg, so `--build` picks it up.

Changed `nginx/gradebd.conf` in the repo? Remember certbot's edits live only in the installed copy —
merge by hand rather than overwriting, then:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

## Directus, and the admin host

The site's content — copy, catalogue, images, logo, SEO — comes from Directus. `docs/cms.md` is the
full picture; this is the deployment half.

### Fill it with the site's current content

Once, on the first deploy:

```bash
docker compose up -d directus
npm run directus:bootstrap
```

That creates the collections, uploads the images and writes the existing content in, so nothing is
retyped. It prints a `DIRECTUS_TOKEN` — put it in `.env` along with:

```
DIRECTUS_INTERNAL_URL=http://directus:8055
DIRECTUS_PUBLIC_URL=https://admin.gradebd.com
DIRECTUS_TOKEN=…
```

Then `docker compose up -d site`. These are read at run time, so a restart is enough — no rebuild.

### The admin hostname

In-place editing loads the live site inside the admin, and a browser will not put an http frame in an
https page. So the Visual Editor needs the admin on its own hostname with a certificate:

```bash
sudo cp nginx/admin.gradebd.com.conf /etc/nginx/sites-available/admin.gradebd.com.conf
sudo ln -s /etc/nginx/sites-available/admin.gradebd.com.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d admin.gradebd.com
```

Point an `A` record for `admin.gradebd.com` at the box first. Log in with `DIRECTUS_ADMIN_EMAIL` /
`DIRECTUS_ADMIN_PASSWORD` and change the password immediately — this hostname is now public.

**If in-place editing is not wanted, do not publish the admin at all.** Skip the config above, leave
Directus on loopback, and reach it over a tunnel:

```bash
ssh -L 8055:127.0.0.1:8055 user@vps     # then http://localhost:8055
```

### Restricting it

The admin is a login page on the public internet. Two things worth doing: keep `admin.gradebd.com`
out of DNS until it is needed, and once the office IP is known, uncomment the `allow`/`deny` block at
the bottom of `nginx/admin.gradebd.com.conf`.

## Backups

Two Docker volumes hold everything that cannot be rebuilt from git:

| volume | contents |
| --- | --- |
| `gradebd_postgres-data` | Directus content and submitted enquiries |
| `gradebd_directus-uploads` | images uploaded by moderators |

Certificates live on the host in `/etc/letsencrypt`, outside Docker.

A database dump is more useful than a volume copy:

```bash
docker compose exec postgres pg_dump -U gradebd gradebd | gzip > gradebd-$(date +%F).sql.gz
```

Uploads:

```bash
docker run --rm -v gradebd_directus-uploads:/data -v "$PWD":/out alpine \
  tar czf /out/uploads-$(date +%F).tar.gz -C /data .
```

## Troubleshooting

**502 Bad Gateway.** The container is down or still starting: `docker compose ps`,
`docker compose logs site`, `curl -I http://127.0.0.1:4321/`. nginx proxies to a fixed loopback port,
so once the container is back it recovers without an nginx reload.

**The site answers on the IP but not the domain.** `/etc/nginx/sites-enabled/default` is still there
and is the `default_server`. Remove it and reload.

**429 on the contact form.** The app allows 5 submissions per 10 minutes per IP. That limiter is
in-memory, so it resets when the container restarts.

**Wrong canonical URL in the page source.** `SITE_URL` was not set when the image was built. Fix
`.env` and `docker compose up -d --build site`. It is the one setting that genuinely needs a rebuild;
everything else about the CMS is read at run time.

**The site shows old content and the logs say "fell back to the seed content".** Directus was
unreachable or rejected the read, and the site served the bundled copy rather than an error. The
message names the collection. Check `docker compose logs directus`, and that `DIRECTUS_TOKEN` matches
the token on the `Website` user.

**The Visual Editor panel is blank.** Directus is not allowed to frame the site. `SITE_URL` must be
set in `.env` — it becomes `CONTENT_SECURITY_POLICY_DIRECTIVES__FRAME_SRC` — and `frame-ancestors` in
`nginx/gradebd.conf` must name the admin host. Neither produces a visible error, just an empty panel.

**Images 404 after a content change.** The `/cms/<id>` proxy needs `DIRECTUS_TOKEN` to have read
access to `directus_files`. Re-running `npm run directus:bootstrap -- --schema-only` restores the
`Website` policy and refreshes the token.

**Requesting `/404` directly throws `FailedToFindPageMapSSR`.** Known `output: 'static'` +
SSR-adapter quirk. A genuinely unknown path returns the 404 page correctly, which is the case that
matters.

# Deploying to a VPS

Three containers and one host. Docker runs the site, Directus and Postgres, all
bound to `127.0.0.1`; **nginx on the host** terminates TLS and is the only thing
listening on the public internet. Nothing about nginx runs in a container.

Follow this top to bottom on a fresh box. About half an hour, most of it DNS.

## What you end up with

| | port | reachable from |
| --- | --- | --- |
| nginx (host) | 80, 443 | the internet |
| site (Astro/Node) | 4321 | `127.0.0.1` only |
| Directus | 8055 | `127.0.0.1` only |
| Postgres | 5432 | the compose network only, never published |

| hostname | serves |
| --- | --- |
| `www.gradebd.com` | the website |
| `gradebd.com` | redirects to www |
| `admin.gradebd.com` | Directus — **only if you want in-place editing** |

## Before you start

- **Docker Engine + the Compose plugin**, and **2 GB RAM or more**. The image builds with
  `astro check && astro build`, which will OOM on a 1 GB box — add swap, or build elsewhere and pull.
- Ports 80 and 443 open: `sudo ufw allow 'Nginx Full'`.
- DNS `A` records pointing at the box, in place **before** you ask for any certificate:

  ```
  gradebd.com        A  <vps-ip>
  www.gradebd.com    A  <vps-ip>
  admin.gradebd.com  A  <vps-ip>     # only if publishing the CMS
  ```

  Check from somewhere else: `dig +short www.gradebd.com`.
- **`gradebd.com` is currently serving injected spam** from the old WordPress install. Audit the
  domain and its DNS before pointing it here, and do not migrate that install.

---

## 1 · Clone and configure

```bash
git clone https://github.com/klayko-studio/gradebd.com.git gradebd
cd gradebd
cp .env.example .env
```

Edit `.env`:

```ini
SITE_URL=https://www.gradebd.com

DIRECTUS_INTERNAL_URL=http://directus:8055
DIRECTUS_PUBLIC_URL=https://admin.gradebd.com   # leave empty if not publishing the CMS
DIRECTUS_TOKEN=                                  # filled in at step 3

DIRECTUS_KEY=…             # node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
DIRECTUS_SECRET=…          # run it again — a different value
DIRECTUS_ADMIN_EMAIL=sales@gradebd.com
DIRECTUS_ADMIN_PASSWORD=…  # a real password; this is your CMS login
POSTGRES_PASSWORD=…
```

Two behave differently from the rest:

- **`SITE_URL` is baked in at build time.** It becomes `<link rel="canonical">` and the sitemap, and
  it is what Directus is told to allow inside an iframe. Changing it needs `--build`, not a restart.
- Every `DIRECTUS_*` value is read **at run time**, so those only need a restart.

## 2 · Start Directus

```bash
docker compose up -d directus     # brings Postgres up with it
docker compose logs -f directus   # wait for "Server started"
```

## 3 · Fill it with the site's content

```bash
npm ci
npm run directus:bootstrap
```

This is the step that saves the day. It creates all 20 collections and their relations, uploads the
58 images from `public/images/`, and writes the current content in — five ranges, 44 products,
fifteen client logos, the gallery, the FAQs, every line of page copy. Nobody retypes the catalogue,
and the first thing a moderator opens is their own site rather than an empty admin.

It prints a token. Put it in `.env`:

```ini
DIRECTUS_TOKEN=<the token it printed>
```

Re-running is safe: the schema step is ensure-don't-create and content is skipped once categories
exist. `--schema-only` re-applies model changes without touching content; `--force` re-seeds on top.

`npm run directus:bootstrap -- --help` lists every flag.

> **No Node 20.11+ on the box?** Run it from your laptop through a tunnel:
>
> ```bash
> ssh -L 8055:127.0.0.1:8055 user@vps
> npm run directus:bootstrap -- --url http://127.0.0.1:8055 --site https://www.gradebd.com
> ```
>
> It reads the admin credentials from your *local* `.env`; if the server's differ,
> pass `--email` and `--password`.

Two things that used to make this step fail, both fixed but worth knowing:

- It connects to `127.0.0.1`, **not** to `DIRECTUS_PUBLIC_URL`. That value names
  the admin hostname, which at this point has no DNS, no nginx and no
  certificate — pointing the bootstrap at it just times out.
- `localhost` resolves to IPv6 `::1` first on most systems, while Docker
  publishes the port on IPv4 `127.0.0.1` only, so `http://localhost:8055` can
  refuse the connection while `http://127.0.0.1:8055` answers instantly. It now
  tries both and says which one worked.

## 4 · Build and start the site

```bash
docker compose up -d --build
docker compose ps
curl -I http://127.0.0.1:4321/          # 200, before nginx is involved
```

Confirm it is really reading the CMS and not the bundled seed:

```bash
docker compose logs site | grep "fell back"                        # should print nothing
curl -s http://127.0.0.1:4321/ | grep -o '/cms/[0-9a-f-]\{36\}' | head -1
```

A `/cms/…` image URL means the content is coming from Directus.

## 5 · Put the website on nginx

```bash
sudo cp nginx/gradebd.conf /etc/nginx/sites-available/gradebd.conf
sudo ln -s /etc/nginx/sites-available/gradebd.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default     # or it wins the bare-IP requests
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d gradebd.com -d www.gradebd.com
```

certbot **rewrites the installed file in place**, adding the 443 server, the certificate paths and
the 80 → 443 redirect. From then on that copy is ahead of the repo: edit it directly, or re-run
certbot after replacing it.

```bash
curl -I http://www.gradebd.com/     # 301 to https
curl -I https://www.gradebd.com/    # 200
```

Once HTTPS is confirmed, uncomment the `Strict-Transport-Security` line and reload. The file's header
comment also carries the optional apex → www redirect and the two lines that switch on edge rate
limiting for the enquiry form.

Renewal is the system certbot timer, already on a stock Ubuntu install:

```bash
systemctl list-timers | grep certbot
sudo certbot renew --dry-run
```

## 6 · Put Directus on nginx — only for in-place editing

The Visual Editor loads the live site *inside* the admin, and a browser will not put an http frame in
an https page. That is the only reason the CMS needs a public hostname.

**If you do not need in-place editing, skip this step entirely.** Leave Directus on loopback, set
`DIRECTUS_PUBLIC_URL=` empty, and reach the admin over a tunnel:

```bash
ssh -L 8055:127.0.0.1:8055 user@vps     # then http://localhost:8055
```

Otherwise:

```bash
sudo cp nginx/admin.gradebd.com.conf /etc/nginx/sites-available/admin.gradebd.com.conf
sudo ln -s /etc/nginx/sites-available/admin.gradebd.com.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d admin.gradebd.com
```

Then make sure `.env` carries `DIRECTUS_PUBLIC_URL=https://admin.gradebd.com` and restart both —
Directus to pick up its own public URL, the site to learn where the editor lives:

```bash
docker compose up -d directus site
```

## 7 · Check the editor

Open `https://admin.gradebd.com`, log in with `DIRECTUS_ADMIN_EMAIL` / `DIRECTUS_ADMIN_PASSWORD`, and
**change the password immediately** — that login page is now public.

Open **Visual Editor** in the sidebar. The site renders inside the admin; click the pencil in the top
bar and editable regions outline. Clicking one opens its field. Save, and the frame reloads showing
the change — no rebuild, no redeploy.

If it does not work, it is one of three things, and two of them produce no error at all:

| symptom | cause |
| --- | --- |
| blank panel | `SITE_URL` wrong in `.env` — Directus' `frame-src` does not name the site |
| blank panel | `frame-ancestors` in `nginx/gradebd.conf` does not name `admin.gradebd.com` |
| site loads, nothing outlines | `DIRECTUS_PUBLIC_URL` empty — the site never loads the editing script |

To make more than one origin editable (staging beside production):
`DIRECTUS_FRAME_SRC="https://www.gradebd.com https://staging.gradebd.com"`.

## 8 · Lock the admin down

It is a login page on the public internet.

- Keep `admin.gradebd.com` out of DNS until it is needed.
- Once the office IP is known, uncomment the `allow`/`deny` block at the bottom of
  `nginx/admin.gradebd.com.conf`.
- Give each moderator their own Directus account. Do not share the admin login.

---

## Redeploying

```bash
git pull
docker compose up -d --build site
```

nginx keeps serving throughout; downtime is the container swap. Changed `SITE_URL`? Same command —
it is a build arg, so `--build` picks it up. Changed any other `DIRECTUS_*`? `docker compose up -d
site` is enough, no rebuild.

Changed the CMS model in `scripts/directus/model.mjs`?

```bash
npm run directus:bootstrap -- --schema-only
npm run directus:bootstrap -- --fill-empty
```

The first creates the new columns; the second puts the seed's values into the
ones nobody has filled in. Without it the new sections render empty here even
though they look right locally — `--schema-only` adds a column, it does not put
anything in it. `--fill-empty` never overwrites an existing value; run it with
`--dry-run` first to see the list.

Changed `nginx/*.conf` in the repo? certbot's edits live only in the installed copy, so merge by hand
rather than overwriting, then `sudo nginx -t && sudo systemctl reload nginx`.

## Backups

Two volumes hold everything that cannot be rebuilt from git. Certificates live on the host in
`/etc/letsencrypt`.

| volume | contents |
| --- | --- |
| `gradebd_postgres-data` | all CMS content and every submitted enquiry |
| `gradebd_directus-uploads` | images uploaded by moderators |

```bash
# the database — more useful than a volume copy
docker compose exec postgres pg_dump -U gradebd gradebd | gzip > gradebd-$(date +%F).sql.gz

# uploads
docker run --rm -v gradebd_directus-uploads:/data -v "$PWD":/out alpine \
  tar czf /out/uploads-$(date +%F).tar.gz -C /data .
```

Worth a nightly cron. Once moderators start editing, the content is their own work — a rebuild
cannot recreate it.

## Troubleshooting

**502 Bad Gateway.** The site container is down or still starting: `docker compose ps`,
`docker compose logs site`, `curl -I http://127.0.0.1:4321/`. nginx proxies to a fixed loopback port,
so it recovers on its own once the container is back — no reload needed.

**The site answers on the IP but not the domain.** `/etc/nginx/sites-enabled/default` is still there
and is the `default_server`. Remove it and reload.

**Old content, and the logs say "fell back to the seed content".** Directus was unreachable or
refused the read, so the site served its bundled copy rather than an error. The message names the
collection. Check `docker compose logs directus`, and that `DIRECTUS_TOKEN` matches the token on the
`Website` user.

**Images 404.** The `/cms/<id>` proxy needs the token to have read access to `directus_files`.
`npm run directus:bootstrap -- --schema-only` restores the `Website` policy and refreshes the token.

**Wrong canonical URL in the page source.** `SITE_URL` was not set when the image was built. Fix
`.env` and `docker compose up -d --build site`. It is the one setting that genuinely needs a rebuild.

**429 on the contact form.** The app allows 5 submissions per 10 minutes per IP. In-memory, so it
resets when the container restarts.

**Requesting `/404` directly throws `FailedToFindPageMapSSR`.** A known adapter quirk. A genuinely
unknown path returns the 404 page correctly, which is the case that matters.

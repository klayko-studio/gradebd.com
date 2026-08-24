# Deploying to a VPS

The site ships as three files' worth of infrastructure: `Dockerfile` (Astro built and served by the
Node adapter), `docker-compose.yml` (site + Directus + Postgres), and `docker-compose.prod.yml`
(nginx in front, terminating TLS). The nginx configuration lives in `nginx/`.

```
nginx/
  nginx.conf                    main config — logging, gzip, rate-limit zones, Docker resolver
  snippets/
    proxy.conf                  proxy headers, included by every proxying location
    security-headers.conf       nosniff, referrer policy, permissions policy
    tls.conf                    protocols, ciphers, session cache
  conf.d/
    site.conf                   ACTIVE  · HTTP only, plus the ACME challenge path
    site-tls.conf.disabled      the HTTPS pair — rename to .conf once you hold a certificate
    cms.conf.disabled           optional public Directus at cms.gradebd.com
```

Only files ending in `.conf` are loaded, so the `.disabled` suffix is the on/off switch.

## What listens where

| | port | reachable from |
| --- | --- | --- |
| nginx | 80, 443 | the internet |
| site (Astro/Node) | 4321 | `127.0.0.1` only — nginx reaches it over the compose network |
| Directus | 8055 | `127.0.0.1` only — SSH tunnel, or enable `cms.conf` |
| Postgres | 5432 | the compose network only, never published |

## Before you start

- A VPS with **Docker Engine and the Compose plugin**, and **2 GB RAM or more**. The image builds
  with `astro check && astro build`, which will OOM on a 1 GB box — either add swap, or build the
  image elsewhere and pull it.
- Ports 80 and 443 open. With ufw: `sudo ufw allow 80,443/tcp`.
- **`gradebd.com` is currently serving injected spam from the old WordPress install.** Audit the
  domain and its DNS records before pointing anything at this box, and do not migrate that install.

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
sitemap. Changing it needs a rebuild, not a restart. `docker-compose.prod.yml` refuses to start
without it for exactly that reason.

Generate the two Directus secrets, and set real passwords:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # DIRECTUS_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # DIRECTUS_SECRET
```

## 2 · Bring it up on HTTP

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

That is the full command every time, so it is worth an alias:

```bash
alias dc='docker compose -f docker-compose.yml -f docker-compose.prod.yml'
dc ps
dc logs -f nginx site
```

`site.conf` is `default_server`, so the site answers on the bare IP — you can check it before DNS
has propagated: `curl -I http://<vps-ip>/`.

## 3 · Point DNS, then get a certificate

Two `A` records (and `AAAA` if the VPS has IPv6):

```
gradebd.com        A  <vps-ip>
www.gradebd.com    A  <vps-ip>
```

Wait for them to resolve from the outside (`dig +short www.gradebd.com`) — certbot's http-01
challenge fails if Let's Encrypt cannot reach this box by name.

Dry-run first. The staging endpoint has no rate limit; the real one locks you out for a week after
five failures:

```bash
dc run --rm --entrypoint certbot certbot certonly \
  --webroot -w /var/www/certbot \
  -d gradebd.com -d www.gradebd.com \
  --email sales@gradebd.com --agree-tos --no-eff-email \
  --dry-run
```

Then for real, dropping `--dry-run`:

```bash
dc run --rm --entrypoint certbot certbot certonly \
  --webroot -w /var/www/certbot \
  -d gradebd.com -d www.gradebd.com \
  --email sales@gradebd.com --agree-tos --no-eff-email
```

Order matters: certbot names the certificate directory after the **first** `-d`, and
`site-tls.conf.disabled` reads `/etc/letsencrypt/live/gradebd.com/`. Lead with `www` and those four
paths need editing.

## 4 · Switch to HTTPS

```bash
mv nginx/conf.d/site.conf              nginx/conf.d/site.conf.disabled
mv nginx/conf.d/site-tls.conf.disabled nginx/conf.d/site-tls.conf

dc exec nginx nginx -t          # always test before reloading
dc exec nginx nginx -s reload   # graceful: in-flight requests finish
```

Check it:

```bash
curl -I http://www.gradebd.com/          # 301 to https
curl -I https://gradebd.com/             # 301 to https://www.gradebd.com
curl -I https://www.gradebd.com/         # 200, with Strict-Transport-Security
```

Renewal is automatic — the `certbot` sidecar tries twice a day and exits quietly unless something is
within 30 days of expiry, and nginx reloads every six hours so a renewed certificate is actually
served. To watch it: `dc logs certbot`.

## Redeploying

```bash
git pull
dc up -d --build site
```

Only the site container is rebuilt; nginx keeps serving throughout, and there is no downtime beyond
the container swap. Changed `SITE_URL`? Same command — it is a build arg, so `--build` picks it up.

Changed something in `nginx/`? No rebuild, the config is bind-mounted:

```bash
dc exec nginx nginx -t && dc exec nginx nginx -s reload
```

## Directus

The admin app is on `127.0.0.1:8055`, deliberately not public. Reach it over SSH:

```bash
ssh -L 8055:127.0.0.1:8055 user@vps     # then http://localhost:8055
```

Log in with `DIRECTUS_ADMIN_EMAIL` / `DIRECTUS_ADMIN_PASSWORD` and change the password immediately.

The site does not read from Directus yet — content comes from the seed JSON in `src/content` while
`DIRECTUS_INTERNAL_URL` is empty. To switch it over, set the three `DIRECTUS_*` variables in `.env`
as documented in `.env.example`, then rebuild the site.

To expose the CMS publicly instead of tunnelling — needed for the Visual Editor, which loads the site
in an iframe from the CMS origin — follow the header comment in `nginx/conf.d/cms.conf.disabled`. It
has to be on the certificate as a third `-d`, so re-run `certonly` with all three names.

## Backups

Three Docker volumes hold everything that cannot be rebuilt from git:

| volume | contents |
| --- | --- |
| `gradebd_postgres-data` | Directus content and submitted enquiries |
| `gradebd_directus-uploads` | images uploaded by moderators |
| `gradebd_letsencrypt` | certificates and the ACME account key |

A database dump is more useful than a volume copy:

```bash
dc exec postgres pg_dump -U gradebd gradebd | gzip > gradebd-$(date +%F).sql.gz
```

Uploads:

```bash
docker run --rm -v gradebd_directus-uploads:/data -v "$PWD":/out alpine \
  tar czf /out/uploads-$(date +%F).tar.gz -C /data .
```

## Troubleshooting

**502 Bad Gateway.** The site container is down or still starting: `dc ps`, `dc logs site`. nginx
resolves `site` through Docker's DNS on every request, so it recovers on its own once the container
is back — no nginx restart needed.

**429 on the contact form.** Working as intended. The edge allows 6 submissions per minute per IP
(burst 3), and the app allows 5 per 10 minutes on top of that. Adjust `zone=enquiry` in
`nginx/nginx.conf`.

**nginx will not start after a config edit.** `dc logs nginx` names the file and line. A missing
certificate is the usual cause — `site-tls.conf` cannot load before `certonly` has run.

**certbot fails with "Invalid response".** Let's Encrypt could not fetch the challenge file. Check
that DNS resolves to this box, that port 80 is open at the provider's firewall as well as in ufw, and
that `site.conf` (or the port-80 block of `site-tls.conf`) is the config nginx actually loaded.

**Requesting `/404` directly throws `FailedToFindPageMapSSR`.** Known `output: 'static'` +
SSR-adapter quirk. A genuinely unknown path returns the 404 page correctly, which is the case that
matters.

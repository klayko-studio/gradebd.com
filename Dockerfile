# syntax=docker/dockerfile:1

# ── deps ──────────────────────────────────────────────────────────────────────
# Separate stage so a source-only change doesn't reinstall node_modules.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── build ─────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Baked in at build time by Astro: the canonical host for <link rel=canonical>
# and the sitemap. Override with --build-arg SITE_URL=https://staging.example.com
ARG SITE_URL=https://www.gradebd.com
ENV SITE_URL=$SITE_URL
RUN npm run build

# ── runtime ───────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321

# Production dependencies only — the Node adapter's server needs a handful of
# runtime packages; dev tooling (astro check, tailwind, sharp) is not shipped.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

# Don't run the server as root.
USER node

EXPOSE 4321

# Node has no shell in this image path, so hit the app over HTTP directly.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4321)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "./dist/server/entry.mjs"]

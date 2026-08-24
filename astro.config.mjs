import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import netlify from '@astrojs/netlify';

/**
 * Every page renders per request, because content comes from Directus and
 * moderators edit it in place: with a prerendered build a save would only appear
 * after a full rebuild and redeploy, which is not "editing what you can see".
 *
 * The cost is a request to Directus per page. `src/lib/cms.ts` shares in-flight
 * requests and takes an optional TTL (`DIRECTUS_CACHE_TTL`) for a busy box; the
 * default is no cache, so an edit is visible on the next reload.
 *
 * The adapter has to match where the build runs:
 *
 *   Netlify  → SSR functions, static assets at dist/.
 *   Docker   → dist/client + dist/server, served by `node dist/server/entry.mjs`.
 *
 * Netlify sets NETLIFY=true during its build.
 */
const onNetlify = process.env.NETLIFY === 'true';

export default defineConfig({
  // Canonical host. Baked in at build time, so a staging build is made with
  // SITE_URL=… rather than shipping gradebd.com canonicals from a preview box.
  // Netlify exposes the deploy's own URL, which keeps previews self-consistent.
  site:
    process.env.SITE_URL ||
    (onNetlify ? process.env.URL || process.env.DEPLOY_PRIME_URL : undefined) ||
    'https://www.gradebd.com',
  output: 'server',
  adapter: onNetlify ? netlify() : node({ mode: 'standalone' }),
  // No @astrojs/sitemap: it only sees routes that exist at build time, and the
  // category pages come from the CMS now. src/pages/sitemap.xml.ts reads the
  // same source the pages do.
  vite: {
    plugins: [tailwindcss()],
  },
  image: {
    // Product photography is the heaviest thing on the site; let Astro emit
    // modern formats at the sizes the layout actually uses.
    responsiveStyles: true,
  },
});

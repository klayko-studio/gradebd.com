import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';
import netlify from '@astrojs/netlify';

/**
 * Pages prerender; only /api/enquiry opts out with `export const prerender = false`.
 * That single dynamic route is why an adapter is needed at all, and the adapter
 * has to match where the build runs:
 *
 *   Netlify  → static output at dist/, the endpoint as a Netlify Function.
 *   Docker   → dist/client + dist/server, served by `node dist/server/entry.mjs`.
 *
 * Netlify sets NETLIFY=true during its build. Getting this wrong is silent:
 * the Node adapter nests the pages under dist/client, Netlify publishes dist,
 * finds no index.html and serves its own 404 for every route.
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
  output: 'static',
  adapter: onNetlify ? netlify() : node({ mode: 'standalone' }),
  integrations: [sitemap()],
  vite: {
    plugins: [tailwindcss()],
  },
  image: {
    // Product photography is the heaviest thing on the site; let Astro emit
    // modern formats at the sizes the layout actually uses.
    responsiveStyles: true,
  },
});

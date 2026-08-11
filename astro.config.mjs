import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

// Static today. When Directus lands and the Visual Editor needs live preview,
// switch `output` to 'server' and add an adapter — the data layer in src/lib/cms.ts
// already works either way, so no component changes are required.
export default defineConfig({
  // Canonical host. Baked in at build time, so a staging image is built with
  // SITE_URL=… rather than shipping gradebd.com canonicals from a preview box.
  site: process.env.SITE_URL || 'https://www.gradebd.com',
  output: 'static',
  // Pages prerender; only /api/enquiry opts out via `export const prerender = false`.
  adapter: node({ mode: 'standalone' }),
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

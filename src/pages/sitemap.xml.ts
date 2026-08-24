import type { APIRoute } from 'astro';
import { getCategories } from '../lib/cms';

export const prerender = false;

/**
 * The sitemap is generated per request instead of at build time.
 *
 * `@astrojs/sitemap` only sees routes that exist when the build runs, and the
 * category pages now come from Directus — adding a sixth range in the CMS would
 * have produced a page nothing linked to. Reading the same source the pages read
 * means the two cannot drift.
 */
export const GET: APIRoute = async ({ site }) => {
  const origin = (site ?? new URL('https://www.gradebd.com')).origin;
  const categories = await getCategories();

  const paths = [
    { path: '/', priority: '1.0' },
    { path: '/about/', priority: '0.7' },
    ...categories.map((category) => ({ path: `/${category.slug}/`, priority: '0.8' })),
    { path: '/gallery/', priority: '0.6' },
    { path: '/contact/', priority: '0.7' },
  ];

  const urls = paths
    .map(
      ({ path, priority }) =>
        `  <url>\n    <loc>${origin}${path}</loc>\n    <priority>${priority}</priority>\n  </url>`,
    )
    .join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`,
    {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    },
  );
};

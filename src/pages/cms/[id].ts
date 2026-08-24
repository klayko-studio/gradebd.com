import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * Serves Directus files from the site's own origin.
 *
 * Every picture on the site comes through here rather than straight from
 * Directus, which buys three things: Directus needs no public read permission
 * (the token stays server-side), the admin host never has to be reachable from a
 * visitor's browser, and images share the site's certificate, cache and CDN
 * rather than needing their own.
 *
 * Directus' own image transforms are passed through, so `?width=800&format=webp`
 * works exactly as it does against `/assets`.
 */

/** Runtime, not build-time — see the note in src/lib/cms.ts. */
const DIRECTUS_URL = process.env.DIRECTUS_URL || (import.meta.env.DIRECTUS_URL as string | undefined);
const DIRECTUS_TOKEN =
  process.env.DIRECTUS_TOKEN || (import.meta.env.DIRECTUS_TOKEN as string | undefined);

/** Only Directus' documented transform keys are forwarded. */
const TRANSFORMS = new Set([
  'width',
  'height',
  'quality',
  'fit',
  'format',
  'withoutEnlargement',
  'key',
  'transforms',
]);

/** Directus file ids are uuids; anything else is a probe, not a request. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const GET: APIRoute = async ({ params, request }) => {
  if (!DIRECTUS_URL) {
    return new Response('No CMS configured.', { status: 404 });
  }

  const id = params.id ?? '';
  if (!UUID.test(id)) {
    return new Response('Not found.', { status: 404 });
  }

  const incoming = new URL(request.url).searchParams;
  const forwarded = new URLSearchParams();
  for (const [key, value] of incoming) {
    if (TRANSFORMS.has(key)) forwarded.set(key, value);
  }

  const target =
    `${DIRECTUS_URL.replace(/\/$/, '')}/assets/${id}` +
    (forwarded.size ? `?${forwarded.toString()}` : '');

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      headers: {
        ...(DIRECTUS_TOKEN ? { Authorization: `Bearer ${DIRECTUS_TOKEN}` } : {}),
        // Pass the validator through so an unchanged image costs a 304 both ways
        // rather than the full bytes twice.
        ...(request.headers.get('if-none-match')
          ? { 'If-None-Match': request.headers.get('if-none-match')! }
          : {}),
      },
    });
  } catch {
    return new Response('The image library is unavailable.', { status: 502 });
  }

  if (upstream.status === 304) {
    return new Response(null, { status: 304, headers: cacheHeaders(upstream) });
  }
  if (!upstream.ok) {
    return new Response('Not found.', { status: upstream.status === 403 ? 404 : upstream.status });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
      ...Object.fromEntries(cacheHeaders(upstream)),
    },
  });
};

/**
 * A day in the browser, a year at any shared cache, and `stale-while-revalidate`
 * so replacing a picture in Directus shows up without anyone waiting on it.
 * The id changes when the file does, so this is safe to cache hard.
 */
function cacheHeaders(upstream: Response): Headers {
  const headers = new Headers({
    'Cache-Control': 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=604800',
  });
  const etag = upstream.headers.get('etag');
  if (etag) headers.set('ETag', etag);
  const length = upstream.headers.get('content-length');
  if (length) headers.set('Content-Length', length);
  return headers;
}

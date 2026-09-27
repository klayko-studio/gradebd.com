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
 *
 * It also proxies video, which is why `Range` is forwarded and a 206 is passed
 * back untouched. Without that a browser cannot seek — and Safari refuses to
 * play a video at all when the response has no `Accept-Ranges`, so this is the
 * difference between video working and video appearing broken on every iPhone.
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

  const range = request.headers.get('range');

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
        // A player asks for one slice at a time; forwarding it is what makes
        // scrubbing a video cost a few hundred KB instead of the whole file.
        ...(range ? { Range: range } : {}),
      },
    });
  } catch {
    return new Response('The media library is unavailable.', { status: 502 });
  }

  if (upstream.status === 304) {
    return new Response(null, { status: 304, headers: cacheHeaders(upstream) });
  }
  if (!upstream.ok) {
    return new Response('Not found.', { status: upstream.status === 403 ? 404 : upstream.status });
  }

  /*
    A 206 is a success, not an error, and it must reach the browser as a 206 with
    its `Content-Range` intact — rewritten to 200 the player would take the slice
    for the whole file and the video would end after the first chunk.
  */
  const headers = new Headers({
    'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
    ...Object.fromEntries(cacheHeaders(upstream)),
  });
  const contentRange = upstream.headers.get('content-range');
  if (contentRange) headers.set('Content-Range', contentRange);
  // Advertised on every response, not only the partial ones: a player reads this
  // from the first request to decide whether the file is seekable at all.
  headers.set('Accept-Ranges', upstream.headers.get('accept-ranges') ?? 'bytes');
  /*
    These responses carry a long `s-maxage`, and a shared cache keyed on the URL
    alone could hand one reader's byte slice to the next reader as the whole
    file. Saying what the response varied on is the fix, and it is set only when
    a range was actually asked for — on the images, which is nearly every request
    through here, it would only fragment the cache for nothing.
  */
  if (range) headers.set('Vary', 'Range');

  return new Response(upstream.body, { status: upstream.status === 206 ? 206 : 200, headers });
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

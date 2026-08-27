import {
  aboutSchema,
  categorySchema,
  clientSchema,
  contactSchema,
  gallerySchema,
  homeSchema,
  reviewSchema,
  siteSchema,
  type About,
  type Category,
  type Client,
  type Contact,
  type Gallery,
  type Home,
  type Image,
  type Review,
  type Site,
} from './schema';

import siteSeed from '../content/site.json';
import homeSeed from '../content/home.json';
import aboutSeed from '../content/about.json';
import gallerySeed from '../content/gallery.json';
import contactSeed from '../content/contact.json';
import categoriesSeed from '../content/categories.json';
import clientsSeed from '../content/clients.json';
import reviewsSeed from '../content/reviews.json';

/**
 * The only module that knows where content comes from.
 *
 * With `DIRECTUS_URL` set, every page renders from Directus. Without it the same
 * functions read the seed JSON in `src/content/`, so the site still builds with
 * no backend at all — which is also the safety net: if Directus is unreachable
 * mid-request the reader falls back to seed rather than serving an error page.
 *
 * Both paths return values parsed by the same Zod schemas, so a component cannot
 * tell the difference and a moderator emptying a required field surfaces as a
 * clear message instead of `undefined` in the markup.
 */

/**
 * Runtime configuration, not build-time.
 *
 * Vite replaces `import.meta.env.X` with the value present when the bundle was
 * built, so a Docker image built once and run anywhere would carry whatever the
 * build box had — which, for the site image, is nothing: only SITE_URL is a build
 * arg. Reading `process.env` first means one image works in dev, staging and
 * production, configured by the compose file rather than by rebuilding.
 * `import.meta.env` stays as the fallback because `astro dev` loads .env into it
 * and not into `process.env`.
 *
 * An empty runtime value means *off*, not "fall back to whatever was baked in".
 * docker-compose passes `DIRECTUS_URL: ${DIRECTUS_INTERNAL_URL:-}`, so leaving
 * that blank hands the container an empty string rather than nothing at all. A
 * plain `||` would step over it and quietly use the build-time value — the site
 * would talk to whatever host the image happened to be built against, which is
 * the sort of thing that is only discovered much later and from a long way away.
 */
const env = (runtime: string | undefined, buildTime: unknown): string | undefined =>
  runtime !== undefined ? runtime || undefined : (buildTime as string | undefined) || undefined;

const DIRECTUS_URL = env(process.env.DIRECTUS_URL, import.meta.env.DIRECTUS_URL);
const DIRECTUS_TOKEN = env(process.env.DIRECTUS_TOKEN, import.meta.env.DIRECTUS_TOKEN);

/**
 * Where a *browser* reaches Directus — the admin origin. Only the Visual Editor
 * needs it: it is the origin allowed to frame this site and the one the editing
 * script talks to. Asset URLs deliberately do not use it (see `assetUrl`).
 */
export const DIRECTUS_PUBLIC_URL =
  env(process.env.DIRECTUS_PUBLIC_URL, import.meta.env.DIRECTUS_PUBLIC_URL) ?? '';

export const usingDirectus = Boolean(DIRECTUS_URL);

/** In-page editing needs both a source to read and an admin origin to trust. */
export const visualEditingEnabled = usingDirectus && Boolean(DIRECTUS_PUBLIC_URL);

/**
 * Optional seconds to hold a response. Zero — the default — is deliberate:
 * visual editing means a moderator saves and reloads immediately, and any cache
 * long enough to be useful is long enough to show them their own edit missing.
 * Set it on a busy production box, not while content is being written.
 */
const CACHE_TTL_MS =
  Number(process.env.DIRECTUS_CACHE_TTL ?? import.meta.env.DIRECTUS_CACHE_TTL ?? 0) * 1000;

/**
 * Say which source is in use, once, at start-up.
 *
 * Without this the seed path is completely silent, and a site rendering its
 * bundled copy is indistinguishable from one reading the CMS — same words, same
 * pictures, same everything. It looks deployed and finished, and the first sign
 * that the CMS was never connected is a moderator's edit not appearing. One line
 * in `docker compose logs site` answers it instead.
 */
if (usingDirectus && !DIRECTUS_TOKEN) {
  // Its own case because it is the one that looks like success. The site comes
  // up, every page renders, every picture is there — and none of it is from the
  // CMS, because each read is a 401 and falls back. Almost always: the bootstrap
  // was never run, or its token was never pasted into .env.
  console.warn(
    `[cms] DIRECTUS_URL is set (${DIRECTUS_URL}) but DIRECTUS_TOKEN is empty, so every ` +
      'read will be refused and the pages will fall back to the seed content bundled ' +
      'into this image. Run `npm run directus:bootstrap`, put the token it prints into ' +
      '.env, and restart.',
  );
} else if (usingDirectus) {
  console.info(
    `[cms] reading from Directus at ${DIRECTUS_URL}` +
      (visualEditingEnabled
        ? ` · in-place editing via ${DIRECTUS_PUBLIC_URL}`
        : ' · in-place editing OFF (DIRECTUS_PUBLIC_URL is not set)'),
  );
} else {
  console.warn(
    '[cms] DIRECTUS_URL is not set, so nothing is being read from the CMS — ' +
      'the pages you see are the seed content bundled into this image. ' +
      'Set DIRECTUS_URL (or DIRECTUS_INTERNAL_URL in compose) and DIRECTUS_TOKEN, then restart.',
  );
}

/* ------------------------------------------------------------------- assets */

/**
 * Images are served from the site's own origin, not from Directus.
 *
 * `/cms/<id>` proxies to the Directus asset endpoint using the server-side
 * token, which means Directus needs no public read permission, the admin host
 * never has to be reachable from a visitor's browser, and the pictures share the
 * site's cache and certificate. `params` are passed through to Directus' image
 * transforms (`width`, `height`, `quality`, `fit`, `format`).
 */
export function assetUrl(id: string | null, params?: Record<string, string | number>): string {
  if (!id) return '';
  // A seed image is already a path under public/; only a Directus uuid needs the proxy.
  if (id.startsWith('/') || id.startsWith('http')) return id;
  const query = params
    ? '?' + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()
    : '';
  return `/cms/${id}${query}`;
}

/* -------------------------------------------------------------------- fetch */

/**
 * The file columns the site needs, prefixed for a nested read.
 *
 * It has to be built per prefix: Directus' `fields` is a flat comma-separated
 * list, so `image.id,width,height` asks for `image.id` and then three columns of
 * the *parent* — which do not exist, and which Directus reports as a 403 rather
 * than a validation error. Every nested key must carry its own prefix.
 */
const file = (prefix: string): string =>
  ['id', 'width', 'height', 'description', 'title', 'modified_on', 'type']
    .map((key) => `${prefix}.${key}`)
    .join(',');

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${DIRECTUS_URL!.replace(/\/$/, '')}/${path}`, {
    headers: DIRECTUS_TOKEN ? { Authorization: `Bearer ${DIRECTUS_TOKEN}` } : {},
  });
  if (!res.ok) throw new Error(`Directus ${res.status} ${res.statusText} for /${path}`);
  const json = (await res.json()) as { data: T };
  return json.data;
}

/**
 * Two jobs. It shares one in-flight request between concurrent callers — the
 * layout and the page both ask for the site and the categories on every render —
 * and it holds the result for CACHE_TTL_MS when that is configured.
 */
const inFlight = new Map<string, Promise<unknown>>();
const cached = new Map<string, { value: unknown; until: number }>();

/**
 * The row id behind each singleton. Directus singletons still have one, and the
 * Visual Editor needs it to address a field — but it is noise in the content
 * shape, so the readers stash it here instead of putting it in the Zod schemas.
 */
const singletonIds = new Map<string, string | number>();

function once<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cached.get(key);
  if (hit && hit.until > Date.now()) return Promise.resolve(hit.value as T);

  const running = inFlight.get(key);
  if (running) return running as Promise<T>;

  const promise = load()
    .then((value) => {
      if (CACHE_TTL_MS > 0) cached.set(key, { value, until: Date.now() + CACHE_TTL_MS });
      return value;
    })
    .finally(() => inFlight.delete(key));

  inFlight.set(key, promise);
  return promise;
}

/**
 * Read from Directus, parse, and fall back to the seed if anything goes wrong.
 *
 * A CMS outage should cost freshness, not the website. The seed is a real, valid
 * copy of the content, so falling back to it renders a complete page — and the
 * warning names the collection so the cause is in the logs rather than guessed at.
 */
async function read<T>(
  key: string,
  schema: { parse(v: unknown): T },
  fromDirectus: () => Promise<unknown>,
  fromSeed: () => unknown,
): Promise<T> {
  return once(key, async () => {
    if (usingDirectus) {
      try {
        return schema.parse(await fromDirectus());
      } catch (error) {
        console.warn(`[cms] "${key}" fell back to the seed content: ${String(error)}`);
      }
    }
    try {
      return schema.parse(fromSeed());
    } catch (error) {
      throw new Error(`Seed content for "${key}" does not match its schema.\n${String(error)}`);
    }
  });
}

/* ------------------------------------------------------------------ mapping */

type DirectusFile = {
  id: string;
  width?: number | null;
  height?: number | null;
  description?: string | null;
  title?: string | null;
  modified_on?: string | null;
  type?: string | null;
} | null;

/**
 * A cache-busting token from the file's own modified time.
 *
 * Replacing an image in Directus keeps the same file id, so `/cms/<id>` stays
 * byte-identical as a URL — and that URL is cached for a day in the browser and
 * a year at any shared cache. Without this, a moderator replaces a photograph,
 * sees the new one in the admin (which busts its own cache) and the old one on
 * the site, with nothing to explain the difference. The proxy ignores `v`; it
 * exists purely to make the URL change when the bytes do.
 */
const version = (file: DirectusFile): Record<string, string> => {
  const stamp = file?.modified_on ? Date.parse(file.modified_on) : NaN;
  return Number.isNaN(stamp) ? {} : { v: stamp.toString(36) };
};

/**
 * Alt text lives on the file, in Directus' `description` — the field its own
 * image interface labels "description" and every CMS uses for alt. One file is
 * one subject, so one description is the right number.
 */
function img(file: DirectusFile, fallbackAlt = ''): Image {
  if (!file?.id) return { id: null, src: '', alt: fallbackAlt };
  return {
    id: file.id,
    src: assetUrl(file.id, version(file)),
    alt: file.description || file.title || fallbackAlt,
    ...(file.type ? { mime: file.type } : {}),
    ...(file.width ? { width: file.width } : {}),
    ...(file.height ? { height: file.height } : {}),
  };
}

/** Every string array in Directus is a textarea, one value per line. */
const toLines = (value: unknown): string[] =>
  typeof value === 'string'
    ? value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    : [];

const seo = (row: Record<string, unknown>, fallback: { title: string; description: string }) => ({
  title: (row.seo_title as string) || fallback.title,
  description: (row.seo_description as string) || fallback.description,
});

const banner = (row: Record<string, unknown>) => ({
  eyebrow: (row.banner_eyebrow as string) ?? '',
  title: (row.banner_title as string) ?? '',
  sub: (row.banner_sub as string) ?? '',
  lines: toLines(row.banner_lines),
  image: img(row.banner_image as DirectusFile, (row.banner_title as string) ?? ''),
});

/* ------------------------------------------------------------------ readers */

export const getSite = (): Promise<Site> =>
  read(
    'site',
    siteSchema,
    async () => {
      const row = await api<Record<string, any>>(
        'items/site?fields=*,' +
          [
            file('logo'),
            file('logo_reversed'),
            file('logo_reversed_stationary'),
            file('favicon'),
            file('og_image'),
            'socials.platform,socials.url,socials.confirmed,socials.sort',
          ].join(','),
      );
      singletonIds.set('site', row.id);
      /**
       * Directus returns null for a field a moderator has cleared, and the schema
       * wants strings. Without this, emptying one optional line — the opening
       * hours, say — failed the parse for the *whole* record, and the site quietly
       * served its bundled copy of everything: logo, address, socials, the lot.
       * One empty field should be one empty field.
       */
      const text = (value: unknown): string => (typeof value === 'string' ? value : '');
      return {
        ...row,
        tagline: text(row.tagline),
        phone: text(row.phone),
        phone_href: text(row.phone_href),
        email: text(row.email),
        opening_hours: text(row.opening_hours),
        utility_message: text(row.utility_message),
        response_promise: text(row.response_promise),
        address_lines: toLines(row.address),
        logo: img(row.logo, `${row.company_name} logo`),
        logo_reversed: img(row.logo_reversed, `${row.company_name} logo`),
        logo_reversed_stationary: img(row.logo_reversed_stationary, `${row.company_name} logo`),
        favicon: row.favicon ? img(row.favicon) : null,
        og_image: row.og_image ? img(row.og_image) : null,
        seo: seo(row, { title: row.company_name, description: row.tagline ?? '' }),
        socials: (row.socials ?? []).sort((a: any, b: any) => (a.sort ?? 0) - (b.sort ?? 0)),
      };
    },
    () => siteSeed,
  );

export const getHome = (): Promise<Home> =>
  read(
    'home',
    homeSchema,
    async () => {
      const row = await api<Record<string, any>>(
        'items/home?fields=*,slides.*,stats.*,pillars.*,' +
          [file('who_we_are_image'), file('slides.image')].join(','),
      );
      singletonIds.set('home', row.id);
      const bySort = (a: any, b: any) => (a.sort ?? 0) - (b.sort ?? 0);
      return {
        seo: seo(row, { title: 'Grade Limited', description: '' }),
        slides: (row.slides ?? []).sort(bySort).map((slide: any) => ({
          eyebrow: slide.eyebrow ?? '',
          headline: slide.headline ?? '',
          body: slide.body ?? '',
          image: img(slide.image, slide.label ?? ''),
          range_slug: slide.range_slug ?? null,
          label: slide.label ?? '',
          lines: toLines(slide.lines),
          // Off unless a moderator has explicitly switched it on, which is also
          // what a null from a pre-existing row should mean.
          show_cta: slide.show_cta ?? false,
        })),
        stats: (row.stats ?? []).sort(bySort).map((s: any) => ({ value: s.value, label: s.label })),
        who_we_are: {
          eyebrow: row.who_we_are_eyebrow ?? '',
          heading: row.who_we_are_heading ?? '',
          body: toLines(row.who_we_are_body),
          image: img(row.who_we_are_image, row.who_we_are_heading ?? ''),
          cta_label: row.who_we_are_cta_label ?? '',
        },
        categories_intro: {
          eyebrow: row.categories_intro_eyebrow ?? '',
          heading: row.categories_intro_heading ?? '',
        },
        pillars_intro: {
          eyebrow: row.pillars_intro_eyebrow ?? '',
          heading: row.pillars_intro_heading ?? '',
        },
        pillars: (row.pillars ?? []).sort(bySort).map((p: any) => ({ title: p.title, body: p.body })),
        clients_intro: {
          eyebrow: row.clients_intro_eyebrow ?? '',
          heading: row.clients_intro_heading ?? '',
        },
        reviews_intro: {
          eyebrow: row.reviews_intro_eyebrow || 'Client feedback',
          heading: row.reviews_intro_heading || 'What buyers say about ordering from Grade.',
        },
      };
    },
    () => homeSeed,
  );

export const getAbout = (): Promise<About> =>
  read(
    'about',
    aboutSchema,
    async () => {
      const row = await api<Record<string, any>>(
        `items/about?fields=*,values.*,${file('banner_image')}`,
      );
      singletonIds.set('about', row.id);
      return {
        seo: seo(row, { title: 'About Us', description: '' }),
        banner: banner(row),
        vision: {
          eyebrow: row.vision_eyebrow ?? '',
          heading: row.vision_heading ?? '',
          body: row.vision_body ?? '',
        },
        mission: {
          eyebrow: row.mission_eyebrow ?? '',
          heading: row.mission_heading ?? '',
          body: row.mission_body ?? '',
        },
        values_intro: {
          eyebrow: row.values_intro_eyebrow ?? '',
          heading: row.values_intro_heading ?? '',
        },
        values: (row.values ?? [])
          .sort((a: any, b: any) => (a.sort ?? 0) - (b.sort ?? 0))
          .map((v: any) => ({ title: v.title, body: v.body })),
        story: {
          eyebrow: row.story_eyebrow ?? '',
          heading: row.story_heading ?? '',
          body: toLines(row.story_body),
        },
      };
    },
    () => aboutSeed,
  );

export const getGallery = (): Promise<Gallery> =>
  read(
    'gallery',
    gallerySchema,
    async () => {
      const row = await api<Record<string, any>>(
        `items/gallery?fields=*,images.*,${file('banner_image')},${file('images.image')}`,
      );
      singletonIds.set('gallery', row.id);
      return {
        seo: seo(row, { title: 'Gallery', description: '' }),
        banner: banner(row),
        images: (row.images ?? [])
          .sort((a: any, b: any) => (a.sort ?? 0) - (b.sort ?? 0))
          .map((entry: any) => ({
            image: img(entry.image, entry.caption ?? ''),
            caption: entry.caption ?? '',
            tag: entry.tag ?? '',
          })),
      };
    },
    () => gallerySeed,
  );

export const getContact = (): Promise<Contact> =>
  read(
    'contact',
    contactSchema,
    async () => {
      const row = await api<Record<string, any>>(
        `items/contact?fields=*,faqs.*,${file('banner_image')}`,
      );
      singletonIds.set('contact', row.id);
      return {
        seo: seo(row, { title: 'Contact', description: '' }),
        banner: banner(row),
        form_heading: row.form_heading ?? '',
        form_sub: row.form_sub ?? '',
        map_embed_url: row.map_embed_url || null,
        show_faqs: row.show_faqs ?? true,
        faqs: (row.faqs ?? [])
          .sort((a: any, b: any) => (a.sort ?? 0) - (b.sort ?? 0))
          .map((f: any) => ({ question: f.question, answer: f.answer })),
      };
    },
    () => contactSeed,
  );

export const getClients = (): Promise<Client[]> =>
  read(
    'clients',
    { parse: (v: unknown) => (v as unknown[]).map((entry) => clientSchema.parse(entry)) },
    async () => {
      const rows = await api<any[]>(`items/clients?limit=-1&sort=sort&fields=*,${file('logo')}`);
      return rows.map((row) => ({
        name: row.name,
        qualifier: row.qualifier ?? '',
        mark: row.mark ?? 'ring',
        logo: row.logo ? assetUrl(row.logo.id, version(row.logo)) : null,
        placeholder: row.placeholder ?? true,
      }));
    },
    () => clientsSeed,
  );

export const getReviews = (): Promise<Review[]> =>
  read(
    'reviews',
    { parse: (v: unknown) => (v as unknown[]).map((entry) => reviewSchema.parse(entry)) },
    () => api<any[]>('items/reviews?limit=-1&sort=sort'),
    () => reviewsSeed,
  );

export const getCategories = (): Promise<Category[]> =>
  read(
    'categories',
    { parse: (v: unknown) => (v as unknown[]).map((entry) => categorySchema.parse(entry)) },
    async () => {
      const rows = await api<any[]>(
        'items/categories?limit=-1&sort=sort&fields=*' +
          ',subcategories.slug,subcategories.name,subcategories.sort' +
          ',sub_brands.slug,sub_brands.name,sub_brands.sort' +
          ',items.*,items.subcategory.slug,items.sub_brand.name,' +
          [file('image'), file('items.image'), file('items.images.directus_files_id')].join(','),
      );
      const bySort = (a: any, b: any) => (a.sort ?? 0) - (b.sort ?? 0);

      return rows.map((row, index) => ({
        slug: row.slug,
        directus_id: row.id,
        name: row.name,
        summary: row.summary ?? '',
        meta: row.meta ?? '',
        seo: seo(row, { title: row.name, description: row.summary ?? '' }),
        image: img(row.image, row.name),
        banner_lines: toLines(row.banner_lines),
        sub_brands: (row.sub_brands ?? [])
          .sort(bySort)
          .map((b: any) => ({ slug: b.slug, name: b.name })),
        subcategories: (row.subcategories ?? [])
          .sort(bySort)
          .map((s: any) => ({ slug: s.slug, name: s.name })),
        items: (row.items ?? []).sort(bySort).map((item: any) => ({
          id: item.sku ?? String(item.id),
          directus_id: item.id,
          name: item.name,
          meta: item.meta ?? '',
          subcategory: item.subcategory?.slug ?? null,
          sub_brand: item.sub_brand?.name ?? null,
          features: toLines(item.features),
          pack_inner: item.pack_inner || null,
          pack_carton: item.pack_carton || null,
          image: img(item.image, item.name),
          images: (item.images ?? [])
            .map((entry: any) => img(entry.directus_files_id, item.name))
            .filter((image: Image) => image.src),
        })),
        sort: row.sort ?? index,
        accent: row.accent || 'var(--bg-brand)',
      }));
    },
    () => categoriesSeed,
  );

export async function getCategory(slug: string): Promise<Category> {
  const found = (await getCategories()).find((c) => c.slug === slug);
  if (!found) throw new Error(`No category with slug "${slug}".`);
  return found;
}

/* ------------------------------------------------- Directus visual editing */

interface EditableTarget {
  collection: string;
  /** Omitted for singletons, which have exactly one row. */
  item?: string | number;
  /** The field, or fields, this element renders. */
  fields: string | string[];
  /** `drawer` opens the full form; `popover` edits in place; `modal` is the middle. */
  mode?: 'drawer' | 'modal' | 'popover';
}

/**
 * The attribute Directus' Visual Editor reads to map a rendered element back to
 * the field behind it, so a moderator can click the text on the page and edit it.
 *
 * Returns nothing unless both DIRECTUS_URL and DIRECTUS_PUBLIC_URL are set, which
 * keeps a seed-only build free of attributes that point at nothing.
 */
export function editable({ collection, item, fields, mode }: EditableTarget): Record<string, string> {
  if (!visualEditingEnabled) return {};
  // A singleton's row id is known from the read, so callers never pass one.
  const id = item ?? singletonIds.get(collection);
  if (id === undefined) return {};
  const parts = [`collection:${collection}`, `item:${id}`];
  parts.push(`fields:${Array.isArray(fields) ? fields.join(',') : fields}`);
  if (mode) parts.push(`mode:${mode}`);
  return { 'data-directus': parts.join(';') };
}

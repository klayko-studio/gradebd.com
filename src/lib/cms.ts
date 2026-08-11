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
 * Today it reads local seed JSON, so the whole site builds and is reviewable
 * without waiting on hosting. Set DIRECTUS_URL and the same functions fetch from
 * Directus instead — every component above this file is unchanged either way.
 *
 * Both paths validate through the same Zod schemas, so the shape a component
 * receives is guaranteed regardless of source.
 */

const DIRECTUS_URL = import.meta.env.DIRECTUS_URL as string | undefined;
const DIRECTUS_TOKEN = import.meta.env.DIRECTUS_TOKEN as string | undefined;

/**
 * Where a *browser* can reach Directus. Inside Docker the build talks to
 * `http://directus:8055` over the compose network, which no visitor can resolve —
 * asset URLs in the HTML must use the public origin instead. Falls back to
 * DIRECTUS_URL when the two are the same (a normal, non-containerised setup).
 */
const DIRECTUS_PUBLIC_URL =
  (import.meta.env.DIRECTUS_PUBLIC_URL as string | undefined) || DIRECTUS_URL;

export const usingDirectus = Boolean(DIRECTUS_URL);

/** Turn a Directus file id into a delivery URL the browser can fetch. */
export function assetUrl(id: string | null, params?: Record<string, string | number>): string {
  if (!id) return '';
  if (!DIRECTUS_PUBLIC_URL) return id; // seed files already carry a usable path
  const query = params
    ? '?' + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()
    : '';
  return `${DIRECTUS_PUBLIC_URL.replace(/\/$/, '')}/assets/${id}${query}`;
}

async function readDirectus<T>(path: string): Promise<T> {
  const res = await fetch(`${DIRECTUS_URL!.replace(/\/$/, '')}/${path}`, {
    headers: DIRECTUS_TOKEN ? { Authorization: `Bearer ${DIRECTUS_TOKEN}` } : {},
  });
  if (!res.ok) {
    throw new Error(`Directus ${res.status} ${res.statusText} for /${path}`);
  }
  const json = (await res.json()) as { data: T };
  return json.data;
}

/**
 * Read a singleton, from Directus when configured and from seed otherwise.
 * The schema parse is what makes the swap safe.
 */
async function singleton<T>(collection: string, seed: unknown, schema: { parse(v: unknown): T }): Promise<T> {
  const raw = usingDirectus ? await readDirectus<unknown>(`items/${collection}`) : seed;
  try {
    return schema.parse(raw);
  } catch (error) {
    throw new Error(
      `Content for "${collection}" does not match its schema.\n` +
        `Source: ${usingDirectus ? 'Directus' : 'local seed'}\n${String(error)}`,
    );
  }
}

async function list<T>(collection: string, seed: unknown, schema: { parse(v: unknown): T }): Promise<T[]> {
  const raw = usingDirectus
    ? await readDirectus<unknown[]>(`items/${collection}?limit=-1&sort=sort`)
    : seed;
  if (!Array.isArray(raw)) {
    throw new Error(`Expected an array for "${collection}", received ${typeof raw}.`);
  }
  return raw.map((entry, index) => {
    try {
      return schema.parse(entry);
    } catch (error) {
      throw new Error(`Entry ${index} of "${collection}" is invalid.\n${String(error)}`);
    }
  });
}

/* ------------------------------------------------------------------ readers */

export const getSite = (): Promise<Site> => singleton('site', siteSeed, siteSchema);
export const getHome = (): Promise<Home> => singleton('home', homeSeed, homeSchema);
export const getAbout = (): Promise<About> => singleton('about', aboutSeed, aboutSchema);
export const getGallery = (): Promise<Gallery> => singleton('gallery', gallerySeed, gallerySchema);
export const getContact = (): Promise<Contact> => singleton('contact', contactSeed, contactSchema);

export const getClients = (): Promise<Client[]> => list('clients', clientsSeed, clientSchema);
export const getReviews = (): Promise<Review[]> => list('reviews', reviewsSeed, reviewSchema);

export async function getCategories(): Promise<Category[]> {
  const categories = await list('categories', categoriesSeed, categorySchema);
  return categories.sort((a, b) => a.sort - b.sort);
}

export async function getCategory(slug: string): Promise<Category> {
  const found = (await getCategories()).find((c) => c.slug === slug);
  if (!found) throw new Error(`No category with slug "${slug}".`);
  return found;
}

/* ------------------------------------------------- Directus visual editing */

/**
 * Emit the attributes Directus' Visual Editor uses to map a rendered element
 * back to its field, so a moderator can click text on the page and edit it.
 *
 * Returns nothing when Directus is not configured, which keeps the static build
 * free of dead data attributes.
 */
export function editable(collection: string, field: string, itemId?: string | number) {
  if (!usingDirectus) return {};
  const key = itemId === undefined ? collection : `${collection}:${itemId}`;
  return { 'data-directus': `collection:${key};field:${field}` };
}

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Fills in the fields a live Directus has but has never been given a value for.
 *
 * Every round of changes that adds a field leaves an installation that already
 * holds content in an awkward spot. `--schema-only` creates the column — the
 * bootstrap's `ensureField` is create-only — but nothing puts anything in it,
 * and `seedContent` refuses to run at all once content exists. So the site goes
 * live with the new markup reading a column that is null, and the section
 * renders as an empty shape. That is exactly how Home's social band ended up on
 * production with no heading and no artwork.
 *
 * `--force` is not the answer: it re-seeds everything and would throw away every
 * edit a moderator has made. This only ever writes where the current value is
 * empty, so it cannot overwrite anyone's work, and it prints every field it
 * touches and every one it leaves alone.
 *
 * The one deliberate exception is `socials.confirmed` — see below.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
};

const readJson = async (name) =>
  JSON.parse(await readFile(path.join(ROOT, 'src/content', name), 'utf8'));

const lines = (value) => (Array.isArray(value) ? value.filter(Boolean).join('\n') : (value ?? ''));

/**
 * What counts as "never filled in". `false` and `0` are real answers somebody
 * may have chosen, so they are not empty; null, undefined and blank text are.
 */
const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
};

/** Uploads a file only if nothing with that name is in the library already. */
function createUploader(client) {
  const byName = new Map();
  let loaded = false;

  return async function fileId(src, alt) {
    if (!src) return null;
    if (!loaded) {
      const existing = await client.get('/files?limit=-1&fields=id,filename_download');
      for (const file of existing) byName.set(file.filename_download, file.id);
      loaded = true;
    }
    const name = path.basename(src);
    if (byName.has(name)) return byName.get(name);

    const absolute = path.join(ROOT, 'public', src.replace(/^\//, ''));
    let bytes;
    try {
      bytes = await readFile(absolute);
    } catch {
      console.warn(`   ! missing file, left empty: ${src}`);
      return null;
    }
    const ext = path.extname(absolute).toLowerCase();
    const file = await client.upload({
      bytes,
      filename: name,
      type: MIME[ext] ?? 'application/octet-stream',
      title: path.basename(absolute, ext),
      description: alt ?? '',
    });
    byName.set(name, file.id);
    console.log(`   + uploaded ${name}`);
    return file.id;
  };
}

export async function backfillContent(client, { dryRun = false } = {}) {
  console.log(`\nBackfill${dryRun ? ' (dry run — nothing will be written)' : ''}`);

  const [site, home, about, contact, notFound] = await Promise.all([
    readJson('site.json'),
    readJson('home.json'),
    readJson('about.json'),
    readJson('contact.json'),
    readJson('not-found.json'),
  ]);

  const upload = createUploader(client);
  let filled = 0;
  let kept = 0;

  /**
   * `wanted` is what the seed would have put there. Only the keys whose current
   * value is empty are sent, so a moderator's wording always wins.
   */
  const fill = async (collection, wanted) => {
    const keys = Object.keys(wanted);
    const current = await client.get(`/items/${collection}?fields=${keys.join(',')}`);
    const patch = {};
    for (const key of keys) {
      const value = wanted[key];
      if (isEmpty(value)) continue;
      if (!isEmpty(current?.[key])) {
        kept += 1;
        continue;
      }
      patch[key] = value;
    }
    const names = Object.keys(patch);
    if (names.length === 0) {
      console.log(`  ${collection}: nothing empty`);
      return;
    }
    if (!dryRun) await client.patch(`/items/${collection}`, patch);
    filled += names.length;
    console.log(`  ${collection}: ${names.join(', ')}`);
  };

  await fill('site', {
    company_name: site.company_name,
    tagline: site.tagline,
    address: lines(site.address_lines),
    phone: site.phone,
    phone_href: site.phone_href,
    email: site.email,
    footer_contact_heading: site.footer_contact_heading,
    footer_note: site.footer_note,
    footer_rights: site.footer_rights,
    price_note: site.price_note,
    doodle_image: await upload(site.doodle_image?.src, site.doodle_image?.alt),
    background_image: await upload(site.background_image?.src, site.background_image?.alt),
    footer_pattern: await upload(site.footer_pattern?.src, site.footer_pattern?.alt),
  });

  await fill('home', {
    who_we_are_eyebrow: home.who_we_are?.eyebrow,
    who_we_are_heading: home.who_we_are?.heading,
    who_we_are_body: home.who_we_are?.body,
    who_we_are_cta_label: home.who_we_are?.cta_label,
    categories_intro_eyebrow: home.categories_intro?.eyebrow,
    categories_intro_heading: home.categories_intro?.heading,
    clients_intro_eyebrow: home.clients_intro?.eyebrow,
    clients_intro_heading: home.clients_intro?.heading,
    categories_cta_label: home.categories_cta_label,
    brand_band_eyebrow: home.brand_band?.eyebrow,
    brand_band_heading: home.brand_band?.heading,
    brand_band_body: home.brand_band?.body,
  });

  await fill('about', {
    vision_heading: about.vision?.heading,
    vision_body: about.vision?.body,
    mission_heading: about.mission?.heading,
    mission_body: about.mission?.body,
    values_intro_heading: about.values_intro?.heading,
    story_heading: about.story?.heading,
  });

  await fill('contact', {
    form_eyebrow: contact.form_eyebrow,
    field_name_label: contact.field_name_label,
    field_email_label: contact.field_email_label,
    field_phone_label: contact.field_phone_label,
    field_message_label: contact.field_message_label,
    send_label: contact.send_label,
    visit_eyebrow: contact.visit_eyebrow,
    office_heading: contact.office_heading,
    map_heading: contact.map_heading,
    faq_heading: contact.faq_heading,
  });

  await fill('not_found', {
    seo_title: notFound.seo?.title,
    seo_description: notFound.seo?.description,
    eyebrow: notFound.eyebrow,
    heading: notFound.heading,
    body: notFound.body,
    cta_label: notFound.cta_label,
    phone_label: notFound.phone_label,
  });

  /**
   * Socials are the exception, and worth being explicit about.
   *
   * `confirmed` is what decides whether a platform appears at all, and `false` is
   * a real stored value rather than an empty one — so the rule above would never
   * touch it, and an installation seeded before the client asked for Instagram
   * and YouTube keeps showing two icons forever. Which platforms appear is site
   * configuration rather than authored copy, so the seed is taken as the answer
   * here. Every change is printed.
   */
  const rows = await client.get('/items/socials?limit=-1&fields=id,platform,url,confirmed,sort');
  const byPlatform = new Map(rows.map((row) => [row.platform, row]));

  for (const [index, wanted] of (site.socials ?? []).entries()) {
    const row = byPlatform.get(wanted.platform);
    if (!row) {
      if (!dryRun) await client.post('/items/socials', { ...wanted, sort: index });
      filled += 1;
      console.log(`  socials: + ${wanted.platform}`);
      continue;
    }
    const patch = {};
    if (row.confirmed !== wanted.confirmed) patch.confirmed = wanted.confirmed;
    if (row.sort !== index) patch.sort = index;
    if (isEmpty(row.url) && !isEmpty(wanted.url)) patch.url = wanted.url;
    if (Object.keys(patch).length === 0) continue;

    if (!dryRun) await client.patch(`/items/socials/${row.id}`, patch);
    filled += 1;
    const shown = patch.confirmed === undefined ? '' : patch.confirmed ? ' (now shown)' : ' (now hidden)';
    console.log(`  socials: ${row.platform} → ${Object.keys(patch).join(', ')}${shown}`);
  }

  console.log(
    `\n${dryRun ? 'Would fill' : 'Filled'} ${filled} field${filled === 1 ? '' : 's'}; ` +
      `left ${kept} alone because they already had a value.`,
  );

  // A placeholder URL is worse than no link: say so rather than let it ship quietly.
  const dead = rows.filter((row) => row.confirmed && (isEmpty(row.url) || row.url === '#'));
  const pending = (site.socials ?? []).filter((s) => s.confirmed && (isEmpty(s.url) || s.url === '#'));
  const names = [...new Set([...dead, ...pending].map((s) => s.platform))];
  if (names.length > 0) {
    console.log(`\n! ${names.join(' and ')} are set to show but have no real URL yet — they will`);
    console.log('  render as links that go nowhere until someone sets them in the admin.');
  }
}

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Pushes the site's existing content into a fresh Directus: every image in
 * `public/images/` becomes a file, every `src/content/*.json` becomes rows.
 *
 * The point is that nobody has to retype the catalogue. What the site shows
 * today is what Directus starts with, so the first thing a moderator sees is
 * their own site rather than an empty admin.
 */

// Not import.meta.dirname: that landed in Node 20.11, and this is evaluated
// the moment the module is imported — so on an older Node it throws before
// anything has a chance to explain why. fileURLToPath works everywhere.
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

/** `["a","b"]` → `"a\nb"`. The model stores every string array as lines of text. */
const lines = (value) => (Array.isArray(value) ? value.filter(Boolean).join('\n') : (value ?? ''));

/* ------------------------------------------------------------------- files */

/**
 * Uploads a file once per source path, however many records point at it — the
 * Champ geometry box is a range image and a product shot and a gallery plate,
 * and three copies in the library would be three things to replace later.
 */
function createUploader(client, folders) {
  const byPath = new Map();
  let uploaded = 0;
  let missing = 0;

  return {
    get stats() {
      return { uploaded, missing, unique: byPath.size };
    },

    /**
     * `alt` is stored on the file, not on the reference. One file is almost
     * always one subject, and a single place to fix a description beats the same
     * sentence copied beside every field that points at the picture.
     */
    async id(src, alt) {
      if (!src) return null;
      if (byPath.has(src)) return byPath.get(src);

      const relative = src.replace(/^\//, '');
      const absolute = path.join(ROOT, 'public', relative);
      let bytes;
      try {
        bytes = await readFile(absolute);
      } catch {
        console.warn(`   ! missing file, left empty: ${src}`);
        missing += 1;
        byPath.set(src, null);
        return null;
      }

      const ext = path.extname(absolute).toLowerCase();
      const top = relative.split('/')[1] ?? '';
      const file = await client.upload({
        bytes,
        filename: path.basename(absolute),
        type: MIME[ext] ?? 'application/octet-stream',
        // A readable title, so the file library is browsable: "champ-pencil-2b"
        // rather than a uuid.
        title: path.basename(absolute, ext),
        description: alt ?? '',
        folder: folders[top] ?? null,
      });

      byPath.set(src, file.id);
      uploaded += 1;
      if (uploaded % 10 === 0) console.log(`   … ${uploaded} files`);
      return file.id;
    },
  };
}

/** One folder per top-level image directory, so the library is not one flat list. */
async function ensureFolders(client) {
  const names = ['about', 'brand', 'clients', 'contact', 'gallery', 'hero', 'items', 'products', 'ranges'];
  const existing = await client.get('/folders?limit=-1&fields=id,name');
  const byName = new Map(existing.map((f) => [f.name, f.id]));

  const folders = {};
  for (const name of names) {
    if (byName.has(name)) {
      folders[name] = byName.get(name);
      continue;
    }
    const folder = await client.post('/folders', { name });
    folders[name] = folder.id;
  }
  return folders;
}

/* ---------------------------------------------------------------- seeding */

export async function seedContent(client, { force = false } = {}) {
  const already = await client.get('/items/categories?limit=1&fields=id');
  if (already?.length && !force) {
    console.log('\nContent — already seeded, skipping. Re-run with --force to add it again.');
    return;
  }

  console.log('\nFiles');
  const folders = await ensureFolders(client);
  const files = createUploader(client, folders);

  const [site, home, about, gallery, contact, categories, clients, reviews] = await Promise.all([
    readJson('site.json'),
    readJson('home.json'),
    readJson('about.json'),
    readJson('gallery.json'),
    readJson('contact.json'),
    readJson('categories.json'),
    readJson('clients.json'),
    readJson('reviews.json'),
  ]);

  /* ── site ─────────────────────────────────────────────────────────────── */
  console.log('\nContent');

  await client.patch('/items/site', {
    company_name: site.company_name,
    tagline: site.tagline,
    founded_year: site.founded_year,
    address: lines(site.address_lines),
    phone: site.phone,
    phone_href: site.phone_href,
    email: site.email,
    opening_hours: site.opening_hours,
    utility_message: site.utility_message,
    response_promise: site.response_promise,
    // The client's own vector exports. SVG so the mark is crisp at any size and
    // on any screen — the PNGs it replaces were fixed-width raster.
    logo: await files.id('/images/brand/grade-logo.svg', `${site.company_name} logo`),
    logo_reversed: await files.id(
      '/images/brand/grade-lockup-white.svg',
      `${site.company_name} lockup, reversed`,
    ),
    logo_reversed_stationary: await files.id(
      '/images/brand/grade-lockup.svg',
      `${site.company_name} Stationery lockup`,
    ),
    favicon: await files.id('/images/brand/favicon.svg', `${site.company_name}`),
    og_image: await files.id(home.slides?.[0]?.image?.src ?? null, home.slides?.[0]?.image?.alt),
    seo_title: home.seo.title,
    seo_description: home.seo.description,
    socials: site.socials.map((s, i) => ({ ...s, sort: i })),
  });
  console.log('   site');

  /* ── home ─────────────────────────────────────────────────────────────── */
  const slides = [];
  for (const [i, slide] of home.slides.entries()) {
    slides.push({
      label: slide.label,
      eyebrow: slide.eyebrow,
      headline: slide.headline,
      body: slide.body,
      lines: lines(slide.lines),
      range_slug: slide.range_slug,
      show_cta: slide.show_cta ?? false,
      image: await files.id(slide.image?.src, slide.image?.alt),
      sort: i,
    });
  }

  await client.patch('/items/home', {
    seo_title: home.seo.title,
    seo_description: home.seo.description,
    slides,
    stats: home.stats.map((s, i) => ({ ...s, sort: i })),
    who_we_are_eyebrow: home.who_we_are.eyebrow,
    who_we_are_heading: home.who_we_are.heading,
    who_we_are_body: lines(home.who_we_are.body),
    who_we_are_image: await files.id(home.who_we_are.image?.src, home.who_we_are.image?.alt),
    who_we_are_cta_label: home.who_we_are.cta_label,
    categories_intro_eyebrow: home.categories_intro.eyebrow,
    categories_intro_heading: home.categories_intro.heading,
    pillars_intro_eyebrow: home.pillars_intro.eyebrow,
    pillars_intro_heading: home.pillars_intro.heading,
    pillars: home.pillars.map((p, i) => ({ ...p, sort: i })),
    clients_intro_eyebrow: home.clients_intro.eyebrow,
    clients_intro_heading: home.clients_intro.heading,
    reviews_intro_eyebrow: home.reviews_intro?.eyebrow ?? '',
    reviews_intro_heading: home.reviews_intro?.heading ?? '',
  });
  console.log('   home');

  /* ── about · gallery · contact ────────────────────────────────────────── */
  const banner = async (b) => ({
    banner_eyebrow: b.eyebrow,
    banner_title: b.title,
    banner_sub: b.sub,
    banner_lines: lines(b.lines),
    banner_image: await files.id(b.image?.src, b.image?.alt),
  });

  await client.patch('/items/about', {
    seo_title: about.seo.title,
    seo_description: about.seo.description,
    ...(await banner(about.banner)),
    vision_eyebrow: about.vision.eyebrow,
    vision_heading: about.vision.heading,
    vision_body: about.vision.body,
    mission_eyebrow: about.mission.eyebrow,
    mission_heading: about.mission.heading,
    mission_body: about.mission.body,
    values_intro_eyebrow: about.values_intro.eyebrow,
    values_intro_heading: about.values_intro.heading,
    values: about.values.map((v, i) => ({ ...v, sort: i })),
    story_eyebrow: about.story.eyebrow,
    story_heading: about.story.heading,
    story_body: lines(about.story.body),
  });
  console.log('   about');

  const galleryImages = [];
  for (const [i, entry] of gallery.images.entries()) {
    galleryImages.push({
      image: await files.id(entry.image?.src, entry.image?.alt),
      caption: entry.caption,
      tag: entry.tag,
      sort: i,
    });
  }
  await client.patch('/items/gallery', {
    seo_title: gallery.seo.title,
    seo_description: gallery.seo.description,
    ...(await banner(gallery.banner)),
    images: galleryImages,
  });
  console.log('   gallery');

  await client.patch('/items/contact', {
    seo_title: contact.seo.title,
    seo_description: contact.seo.description,
    ...(await banner(contact.banner)),
    form_heading: contact.form_heading,
    form_sub: contact.form_sub ?? '',
    map_embed_url: contact.map_embed_url,
    show_faqs: contact.show_faqs ?? true,
    faqs: contact.faqs.map((f, i) => ({ ...f, sort: i })),
  });
  console.log('   contact');

  /* ── catalogue ────────────────────────────────────────────────────────── */
  // Two passes on purpose: an item points at a sub-category and a sub-brand by
  // id, and those ids only exist once the category has been written.
  for (const [index, category] of categories.entries()) {
    const created = await client.post('/items/categories', {
      name: category.name,
      slug: category.slug,
      summary: category.summary,
      meta: category.meta,
      banner_lines: lines(category.banner_lines),
      image: await files.id(category.image?.src, category.image?.alt),
      accent: category.accent,
      seo_title: category.seo.title,
      seo_description: category.seo.description,
      sort: category.sort ?? index,
      subcategories: (category.subcategories ?? []).map((s, i) => ({ ...s, sort: i })),
      sub_brands: (category.sub_brands ?? []).map((s, i) => ({ ...s, sort: i })),
    });

    const full = await client.get(
      `/items/categories/${created.id}?fields=id,subcategories.id,subcategories.slug,sub_brands.id,sub_brands.slug`,
    );
    const subBySlug = new Map((full.subcategories ?? []).map((s) => [s.slug, s.id]));
    const brandBySlug = new Map((full.sub_brands ?? []).map((s) => [s.slug, s.id]));

    for (const [i, item] of category.items.entries()) {
      const extra = [];
      for (const [j, image] of (item.images ?? []).entries()) {
        const id = await files.id(image?.src, image?.alt);
        if (id) extra.push({ directus_files_id: id, sort: j });
      }

      await client.post('/items/items', {
        category: created.id,
        name: item.name,
        sku: item.id,
        meta: item.meta,
        subcategory: subBySlug.get(item.subcategory) ?? null,
        // The seed stores the sub-brand as a display name ("Champ"); the model
        // stores it as a row, so match on the slug the category declares.
        sub_brand: brandBySlug.get(String(item.sub_brand ?? '').toLowerCase()) ?? null,
        features: lines(item.features),
        pack_inner: item.pack_inner,
        pack_carton: item.pack_carton,
        image: await files.id(item.image?.src, item.image?.alt),
        images: extra,
        sort: i,
      });
    }
    console.log(`   ${category.name} — ${category.items.length} items`);
  }

  /* ── social proof ─────────────────────────────────────────────────────── */
  const clientRows = [];
  for (const [i, entry] of clients.entries()) {
    clientRows.push({
      name: entry.name,
      qualifier: entry.qualifier,
      mark: entry.mark,
      logo: await files.id(entry.logo, `${entry.name} logo`),
      placeholder: entry.placeholder,
      sort: i,
    });
  }
  if (clientRows.length) await client.post('/items/clients', clientRows);
  console.log(`   clients — ${clientRows.length}`);

  if (reviews.length) {
    await client.post(
      '/items/reviews',
      reviews.map((r, i) => ({ ...r, sort: i })),
    );
  }
  console.log(`   reviews — ${reviews.length}`);

  const { uploaded, missing, unique } = files.stats;
  console.log(`\n   ${uploaded} files uploaded, ${unique} paths referenced, ${missing} missing.`);
}

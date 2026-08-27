/**
 * The Directus data model, declared once.
 *
 * This mirrors `src/lib/schema.ts` — the Zod contracts the site validates against —
 * so the two can be read side by side. Where they differ it is deliberate and
 * noted; `src/lib/cms.ts` holds the mapping.
 *
 * One convention worth knowing: **every string array is a textarea, one value per
 * line.** Address lines, banner lines, story paragraphs, product features. The
 * alternatives (a `tags` chip input, or a repeater producing `[{value}]`) are both
 * worse to edit and worse to map, and a moderator writing three lines of a banner
 * wants to see them as three lines.
 */

/* ------------------------------------------------------------------ helpers */

const field = (name, type, meta = {}, schema = {}) => ({
  field: name,
  type,
  meta: { width: 'full', ...meta },
  schema,
});

export const F = {
  pk: () =>
    field('id', 'integer', { hidden: true, interface: 'input', readonly: true }, {
      is_primary_key: true,
      has_auto_increment: true,
    }),

  string: (name, opts = {}) =>
    field(
      name,
      'string',
      { interface: 'input', required: opts.required ?? false, note: opts.note, width: opts.width ?? 'full', options: opts.options },
      { is_nullable: !opts.required, default_value: opts.default ?? null },
    ),

  text: (name, opts = {}) =>
    field(
      name,
      'text',
      { interface: 'input-multiline', required: opts.required ?? false, note: opts.note },
      { is_nullable: true },
    ),

  /** A string array, edited as one value per line. See the note at the top. */
  lines: (name, note) =>
    field(
      name,
      'text',
      { interface: 'input-multiline', note: note ?? 'One per line. Blank lines are ignored.' },
      { is_nullable: true },
    ),

  integer: (name, opts = {}) =>
    field(
      name,
      'integer',
      { interface: 'input', required: opts.required ?? false, note: opts.note, width: opts.width ?? 'half' },
      { is_nullable: !opts.required, default_value: opts.default ?? null },
    ),

  boolean: (name, opts = {}) =>
    field(
      name,
      'boolean',
      { interface: 'boolean', note: opts.note, width: 'half' },
      { is_nullable: false, default_value: opts.default ?? false },
    ),

  select: (name, choices, opts = {}) =>
    field(
      name,
      'string',
      {
        interface: 'select-dropdown',
        options: { choices: choices.map((c) => ({ text: c.text ?? c, value: c.value ?? c })) },
        required: opts.required ?? false,
        width: opts.width ?? 'half',
        note: opts.note,
      },
      { is_nullable: !opts.required, default_value: opts.default ?? null },
    ),

  /** Sort handle. Directus uses this for drag-to-reorder when meta.sort_field says so. */
  sort: () => field('sort', 'integer', { interface: 'input', hidden: true }, { is_nullable: true }),

  timestamp: (name, opts = {}) =>
    field(name, 'timestamp', { interface: 'datetime', readonly: opts.readonly ?? false, width: 'half' }, {
      is_nullable: true,
    }),

  /** A single file. The relation to directus_files is created separately. */
  file: (name, note) =>
    field(name, 'uuid', { interface: 'file-image', special: ['file'], note }, { is_nullable: true }),

  /** The parent side of a one-to-many. The child's m2o field carries the relation. */
  o2m: (name, note) =>
    field(name, 'alias', { interface: 'list-o2m', special: ['o2m'], note, options: { enableSelect: false } }),

  /** The child side. `to` is the parent collection. */
  m2o: (name, to, opts = {}) =>
    field(
      name,
      'integer',
      {
        interface: 'select-dropdown-m2o',
        options: { template: opts.template ?? '{{name}}' },
        required: opts.required ?? false,
        hidden: opts.hidden ?? false,
        width: opts.width ?? 'half',
        note: opts.note ?? `Linked to ${to}.`,
      },
      { is_nullable: true },
    ),

  /** Many files, ordered. Needs a junction collection — see `m2mFiles` below. */
  files: (name, note) =>
    field(name, 'alias', { interface: 'files', special: ['files'], note }),
};

/* ------------------------------------------------------- collection defaults */

const collection = (name, { icon, note, singleton = false, template, fields, sortable = true }) => ({
  name,
  singleton,
  fields,
  meta: {
    icon,
    note,
    singleton,
    display_template: template,
    sort_field: sortable && !singleton ? 'sort' : null,
    // Show every content collection in one place rather than scattered down the
    // sidebar; Directus groups by this.
    collection: name,
  },
});

const SEO = [
  F.string('seo_title', { note: 'Browser tab and search result title.' }),
  F.text('seo_description', { note: 'The search-result snippet. Around 155 characters.' }),
];

const BANNER = [
  F.string('banner_eyebrow'),
  F.string('banner_title', { note: 'Fallback headline, used only when no banner lines are set.' }),
  F.text('banner_sub', { note: 'Fallback sub-line. Also unused when banner lines are set.' }),
  F.lines('banner_lines', 'The two or three short lines of the banner. One per line.'),
  F.file('banner_image'),
];

/* -------------------------------------------------------------------- model */

export const COLLECTIONS = [
  /* ── site-wide ─────────────────────────────────────────────────────────── */
  collection('site', {
    icon: 'domain',
    singleton: true,
    note: 'Company details, logos and site-wide SEO defaults.',
    fields: [
      F.pk(),
      F.string('company_name', { required: true }),
      F.string('tagline'),
      F.integer('founded_year'),
      F.lines('address', 'The postal address, one line per line.'),
      F.string('phone', { width: 'half' }),
      F.string('phone_href', { width: 'half', note: 'The dialable form, e.g. tel:+8801842024378' }),
      F.string('email', { width: 'half' }),
      F.string('opening_hours', { width: 'half' }),
      F.string('utility_message'),
      F.string('response_promise'),
      F.file('logo', 'Header lockup — the red wordmark, for the light blue bar.'),
      F.file('logo_reversed', 'All-white lockup for dark grounds.'),
      F.file('logo_reversed_stationary', 'White lockup carrying STATIONARY — used in the footer.'),
      F.file('favicon', 'Browser tab icon. A square PNG of 180px or more.'),
      F.file('og_image', 'The picture shown when a page is shared. 1200x630 works everywhere.'),
      ...SEO,
      F.o2m('socials', 'Social profiles, in the order they appear.'),
    ],
  }),

  collection('socials', {
    icon: 'share',
    template: '{{platform}}',
    note: 'Social profiles shown in the footer.',
    fields: [
      F.pk(),
      F.m2o('site', 'site', { hidden: true }),
      F.select(
        'platform',
        ['facebook', 'instagram', 'youtube', 'x', 'linkedin'],
        { required: true, note: 'Decides which icon is drawn.' },
      ),
      F.string('url', { width: 'half' }),
      F.boolean('confirmed', {
        note: 'Off means the profile is not known to exist yet, and it is hidden from the site.',
      }),
      F.sort(),
    ],
  }),

  /* ── home ──────────────────────────────────────────────────────────────── */
  collection('home', {
    icon: 'home',
    singleton: true,
    note: 'The home page.',
    fields: [
      F.pk(),
      ...SEO,
      F.o2m('slides', 'The hero slider.'),
      F.o2m('stats', 'The figures in the strip under the hero.'),
      F.string('who_we_are_eyebrow'),
      F.string('who_we_are_heading'),
      F.lines('who_we_are_body', 'One paragraph per line.'),
      F.file('who_we_are_image'),
      F.string('who_we_are_cta_label'),
      F.string('categories_intro_eyebrow'),
      F.string('categories_intro_heading'),
      F.string('pillars_intro_eyebrow'),
      F.string('pillars_intro_heading'),
      F.o2m('pillars'),
      F.string('clients_intro_eyebrow'),
      F.string('clients_intro_heading'),
      F.string('reviews_intro_eyebrow'),
      F.string('reviews_intro_heading'),
    ],
  }),

  collection('home_slides', {
    icon: 'view_carousel',
    template: '{{label}}',
    note: 'Hero slides, in order.',
    fields: [
      F.pk(),
      F.m2o('home', 'home', { hidden: true }),
      F.string('label', { required: true, width: 'half', note: 'The slider control label.' }),
      F.string('eyebrow'),
      F.lines('lines', 'The two or three headline lines. One per line.'),
      F.string('headline', { note: 'Fallback headline, used only when no lines are set.' }),
      F.text('body'),
      F.file('image'),
      F.string('range_slug', { width: 'half', note: 'Optional. The category this slide links to.' }),
      F.boolean('show_cta', {
        default: false,
        note: 'Show the "Request a quote" button on this slide. Off by default.',
      }),
      F.sort(),
    ],
  }),

  collection('home_stats', {
    icon: 'trending_up',
    template: '{{value}} — {{label}}',
    fields: [
      F.pk(),
      F.m2o('home', 'home', { hidden: true }),
      F.string('value', { width: 'half', note: 'Written exactly as it should read, e.g. "300+".' }),
      F.string('label', { width: 'half' }),
      F.sort(),
    ],
  }),

  collection('home_pillars', {
    icon: 'check_circle',
    template: '{{title}}',
    fields: [
      F.pk(),
      F.m2o('home', 'home', { hidden: true }),
      F.string('title'),
      F.text('body'),
      F.sort(),
    ],
  }),

  /* ── about ─────────────────────────────────────────────────────────────── */
  collection('about', {
    icon: 'info',
    singleton: true,
    note: 'The About Us page.',
    fields: [
      F.pk(),
      ...SEO,
      ...BANNER,
      F.string('vision_eyebrow'),
      F.string('vision_heading'),
      F.text('vision_body'),
      F.string('mission_eyebrow'),
      F.string('mission_heading'),
      F.text('mission_body'),
      F.string('values_intro_eyebrow'),
      F.string('values_intro_heading'),
      F.o2m('values'),
      F.string('story_eyebrow'),
      F.string('story_heading'),
      F.lines('story_body', 'One paragraph per line.'),
    ],
  }),

  collection('about_values', {
    icon: 'stars',
    template: '{{title}}',
    fields: [
      F.pk(),
      F.m2o('about', 'about', { hidden: true }),
      F.string('title'),
      F.text('body'),
      F.sort(),
    ],
  }),

  /* ── gallery ───────────────────────────────────────────────────────────── */
  collection('gallery', {
    icon: 'photo_library',
    singleton: true,
    note: 'The Gallery page.',
    fields: [F.pk(), ...SEO, ...BANNER, F.o2m('images')],
  }),

  collection('gallery_images', {
    icon: 'image',
    template: '{{caption}}',
    fields: [
      F.pk(),
      F.m2o('gallery', 'gallery', { hidden: true }),
      F.file('image'),
      F.string('caption'),
      F.string('tag', { width: 'half', note: 'The small label over the picture.' }),
      F.sort(),
    ],
  }),

  /* ── contact ───────────────────────────────────────────────────────────── */
  collection('contact', {
    icon: 'mail',
    singleton: true,
    note: 'The Contact page.',
    fields: [
      F.pk(),
      ...SEO,
      ...BANNER,
      F.string('form_heading'),
      F.text('form_sub', { note: 'The line under the form heading.' }),
      F.text('map_embed_url', {
        note: 'The src of a Google Maps embed. Left empty, the site draws a labelled placeholder and makes no third-party request.',
      }),
      F.boolean('show_faqs', {
        default: true,
        note: 'Show the FAQ section on the contact page. Off hides it without deleting anything.',
      }),
      F.o2m('faqs'),
    ],
  }),

  collection('faqs', {
    icon: 'help',
    template: '{{question}}',
    fields: [
      F.pk(),
      F.m2o('contact', 'contact', { hidden: true }),
      F.string('question'),
      F.text('answer'),
      F.sort(),
    ],
  }),

  /* ── catalogue ─────────────────────────────────────────────────────────── */
  collection('categories', {
    icon: 'category',
    template: '{{name}}',
    note: 'The five ranges. Adding one here creates its page — no code change needed.',
    fields: [
      F.pk(),
      F.string('name', { required: true, width: 'half' }),
      F.string('slug', { required: true, width: 'half', note: 'The URL, e.g. "pen" for /pen/.' }),
      F.string('summary', { note: 'One line, used as the banner fallback.' }),
      F.string('meta', { note: 'The condensed sub-category list on the home page card.' }),
      F.lines('banner_lines', 'The two or three banner lines. One per line.'),
      F.file('image', 'The range picture: home page card and page banner.'),
      F.string('accent', {
        width: 'half',
        note: 'A CSS colour from the highlighter range. Marks the card, banner rule and active filter.',
      }),
      ...SEO,
      F.o2m('subcategories'),
      F.o2m('sub_brands', 'Shown as a filter row only when a range has two or more.'),
      F.o2m('items'),
      F.sort(),
    ],
  }),

  collection('subcategories', {
    icon: 'label',
    template: '{{name}}',
    fields: [
      F.pk(),
      F.m2o('category', 'categories'),
      F.string('name', { width: 'half' }),
      F.string('slug', { width: 'half' }),
      F.sort(),
    ],
  }),

  collection('sub_brands', {
    icon: 'branding_watermark',
    template: '{{name}}',
    note: 'Champ, Neo, Xtreme, Dox — the client’s own product lines.',
    fields: [
      F.pk(),
      F.m2o('category', 'categories'),
      F.string('name', { width: 'half' }),
      F.string('slug', { width: 'half' }),
      F.sort(),
    ],
  }),

  collection('items', {
    icon: 'inventory_2',
    template: '{{name}}',
    note: 'Products.',
    fields: [
      F.pk(),
      F.m2o('category', 'categories', { required: true }),
      F.string('name', { required: true }),
      F.string('sku', { width: 'half', note: 'The stable id used in links. Lower case, dashes.' }),
      F.string('meta', { note: 'The line under the name on the card.' }),
      F.m2o('subcategory', 'subcategories'),
      F.m2o('sub_brand', 'sub_brands'),
      F.lines('features', 'The benefit bullets, one per line. These are the detail description.'),
      F.string('pack_inner', { width: 'half', note: 'e.g. "12 Pcs Paper Box".' }),
      F.string('pack_carton', { width: 'half', note: 'e.g. "1728 Pcs Ctn.".' }),
      F.file('image', 'The card image.'),
      F.files('images', 'Extra views. A thumbnail strip appears in the detail pop-up from the second image on.'),
      F.sort(),
    ],
  }),

  /* ── social proof ──────────────────────────────────────────────────────── */
  collection('clients', {
    icon: 'apartment',
    template: '{{name}}',
    note: 'Corporate clients. Every mark is its owner’s trademark — written permission is needed before go-live.',
    fields: [
      F.pk(),
      F.string('name', { required: true, width: 'half' }),
      F.string('qualifier', { width: 'half' }),
      F.file('logo', 'The company’s own mark. Rendered as a white silhouette.'),
      F.select('mark', ['ring', 'diamond', 'bars', 'triangle', 'dots', 'square', 'chevron', 'disc'], {
        note: 'The drawn fallback used when there is no logo file.',
      }),
      F.boolean('placeholder', {
        default: true,
        note: 'On until permission to use the mark is in writing.',
      }),
      F.sort(),
    ],
  }),

  collection('reviews', {
    icon: 'format_quote',
    template: '{{organisation}}',
    note: 'Not rendered on the site today — hidden on the client’s instruction.',
    fields: [
      F.pk(),
      F.text('quote'),
      F.string('role', { width: 'half' }),
      F.string('organisation', { width: 'half' }),
      F.integer('rating', { width: 'half', default: 5 }),
      F.boolean('placeholder', { default: true }),
      F.sort(),
    ],
  }),

  /* ── inbound ───────────────────────────────────────────────────────────── */
  collection('enquiries', {
    icon: 'inbox',
    template: '{{name}} — {{organisation}}',
    sortable: false,
    note: 'Submissions from the contact form. Written by the site; nothing here is published.',
    fields: [
      F.pk(),
      F.string('name'),
      F.string('organisation'),
      F.string('email'),
      F.string('phone'),
      F.text('requirement'),
      F.select('status', ['new', 'in progress', 'quoted', 'closed'], { default: 'new' }),
      F.timestamp('received_at', { readonly: true }),
    ],
  }),
];

/* ----------------------------------------------------------------- relations */

/** `[childCollection, m2oField, parentCollection, parentO2mField]` */
export const O2M = [
  ['socials', 'site', 'site', 'socials'],
  ['home_slides', 'home', 'home', 'slides'],
  ['home_stats', 'home', 'home', 'stats'],
  ['home_pillars', 'home', 'home', 'pillars'],
  ['about_values', 'about', 'about', 'values'],
  ['gallery_images', 'gallery', 'gallery', 'images'],
  ['faqs', 'contact', 'contact', 'faqs'],
  ['subcategories', 'category', 'categories', 'subcategories'],
  ['sub_brands', 'category', 'categories', 'sub_brands'],
  ['items', 'category', 'categories', 'items'],
];

/** m2o fields that point somewhere but have no list on the other side. */
export const M2O_ONLY = [
  ['items', 'subcategory', 'subcategories'],
  ['items', 'sub_brand', 'sub_brands'],
];

/** `[collection, field]` — single-file relations onto directus_files. */
export const FILE_FIELDS = [
  ['site', 'logo'],
  ['site', 'logo_reversed'],
  ['site', 'logo_reversed_stationary'],
  ['site', 'favicon'],
  ['site', 'og_image'],
  ['home', 'who_we_are_image'],
  ['home_slides', 'image'],
  ['about', 'banner_image'],
  ['gallery', 'banner_image'],
  ['gallery_images', 'image'],
  ['contact', 'banner_image'],
  ['categories', 'image'],
  ['items', 'image'],
  ['clients', 'logo'],
];

/** `[collection, aliasField, junctionCollection]` — ordered many-files. */
export const M2M_FILES = [['items', 'images', 'items_files']];

/**
 * Collections the website's read-only token needs. Enquiries is create-only.
 *
 * The m2m junctions are in here for a reason worth knowing: without read access
 * to `items_files`, Directus does not refuse the request — it answers 200 and
 * silently leaves the nested `images` out. The products looked as though they
 * had lost their extra photographs when what they had actually lost was
 * permission to be seen.
 */
export const READABLE = [
  ...COLLECTIONS.map((c) => c.name).filter((n) => n !== 'enquiries'),
  ...M2M_FILES.map(([, , junction]) => junction),
];

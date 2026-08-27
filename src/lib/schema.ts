import { z } from 'zod';

/**
 * The shape of every Directus collection this site reads.
 *
 * These schemas are the single source of truth. The local seed files are parsed
 * through them at build time, so a malformed seed fails the build rather than
 * rendering a half-empty page. When Directus comes online the same schemas
 * validate the API response, which means a moderator deleting a required field
 * surfaces as a clear error instead of `undefined` in the markup.
 */

/** A Directus file reference. `id` is what the API returns; `src` is resolved for us. */
export const imageSchema = z.object({
  id: z.string().nullable().default(null),
  src: z.string(),
  alt: z.string(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});
export type Image = z.infer<typeof imageSchema>;

export const seoSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  /** Keeps utility pages (404) out of the index. */
  noindex: z.boolean().optional(),
});
export type Seo = z.infer<typeof seoSchema>;

/**
 * A page banner. The client writes these as two or three short lines rather than a
 * headline plus paragraph, so `lines` is the real content; `title`/`sub` are kept
 * so anything still reading them (SEO, older components) keeps working.
 */
export const bannerSchema = z.object({
  eyebrow: z.string(),
  title: z.string(),
  sub: z.string(),
  lines: z.array(z.string()).default([]),
  image: imageSchema,
});
export type Banner = z.infer<typeof bannerSchema>;

/* ---------------------------------------------------------------- singletons */

export const siteSchema = z.object({
  company_name: z.string(),
  tagline: z.string(),
  /**
   * Brand marks, from the CMS. Nullable because a moderator can empty the field
   * and a missing logo must not take the site down — the components fall back to
   * the company name as text.
   */
  logo: imageSchema.nullable().default(null),
  logo_reversed: imageSchema.nullable().default(null),
  logo_reversed_stationary: imageSchema.nullable().default(null),
  favicon: imageSchema.nullable().default(null),
  /** The picture shown when any page is shared, unless a page overrides it. */
  og_image: imageSchema.nullable().default(null),
  /** Site-wide SEO defaults. Per-page values win; this is the floor. */
  seo: seoSchema.nullable().default(null),
  founded_year: z.number().int(),
  address_lines: z.array(z.string()).min(1),
  phone: z.string(),
  phone_href: z.string(),
  /**
   * Validated when present, but an empty one is allowed: a moderator clearing the
   * address should blank a line in the footer, not fail the parse and take every
   * other site field down with it.
   */
  email: z.union([z.literal(''), z.string().email()]),
  opening_hours: z.string(),
  utility_message: z.string(),
  response_promise: z.string(),
  socials: z.array(
    z.object({
      platform: z.enum(['facebook', 'instagram', 'youtube', 'x', 'linkedin']),
      url: z.string(),
      /** Only Facebook and LinkedIn are confirmed to exist. */
      confirmed: z.boolean().default(false),
    }),
  ),
});
export type Site = z.infer<typeof siteSchema>;

export const homeSchema = z.object({
  seo: seoSchema,
  slides: z
    .array(
      z.object({
        eyebrow: z.string(),
        headline: z.string(),
        body: z.string(),
        image: imageSchema,
        /** Where the slide's secondary link points, if any. */
        range_slug: z.string().nullable().default(null),
        label: z.string(),
        /** The client's three-line treatment for this slide. Falls back to headline. */
        lines: z.array(z.string()).default([]),
        /**
         * Whether this slide shows the "Request a quote" button. **Off by
         * default**, on the client's instruction: the slide copy is the whole
         * message and they want the hero to carry it alone. A moderator turns it
         * on per slide in the CMS. Null reads as off, so the default holds for
         * rows written before the field existed.
         */
        show_cta: z.boolean().default(false),
      }),
    )
    .min(1),
  stats: z
    .array(z.object({ value: z.string(), label: z.string() }))
    .min(1),
  who_we_are: z.object({
    eyebrow: z.string(),
    heading: z.string(),
    body: z.array(z.string()).min(1),
    image: imageSchema,
    cta_label: z.string(),
  }),
  categories_intro: z.object({ eyebrow: z.string(), heading: z.string() }),
  pillars_intro: z.object({ eyebrow: z.string(), heading: z.string() }),
  pillars: z
    .array(z.object({ title: z.string(), body: z.string() }))
    .min(1),
  clients_intro: z.object({ eyebrow: z.string(), heading: z.string() }),
  reviews_intro: z
    .object({ eyebrow: z.string(), heading: z.string() })
    .default({ eyebrow: 'Client feedback', heading: 'What buyers say about ordering from Grade.' }),
});
export type Home = z.infer<typeof homeSchema>;

export const aboutSchema = z.object({
  seo: seoSchema,
  banner: bannerSchema,
  vision: z.object({ eyebrow: z.string(), heading: z.string(), body: z.string() }),
  mission: z.object({ eyebrow: z.string(), heading: z.string(), body: z.string() }),
  values_intro: z.object({ eyebrow: z.string(), heading: z.string() }),
  values: z.array(z.object({ title: z.string(), body: z.string() })).min(1),
  story: z.object({ eyebrow: z.string(), heading: z.string(), body: z.array(z.string()).min(1) }),
});
export type About = z.infer<typeof aboutSchema>;

export const gallerySchema = z.object({
  seo: seoSchema,
  banner: bannerSchema,
  images: z
    .array(z.object({ image: imageSchema, caption: z.string(), tag: z.string() }))
    .min(1),
});
export type Gallery = z.infer<typeof gallerySchema>;

export const contactSchema = z.object({
  seo: seoSchema,
  banner: bannerSchema,
  form_heading: z.string(),
  /** The line under the form heading. Empty is fine — it simply is not rendered. */
  form_sub: z.string().default(''),
  map_embed_url: z.string().nullable().default(null),
  /**
   * Whether the FAQ section renders. Defaults on: a null — an older row written
   * before the field existed — must not silently hide a section that was there.
   * The questions stay in the CMS either way, so this hides rather than deletes.
   */
  show_faqs: z.boolean().default(true),
  faqs: z.array(z.object({ question: z.string(), answer: z.string() })).min(1),
});
export type Contact = z.infer<typeof contactSchema>;

/* -------------------------------------------------------------- collections */

export const itemSchema = z.object({
  id: z.string(),
  /**
   * The Directus row id, carried through so the Visual Editor can map a rendered
   * product back to the record behind it. `id` above is the client's SKU, which
   * is what the URLs and dialogs use; the two are deliberately separate.
   */
  directus_id: z.union([z.number(), z.string()]).nullable().default(null),
  name: z.string(),
  meta: z.string(),
  /** Sub-category slug this item belongs to, or null for categories with no children. */
  subcategory: z.string().nullable().default(null),
  /**
   * Product sub-brand — Champ, Neo, Xtreme or Dox. The client's own SKU naming is
   * built on these ("Grade Champ Pencil HB"), so it is a real browse axis, not a
   * label: Champ reads school, Neo utility, Xtreme office hardware, Dox filing.
   * Null for the pen lines, which are named individually (Classmate, Glow, …).
   */
  sub_brand: z.string().nullable().default(null),
  /** Benefit bullets exactly as the client wrote them. Drives the detail dialog. */
  features: z.array(z.string()).default([]),
  /** Inner pack, where the client gives one ("12 Pcs Paper Box"). */
  pack_inner: z.string().nullable().default(null),
  /** Carton quantity ("1728 Pcs Ctn."). Every SKU has one. */
  pack_carton: z.string().nullable().default(null),
  image: imageSchema,
  /**
   * Extra views for the detail dialog. The client asked for multiple images per
   * product; none have arrived yet, so this is empty and the dialog shows the
   * single card image. The thumbnail strip appears as soon as a second view exists.
   */
  images: z.array(imageSchema).default([]),
});
export type Item = z.infer<typeof itemSchema>;

export const categorySchema = z.object({
  slug: z.string(),
  /** The Directus row id — see the note on `itemSchema`. */
  directus_id: z.union([z.number(), z.string()]).nullable().default(null),
  name: z.string(),
  /** Short line used on the category banner. */
  summary: z.string(),
  /** Condensed sub-category list shown on the home page card. */
  meta: z.string(),
  seo: seoSchema,
  image: imageSchema,
  /**
   * The three short lines the client writes for a page banner, in order. Their copy
   * deck uses this shape everywhere instead of a headline plus paragraph.
   */
  banner_lines: z.array(z.string()).default([]),
  /** Sub-brands present in this range. Rendered as a filter only when there are 2+. */
  sub_brands: z.array(z.object({ slug: z.string(), name: z.string() })).default([]),
  /** Empty for File & Folder — the template must not render a filter row. */
  subcategories: z.array(z.object({ slug: z.string(), name: z.string() })),
  items: z.array(itemSchema).min(1),
  sort: z.number().int(),
  /**
   * One accent per range, taken from the Neo highlighter colours. It marks the
   * card on the home page, the banner rule, and the active filter — so a range
   * is recognisable before its name is read. Falls back to brand red.
   */
  accent: z.string().default('var(--bg-brand)'),
});
export type Category = z.infer<typeof categorySchema>;

export const clientSchema = z.object({
  name: z.string(),
  qualifier: z.string(),
  mark: z.enum(['ring', 'diamond', 'bars', 'triangle', 'dots', 'square', 'chevron', 'disc']),
  /**
   * The company's own mark, where we have it. Rendered as a one-colour white
   * silhouette on the deep band, which is the only way a wall of logos from
   * fifteen different brand palettes reads as one row rather than a collision.
   */
  logo: z.string().nullable().default(null),
  /** Real client logos need permission; placeholders are flagged so they can't ship unnoticed. */
  placeholder: z.boolean().default(true),
});
export type Client = z.infer<typeof clientSchema>;

export const reviewSchema = z.object({
  quote: z.string(),
  role: z.string(),
  organisation: z.string(),
  rating: z.number().int().min(1).max(5),
  placeholder: z.boolean().default(true),
});
export type Review = z.infer<typeof reviewSchema>;

/* --------------------------------------------------------- enquiry (write) */

/**
 * Enquiry payload. Deliberately strict: a quantity in the first message is what
 * turns an enquiry into a quote without three emails of back-and-forth.
 */
export const enquirySchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name.').max(120),
  organisation: z.string().trim().max(160).optional().or(z.literal('')),
  email: z.string().trim().email('Please enter a valid email address.').max(200),
  phone: z
    .string()
    .trim()
    .min(6, 'Please enter a phone number we can reach you on.')
    .max(40)
    .regex(/^[+\d][\d\s\-()]*$/, 'Please use digits, spaces, brackets or a leading +.'),
  requirement: z
    .string()
    .trim()
    .min(12, 'Tell us what you need and roughly how many.')
    .max(4000),
  /**
   * The spam trap. Hidden from users, so only a bot fills it in. Deliberately
   * permissive: rejecting it here would return a validation error naming the
   * trap, which tells the bot exactly what to leave blank next time — and would
   * show a real user an error against a field they cannot see. The endpoint
   * checks it instead and answers with a plain success.
   */
  honeypot: z.string().optional(),
});
export type Enquiry = z.infer<typeof enquirySchema>;

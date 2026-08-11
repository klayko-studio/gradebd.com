/**
 * Emits the remaining seed content files.
 * Kept in the repo so the seed can be regenerated, and so the same objects can
 * be pushed into Directus later with a short import script.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'src', 'content');
mkdirSync(out, { recursive: true });

const img = (src, alt, width, height) => ({ id: null, src, alt, width, height });

const about = {
  seo: {
    title: 'About Grade Limited — supplying Bangladesh since 2019',
    description:
      'Grade Limited sources stationery direct from manufacturers for schools, retailers and corporate buyers across Bangladesh. Over 300 work orders for more than 50 companies.',
  },
  banner: {
    eyebrow: 'About Grade',
    title: 'Supplying Bangladesh since 2019.',
    sub: 'Over 300 work orders completed for more than 50 companies, from a base in Dhanmondi, Dhaka.',
    image: img('/images/about/warehouse.jpg', 'Warehouse racking stacked with palletised cartons', 1100, 920),
  },
  vision: {
    eyebrow: 'Our Vision',
    heading: 'A supply chain with nothing hidden in it.',
    body:
      'Grade exists to take the guesswork out of buying stationery in Bangladesh. One supplier, one invoice, and prices that reflect the goods rather than the chain that carried them — against a specification a school or an office can plan a year around.',
  },
  mission: {
    eyebrow: 'Our Mission',
    heading: 'Cut the intermediaries, hold the specification.',
    body:
      'We buy direct from the manufacturers who make the goods, hold stock against the lines our customers reorder, and return a quote within one working day. No intermediaries, no drifting specification, and no chasing a delivery date.',
  },
  values_intro: { eyebrow: 'Our Values', heading: 'What we hold ourselves to.' },
  values: [
    {
      title: 'Transparency',
      body: 'A quote shows what the goods cost, not what the chain adds. Buyers see the same pricing structure on every order.',
    },
    { title: 'Consistency', body: 'The same specification on the first order and the fiftieth.' },
    { title: 'Reliability', body: 'Dispatch on the date agreed, without the buyer having to chase it.' },
    { title: 'Value', body: 'Direct sourcing passed on as price, not absorbed as margin.' },
  ],
  story: {
    eyebrow: 'About Us',
    heading: 'From B2B supplier to a one-stop procurement partner.',
    body: [
      'Since its inception in 2019, Grade has grown from a B2B supplier into a platform serving both traditional supply and end-consumer purchasing. The B2B side holds to the same commitment throughout: eliminate the intermediaries, source direct from manufacturers, and pass the difference on.',
      'This site covers the stationery range only — pens, exercise books, school supplies, office consumables and filing. Orders are quoted by the carton for schools, retailers and corporate procurement teams across Bangladesh.',
    ],
  },
};

const gallery = {
  seo: {
    title: 'Gallery — Grade Limited stationery ranges',
    description:
      'Product, packaging and dispatch photography from across the five stationery ranges supplied by Grade Limited, Dhaka.',
  },
  banner: {
    eyebrow: 'Gallery',
    title: 'The range, in the room.',
    sub: 'Product, packaging and dispatch photography from across the five ranges.',
    image: img('/images/hero/all-items.jpg', 'Stationery arranged on a deep navy surface', 2000, 1200),
  },
  images: [
    {
      image: img('/images/gallery/colour-pencils.jpg', 'Colour pencils with shavings and a sharpener', 800, 560),
      caption: 'Colour pencil range',
      tag: 'School Stationery',
    },
    {
      image: img('/images/gallery/lever-arch.jpg', 'A row of red lever arch files on a shelf', 1300, 650),
      caption: 'Lever arch files, A4',
      tag: 'File & Folder',
    },
    {
      image: img('/images/gallery/warehouse.jpg', 'Warehouse racking stacked with palletised cartons', 1100, 920),
      caption: 'Racked stock, Dhanmondi',
      tag: 'Warehouse & dispatch',
    },
    {
      image: img('/images/gallery/exercise-books.jpg', 'A stack of soft-cover exercise books', 800, 560),
      caption: 'Exercise books, soft cover',
      tag: 'Exercise Book',
    },
    {
      image: img('/images/gallery/markers.jpg', 'Rows of marker pens seen from above', 800, 560),
      caption: 'Marker and highlighter display',
      tag: 'Office Stationery',
    },
    {
      image: img('/images/gallery/in-use.jpg', 'An open notebook and pen on a wooden desk', 800, 560),
      caption: 'Supplied to a client desk',
      tag: 'In use',
    },
  ],
};

const contact = {
  seo: {
    title: 'Contact Grade Limited — request a stationery quote',
    description:
      'Tell us what you need and how many. Grade Limited replies to bulk stationery enquiries within one working day. Dhanmondi, Dhaka.',
  },
  banner: {
    eyebrow: 'Contact',
    title: 'Query Zone.',
    sub: 'Tell us what you need and how many. We reply to bulk enquiries within one working day.',
    image: img('/images/contact/desk.jpg', 'A hand writing notes in a notebook at a desk', 800, 560),
  },
  form_heading: 'Request a quote',
  map_embed_url: null,
  faqs: [
    {
      question: 'Do you supply wholesale to schools?',
      answer:
        'Yes — schools are among our largest customers. Orders are quoted by the carton, with volume pricing from twenty cartons upward. Send your list and intake dates and we will come back within one working day.',
    },
    {
      question: 'What is the minimum order quantity?',
      answer:
        'Most lines are quoted from one carton, and volume pricing begins at twenty cartons across an order. Mixed orders across ranges count toward the same total.',
    },
    {
      question: 'Do you offer custom branding on exercise books?',
      answer:
        'Yes, on exercise books and files. Custom covers need longer lead times than stock lines, so tell us your intake date when you enquire.',
    },
    {
      question: 'Which areas do you deliver to?',
      answer:
        'Dhaka and surrounding districts on our own schedule, and the rest of Bangladesh through freight partners. Delivery is confirmed with your quote.',
    },
    {
      question: 'How long does a quote take?',
      answer:
        'One working day for stock lines. Custom branding or unusually large volumes may take longer, and we will tell you when you enquire rather than leaving you waiting.',
    },
  ],
};

const clients = [
  ['Northfield', 'Academy', 'ring'],
  ['Meridian', 'Group', 'diamond'],
  ['Riverside', 'School', 'bars'],
  ['Apex', 'Traders', 'triangle'],
  ['Lakeside', 'College', 'dots'],
  ['Vertex', 'Office', 'square'],
  ['Summit', 'Retail', 'chevron'],
  ['Crestview', 'School', 'disc'],
].map(([name, qualifier, mark]) => ({ name, qualifier, mark, placeholder: true }));

const reviews = [
  {
    quote:
      'We moved the whole stationery order to Grade last year. One invoice instead of four suppliers, and the exercise book spec has been identical on every reorder.',
    role: 'Procurement Officer',
    organisation: 'Northfield Academy',
    rating: 5,
    placeholder: true,
  },
  {
    quote:
      'Quotes come back the same day and the pricing holds. That predictability is worth more to us than shaving a little off a one-off order.',
    role: 'Office Manager',
    organisation: 'Meridian Group',
    rating: 5,
    placeholder: true,
  },
  {
    quote:
      'They delivered ahead of our January intake without us chasing once. That is the reason we have renewed twice.',
    role: 'School Administrator',
    organisation: 'Riverside School',
    rating: 5,
    placeholder: true,
  },
];

/* ------------------------------------------------------------- categories */

const ranges = [
  {
    slug: 'pen',
    name: 'Pen',
    summary: 'Ball pens supplied by the carton to schools, retailers and offices.',
    meta: 'Ball Pen · 0.5–1.0 mm',
    subcategories: [{ slug: 'ball-pen', name: 'Ball Pen' }],
    items: [
      ['Ball Pen — 0.7 mm, retractable', 'Blue · Black · Red'],
      ['Ball Pen — assorted barrels', 'Trade pack of 50'],
      ['Ball Pen — 0.7 mm, black barrel', 'Medium point'],
      ['Ball Pen — 0.5 mm, fine tip', 'Black ink'],
      ['Ball Pen — pastel barrels', 'Box of 10'],
      ['Ball Pen — grip barrel, assorted', 'Box of 10'],
    ],
    alts: [
      'A retractable ball pen with a mint barrel',
      'A row of assorted dark ball pens',
      'A slim black ball pen on white',
      'A fine-tipped black pen on a white surface',
      'Pastel-coloured pens held in a hand',
      'Colourful grip ball pens on a teal surface',
    ],
  },
  {
    slug: 'exercise-book',
    name: 'Exercise Book',
    summary: 'Student and standard sizes, held in stock against repeat orders.',
    meta: 'Student · Standard',
    subcategories: [
      { slug: 'student-large', name: 'Student Large' },
      { slug: 'standard-large', name: 'Standard Large' },
    ],
    items: [
      ['Student Large — 100 pages', 'Ruled · soft cover'],
      ['Standard Large — 160 pages', 'Ruled · wire bound'],
      ['Student Large — 200 pages', 'Ruled · assorted covers'],
      ['Standard Large — 100 pages', 'Ruled · board cover'],
      ['Student Large — hard cover', '200 pages'],
      ['Standard Large — 200 pages', 'Plain · board cover'],
    ],
    alts: [
      'A stack of soft-cover exercise books in four colours',
      'Wire-bound notepads laid flat on a pale surface',
      'A fan of pastel notebooks',
      'A stack of books seen from the side',
      'Hardback books stacked beside a notepad',
      'A pile of board-covered books',
    ],
  },
  {
    slug: 'school-stationery',
    name: 'School Stationery',
    summary: 'Pencils, erasers, sharpeners, scales and boxes for the school year.',
    meta: 'Pencil · Eraser · +5',
    subcategories: [
      { slug: 'pencil', name: 'Pencil' },
      { slug: 'eraser', name: 'Eraser' },
      { slug: 'sharpener', name: 'Sharpener' },
      { slug: 'colour-pencil', name: 'Colour Pencil' },
      { slug: 'scale', name: 'Scale' },
      { slug: 'pencil-box', name: 'Pencil Box' },
      { slug: 'clipboard', name: 'Clipboard' },
    ],
    items: [
      ['HB Pencil — box of 12', 'Graphite · with eraser'],
      ['Sharpener — metal, single hole', 'Box of 20'],
      ['Colour Pencil — 12 shades', 'Boxed set'],
      ['Scale — 30 cm', 'With colour pencil set'],
      ['Pencil & sharpener set', 'School pack'],
      ['Desk Sharpener — wooden', 'Single unit'],
    ],
    alts: [
      'Two pencils and an eraser on a pale blue surface',
      'A metal sharpener beside a blue pencil and shavings',
      'Colour pencils with shavings on a dark surface',
      'A ruler beside a row of colour pencils on wood',
      'A sharpener and shavings on an open notebook',
      'A wooden desk sharpener',
    ],
  },
  {
    slug: 'office-stationery',
    name: 'Office Stationery',
    summary: 'Desk tools and consumables for offices and corporate procurement.',
    meta: 'Stapler · Staples · +4',
    subcategories: [
      { slug: 'stapler', name: 'Stapler' },
      { slug: 'punch', name: 'Punch' },
      { slug: 'pin-remover', name: 'Pin Remover' },
      { slug: 'staples', name: 'Staples' },
      { slug: 'highlighter', name: 'Highlighter' },
      { slug: 'marker', name: 'Marker' },
      { slug: 'cutter-knife', name: 'Cutter Knife' },
    ],
    items: [
      ['Stapler — half strip', 'Steel body · 20 sheets'],
      ['Staples — 26/6', 'Box of 1000'],
      ['Highlighter — 4 pack', 'Chisel tip · assorted'],
      ['Marker — assorted colours', 'Display box of 60'],
      ['Cutter Knife — retractable', 'Snap-off blade'],
      ['Note Pad — A5', 'Pack of 5 · plain'],
    ],
    alts: [
      'A half-strip stapler on a white surface',
      'A strip of staples beside used staples',
      'Four highlighters in pink, green, orange and yellow',
      'Rows of marker pens seen from above',
      'A retractable cutter knife on a dark surface',
      'A stack of white note pads',
    ],
  },
  {
    slug: 'file-folder',
    name: 'File & Folder',
    summary: 'Filing and document storage for offices and record keeping.',
    meta: 'Box file · Ring binder · +4',
    subcategories: [],
    items: [
      ['Lever Arch File — A4, red', 'Board · 75 mm spine'],
      ['Lever Arch File — assorted', 'Board · 75 mm spine'],
      ['Ring Binder — 2D, A4', 'Assorted colours'],
      ['Box File — foolscap', 'Board · assorted'],
      ['Document Wallet — A4', 'Pack of 10'],
      ['Suspension File — A4', 'Pack of 10'],
    ],
    alts: [
      'A row of red lever arch files on a shelf',
      'Lever arch files in purple, teal and green',
      'Shelves of ring binders in assorted colours',
      'Shelving filled with colourful box files',
      'Stacks of tied document bundles',
      'An open suspension file drawer',
    ],
  },
];

const rangeImage = {
  pen: ['/images/ranges/pen.jpg', 800, 560],
  'exercise-book': ['/images/ranges/exercise-book.jpg', 800, 560],
  'school-stationery': ['/images/ranges/school-stationery.jpg', 900, 650],
  'office-stationery': ['/images/ranges/office-stationery.jpg', 1300, 650],
  'file-folder': ['/images/ranges/file-folder.jpg', 1300, 650],
};
// measured from the files on disk
const itemSize = {
  'office-stationery-02': [1300, 650],
  'file-folder-01': [1300, 650],
};

const categories = ranges.map((r, index) => {
  const [rSrc, rW, rH] = rangeImage[r.slug];
  return {
    slug: r.slug,
    name: r.name,
    summary: r.summary,
    meta: r.meta,
    seo: {
      title: `${r.name} — Grade Limited, Dhaka`,
      description: `${r.summary} Quoted by the carton for schools, retailers and corporate buyers across Bangladesh.`,
    },
    image: img(rSrc, `${r.name} range`, rW, rH),
    subcategories: r.subcategories,
    sort: index + 1,
    items: r.items.map(([name, meta], i) => {
      const key = `${r.slug}-0${i + 1}`;
      const [w, h] = itemSize[key] ?? [800, 560];
      return {
        id: key,
        name,
        meta,
        subcategory: r.subcategories.length ? r.subcategories[i % r.subcategories.length].slug : null,
        image: img(`/images/items/${key}.jpg`, r.alts[i], w, h),
      };
    }),
  };
});

const files = { about, gallery, contact, clients, reviews, categories };
for (const [name, data] of Object.entries(files)) {
  const path = join(out, `${name}.json`);
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf8');
  const count = Array.isArray(data) ? `${data.length} entries` : 'singleton';
  console.log(`wrote ${name}.json (${count})`);
}

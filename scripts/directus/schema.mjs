import { COLLECTIONS, O2M, M2O_ONLY, FILE_FIELDS, M2M_FILES, READABLE } from './model.mjs';

/**
 * Creates the collections, fields and relations in `model.mjs`, then the
 * read-only role the website authenticates as.
 *
 * Everything is "ensure" rather than "create": running it twice is safe, and a
 * partially-applied run (a network blip halfway through) is fixed by running it
 * again rather than by dropping the database.
 */

const log = (...args) => console.log('  ', ...args);

async function ensureCollection(client, def) {
  if (await client.exists(`/collections/${def.name}`)) {
    log(`· ${def.name} — already there`);
    return false;
  }
  await client.post('/collections', {
    collection: def.name,
    meta: def.meta,
    schema: { name: def.name },
    // Alias fields (o2m, m2m) cannot be created in this payload — they have no
    // column — so only real ones go in and the rest follow as separate calls.
    fields: def.fields.filter((f) => f.type !== 'alias'),
  });
  log(`+ ${def.name}`);
  return true;
}

async function ensureField(client, collectionName, def) {
  if (await client.exists(`/fields/${collectionName}/${def.field}`)) return false;
  await client.post(`/fields/${collectionName}`, def);
  return true;
}

async function ensureRelation(client, relation) {
  const existing = await client
    .get(`/relations/${relation.collection}/${relation.field}`)
    .catch(() => null);
  if (existing) return false;
  await client.post('/relations', relation);
  return true;
}

export async function applySchema(client) {
  console.log('\nSchema');

  for (const def of COLLECTIONS) {
    await ensureCollection(client, def);
    // Alias fields, and anything a re-run added to the model after the
    // collection was first created.
    for (const f of def.fields) {
      if (f.field === 'id') continue;
      if (await ensureField(client, def.name, f)) log(`  + ${def.name}.${f.field}`);
    }
  }

  console.log('\nRelations');

  for (const [collection, field] of FILE_FIELDS) {
    if (
      await ensureRelation(client, {
        collection,
        field,
        related_collection: 'directus_files',
        // Deleting a file empties the reference rather than deleting the row
        // that used it — losing a product because its photo was tidied away
        // would be a bad trade.
        schema: { on_delete: 'SET NULL' },
      })
    ) {
      log(`+ ${collection}.${field} → file`);
    }
  }

  for (const [child, m2oField, parent, o2mField] of O2M) {
    if (
      await ensureRelation(client, {
        collection: child,
        field: m2oField,
        related_collection: parent,
        meta: { one_field: o2mField, sort_field: 'sort', one_deselect_action: 'delete' },
        schema: { on_delete: 'CASCADE' },
      })
    ) {
      log(`+ ${parent}.${o2mField} ↔ ${child}.${m2oField}`);
    }
  }

  for (const [collection, field, related] of M2O_ONLY) {
    if (
      await ensureRelation(client, {
        collection,
        field,
        related_collection: related,
        schema: { on_delete: 'SET NULL' },
      })
    ) {
      log(`+ ${collection}.${field} → ${related}`);
    }
  }

  for (const [parent, alias, junction] of M2M_FILES) {
    await ensureFilesJunction(client, parent, alias, junction);
  }
}

/**
 * The ordered many-files relation Directus calls a "Files" field. It is three
 * pieces — a junction table and a relation from each side — and the admin app
 * only renders the interface once all three exist.
 */
async function ensureFilesJunction(client, parent, alias, junction) {
  const parentKey = `${parent}_id`;

  if (!(await client.exists(`/collections/${junction}`))) {
    await client.post('/collections', {
      collection: junction,
      meta: { hidden: true, icon: 'import_export' },
      schema: { name: junction },
      fields: [
        {
          field: 'id',
          type: 'integer',
          meta: { hidden: true },
          schema: { is_primary_key: true, has_auto_increment: true },
        },
        { field: parentKey, type: 'integer', meta: { hidden: true }, schema: { is_nullable: true } },
        {
          field: 'directus_files_id',
          type: 'uuid',
          meta: { hidden: true },
          schema: { is_nullable: true },
        },
        { field: 'sort', type: 'integer', meta: { hidden: true }, schema: { is_nullable: true } },
      ],
    });
    log(`+ ${junction}`);
  }

  await ensureRelation(client, {
    collection: junction,
    field: parentKey,
    related_collection: parent,
    meta: { one_field: alias, sort_field: 'sort', junction_field: 'directus_files_id' },
    schema: { on_delete: 'CASCADE' },
  });

  await ensureRelation(client, {
    collection: junction,
    field: 'directus_files_id',
    related_collection: 'directus_files',
    meta: { one_field: null, junction_field: parentKey },
    schema: { on_delete: 'CASCADE' },
  });

  log(`+ ${parent}.${alias} → many files`);
}

/* ------------------------------------------------------------ website access */

/**
 * The site reads Directus server-side with a static token, so nothing in
 * Directus needs to be public — no anonymous read, and the token never reaches a
 * browser. Images are the usual reason people open public access; this build
 * proxies them through the site instead (`/cms/[id]`), so that reason is gone.
 */
export async function ensureWebsiteAccess(client, staticToken) {
  console.log('\nWebsite access');

  // The token goes straight into Directus and then into .env, and a bad one
  // fails as a 401 on every read — which the site absorbs by falling back to its
  // seed content, so the symptom is a site that looks completely fine and simply
  // ignores the CMS. Worth half a line to refuse the obviously-wrong ones (a
  // stray comment picked up out of .env, an unreplaced placeholder).
  if (!/^\S{20,}$/.test(staticToken ?? '')) {
    throw new Error(
      [
        `"${String(staticToken).slice(0, 40)}" is not a usable token.`,
        'It must be at least 20 characters with no spaces. This normally means',
        'DIRECTUS_TOKEN in .env is a placeholder or a malformed line — clear it and',
        'run the bootstrap again to have a new one generated.',
      ].join('\n'),
    );
  }

  const policies = await client.get('/policies?filter[name][_eq]=Website&limit=1');
  let policyId = policies?.[0]?.id;

  if (!policyId) {
    const policy = await client.post('/policies', {
      name: 'Website',
      icon: 'public',
      description: 'Read-only access for the Astro site, plus creating enquiries.',
      admin_access: false,
      app_access: false,
    });
    policyId = policy.id;
    log('+ policy "Website"');

    const permissions = [
      // Files must be readable for the asset proxy to fetch bytes.
      ...[...READABLE, 'directus_files'].map((collection) => ({
        policy: policyId,
        collection,
        action: 'read',
        fields: ['*'],
        permissions: {},
      })),
      // The contact form writes here. Read is deliberately not granted: the site
      // has no reason to list other people's enquiries.
      { policy: policyId, collection: 'enquiries', action: 'create', fields: ['*'], permissions: {} },
    ];
    await client.post('/permissions', permissions);
    log(`+ ${permissions.length} permissions`);
  } else {
    log('· policy "Website" — already there');
  }

  const roles = await client.get('/roles?filter[name][_eq]=Website&limit=1');
  let roleId = roles?.[0]?.id;
  if (!roleId) {
    const role = await client.post('/roles', { name: 'Website', icon: 'public' });
    roleId = role.id;
    await client.post('/access', { role: roleId, policy: policyId, sort: 1 });
    log('+ role "Website"');
  } else {
    log('· role "Website" — already there');
  }

  // A real-looking domain on purpose: Directus validates this field as an email
  // and rejects .local. Nothing is ever sent to it — the account cannot sign in.
  const email = 'website@gradebd.com';
  const users = await client.get(
    `/users?filter[email][_eq]=${encodeURIComponent(email)}&fields=id,token&limit=1`,
  );

  if (users?.[0]) {
    await client.patch(`/users/${users[0].id}`, { token: staticToken, role: roleId, status: 'active' });
    log('· user "Website" — token refreshed');
  } else {
    await client.post('/users', {
      first_name: 'Website',
      email,
      role: roleId,
      token: staticToken,
      status: 'active',
      // A machine account: the token is the credential and app access is off, so
      // this password can never be used to sign in to the admin app.
      password: staticToken,
    });
    log('+ user "Website"');
  }

  return staticToken;
}

/* ------------------------------------------------------------ visual editor */

/**
 * Registers the website with Directus' Visual Editor so the "Visual Editor"
 * module opens the live site instead of an empty picker. Without this a
 * moderator has to paste the URL into Settings before they can edit anything,
 * which is a strange first experience of a CMS that is meant to show them their
 * own page.
 */
export async function ensureVisualEditorUrl(client, siteUrl) {
  if (!siteUrl) return;
  const settings = await client.get('/settings?fields=visual_editor_urls');
  const existing = settings?.visual_editor_urls ?? [];
  const normalised = siteUrl.replace(/\/$/, '');

  if (existing.some((entry) => (entry?.url ?? '').replace(/\/$/, '') === normalised)) {
    console.log(`
Visual editor
   · ${normalised} — already registered`);
    return;
  }

  await client.patch('/settings', {
    visual_editor_urls: [...existing, { url: normalised, name: 'Website' }],
  });
  console.log(`
Visual editor
   + ${normalised}`);
}

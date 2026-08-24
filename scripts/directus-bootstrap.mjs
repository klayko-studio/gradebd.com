#!/usr/bin/env node
/**
 * Turns an empty Directus into this website's backend, in one command.
 *
 *   npm run directus:bootstrap
 *
 * It creates the collections and relations, uploads every image in
 * `public/images/`, writes the current `src/content/*.json` in as content, and
 * makes the read-only account the site authenticates as. Safe to re-run: the
 * schema step is idempotent, and content is skipped once categories exist
 * (`--force` seeds again anyway).
 *
 * Configuration comes from `.env`, overridable per-run:
 *   --url        Directus URL                (DIRECTUS_ADMIN_URL, DIRECTUS_PUBLIC_URL)
 *   --email      admin email                 (DIRECTUS_ADMIN_EMAIL)
 *   --password   admin password              (DIRECTUS_ADMIN_PASSWORD)
 *   --token      the static token to install (DIRECTUS_TOKEN; generated if absent)
 *   --site       the website's own URL       (SITE_URL) — registered with the
 *                Visual Editor so the module opens the live site
 *   --force      seed content even if some already exists
 *   --schema-only / --content-only
 */

import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient, waitForDirectus } from './directus/client.mjs';
import { applySchema, ensureWebsiteAccess, ensureVisualEditorUrl } from './directus/schema.mjs';
import { seedContent } from './directus/content.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');

/** Minimal .env reader — enough for KEY=value, quoted or not. */
async function loadEnv() {
  try {
    const text = await readFile(path.join(ROOT, '.env'), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i.exec(line);
      if (!match) continue;
      const value = match[2].trim().replace(/^["'](.*)["']$/, '$1');
      if (process.env[match[1]] === undefined) process.env[match[1]] = value;
    }
  } catch {
    /* no .env — rely on the real environment and the flags */
  }
}

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  const next = process.argv[index + 1];
  return next && !next.startsWith('--') ? next : 'true';
}

const has = (name) => process.argv.includes(`--${name}`);

async function main() {
  await loadEnv();

  const url =
    arg('url') ||
    process.env.DIRECTUS_ADMIN_URL ||
    process.env.DIRECTUS_PUBLIC_URL ||
    'http://localhost:8055';
  const email = arg('email') || process.env.DIRECTUS_ADMIN_EMAIL;
  const password = arg('password') || process.env.DIRECTUS_ADMIN_PASSWORD;

  // A generated token is printed at the end; it is only useful once it is in
  // .env, so it is never written silently.
  const generated = !arg('token') && !process.env.DIRECTUS_TOKEN;
  const token = arg('token') || process.env.DIRECTUS_TOKEN || randomBytes(32).toString('hex');

  console.log(`Directus: ${url}`);
  await waitForDirectus(url);

  const client = createClient({ url, email, password });
  await client.login();

  const me = await client.get('/users/me?fields=email,role.name');
  console.log(`Signed in as ${me.email}`);

  if (!has('content-only')) {
    await applySchema(client);
    await ensureWebsiteAccess(client, token);
    await ensureVisualEditorUrl(client, arg('site') || process.env.SITE_URL);
  }
  if (!has('schema-only')) {
    await seedContent(client, { force: has('force') });
  }

  console.log('\nDone.\n');
  if (generated) {
    console.log('Add this to .env, then rebuild the site so it reads from Directus:\n');
    console.log(`  DIRECTUS_TOKEN=${token}\n`);
    console.log('  DIRECTUS_INTERNAL_URL=http://directus:8055   # inside compose');
    console.log('  DIRECTUS_PUBLIC_URL=https://admin.gradebd.com # what the admin is served on\n');
  }
}

main().catch((error) => {
  console.error(`\n✗ ${error.message}\n`);
  if (error.directus) console.error(JSON.stringify(error.directus, null, 2));
  process.exit(1);
});

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
 *   --url        where to reach Directus     (DIRECTUS_ADMIN_URL, else 127.0.0.1)
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
import { fileURLToPath } from 'node:url';
import { createClient, waitForDirectus } from './directus/client.mjs';
import { applySchema, ensureWebsiteAccess, ensureVisualEditorUrl } from './directus/schema.mjs';
import { seedContent } from './directus/content.mjs';
import { backfillContent } from './directus/backfill.mjs';

// Not import.meta.dirname: that landed in Node 20.11 and is evaluated the moment
// the module loads, so on an older Node it throws before anything can explain
// why. fileURLToPath works everywhere.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Checked at module scope, not inside main(): a requirement this basic has to be
 * reported before anything else runs. Checked by capability rather than version
 * number, because `fetch` is what every request here depends on — it, FormData
 * and Blob all became global in Node 18, which is the real floor.
 */
if (typeof fetch !== 'function') {
  console.error(
    [
      '',
      `✗ This needs Node 18 or newer; this is ${process.versions.node}.`,
      '',
      'Either install a newer Node on the server, or run the bootstrap from a machine',
      'that has one, over an SSH tunnel:',
      '',
      '  ssh -L 8055:127.0.0.1:8055 user@vps',
      '  node scripts/directus-bootstrap.mjs --url http://127.0.0.1:8055',
      '',
    ].join('\n'),
  );
  process.exit(1);
}

/**
 * Minimal .env reader — enough for KEY=value, quoted or not.
 *
 * Later lines win, which is what dotenv and docker compose both do. It matters
 * more than it sounds: a `.env` that has picked up a duplicate key — an edit
 * gone wrong, a comment that lost its `#` — silently resolves to the wrong one
 * otherwise, and "first wins" picks exactly the line a human would read past.
 * A real value set in the environment still beats the file.
 */
async function loadEnv() {
  const fromFile = new Map();
  try {
    const text = await readFile(path.join(ROOT, '.env'), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      if (/^\s*#/.test(line)) continue;
      const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/i.exec(line);
      if (!match) continue;
      fromFile.set(match[1], match[2].trim().replace(/^["'](.*)["']$/, '$1'));
    }
  } catch {
    /* no .env — rely on the real environment and the flags */
  }
  for (const [key, value] of fromFile) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

function arg(name) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return undefined;
  const next = process.argv[index + 1];
  return next && !next.startsWith('--') ? next : 'true';
}

const has = (name) => process.argv.includes(`--${name}`);

const HELP = `
Turns an empty Directus into this website's backend.

  npm run directus:bootstrap

Options
  --url <url>        where to reach Directus (default http://127.0.0.1:8055)
  --email <email>    admin email     (default DIRECTUS_ADMIN_EMAIL from .env)
  --password <pw>    admin password  (default DIRECTUS_ADMIN_PASSWORD from .env)
  --token <token>    the static token to install (default: generate one)
  --site <url>       the website's URL, registered with the Visual Editor
  --fill-empty       fill only the fields that are still empty, from the seed —
                     use after a pull that adds fields to an installation that
                     already has content. Never overwrites an existing value.
  --dry-run          with --fill-empty, list what it would change and stop
  --force            seed content again even if some already exists
  --schema-only      collections, relations and access — no content
  --content-only     content only — assumes the schema is there
  --help

Running it from a laptop against a server, over an SSH tunnel:

  ssh -L 8055:127.0.0.1:8055 user@vps
  npm run directus:bootstrap -- --url http://127.0.0.1:8055 --site https://www.gradebd.com

That uses the admin credentials in your local .env. If the server's differ, pass
them: --email admin@example.com --password 'the real one'
`;

async function main() {
  if (has('help') || process.argv.includes('-h')) {
    console.log(HELP);
    return;
  }

  await loadEnv();

  /**
   * Where this script connects, which is not the same thing as where a browser
   * reaches Directus. It runs on the box (or through an SSH tunnel), so the
   * default is loopback.
   *
   * DIRECTUS_PUBLIC_URL is deliberately NOT consulted. During a first deploy it
   * already names a hostname that has no DNS, no nginx and no certificate yet,
   * so honouring it here meant the bootstrap sat there retrying a host that
   * could not answer until it timed out.
   */
  const requestedUrl =
    arg('url') ||
    process.env.DIRECTUS_ADMIN_URL ||
    `http://127.0.0.1:${process.env.DIRECTUS_PORT || 8055}`;
  const email = arg('email') || process.env.DIRECTUS_ADMIN_EMAIL;
  const password = arg('password') || process.env.DIRECTUS_ADMIN_PASSWORD;

  // A generated token is printed at the end; it is only useful once it is in
  // .env, so it is never written silently.
  const generated = !arg('token') && !process.env.DIRECTUS_TOKEN;
  const token = arg('token') || process.env.DIRECTUS_TOKEN || randomBytes(32).toString('hex');

  console.log(`Directus: ${requestedUrl}`);
  // Returns whichever loopback form actually answered — see waitForDirectus.
  const url = await waitForDirectus(requestedUrl);

  if (!email || !password) {
    throw new Error(
      [
        'No admin credentials.',
        'Set DIRECTUS_ADMIN_EMAIL and DIRECTUS_ADMIN_PASSWORD in .env, or pass',
        '--email and --password.',
      ].join('\n'),
    );
  }

  const client = createClient({ url, email, password });
  try {
    await client.login();
  } catch (error) {
    throw new Error(
      [
        error.message,
        'These come from DIRECTUS_ADMIN_EMAIL / DIRECTUS_ADMIN_PASSWORD in .env.',
        'If the admin password was changed in the Directus UI, .env is now stale —',
        'pass the real one with --password.',
      ].join('\n'),
    );
  }

  const me = await client.get('/users/me?fields=email,role.name');
  console.log(`Signed in as ${me.email}`);

  if (!has('content-only')) {
    await applySchema(client);
    await ensureWebsiteAccess(client, token);
    await ensureVisualEditorUrl(client, arg('site') || process.env.SITE_URL);
  }
  if (has('fill-empty')) {
    // Deliberately not part of a normal run: a fresh install is seeded by
    // `seedContent`, and this is only for an installation that already has
    // content and has just been given new fields.
    await backfillContent(client, { dryRun: has('dry-run') });
  } else if (!has('schema-only')) {
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

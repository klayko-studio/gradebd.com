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

const HELP = `
Turns an empty Directus into this website's backend.

  npm run directus:bootstrap

Options
  --url <url>        where to reach Directus (default http://127.0.0.1:8055)
  --email <email>    admin email     (default DIRECTUS_ADMIN_EMAIL from .env)
  --password <pw>    admin password  (default DIRECTUS_ADMIN_PASSWORD from .env)
  --token <token>    the static token to install (default: generate one)
  --site <url>       the website's URL, registered with the Visual Editor
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

  // import.meta.dirname, used to find the repo root, landed in 20.11.
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 20 || (major === 20 && minor < 11)) {
    throw new Error(
      [
        `Node 20.11 or newer is needed; this is ${process.versions.node}.`,
        'Either install Node 22 on the server, or run the bootstrap from a machine that',
        'has it, over an SSH tunnel — see --help.',
      ].join('\n'),
    );
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

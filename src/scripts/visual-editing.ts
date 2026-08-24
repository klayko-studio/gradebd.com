/**
 * Directus Visual Editing — click text on the rendered page, edit it in place.
 *
 * Everything it needs is already in the markup: `src/lib/cms.ts` exports
 * `editable()`, and components spread it onto the element that renders a field,
 * which emits `data-directus="collection:…;item:…;fields:…"`. This module is
 * only the part that turns those attributes into an editable overlay.
 *
 * Two deliberate choices:
 *
 * - The library is loaded through a dynamic `import()`, so Vite splits it into
 *   its own chunk. A visitor who is not a moderator never downloads it.
 * - It runs only inside an iframe. Outside the admin there is nothing to talk
 *   to, and the library would sit there listening for messages that never come.
 */

async function start() {
  // Outside the Directus admin there is no editor to connect to.
  if (window.self === window.top) return;

  const directusUrl = document.body.dataset.directusUrl;
  if (!directusUrl) return;

  const { apply } = await import('@directus/visual-editing');

  await apply({
    directusUrl,
    // The page was rendered from the values that existed before the save, so
    // re-rendering is the only way to show the edit in its real context —
    // wrapped text reflows, a longer heading pushes the section down. The site
    // renders per request, so a reload is enough; there is no build to wait for.
    onSaved: () => window.location.reload(),
  });
}

void start();

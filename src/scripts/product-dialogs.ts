import { mountLightbox, type Slide } from './lightbox';

/**
 * Wiring for the product detail pop-ups.
 *
 * The range pages and All Products render the same `ProductDialog` markup and
 * had the same eighty lines of script each, kept in step by hand. They are one
 * module now — which is also why the viewer only had to learn about video once.
 *
 * What it does: opens a dialog from a card, closes it from the button or the
 * backdrop, switches the main view from the thumbnail strip, and hands the whole
 * list of views to the full-screen viewer when the main view is pressed.
 */

/** A view as the dialog serialises it into `data-views`. */
type View = Slide;

export function mountProductDialogs(lightboxId: string): void {
  const viewer = mountLightbox(lightboxId);

  document.querySelectorAll<HTMLElement>('[data-dialog-open]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const id = trigger.dataset.dialogOpen;
      const dialog = id ? document.getElementById(id) : null;
      if (dialog instanceof HTMLDialogElement) dialog.showModal();
    });
  });

  document.querySelectorAll<HTMLDialogElement>('dialog.product-dialog').forEach((dialog) => {
    dialog.querySelector('[data-dialog-close]')?.addEventListener('click', () => dialog.close());

    /**
     * Clicking the backdrop closes. A click whose target is the dialog element
     * itself landed on the backdrop, because everything visible is inside the
     * panel and the dialog carries no padding of its own.
     *
     * This used to compare the pointer's coordinates against the panel's box
     * instead, which closed the dialog whenever anyone activated a control inside
     * it from the keyboard: an Enter or Space press fires a click with clientX and
     * clientY both 0, and 0,0 is outside a centred panel. Pressing Enter on a
     * thumbnail shut the whole dialog.
     */
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) dialog.close();
    });

    const main = dialog.querySelector<HTMLImageElement>('[data-dialog-main]');
    const zoom = dialog.querySelector<HTMLButtonElement>('[data-dialog-zoom]');
    const playBadge = dialog.querySelector<HTMLElement>('.play-badge');
    const zoomBadge = dialog.querySelector<HTMLElement>('.zoom-badge');
    const thumbs = [...dialog.querySelectorAll<HTMLButtonElement>('[data-dialog-thumb]')];
    const accent = dialog.dataset.dialogAccent ?? 'currentColor';
    const views = JSON.parse(dialog.dataset.views ?? '[]') as View[];

    /**
     * Which view the reader is looking at, held as an index rather than worked
     * out from the main image's `src`.
     *
     * Matching on `src` was how this used to find its place in the list, and it
     * cannot survive video: a video's frame shows the product's card photograph
     * as its poster, so its `src` is the FIRST view's — and pressing play would
     * have opened the viewer on the still every time.
     */
    let selected = 0;

    const select = (index: number) => {
      const view = views[index];
      if (!view || !main) return;
      selected = index;

      const isVideo = view.type === 'video';
      // A video shows its poster in the frame; the file itself only loads once
      // the reader asks for it by pressing play.
      main.src = isVideo ? (view.poster ?? main.src) : view.src;
      main.alt = isVideo ? '' : (view.alt ?? '');
      playBadge?.classList.toggle('is-on', isVideo);
      zoomBadge?.classList.toggle('is-off', isVideo);
      main.parentElement?.classList.toggle('cursor-zoom-in', !isVideo);
      main.parentElement?.classList.toggle('cursor-pointer', isVideo);
      zoom?.setAttribute(
        'aria-label',
        isVideo ? 'Play this video full screen' : 'View these images full screen',
      );

      thumbs.forEach((thumb) => {
        const on = Number(thumb.dataset.dialogView) === index;
        thumb.style.borderColor = on ? accent : 'transparent';
        thumb.setAttribute('aria-current', on ? 'true' : 'false');
      });
    };

    thumbs.forEach((thumb) => {
      thumb.addEventListener('click', () => select(Number(thumb.dataset.dialogView)));
    });

    /**
     * Pressing the main view opens the full-screen viewer over this dialog with
     * every view of this SKU, starting on the one showing. Modal dialogs stack
     * in the top layer, so the viewer lands on top of this panel and ESC closes
     * the viewer first — no z-index and no hiding this dialog.
     */
    if (viewer && zoom) {
      zoom.addEventListener('click', () => viewer.open(views, selected, zoom));
    }

    // Sets the first thumbnail's border and the right badge without a second
    // copy of that logic sitting in the markup.
    if (views.length > 0) select(0);
  });
}

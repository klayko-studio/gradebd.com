/**
 * Behaviour for the full-screen image viewer.
 *
 * Kept apart from the markup because two very different things open the same
 * viewer: the gallery plates, and the main image inside a product dialog. All
 * they have in common is a list of pictures, so that is the whole interface —
 * hand it slides, it shows them.
 *
 * The <dialog> itself supplies the top layer, the backdrop, ESC and focus
 * trapping. What is added here is what it does not do: arrow keys, prev/next, a
 * counter, preloading the neighbours, and click-the-dark-to-close.
 */
export interface Slide {
  src: string;
  alt?: string;
  caption?: string;
  tag?: string;
}

export interface Lightbox {
  /** Show `slides` starting at `at`. Focus returns to `from` on close. */
  open(slides: Slide[], at?: number, from?: HTMLElement | null): void;
}

export function mountLightbox(id: string): Lightbox | null {
  const dialog = document.getElementById(id);
  if (!(dialog instanceof HTMLDialogElement)) return null;

  const image = dialog.querySelector<HTMLImageElement>('[data-lightbox-image]');
  const caption = dialog.querySelector<HTMLElement>('[data-lightbox-caption]');
  const tag = dialog.querySelector<HTMLElement>('[data-lightbox-tag]');
  const indexLabel = dialog.querySelector<HTMLElement>('[data-lightbox-index]');
  const totalLabel = dialog.querySelector<HTMLElement>('[data-lightbox-total]');
  const counter = dialog.querySelector<HTMLElement>('[data-lightbox-counter]');
  const prev = dialog.querySelector<HTMLButtonElement>('[data-lightbox-prev]');
  const next = dialog.querySelector<HTMLButtonElement>('[data-lightbox-next]');
  if (!image) return null;

  let slides: Slide[] = [];
  let current = 0;
  let origin: HTMLElement | null = null;

  /** Warm the neighbours so stepping through does not flash an empty frame. */
  const preload = (from: number) => {
    for (const offset of [-1, 1]) {
      const neighbour = slides[(from + offset + slides.length) % slides.length];
      if (neighbour) new Image().src = neighbour.src;
    }
  };

  const show = (to: number) => {
    if (slides.length === 0) return;
    current = (to + slides.length) % slides.length;
    const slide = slides[current];
    image.src = slide.src;
    image.alt = slide.alt ?? '';
    if (caption) caption.textContent = slide.caption ?? '';
    if (tag) tag.textContent = slide.tag ?? '';
    if (indexLabel) indexLabel.textContent = String(current + 1);
    preload(current);
  };

  prev?.addEventListener('click', () => show(current - 1));
  next?.addEventListener('click', () => show(current + 1));
  dialog.querySelector('[data-lightbox-close]')?.addEventListener('click', () => dialog.close());

  dialog.addEventListener('keydown', (event) => {
    if (slides.length < 2) return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      show(current - 1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      show(current + 1);
    }
  });

  // Clicking the dark area closes. Everything interactive in there is a button,
  // so a click landing on the dialog itself or its padding wrapper hit nothing.
  dialog.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    if (target === dialog || target.dataset.lightboxBackdrop !== undefined) dialog.close();
  });

  // Closing a dialog does not put the keyboard back where it was on its own.
  dialog.addEventListener('close', () => origin?.focus());

  return {
    open(list, at = 0, from = null) {
      if (list.length === 0) return;
      slides = list;
      origin = from;

      // A single picture has nothing to step through, so the controls that would
      // only ever return to the same frame are taken out rather than disabled.
      const many = slides.length > 1;
      prev?.toggleAttribute('hidden', !many);
      next?.toggleAttribute('hidden', !many);
      counter?.toggleAttribute('hidden', !many);
      if (totalLabel) totalLabel.textContent = String(slides.length);

      show(at);
      dialog.showModal();
    },
  };
}

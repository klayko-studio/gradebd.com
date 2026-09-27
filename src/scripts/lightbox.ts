/**
 * Behaviour for the full-screen media viewer.
 *
 * Kept apart from the markup because two very different things open the same
 * viewer: the gallery plates, and the main image inside a product dialog. All
 * they have in common is a list of pictures, so that is the whole interface —
 * hand it slides, it shows them.
 *
 * The <dialog> itself supplies the top layer, the backdrop, ESC and focus
 * trapping. What is added here is what it does not do: arrow keys, prev/next, a
 * counter, preloading the neighbours, zoom, and click-the-dark-to-close.
 */
export interface Slide {
  src: string;
  alt?: string;
  caption?: string;
  tag?: string;
  /** Stills are the default; `video` swaps in the <video> element. */
  type?: 'image' | 'video';
  /** Poster frame for a video, so the stage is never an empty black box. */
  poster?: string;
}

export interface Lightbox {
  /** Show `slides` starting at `at`. Focus returns to `from` on close. */
  open(slides: Slide[], at?: number, from?: HTMLElement | null): void;
}

export function mountLightbox(id: string): Lightbox | null {
  const dialog = document.getElementById(id);
  if (!(dialog instanceof HTMLDialogElement)) return null;

  const image = dialog.querySelector<HTMLImageElement>('[data-lightbox-image]');
  const video = dialog.querySelector<HTMLVideoElement>('[data-lightbox-video]');
  const caption = dialog.querySelector<HTMLElement>('[data-lightbox-caption]');
  const tag = dialog.querySelector<HTMLElement>('[data-lightbox-tag]');
  const indexLabel = dialog.querySelector<HTMLElement>('[data-lightbox-index]');
  const totalLabel = dialog.querySelector<HTMLElement>('[data-lightbox-total]');
  const counter = dialog.querySelector<HTMLElement>('[data-lightbox-counter]');
  const prev = dialog.querySelector<HTMLButtonElement>('[data-lightbox-prev]');
  const next = dialog.querySelector<HTMLButtonElement>('[data-lightbox-next]');
  if (!image) return null;

  const stage = dialog.querySelector<HTMLElement>('[data-lightbox-stage]');
  const zoomControls = dialog.querySelector<HTMLElement>('[data-lightbox-zoom-controls]');
  const zoomIn = dialog.querySelector<HTMLButtonElement>('[data-lightbox-zoom-in]');
  const zoomOut = dialog.querySelector<HTMLButtonElement>('[data-lightbox-zoom-out]');
  const zoomReset = dialog.querySelector<HTMLButtonElement>('[data-lightbox-zoom-reset]');
  const zoomLevel = dialog.querySelector<HTMLElement>('[data-lightbox-zoom-level]');

  let slides: Slide[] = [];
  let current = 0;
  let origin: HTMLElement | null = null;

  /** A video is shown, not zoomed — see the note in the component. */
  const showingVideo = () => slides[current]?.type === 'video';

  /**
   * Zoom, on the client's "the image should zoom in or zoom out on mouse scroll".
   *
   * Held as a scale plus a pan offset and written to the image as one transform.
   * Panning is what makes zooming useful — magnifying about the centre and then
   * being unable to reach the corner of a pack shot is worse than not zooming —
   * so a zoomed picture drags, and the drag is clamped to the picture's own
   * edges so it can never be pushed out of the frame.
   */
  const MAX_ZOOM = 4;
  /** One press of the +/- buttons. 1.5 reaches the 4x ceiling in four presses. */
  const BUTTON_STEP = 1.5;
  let zoom = 1;
  let panX = 0;
  let panY = 0;

  /**
   * The rendered size of the PICTURE, which is not the size of the <img>.
   * `object-contain` letterboxes it inside the element, so clamping the pan
   * against the element box would allow dragging the picture into the empty
   * bands beside it. Everything here works off the contained size instead.
   */
  const pictureSize = () => {
    const box = image.getBoundingClientRect();
    const nw = image.naturalWidth;
    const nh = image.naturalHeight;
    if (!nw || !nh) return { w: box.width, h: box.height };
    const fit = Math.min(box.width / nw, box.height / nh);
    return { w: nw * fit, h: nh * fit };
  };

  const clampPan = () => {
    const { w, h } = pictureSize();
    const box = image.getBoundingClientRect();
    // Only the part of the scaled picture that overhangs the frame is reachable.
    const limitX = Math.max(0, (w * zoom - box.width) / 2);
    const limitY = Math.max(0, (h * zoom - box.height) / 2);
    panX = Math.min(limitX, Math.max(-limitX, panX));
    panY = Math.min(limitY, Math.max(-limitY, panY));
  };

  /**
   * The readout and the two buttons are the only sign on screen of where the
   * zoom currently is, so they are refreshed from the same place that moves it
   * rather than by each caller remembering to.
   */
  const syncControls = () => {
    const isVideo = showingVideo();
    zoomControls?.toggleAttribute('hidden', isVideo);
    if (zoomLevel) zoomLevel.textContent = `${Math.round(zoom * 100)}%`;
    if (zoomIn) zoomIn.disabled = isVideo || zoom >= MAX_ZOOM - 0.001;
    if (zoomOut) zoomOut.disabled = isVideo || zoom <= 1.001;
    if (zoomReset) zoomReset.disabled = isVideo || zoom <= 1.001;
  };

  /**
   * The drag hint shows the first time a picture is big enough to drag, then
   * takes itself off after a few seconds — or the moment the reader drags, which
   * is the point at which it has done its job.
   */
  let hintTimer = 0;
  /* Once per picture, tracked here rather than read back off the class: panning
     calls `applyZoom` on every move event, and a class check would have the hint
     reappearing under the reader's own finger. */
  let hintOffered = false;
  const retireHint = () => {
    window.clearTimeout(hintTimer);
    stage?.classList.add('hint-done');
  };
  const offerHint = () => {
    if (hintOffered || !stage) return;
    hintOffered = true;
    stage.classList.remove('hint-done');
    hintTimer = window.setTimeout(retireHint, 2600);
  };

  const applyZoom = () => {
    clampPan();
    image.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    const zoomed = zoom > 1;
    if (zoomed) offerHint();
    stage?.classList.toggle('is-zoomed', zoomed);
    syncControls();
  };

  const resetZoom = () => {
    zoom = 1;
    panX = 0;
    panY = 0;
    image.style.transform = '';
    stage?.classList.remove('is-zoomed', 'is-panning');
    // Armed again for the next picture.
    hintOffered = false;
    window.clearTimeout(hintTimer);
    stage?.classList.add('hint-done');
    syncControls();
  };

  /**
   * Zoom about the cursor rather than the centre, so the thing under the pointer
   * stays under the pointer. Without it, zooming into a detail means zooming and
   * then hunting for it again. The buttons pass no coordinates, which falls back
   * to the centre of the frame — the right anchor when there is no pointer to
   * anchor to.
   */
  const zoomAt = (factor: number, clientX?: number, clientY?: number) => {
    if (showingVideo()) return;
    const before = zoom;
    const after = Math.min(MAX_ZOOM, Math.max(1, before * factor));
    if (after === before) return;

    if (clientX !== undefined && clientY !== undefined) {
      const box = image.getBoundingClientRect();
      // Where the cursor is relative to the frame's centre.
      const cx = clientX - (box.left + box.width / 2);
      const cy = clientY - (box.top + box.height / 2);
      panX = cx - ((cx - panX) * after) / before;
      panY = cy - ((cy - panY) * after) / before;
    } else {
      // Zooming from a button keeps the pan proportional, so repeated presses
      // travel straight in on whatever the reader had already dragged into view
      // instead of drifting back towards the middle.
      panX = (panX * after) / before;
      panY = (panY * after) / before;
    }

    zoom = after;
    if (zoom === 1) {
      panX = 0;
      panY = 0;
    }
    applyZoom();
  };

  zoomIn?.addEventListener('click', () => zoomAt(BUTTON_STEP));
  zoomOut?.addEventListener('click', () => zoomAt(1 / BUTTON_STEP));
  zoomReset?.addEventListener('click', () => resetZoom());

  if (stage) {
    stage.addEventListener(
      'wheel',
      (event) => {
        if (showingVideo()) return;
        // The page behind a modal dialog can still scroll, and a wheel that both
        // zoomed and scrolled would be unusable.
        event.preventDefault();
        // Exponential, so one notch feels the same whatever the current zoom;
        // a linear step crawls when zoomed in and lurches when zoomed out.
        zoomAt(Math.exp(-event.deltaY * 0.002), event.clientX, event.clientY);
      },
      { passive: false },
    );

    /**
     * One pointer pans, two pinch. Pointer events rather than touch events, so a
     * mouse drag and a finger drag are the same code path and a trackpad's
     * two-finger gesture — which arrives as a wheel event with ctrlKey — is
     * already covered by the handler above.
     *
     * A wheel does not exist on a phone, so without this the zoom the client
     * asked for is desktop-only: you could open a pack shot on a phone and have
     * no way to look closer at it, which is where looking closer matters most.
     */
    const points = new Map<number, { x: number; y: number }>();
    let pinchDistance = 0;
    let pinchZoom = 1;

    const spread = () => {
      const [a, b] = [...points.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const midpoint = () => {
      const [a, b] = [...points.values()];
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    };

    stage.addEventListener('pointerdown', (event) => {
      // A video's own controls are inside the stage; capturing its pointers
      // would take the timeline scrubber away from the reader.
      if (showingVideo()) return;
      points.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (points.size === 2) {
        // Freeze the scale this gesture started from, so the whole pinch is
        // measured against one baseline rather than accumulating rounding from
        // every move event.
        pinchDistance = spread();
        pinchZoom = zoom;
        stage.classList.remove('is-panning');
        return;
      }
      if (points.size === 1 && zoom > 1) {
        // Stops the press turning into a text selection or a native image drag,
        // either of which ends with `pointercancel` and kills the pan.
        event.preventDefault();
        stage.classList.add('is-panning');
        stage.setPointerCapture(event.pointerId);
        retireHint();
      }
    });

    /**
     * The backstop for the same thing, and the one that does not rely on the
     * browser honouring `draggable="false"` or `-webkit-user-drag`.
     *
     * A native image drag fires `pointercancel`, and `pointercancel` is where
     * this module gives the gesture up — so without this the pan ends on the
     * first pixel of movement for every mouse user. The long version is in the
     * component's stylesheet.
     */
    stage.addEventListener('dragstart', (event) => event.preventDefault());

    stage.addEventListener('pointermove', (event) => {
      const last = points.get(event.pointerId);
      if (!last) return;
      const dx = event.clientX - last.x;
      const dy = event.clientY - last.y;
      points.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (points.size >= 2) {
        if (pinchDistance === 0) return;
        const centre = midpoint();
        // The ratio against the gesture's own baseline, applied to the scale it
        // began at — `zoomAt` takes a factor relative to the current zoom, so
        // this is the target over where we are now.
        const target = Math.min(MAX_ZOOM, Math.max(1, (pinchZoom * spread()) / pinchDistance));
        zoomAt(target / zoom, centre.x, centre.y);
        return;
      }

      if (stage.classList.contains('is-panning')) {
        panX += dx;
        panY += dy;
        applyZoom();
      }
    });

    /**
     * Double-tap to zoom, the gesture every phone photo viewer has, and on a
     * touch screen the easiest way back out.
     *
     * The guards are not decoration. Lifting two fingers from a pinch fires two
     * `pointerup` events milliseconds apart, and a naive handler reads that as a
     * double-tap and throws the pinch away the instant it finishes — which is
     * exactly what happened here, and it looked like pinch was not working at
     * all rather than working and being undone. So a tap only counts when the
     * gesture used one finger, that finger barely moved, and it was brief.
     */
    const TAP_SLOP = 10;
    const TAP_TIME = 250;
    let maxPointers = 0;
    let downAt = 0;
    let downX = 0;
    let downY = 0;
    let lastTap = 0;

    stage.addEventListener('pointerdown', (event) => {
      if (showingVideo()) return;
      maxPointers = Math.max(maxPointers, points.size);
      if (points.size === 1) {
        downAt = Date.now();
        downX = event.clientX;
        downY = event.clientY;
      }
    });

    const endPointer = (event: PointerEvent) => {
      const wasSingle = maxPointers === 1;
      points.delete(event.pointerId);
      if (points.size < 2) pinchDistance = 0;
      if (points.size === 0) {
        stage.classList.remove('is-panning');
        maxPointers = 0;
      }
      if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);

      if (showingVideo()) return;
      if (event.pointerType === 'mouse' || !wasSingle) return;
      const moved = Math.hypot(event.clientX - downX, event.clientY - downY);
      if (moved > TAP_SLOP || Date.now() - downAt > TAP_TIME) return;

      const now = Date.now();
      if (now - lastTap < 300) {
        if (zoom > 1) resetZoom();
        else zoomAt(2.5, event.clientX, event.clientY);
        lastTap = 0;
        return;
      }
      lastTap = now;
    };
    stage.addEventListener('pointerup', endPointer);
    stage.addEventListener('pointercancel', endPointer);

    /**
     * Double-CLICK to zoom, the mouse equivalent. The tap handler above skips
     * `pointerType === 'mouse'` on purpose — a mouse has no tap — so without
     * this a desktop reader has the wheel and the buttons but not the gesture
     * every other image viewer gives them.
     */
    stage.addEventListener('dblclick', (event) => {
      if (showingVideo()) return;
      event.preventDefault();
      if (zoom > 1) resetZoom();
      else zoomAt(2.5, event.clientX, event.clientY);
    });
  }

  /** Warm the neighbours so stepping through does not flash an empty frame. */
  const preload = (from: number) => {
    for (const offset of [-1, 1]) {
      const neighbour = slides[(from + offset + slides.length) % slides.length];
      // Only stills. Preloading a video would pull megabytes for a slide the
      // reader may never reach.
      if (neighbour && neighbour.type !== 'video') new Image().src = neighbour.src;
    }
  };

  const show = (to: number) => {
    if (slides.length === 0) return;
    // A new picture starts at its resting size: carrying a zoom across would
    // land the reader somewhere arbitrary in an image they have not seen yet.
    resetZoom();
    current = (to + slides.length) % slides.length;
    const slide = slides[current];
    const isVideo = slide.type === 'video';

    stage?.classList.toggle('is-video', isVideo);
    image.classList.toggle('hidden', isVideo);
    video?.classList.toggle('hidden', !isVideo);

    if (isVideo && video) {
      // Stepping away from a video must stop it, or the sound follows the reader
      // to the next slide. Clearing `src` as well as pausing stops the download.
      video.pause();
      video.src = slide.src;
      if (slide.poster) video.poster = slide.poster;
      else video.removeAttribute('poster');
      video.setAttribute('aria-label', slide.alt ?? slide.caption ?? 'Video');
      // `src` was set after the element already had one; without this the
      // element keeps playing the previous file until it is next touched.
      video.load();
      image.removeAttribute('src');
    } else {
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      image.src = slide.src;
      image.alt = slide.alt ?? '';
    }

    if (caption) caption.textContent = slide.caption ?? '';
    if (tag) tag.textContent = slide.tag ?? '';
    if (indexLabel) indexLabel.textContent = String(current + 1);
    syncControls();
    preload(current);
  };

  prev?.addEventListener('click', () => show(current - 1));
  next?.addEventListener('click', () => show(current + 1));
  dialog.querySelector('[data-lightbox-close]')?.addEventListener('click', () => dialog.close());

  /**
   * Keyboard zoom, so the feature is not mouse-only. `+`/`-` and `0` to reset
   * are what every image viewer uses, and without them a reader on a trackpad-less
   * machine or using the keyboard alone has no way in.
   */
  dialog.addEventListener('keydown', (event) => {
    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoomAt(BUTTON_STEP);
    }
    if (event.key === '-' || event.key === '_') {
      event.preventDefault();
      zoomAt(1 / BUTTON_STEP);
    }
    if (event.key === '0') {
      event.preventDefault();
      resetZoom();
    }
  });

  dialog.addEventListener('keydown', (event) => {
    if (slides.length < 2) return;
    // Arrow keys scrub a focused <video>; stepping the slide instead would take
    // the timeline away from anyone using the player with the keyboard.
    if (event.target === video) return;
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

  // Closing a dialog does not put the keyboard back where it was on its own, and
  // a video left playing behind a closed dialog keeps its sound going.
  dialog.addEventListener('close', () => {
    resetZoom();
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
    }
    origin?.focus();
  });

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

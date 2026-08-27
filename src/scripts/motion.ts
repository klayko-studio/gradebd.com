import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * The site's motion layer.
 *
 * Two rules shape everything here. Motion is for orientation, not decoration: it
 * shows where a thing came from, so entrances travel a short distance and settle.
 * And it is entirely optional — every effect below is skipped when the visitor asks
 * for reduced motion, with the page left in its finished state rather than mid-way
 * through an animation that never runs.
 */

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Show everything, animate nothing. */
function settle() {
  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    el.classList.add('is-revealed');
  });
  gsap.set('[data-anim-line]', { yPercent: 0, opacity: 1 });
}

if (reduced) {
  settle();
} else {
  gsap.registerPlugin(ScrollTrigger);

  /* ------------------------------------------------------------------ entrance */

  /**
   * The headline's lines slide up from behind their own clipping box, which reads as
   * type being set rather than fading in. Everything else in the block follows on a
   * short stagger so the eye lands on the words first.
   */
  function revealLines(scope: ParentNode, delay = 0) {
    const lines = scope.querySelectorAll<HTMLElement>('[data-anim-line]');
    if (!lines.length) return;
    gsap.fromTo(
      lines,
      { yPercent: 108 },
      { yPercent: 0, duration: 0.9, ease: 'expo.out', stagger: 0.08, delay },
    );
  }

  const hero = document.querySelector<HTMLElement>('[data-slider]');
  const banner = document.querySelector<HTMLElement>('[data-anim-banner]');
  const stage = hero ?? banner;

  if (stage) {
    const copy = hero
      ? stage.querySelector<HTMLElement>('[data-slide-copy="0"]')
      : stage.querySelector<HTMLElement>('.rail');

    if (copy) {
      // Siblings of the headline: eyebrow, body, buttons. The headline animates by
      // line, so it is excluded here to avoid animating the same thing twice.
      const rest = [...copy.children].filter((el) => el.tagName !== 'H1');
      gsap.fromTo(
        rest,
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.09, delay: 0.18 },
      );
      revealLines(copy, 0.1);
    }

    // The controls are furthest from the message, so they arrive last.
    const controls = stage.querySelectorAll<HTMLElement>('[data-slide-counter], [data-slide-dot]');
    if (controls.length) {
      gsap.fromTo(
        controls,
        { opacity: 0 },
        { opacity: 1, duration: 0.6, ease: 'power2.out', delay: 0.6, stagger: 0.03 },
      );
    }

    /**
     * A very slow push in on the photograph. Small enough that it is not noticed as
     * movement — it just stops the hero feeling like a still.
     *
     * This scales the media *container*, never the <img>. The first hero slide is
     * mirrored with an inline `transform: scaleX(-1)`, and GSAP reads that as a
     * 180-degree rotation with a negative scale — tweening `scale` on top of it
     * flips the photograph on both axes instead of zooming it.
     */
    const firstMedia = stage.querySelector<HTMLElement>('[data-slide-media="0"], [data-parallax]');
    if (firstMedia) {
      gsap.fromTo(firstMedia, { scale: 1.06 }, { scale: 1, duration: 2.4, ease: 'power2.out' });
    }
  }

  // Re-run the line reveal when the slider moves to another slide.
  hero?.addEventListener('slide:change', (event) => {
    const index = (event as CustomEvent<{ index: number }>).detail?.index ?? 0;
    const copy = hero.querySelector<HTMLElement>(`[data-slide-copy="${index}"]`);
    if (copy) revealLines(copy);
  });

  /* ------------------------------------------------------------------ parallax */

  /**
   * Banner photography drifts slower than the page. Only `y` is animated, so this
   * stays on the compositor; the image is already oversized by object-cover, so
   * there is room to move without exposing an edge.
   */
  document.querySelectorAll<HTMLElement>('[data-parallax]').forEach((img) => {
    gsap.to(img, {
      yPercent: 12,
      ease: 'none',
      scrollTrigger: { trigger: img.parentElement ?? img, start: 'top top', end: 'bottom top', scrub: true },
    });
  });

  /* ------------------------------------------------------------- scroll reveals */

  /**
   * Siblings that share a `[data-reveal-group]` animate together on one trigger, so
   * a row of cards staggers as a row instead of each card firing separately as it
   * crosses the line.
   */
  const groups = new Map<Element, HTMLElement[]>();
  document.querySelectorAll<HTMLElement>('[data-reveal]').forEach((el) => {
    const key = el.closest('[data-reveal-group]') ?? el.parentElement ?? document.body;
    const list = groups.get(key) ?? [];
    list.push(el);
    groups.set(key, list);
  });

  groups.forEach((els) => {
    gsap.to(els, {
      opacity: 1,
      y: 0,
      duration: 0.75,
      ease: 'power3.out',
      stagger: 0.07,
      scrollTrigger: { trigger: els[0], start: 'top 88%', once: true },
      onStart: () => els.forEach((el) => el.classList.add('is-revealed')),
    });
  });

  /* -------------------------------------------------------------------- doodles */

  /**
   * The client's line-art marks drift as the footer comes into view — alternating
   * direction and rate so the field feels like depth rather than one moving layer.
   * Transform-only and scrubbed, so it costs a composite and nothing else.
   */
  document.querySelectorAll<HTMLElement>('[data-doodles]').forEach((field) => {
    const marks = [...field.children] as HTMLElement[];
    marks.forEach((mark, i) => {
      const depth = ((i % 3) + 1) / 3; // three planes
      gsap.to(mark, {
        // Small on purpose. The marks now sit one to a grid cell with only a
        // few pixels of slack around each, so a drift of the old 26px would
        // walk them straight into their neighbours halfway down the scroll.
        y: (i % 2 === 0 ? -1 : 1) * 9 * depth,
        x: (i % 3 === 0 ? 1 : -1) * 4 * depth,
        ease: 'none',
        scrollTrigger: {
          trigger: field.parentElement ?? field,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    });
  });

  /* ------------------------------------------------------------------- counters */

  /**
   * Count the credibility figures up. The label is parsed out of the rendered text
   * rather than passed separately, so "Since 2019" and "300+" both work and the
   * markup stays the source of truth.
   */
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    const raw = el.dataset.count ?? el.textContent ?? '';
    const match = raw.match(/(\D*)(\d[\d,]*)(\D*)/);
    if (!match) return;
    const [, before, digits, after] = match;
    const target = Number(digits.replace(/,/g, ''));
    if (!Number.isFinite(target)) return;

    // Mirror the source's own formatting. A year has no thousands separator, so
    // grouping is applied only where the written figure already groups — otherwise
    // "Since 2019" counts up through "Since 2,013".
    const grouped = digits.includes(',');
    const format = (n: number) => (grouped ? n.toLocaleString('en-GB') : String(n));

    // A year should not count from zero — start close so it reads as a year settling.
    const from = target > 1900 ? target - 12 : 0;
    const state = { value: from };
    el.textContent = `${before}${format(from)}${after}`;

    gsap.to(state, {
      value: target,
      duration: 1.4,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 92%', once: true },
      onUpdate: () => {
        el.textContent = `${before}${format(Math.round(state.value))}${after}`;
      },
      onComplete: () => {
        el.textContent = `${before}${digits}${after}`;
      },
    });
  });
}

/* ------------------------------------------------------------------- header */

/**
 * The bar picks up a shadow once the page has moved, so it reads as sitting above
 * the content rather than being part of it. Its height never changes — the hero
 * measures itself against `--header-h`, and animating that would make the fold
 * jump. Runs regardless of the motion preference: it is a state change, not motion.
 */
const header = document.querySelector<HTMLElement>('[data-header]');
if (header) {
  const sync = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
  sync();
  window.addEventListener('scroll', sync, { passive: true });
}

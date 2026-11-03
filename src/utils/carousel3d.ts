/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Math of the 3D composition (VK-524): the gallery header and the
 * gallery photo cards live in a perspective scene and tilt with the
 * pointer. Pure functions, no DOM — the components only write the
 * result.
 */

export const PERSPECTIVE = 1350;

/**
 * The seed rows and the uploads come with the extension in the file path
 * (a .mp4 photo is still stored as a photo row), so the extension decides
 * how a file is rendered. Shared by the carousels and the hero.
 */
export const isVideoUrl = (url: string): boolean => /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(url);

/**
 * The url to render for a media item: a video plays its own file (its
 * thumbnail is a poster image, not a playable url), an image shows its
 * thumbnail.
 */
export const mediaUrl = (
  filePath: string,
  thumbnailUrl: string | undefined,
  isVideo: boolean
): string => (isVideo ? filePath : thumbnailUrl || filePath);

/**
 * The OS setting: with reduced motion the loops (marquee, hero) stop.
 * Read once per mount; the components that need live updates add their
 * own matchMedia listener.
 */
export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---------------------------------------------------------------------------
// Gallery (VK-524): the 3D header and the 3D photo cards
// ---------------------------------------------------------------------------

/** Max tilt of the header, in degrees. */
export const HEADER_TILT = 8;

/** Max tilt of a photo card, in degrees. */
export const CARD_TILT = 6;

/**
 * Tilt for a pointer at normalized offsets (-1..1) inside an element.
 * The pointer near the top edge tilts the far edge down (rotateX < 0).
 */
export function tiltFor(
  nx: number,
  ny: number,
  max: number
): { rotateX: number; rotateY: number } {
  return { rotateX: -ny * max, rotateY: nx * max };
}

/**
 * The 3D treatment runs with a mouse/trackpad only (no tilt on touch:
 * `pointer: coarse`) and never with reduced motion.
 */
export function canTilt(opts: { coarse: boolean; reduced: boolean }): boolean {
  return !opts.coarse && !opts.reduced;
}

/**
 * The hashtag wall shows the first `limit` tags; the rest wait behind
 * the "ver más" toggle.
 */
export function visibleTags<T>(tags: T[], expanded: boolean, limit = 8): T[] {
  return expanded ? tags : tags.slice(0, limit);
}

/**
 * The month of a memory (photo.month) — the month the timeline shows
 * ("Febrero"). The gallery's "fecha de carga" chip is another thing:
 * when the file was uploaded.
 */
export const sameMonth = (month: string | undefined, value: string): boolean =>
  (month ?? '').trim().toLowerCase() === value.trim().toLowerCase();

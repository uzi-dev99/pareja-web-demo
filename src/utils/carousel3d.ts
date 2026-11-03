/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Math of the 3D month-card cylinder (PWD-497): a continuous `progress`
 * value (cards, fractional) places every card on a horizontal cylinder.
 * Pure functions, no DOM — the component only writes the result.
 */

export const PERSPECTIVE = 1350;

/**
 * The seed rows and the uploads come with the extension in the file path
 * (a .mp4 photo is still stored as a photo row), so the extension decides
 * how a file is rendered. Shared by the two carousels and the hero.
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
 * The OS setting: with reduced motion the loops (marquee, cylinder, hero)
 * stop. Read once per mount; the components that need live updates add
 * their own matchMedia listener.
 */
export const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface CylinderMetrics {
  cardW: number;
  viewportW: number;
}

export interface CardPose {
  /** horizontal offset in px, positive = right of the center */
  x: number;
  /** depth in px, positive = closer to the viewer */
  z: number;
  /** rotation around the vertical axis, in degrees */
  rotateY: number;
  opacity: number;
  visible: boolean;
  /** 1 on the center card, 0 on the sides (scales the mouse parallax) */
  centerFactor: number;
}

// ponytail: the numbers come from the motionsites reference (perspective
// 1350px, center z 400, neighbour z 220, edge z -60, off screen z -250,
// 132/175/195 degrees of rotation). Change them here and every card follows.
const GAP = 36;
const PEEK = 55;
const CENTER_Z = 400;
const NEIGHBOR_Z = 220;
const EDGE_Z = -60;
const OFF_Z = -250;

export const smoothstep = (t: number): number => t * t * (3 - 2 * t);

/** Frame-rate independent ease towards a target. */
export const damp = (current: number, target: number, factor: number): number =>
  current + (target - current) * factor;

/** Closest representation of an offset in [-count/2, count/2]. */
export function wrapOffset(offset: number, count: number): number {
  const half = count / 2;
  let o = offset;
  while (o > half) o -= count;
  while (o < -half) o += count;
  return o;
}

/** Magnetic step: the scene dwells briefly at the center of a card. */
export function virtualIndex(progress: number): number {
  const rounded = Math.round(progress);
  const diff = progress - rounded;
  return rounded + Math.sign(diff) * Math.pow(Math.abs(diff) * 2, 4.2) / 2;
}

/**
 * Position of a single card, given its distance (in cards) to the center.
 *
 * `fadeEnd` is where the card fades out completely: the fade has to finish
 * before the wrap (|offset| = count/2), or the card jumps from one edge of
 * the screen to the other while it is still visible — with six months or
 * fewer the wrap happens inside the visible range.
 */
export function cardPose(offset: number, m: CylinderMetrics, fadeEnd = 3): CardPose {
  const abs = Math.abs(offset);
  const sign = Math.sign(offset) || 1;
  if (abs > fadeEnd) {
    return { x: 0, z: 0, rotateY: 0, opacity: 0, visible: false, centerFactor: 0 };
  }

  const scale = (z: number) => PERSPECTIVE / (PERSPECTIVE - z);
  // object-space x that puts the outer edge of the card at `screen` px
  const edgeX = (screen: number, z: number) => screen / scale(z) - m.cardW / 2;

  let rot: number;
  let z: number;
  let x: number;
  if (abs <= 1) {
    const e = smoothstep(abs);
    rot = e * 132;
    z = CENTER_Z + e * (NEIGHBOR_Z - CENTER_Z);
    x = e * (m.cardW + GAP);
  } else if (abs <= 2) {
    const e = smoothstep(abs - 1);
    rot = 132 + e * 43;
    z = NEIGHBOR_Z + e * (EDGE_Z - NEIGHBOR_Z);
    const start = m.cardW + GAP;
    const end = edgeX(m.viewportW / 2 + PEEK, EDGE_Z);
    x = start + e * (end - start);
  } else {
    const e = smoothstep(Math.min(abs - 2, 1));
    rot = 175 + e * 20;
    z = EDGE_Z + e * (OFF_Z - EDGE_Z);
    const start = edgeX(m.viewportW / 2 + PEEK, EDGE_Z);
    const end = edgeX(m.viewportW / 2 + PEEK + m.cardW, OFF_Z);
    x = start + e * (end - start);
  }

  const fadeStart = Math.max(0, fadeEnd - 1);
  return {
    x: sign * x,
    z,
    // the card on the right turns its right edge towards the viewer
    rotateY: -sign * rot,
    opacity: abs > fadeStart ? 1 - smoothstep(Math.min(abs - fadeStart, 1)) : 1,
    visible: true,
    centerFactor: Math.max(0, 1 - abs)
  };
}

/** Position of every card for a continuous progress value. */
export function cylinderLayout(
  progress: number,
  count: number,
  m: CylinderMetrics
): CardPose[] {
  const active = virtualIndex(progress);
  // the fade ends with the wrap: never later, or a card jumps edge to edge.
  // With two months or fewer there is no hidden slot to fade into: the
  // cards keep the base opacity (a card must not disappear).
  const fadeEnd = count <= 2 ? 3 : Math.min(3, count / 2);
  return Array.from({ length: count }, (_, i) =>
    cardPose(wrapOffset(i - active, count), m, fadeEnd)
  );
}

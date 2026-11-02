/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: the 3D month-card cylinder (PWD-497) turns a continuous
 * progress value into the position of every card.
 *
 *   1. progress 0 centers card 0 and pushes its neighbours to the sides.
 *   2. The scene is cyclic: progress + count is the same picture.
 *   3. Cards more than three slots away are hidden.
 *   4. The magnetic step dwells at the center of a card.
 *   5. The neighbour card sits one card width away and turns its back
 *      to the viewer; the edge card pokes past the viewport edge.
 *
 * ponytail: the math lives in a pure util (src/utils/carousel3d.ts) so
 * it is tested with numbers instead of with a DOM.
 */

import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  cardPose,
  cylinderLayout,
  damp,
  smoothstep,
  virtualIndex,
  wrapOffset
} from '../src/utils/carousel3d';

const ROOT = join(import.meta.dir, '..');
const SRC = readFileSync(join(ROOT, 'src', 'components', 'TimelineCarousel.tsx'), 'utf8');
const TIMELINE = readFileSync(join(ROOT, 'src', 'components', 'Timeline.tsx'), 'utf8');

const M = { cardW: 240, viewportW: 1200 };

test('progress 0 centers card 0 and pushes the neighbours to the sides', () => {
  const poses = cylinderLayout(0, 5, M);
  expect(poses[0].x).toBeCloseTo(0, 5);
  expect(poses[0].z).toBeCloseTo(400, 5);
  expect(poses[0].rotateY).toBeCloseTo(0, 5);
  expect(poses[0].centerFactor).toBeCloseTo(1, 5);
  // the next card goes to the right and turns its right edge to the viewer
  expect(poses[1].x).toBeGreaterThan(0);
  expect(poses[1].rotateY).toBeLessThan(0);
  // the previous one goes to the left
  expect(poses[4].x).toBeLessThan(0);
  expect(poses[4].rotateY).toBeGreaterThan(0);
});

test('the scene is cyclic: progress + count is the same picture', () => {
  const a = cylinderLayout(0, 5, M);
  const b = cylinderLayout(5, 5, M);
  a.forEach((pose, i) => {
    expect(b[i].x).toBeCloseTo(pose.x, 3);
    expect(b[i].z).toBeCloseTo(pose.z, 3);
    expect(b[i].rotateY).toBeCloseTo(pose.rotateY, 3);
  });
});

test('cards more than three slots away are hidden', () => {
  const poses = cylinderLayout(0, 9, M);
  expect(poses[4].visible).toBe(false);
  expect(poses[5].visible).toBe(false);
  expect(poses[3].visible).toBe(true);
  expect(poses[6].visible).toBe(true);
});

test('the magnetic step dwells at the center of a card', () => {
  expect(virtualIndex(0.5)).toBeCloseTo(0.5, 5);
  // a tenth of the way to the next card barely moves the scene
  expect(Math.abs(virtualIndex(0.1))).toBeLessThan(0.02);
  expect(wrapOffset(-5, 5)).toBeCloseTo(0, 5);
  expect(wrapOffset(4, 5)).toBeCloseTo(-1, 5);
});

test('the neighbour card sits one card width away and shows its back', () => {
  const pose = cardPose(1, M);
  expect(pose.x).toBeCloseTo(M.cardW + 36, 5);
  expect(pose.z).toBeCloseTo(220, 5);
  // past 90° the back face of the card is the one facing the viewer
  expect(Math.abs(pose.rotateY)).toBeGreaterThan(90);
  expect(pose.visible).toBe(true);
});

test('the edge card pokes past the viewport edge', () => {
  const pose = cardPose(2, M);
  const scale = 1350 / (1350 + 60);
  expect((pose.x + M.cardW / 2) * scale).toBeGreaterThan(M.viewportW / 2);
  expect(pose.opacity).toBeCloseTo(1, 5);
});

test('smoothstep and damp are the shared easing helpers', () => {
  expect(smoothstep(0)).toBe(0);
  expect(smoothstep(1)).toBe(1);
  expect(smoothstep(0.5)).toBeCloseTo(0.5, 5);
  expect(damp(0, 10, 0.5)).toBe(5);
  expect(damp(10, 0, 0.5)).toBe(5);
});

test('AC1: the cylinder drives the cards with requestAnimationFrame', () => {
  expect(SRC).toMatch(/requestAnimationFrame/);
  expect(SRC).toMatch(/cylinderLayout\(/);
  expect(SRC).toMatch(/onTouchStart/);
  expect(SRC).toMatch(/onTouchEnd/);
});

test('AC2: the rAF loop stops off-screen and reduced motion drops it', () => {
  expect(SRC).toMatch(/IntersectionObserver/);
  expect(SRC).toMatch(/cancelAnimationFrame/);
  expect(SRC).toMatch(/prefers-reduced-motion: reduce/);
});

test('AC3: no bank-card content, and the cards come from the timeline', () => {
  expect(SRC).not.toMatch(/CVV|cvv|chip|Chip|JWT|4242|cardholder|Cardholder/);
  expect(TIMELINE).toMatch(/<MonthCardsCylinder/);
});

test('AC3: un .mp4 etiquetado como imagen se renderiza como video, no como img', () => {
  // ponytail: el bucket de fotos devuelve los dos videos del seed con la
  // extension .mp4 pero etiquetados como image — un <img> con un .mp4
  // queda roto (y el alt se imprime sobre la tarjeta).
  expect(SRC).toMatch(/mp4/);
  expect(SRC).toMatch(/preload="metadata"/);
  // los dos carruseles (el 3D y el plano) usan el mismo helper
  expect(SRC.match(/isVideoUrl\(/g)?.length).toBeGreaterThanOrEqual(2);
});

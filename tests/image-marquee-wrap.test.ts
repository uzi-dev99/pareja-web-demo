/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract of the marquee strip (PWD-495): the track is the photo list
 * duplicated once, so the seam sits at `scrollWidth / 2`. The scroll
 * offset therefore has to live inside `[-halfWidth, 0]`: at `-halfWidth`
 * the second copy is exactly where the first one started, and any
 * positive offset (the user dragged to the right) has to wrap back to
 * the left half.
 *
 * ponytail: pure function, no DOM. The physics live in the component;
 * the arithmetic that makes the loop seamless is what breaks silently
 * (a gap that opens once per lap), so it gets its own test.
 */

import { test, expect } from 'bun:test';
import { wrapOffset } from '../src/components/ImageMarquee';

const HALF = 1000;

test('wrapOffset keeps the offset inside [-halfWidth, 0]', () => {
  expect(wrapOffset(0, HALF)).toBe(0);
  expect(wrapOffset(-500, HALF)).toBe(-500);
  // exactly one strip: the second copy lines up with the first one
  expect(wrapOffset(-HALF, HALF)).toBe(0);
});

test('wrapOffset pulls a positive offset (drag to the right) back to the left half', () => {
  expect(wrapOffset(300, HALF)).toBe(-700);
  expect(wrapOffset(HALF, HALF)).toBe(0);
});

test('wrapOffset survives an offset bigger than one strip', () => {
  expect(wrapOffset(-1500, HALF)).toBe(-500);
  expect(wrapOffset(-2500, HALF)).toBe(-500);
  expect(wrapOffset(2500, HALF)).toBe(-500);
});

test('wrapOffset is a no-op while the track has no width yet', () => {
  expect(wrapOffset(-37, 0)).toBe(-37);
});

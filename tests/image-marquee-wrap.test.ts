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
import { isRealActivation, loopHalfWidth, wrapOffset } from '../src/components/ImageMarquee';

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

test('una activación de teclado no es un drag', () => {
  // ponytail: el flag "was dragged" sólo habla del puntero: un drag
  // que empezó en un hueco (sin slide debajo, sin click que lo consuma)
  // dejaba el flag en true y el siguiente Enter/Space no decía nada.
  // Una activación de teclado tiene detail 0.
  expect(isRealActivation(false, 0)).toBe(true);
  expect(isRealActivation(true, 0)).toBe(true);
  // un click de puntero después de un drag no activa
  expect(isRealActivation(true, 1)).toBe(false);
  // un click de puntero sin drag sí
  expect(isRealActivation(false, 1)).toBe(true);
});

test('the period of the loop is measured between the two copies of the strip', () => {
  // three slides of 300px + a gap of 20px: the second copy starts at 620
  const slides = [
    { offsetLeft: 0 },
    { offsetLeft: 300 },
    { offsetLeft: 600 },
    { offsetLeft: 620 },
    { offsetLeft: 920 },
    { offsetLeft: 1220 }
  ];
  // scrollWidth / 2 (610) is half a gap short: that half gap jumps the
  // strip once per lap
  expect(loopHalfWidth(slides, 3, 1220)).toBe(620);
  // without the second copy there is nothing to measure: the fallback is
  // half the track
  expect(loopHalfWidth(slides, 0, 1220)).toBe(610);
  expect(loopHalfWidth(slides, 6, 1220)).toBe(610);
});

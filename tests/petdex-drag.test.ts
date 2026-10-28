/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure-logic tests for the cat drag interaction. The pointer-event handlers
 * in CatTamagotchiBox stay thin; only the position math is exercised here.
 *
 * ponytail: assert-heavy, no fixtures, no DOM, no React.
 */

import { test, expect, describe } from 'bun:test';
import {
  CAT_BOX_BOUNDS,
  clampCatPosition,
  applyDragDelta,
  deltaToPercent,
} from '../src/pets/drag';

describe('CAT_BOX_BOUNDS', () => {
  test('x is 12..84 and y is 38..74', () => {
    expect(CAT_BOX_BOUNDS.xMin).toBe(12);
    expect(CAT_BOX_BOUNDS.xMax).toBe(84);
    expect(CAT_BOX_BOUNDS.yMin).toBe(38);
    expect(CAT_BOX_BOUNDS.yMax).toBe(74);
  });
});

describe('clampCatPosition', () => {
  test('a position inside bounds is returned unchanged', () => {
    expect(clampCatPosition(40, 50)).toEqual({ x: 40, y: 50 });
  });

  test('x below xMin is clamped up', () => {
    expect(clampCatPosition(0, 50)).toEqual({ x: 12, y: 50 });
  });

  test('x above xMax is clamped down', () => {
    expect(clampCatPosition(99, 50)).toEqual({ x: 84, y: 50 });
  });

  test('y below yMin is clamped up', () => {
    expect(clampCatPosition(40, 0)).toEqual({ x: 40, y: 38 });
  });

  test('y above yMax is clamped down', () => {
    expect(clampCatPosition(40, 99)).toEqual({ x: 40, y: 74 });
  });

  test('negative and out-of-range inputs both clamp', () => {
    expect(clampCatPosition(-50, 200)).toEqual({ x: 12, y: 74 });
  });
});

describe('deltaToPercent', () => {
  test('100% box width: 100px delta = 100 percent', () => {
    expect(deltaToPercent(100, 0, 100, 100)).toEqual({ dxPct: 100, dyPct: 0 });
  });

  test('1000px box width: 100px delta = 10 percent', () => {
    expect(deltaToPercent(100, 50, 1000, 500)).toEqual({ dxPct: 10, dyPct: 10 });
  });

  test('zero box width does not divide by zero (returns 0)', () => {
    expect(deltaToPercent(50, 50, 0, 0)).toEqual({ dxPct: 0, dyPct: 0 });
  });

  test('negative delta moves the cat backwards', () => {
    expect(deltaToPercent(-200, -100, 1000, 500)).toEqual({ dxPct: -20, dyPct: -20 });
  });
});

describe('applyDragDelta', () => {
  test('moves the cat by the percent-equivalent of the pixel delta', () => {
    // box width 1000, drag right 100px → 10% → from x=50 to x=60
    const out = applyDragDelta(50, 50, 100, 0, 1000, 500);
    expect(out.x).toBe(60);
    expect(out.y).toBe(50);
  });

  test('clamps when the move would exit the bounds', () => {
    // dragging right past the right edge should stop at xMax (84)
    const out = applyDragDelta(80, 50, 9999, 0, 1000, 500);
    expect(out.x).toBe(84);
  });

  test('clamps when the move would exit the bottom', () => {
    const out = applyDragDelta(50, 70, 0, 9999, 1000, 500);
    expect(out.y).toBe(74);
  });

  test('round-trips: applyDragDelta then applyDragDelta with negated delta restores start (within bounds)', () => {
    const start = { x: 40, y: 50 };
    const moved = applyDragDelta(start.x, start.y, 100, 50, 1000, 500);
    const back = applyDragDelta(moved.x, moved.y, -100, -50, 1000, 500);
    expect(back.x).toBe(start.x);
    expect(back.y).toBe(start.y);
  });
});

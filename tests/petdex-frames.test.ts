/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure-logic tests for the Petdex sprite grid. No React, no DOM — just the
 * mapping from CatData.state to sheet row and the frame-offset math.
 *
 * ponytail: assert-heavy, no fixtures. Runs with `bun test`.
 */

import { test, expect, describe } from 'bun:test';
import {
  STATE_ROW,
  FRAMES_PER_ROW,
  framePosition,
  FRAME_W,
  FRAME_H,
  SHEET_W,
  SHEET_H,
  COLS,
  ROWS,
  type PetdexState,
} from '../src/pets/frames';

const ALL_STATES: PetdexState[] = [
  'idle', 'walking', 'playing', 'jumping', 'spinning',
  'sleeping', 'in_box', 'eating', 'petted',
];

describe('grid constants', () => {
  test('frame and sheet dimensions match the spec', () => {
    expect(FRAME_W).toBe(192);
    expect(FRAME_H).toBe(208);
    expect(SHEET_W).toBe(1536);
    expect(SHEET_H).toBe(1872);
    expect(COLS).toBe(8);
    expect(ROWS).toBe(9);
    // sanity: sheet is exactly COLS × FRAME_W wide and ROWS × FRAME_H tall
    expect(COLS * FRAME_W).toBe(SHEET_W);
    expect(ROWS * FRAME_H).toBe(SHEET_H);
  });
});

describe('STATE_ROW', () => {
  test('every animated state has a row', () => {
    for (const s of ALL_STATES) {
      expect(STATE_ROW[s]).toBeGreaterThanOrEqual(0);
      expect(STATE_ROW[s]).toBeLessThan(ROWS);
    }
  });

  test('only allowed states alias each other on the same row', () => {
    // ponytail: encode the aliases we knowingly introduced (jumping↔spinning)
    // so future drift is loud. Aliases are stored as already-sorted tuples
    // because the actual sorted() output depends on lexicographic order.
    // sleeping intentionally points to row 0 (idle / respiración en reposo)
    // so the avatar doesn't render the "failed / lie down" sprites that look
    // like a sad/defeated cat; the floating Zzz overlay communicates sleep.
    const allowedAliases = new Set(['jumping-spinning', 'idle-sleeping']);
    const groups = new Map<number, string[]>();
    for (const s of ALL_STATES) {
      const r = STATE_ROW[s];
      groups.set(r, [...(groups.get(r) ?? []), s]);
    }
    for (const [, states] of groups) {
      if (states.length === 1) continue;
      const key = [...states].sort().join('-');
      expect(allowedAliases.has(key)).toBe(true);
    }
  });

  test('sleeping maps to row 0 (idle / reposo) so the avatar doesn\'t render the "failed / lie down" sprites', () => {
    // ponytail: row 5 is labelled "failed / lie down" in the Petdex spec;
    // using it for sleeping made the cats look sad/defeated. Row 0 is the
    // "idle" row (respiración / parpadeo) and reads as a sleeping cat once
    // the floating Zzz overlay is rendered on top.
    expect(STATE_ROW.sleeping).toBe(0);
    expect(STATE_ROW.sleeping).not.toBe(STATE_ROW.in_box);
  });

  test('in_box stays on row 5 (lie down) so the box-surprise cat looks hidden', () => {
    expect(STATE_ROW.in_box).toBe(5);
  });
});

describe('FRAMES_PER_ROW', () => {
  test('every row referenced by STATE_ROW has a positive frame count', () => {
    const rows = new Set(Object.values(STATE_ROW));
    for (const r of rows) {
      expect(FRAMES_PER_ROW[r]).toBeGreaterThan(0);
    }
  });
});

describe('framePosition', () => {
  test('idle frame 0 lands on the top-left frame (0,0)', () => {
    // ponytail: don't use toEqual on the position — JavaScript signed-zero
    // makes -0 * 208 !== 0 under Object.is semantics, even though the offset
    // is the same pixel. Assert numerically instead.
    const p = framePosition('idle', 0);
    expect(p.x + 0).toBe(0); // +0 normalises -0 to +0
    expect(p.y + 0).toBe(0);
  });

  test('walking frame 5 advances 5 columns and stays on row 1', () => {
    const p = framePosition('walking', 5);
    expect(p.x).toBe(-5 * FRAME_W);
    expect(p.y).toBe(-1 * FRAME_H);
  });

  test('petted frame 0 lands on row 8', () => {
    const p = framePosition('petted', 0);
    expect(p.y).toBe(-8 * FRAME_H);
  });

  test('eating frame 0 lands on row 6', () => {
    const p = framePosition('eating', 0);
    expect(p.y).toBe(-6 * FRAME_H);
  });
});

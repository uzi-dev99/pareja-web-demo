/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tests for the CSS-sprite composition logic. Keeps the React component thin:
 * the only nontrivial math lives in `computeAvatarStyle` and is exercised here
 * without booting a React renderer.
 *
 * ponytail: assert-heavy, no fixtures, no React, no DOM.
 */

import { test, expect, describe } from 'bun:test';
import {
  resolvePetdexState,
  computeAvatarStyle,
  PET_BY_CAT,
  DISPLAY_SCALE,
  type PetdexCatColor,
} from '../src/pets/frames';

describe('PET_BY_CAT', () => {
  test('every color maps to a non-empty pet id', () => {
    const colors: PetdexCatColor[] = ['orange', 'black', 'grey', 'white'];
    for (const c of colors) {
      expect(typeof PET_BY_CAT[c]).toBe('string');
      expect(PET_BY_CAT[c].length).toBeGreaterThan(0);
    }
  });
});

describe('resolvePetdexState', () => {
  test('passes through known animated states', () => {
    expect(resolvePetdexState('idle')).toBe('idle');
    expect(resolvePetdexState('walking')).toBe('walking');
    expect(resolvePetdexState('spinning')).toBe('spinning');
    expect(resolvePetdexState('petted')).toBe('petted');
  });

  test('falls back to idle for unknown states', () => {
    expect(resolvePetdexState('unboxing_a_box')).toBe('idle');
    expect(resolvePetdexState('')).toBe('idle');
  });
});

describe('computeAvatarStyle', () => {
  test('orange cat on idle frame 0 → top-left frame, scaleX(1)', () => {
    const s = computeAvatarStyle({
      catType: 'orange',
      state: 'idle',
      direction: 1,
      frame: 0,
    });
    // Math.round(0 * 0.45) = 0; positions are "0px 0px"
    expect(s.backgroundPosition).toBe('0px 0px');
    expect(s.transform).toBe('scaleX(1)');
    expect(s.backgroundImage).toBe(`url(/pets/${PET_BY_CAT.orange}/spritesheet.webp)`);
  });

  test('black cat walking frame 3 → x offset -3*192*scale, y offset -1*208*scale', () => {
    const s = computeAvatarStyle({
      catType: 'black',
      state: 'walking',
      direction: 1,
      frame: 3,
    });
    const expectedX = Math.round(-3 * 192 * DISPLAY_SCALE);
    const expectedY = Math.round(-1 * 208 * DISPLAY_SCALE);
    expect(s.backgroundPosition).toBe(`${expectedX}px ${expectedY}px`);
    expect(s.backgroundImage).toBe(`url(/pets/${PET_BY_CAT.black}/spritesheet.webp)`);
  });

  test('direction: -1 applies scaleX(-1) and does not change background position', () => {
    const fwd = computeAvatarStyle({ catType: 'grey', state: 'walking', direction: 1, frame: 2 });
    const rev = computeAvatarStyle({ catType: 'grey', state: 'walking', direction: -1, frame: 2 });
    expect(rev.transform).toBe('scaleX(-1)');
    expect(fwd.transform).toBe('scaleX(1)');
    expect(rev.backgroundPosition).toBe(fwd.backgroundPosition);
  });

  test('width and height are FRAME_W × scale × FRAME_H × scale rounded', () => {
    const s = computeAvatarStyle({ catType: 'white', state: 'idle', direction: 1, frame: 0 });
    expect(s.width).toBe(`${Math.round(192 * DISPLAY_SCALE)}px`);
    expect(s.height).toBe(`${Math.round(208 * DISPLAY_SCALE)}px`);
  });

  test('backgroundSize scales the full sheet by DISPLAY_SCALE', () => {
    const s = computeAvatarStyle({ catType: 'orange', state: 'idle', direction: 1, frame: 0 });
    expect(s.backgroundSize).toBe(
      `${Math.round(1536 * DISPLAY_SCALE)}px ${Math.round(1872 * DISPLAY_SCALE)}px`,
    );
  });

  test('unknown state degrades to idle frame 0', () => {
    const known = computeAvatarStyle({ catType: 'orange', state: 'idle', direction: 1, frame: 0 });
    const weird = computeAvatarStyle({ catType: 'orange', state: 'balloon-ascending', direction: 1, frame: 0 });
    expect(weird.backgroundPosition).toBe(known.backgroundPosition);
  });
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ponytail: regression suite for the pets room scene.
 *
 * History: the room was a layered CSS scene + `FurnitureLayer` (Alocasia,
 * Fern, Couch, Rug, …), then a single full-bleed JPG backdrop, and now
 * again the detailed furniture SVGs — this time over a CSS wall + floor,
 * so the flat painted backdrop no longer fights the furniture.
 *
 * Tests:
 *  - asset guard: the furniture SVGs exist on disk.
 *  - mount guard: `CatTamagotchiBox.tsx` mounts the furniture layer and
 *    draws the wall/floor itself instead of painting the room over a JPG.
 *  - removal guard: the old `FurnitureLayer` mount is gone from the
 *    tamagotchi box (the component file may still exist for reuse, but
 *    it is no longer wired into the room).
 */

import { test, expect } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SRC_BOX = fs.readFileSync(
  path.join(import.meta.dir, '..', 'src', 'components', 'CatTamagotchiBox.tsx'),
  'utf8'
);
const SRC_ROOM = fs.readFileSync(
  path.join(import.meta.dir, '..', 'src', 'pets', 'room.ts'),
  'utf8'
);

test('the furniture SVGs exist on disk', () => {
  for (const file of [
    'couch.svg', 'bed.svg', 'rug-oval.svg', 'table-lamp.svg',
    'coffee-table.svg', 'heart-stool.svg', 'fern.svg', 'alocasia.svg',
  ]) {
    const p = path.join(import.meta.dir, '..', 'public', 'furniture', file);
    expect(fs.existsSync(p), `${file} is missing`).toBe(true);
    expect(fs.statSync(p).size).toBeGreaterThan(500);
  }
});

test('the room mounts the furniture layer', () => {
  // ponytail: the pieces live in src/pets/room.ts and the box maps them
  // to <img> tags; the room must not hardcode the paths.
  expect(SRC_BOX).toMatch(/FURNITURE/);
  expect(SRC_ROOM).toMatch(/'\/furniture\/couch\.svg'/);
});

test('the room paints its own wall and floor instead of the flat backdrop', () => {
  // ponytail: the JPG carries its own painted furniture; stacking the
  // detailed SVGs on top of it would double every piece.
  expect(SRC_BOX).not.toMatch(/\/box\/sanctuary-background\.jpg/);
  expect(SRC_BOX).toMatch(/ROOM_FLOOR_TOP/);
});

test('CatTamagotchiBox no longer mounts <FurnitureLayer />', () => {
  // ponytail: <FurnitureLayer /> was the old SVG dressing component; the
  // room now uses the layout in src/pets/room.ts.
  expect(SRC_BOX).not.toMatch(/<FurnitureLayer\b/);
});

test('CatTamagotchiBox no longer declares the legacy room-decor comment block', () => {
  // ponytail: the inline CSS room decor (fireplace, fishtank, polaroid,
  // 4 food bowls, fairy lights, …) was replaced by the background image.
  // The "{/* Room Decor & Wallpaper */}" header was the marker of that
  // legacy block.
  expect(SRC_BOX).not.toMatch(/Room Decor & Wallpaper/);
});

test('CatTamagotchiBox no longer exposes the Día/Noche button', () => {
  // ponytail: the toggle produced no visible effect because the new
  // background image covers the gradient that the toggle used to swap.
  // The button and its state are gone now. We scan for the user-visible
  // label text (Día / Noche) anywhere in the source — the button used
  // to wrap a <span> with that text.
  expect(SRC_BOX).not.toMatch(/<span[^>]*>\s*(D[ií]a|Noche)\s*<\/span>/);
});

test('CatTamagotchiBox no longer holds an isNightMode state', () => {
  expect(SRC_BOX).not.toMatch(/isNightMode|toggleNightMode/);
});

test('Dar Comidita button uses the unified glassmorphism style', () => {
  // ponytail: the button used to be the only primary-styled action
  // (yellow→orange gradient). After unifying, every action button
  // reads as the same visual layer.
  expect(SRC_BOX).not.toMatch(/from-\[#ffd166\]\s+to-\[#f39c12\]/);
});

test('CatTamagotchiBox overlays 4 feed bowls above the room', () => {
  // ponytail: the room has no bowls in it. The bowl overlay lives between
  // the furniture and the cats, so the cats render on top of their bowls
  // when eating.
  expect(SRC_BOX).toMatch(/bowl-/);
  expect(SRC_BOX).toMatch(/foodInBowls\s*&&/);
  expect(SRC_BOX).toMatch(/28\s*\+\s*idx\s*\*\s*14/);
});

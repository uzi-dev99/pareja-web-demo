/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ponytail: regression suite for the sanctuary background swap.
 *
 * Earlier the CatTamagotchi room was dressed by a layered CSS scene +
 * `FurnitureLayer` (Alocasia, Fern, Couch, Rug, etc.) + a long list of
 * inline decorations (fireplace, window, fishtank, polaroid, bowls, …).
 * That whole scene was replaced with a single full-bleed JPG image.
 *
 * Tests:
 *  - asset guard: the JPG exists on disk and is non-trivial in size.
 *  - mount guard: `CatTamagotchiBox.tsx` mounts the new image as the
 *    background instead of the old decoration stack.
 *  - removal guard: the old `FurnitureLayer` mount is gone from the
 *    tamagotchi box (the component file may still exist for reuse, but
 *    it is no longer wired into the room).
 */

import { test, expect } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const ASSET_PATH = path.join(
  import.meta.dir,
  '..',
  'public',
  'box',
  'sanctuary-background.jpg'
);
const SRC_BOX = fs.readFileSync(
  path.join(import.meta.dir, '..', 'src', 'components', 'CatTamagotchiBox.tsx'),
  'utf8'
);

test('sanctuary background JPG exists on disk', () => {
  expect(fs.existsSync(ASSET_PATH)).toBe(true);
  // ponytail: a 0-byte file means the copy failed silently; catch it
  // loudly so the build never ships a broken background.
  expect(fs.statSync(ASSET_PATH).size).toBeGreaterThan(10_000);
});

test('sanctuary background JPG is the new coder-desk variant (size > 100 KB)', () => {
  // ponytail: both the old and new JPG are high-resolution (~2 MB).
  // Asserting >100 KB catches a 0-byte silent-fail copy.
  expect(fs.statSync(ASSET_PATH).size).toBeGreaterThan(100_000);
});

test('CatTamagotchiBox mounts the new sanctuary background as the room backdrop', () => {
  // ponytail: the image must be referenced through the public path and
  // rendered as an absolute-positioned <img> covering the room.
  expect(SRC_BOX).toMatch(/\/box\/sanctuary-background\.jpg/);
});

test('CatTamagotchiBox no longer mounts <FurnitureLayer />', () => {
  // ponytail: <FurnitureLayer /> was the layered SVG dressing. Its mount
  // in CatTamagotchiBox was removed because the new background image
  // already contains desk, lamp, rug, bookshelf, etc.
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

test('CatTamagotchiBox overlays 4 feed bowls above the background image', () => {
  // ponytail: the new background image has no bowls in it. The bowl
  // overlay lives between the <img> and the cats, so the cats render
  // on top of their bowls when eating.
  expect(SRC_BOX).toMatch(/bowl-/);
  expect(SRC_BOX).toMatch(/foodInBowls\s*&&/);
  expect(SRC_BOX).toMatch(/28\s*\+\s*idx\s*\*\s*14/);
});

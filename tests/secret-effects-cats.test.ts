/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ponytail: regression suite for the "michis" secret-effect handlers.
 *
 * The four michis (Canela, Trufa, Copo, Nube) all belong to the same
 * family and should trigger the *same family of effects* (purr + paw
 * particles + warm toast), each with its own colour and pitch. Earlier
 * versions accidentally wired `copo` and `nube` to a different
 * branch that filtered the gallery and played a magic-sparkle sound. That
 * branch was a holdover from when the names referred to cities, not cats.
 *
 * Tests:
 *  - source-level guard: the handlers for `copo` and `nube` no
 *    longer call `onFilterGallery(...)` (the gallery-redirection symptom).
 *  - source-level guard: the handlers for `copo` and `nube` call
 *    `playPurrSound(...)` (the michi purr effect).
 *  - signature guard: `playPurrSound` accepts an optional pitch
 *    multiplier so each cat can have its own rumble.
 *  - runtime guard: `playPurrSound(1.5)` does not throw (no DOM audio).
 */

import { test, expect } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SRC_SECRET = fs.readFileSync(
  path.join(import.meta.dir, '..', 'src', 'components', 'SecretEffectsManager.tsx'),
  'utf8'
);
const SRC_AUDIO = fs.readFileSync(
  path.join(import.meta.dir, '..', 'src', 'utils', 'audioSynth.ts'),
  'utf8'
);

test('copo handler does NOT call onFilterGallery (regression: gallery redirect)', () => {
  // ponytail: the earlier bug fired onFilterGallery('copo') which
  // scrolled and filtered the masonry. The whole point of typing
  // 'copo' now is to summon the grey-kitty purr, not navigate.
  expect(SRC_SECRET).not.toMatch(/onFilterGallery\(['"]copo['"]\)/);
});

test('nube handler does NOT call onFilterGallery (regression: gallery redirect)', () => {
  expect(SRC_SECRET).not.toMatch(/onFilterGallery\(['"]nube['"]\)/);
});

test('copo handler calls playPurrSound (michi effect, not magic sparkle)', () => {
  // ponytail: source-level match on the copo branch. We accept any
  // pitch argument (with or without a multiplier) so future tuning stays
  // open.
  const copoBranch = SRC_SECRET.match(
    /\/\/\s*5\.\s*COPO[\s\S]*?(?=\/\/\s*6\.\s*NUBE|\/\/\s*7\.)/
  );
  expect(copoBranch).not.toBeNull();
  expect(copoBranch![0]).toMatch(/playPurrSound\(/);
  // ponytail: the legacy sparkle sound belongs to `magia`/`estrellas`,
  // not to a michi summon.
  expect(copoBranch![0]).not.toMatch(/playMagicSparkleSound/);
});

test('nube handler calls playPurrSound (michi effect, not magic sparkle)', () => {
  const nubeBranch = SRC_SECRET.match(
    /\/\/\s*6\.\s*NUBE[\s\S]*?(?=\/\/\s*7\.)/
  );
  expect(nubeBranch).not.toBeNull();
  expect(nubeBranch![0]).toMatch(/playPurrSound\(/);
  expect(nubeBranch![0]).not.toMatch(/playMagicSparkleSound/);
});

test('playPurrSound signature accepts an optional pitch multiplier', () => {
  // ponytail: each of the four michis gets a slightly different rumble.
  // Copo (white ragdoll) is brighter, Nube (grey tabby) is warmer.
  expect(SRC_AUDIO).toMatch(/public\s+playPurrSound\s*\([^)]*pitchMultiplier\s*[:=]/);
});

test('playPurrSound(1.5) does not throw without an AudioContext', async () => {
  // ponytail: with no window.AudioContext the engine swallows the
  // synthetic oscillator creation behind a try/catch. The point of this
  // test is just to confirm the new optional-arg signature didn't break
  // the no-DOM smoke path.
  const { audioEngine } = await import('../src/utils/audioSynth');
  expect(() => audioEngine.playPurrSound(1.5)).not.toThrow();
  expect(() => audioEngine.playPurrSound(0.85)).not.toThrow();
  expect(() => audioEngine.playPurrSound()).not.toThrow();
});

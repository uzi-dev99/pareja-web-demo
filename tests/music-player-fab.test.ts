/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: src/components/MusicPlayerFab.tsx is the minimal floating
 * audio controller. Reuses the existing audioPlayer singleton (no new
 * audio element, no new state mgmt, no Context provider).
 *
 *   1. File exists and exports a React component named MusicPlayerFab.
 *   2. Component imports the audioPlayer singleton from src/utils.
 *   3. Component polls audioPlayer.getCurrent() — without that, it
 *      cannot react to the singleton's auto-loop or next() calls.
 *   4. Component calls audioPlayer.pause() / audioPlayer.next() in its
 *      button handlers.
 *   5. Component does NOT render when there is no current song (return
 *      null / early return) — otherwise it sits uselessly on every
 *      page even when the user has never heard music.
 *   6. FAB is positioned in the bottom-right area (fixed + bottom/right
 *      + z-40), distinct from the codelist FAB which lives bottom-left.
 *
 * ponytail: source-level guards. The wiring is one new file with three
 * handlers — anything fancier (progress bar, volume, queue) belongs in
 * a separate change.
 */

import { test, expect } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const PATH = join(ROOT, 'src', 'components', 'MusicPlayerFab.tsx');

test('src/components/MusicPlayerFab.tsx exists', () => {
  expect(existsSync(PATH)).toBe(true);
});

test('MusicPlayerFab exports a React component', () => {
  const src = readFileSync(PATH, 'utf8');
  expect(src).toMatch(/export\s+(?:const|function)\s+MusicPlayerFab\b/);
});

test('MusicPlayerFab imports the audioPlayer singleton', () => {
  const src = readFileSync(PATH, 'utf8');
  expect(src).toMatch(/from\s+['"]\.\.\/utils\/audioPlayer['"]/);
  expect(src).toMatch(/\baudioPlayer\b/);
});

test('MusicPlayerFab reads audioPlayer.getCurrent() to react to songs', () => {
  const src = readFileSync(PATH, 'utf8');
  // ponytail: the singleton mutates current from inside (auto-loop
  // on 'ended', next(), etc). Without polling getCurrent(), the UI
  // would never know a new song started. Lock the call.
  expect(src).toMatch(/audioPlayer\.getCurrent\(\)/);
});

test('MusicPlayerFab wires pause() and next() handlers', () => {
  const src = readFileSync(PATH, 'utf8');
  expect(src).toMatch(/audioPlayer\.pause\(\)/);
  expect(src).toMatch(/audioPlayer\.next\(\)/);
});

test('MusicPlayerFab returns null when no song is playing', () => {
  const src = readFileSync(PATH, 'utf8');
  // ponytail: the FAB must hide itself if getCurrent() is null,
  // otherwise it floats uselessly on every page forever.
  expect(src).toMatch(/if\s*\(!?\s*currentSong?\s*\)\s*return\s+null/);
});

test('MusicPlayerFab FAB is positioned bottom-right (distinct from codelist)', () => {
  const src = readFileSync(PATH, 'utf8');
  // ponytail: codelist FAB is bottom-left (bottom-6 left-4). Player
  // FAB must be bottom-right so they don't overlap on mobile.
  expect(src).toMatch(/fixed\s+bottom-\d+\s+right-\d+/);
  // z-40 puts it on the same overlay layer as the codelist FAB, so
  // either can overlap the other cleanly when one is hidden.
  expect(src).toMatch(/\bz-40\b/);
});

test('MusicPlayerFab is mounted in App.tsx (not orphaned)', () => {
  const app = readFileSync(join(ROOT, 'src', 'App.tsx'), 'utf8');
  expect(app).toMatch(/<MusicPlayerFab\b/);
});

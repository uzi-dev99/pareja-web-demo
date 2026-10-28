/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * UI wiring contracts after Task 5:
 *  - SecretEffectsManager must accept `onOpenMusicLibrary` prop
 *  - SecretLetter must NOT have an `onPlaySong` prop (it calls audioPlayer directly)
 *  - The `next` keyword must be in the knownKeywords list (typecheck-only)
 *
 * ponytail: typecheck + export smoke. Full React Testing Library would add
 * ~15MB of deps; we already have typecheck and manual smoke for the rest.
 */

import { test, expect, beforeAll } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = (file: string) =>
  readFileSync(join(import.meta.dir, '..', 'src', 'components', file), 'utf8') as string;

beforeAll(() => {
  // ponytail: stub HTMLAudioElement so audioPlayer singleton can be imported.
  (globalThis as any).HTMLAudioElement = function () {
    return {
      src: '', paused: true,
      play: () => Promise.resolve(),
      pause: () => {}, load: () => {},
      addEventListener: () => {}
    };
  };
});

test('SecretEffectsManagerProps has onOpenMusicLibrary prop', () => {
  // ponytail: source-level inspection is more reliable than ts-type probing
  // at runtime; tsc already validates the type contract.
  expect(SRC('SecretEffectsManager.tsx')).toContain('onOpenMusicLibrary');
});

test('SecretLetter does NOT export onPlaySong prop', () => {
  const src = SRC('SecretLetter.tsx');
  expect(src).not.toContain('onPlaySong');
  // ponytail: SecretLetter must import audioPlayer directly
  expect(src).toContain('audioPlayer');
});

test('SecretEffectsManager has `next` in knownKeywords', () => {
  const src = SRC('SecretEffectsManager.tsx');
  // ponytail: regex match on the array literal
  expect(/knownKeywords\s*=\s*\[[^\]]*'next'[^\]]*\]/s.test(src)).toBe(true);
});
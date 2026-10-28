/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Regression: the photo compliments surfaced when the user clicks the
 * Hero image were drifting away from the inventory documented in
 * `HARDCODED_TEXTS.md` (PHOTO_COMPLIMENT_1..12). The user explicitly listed
 * those 12 strings as the canonical set; anything else in the floating
 * compliment is now considered a bug.
 *
 * ponytail: the source-of-truth list is duplicated here on purpose. Keeping
 * a parser for the markdown YAML out of the test means a typo in the .md
 * stops failing CI — but in this repo the .md IS the contract, so retyping
 * the 12 strings is the cheapest way to assert "code matches inventory".
 */

import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const EXPECTED_COMPLIMENTS = [
  '¡Qué hermosa que sos! ✨',
  'Tenés la sonrisa más linda de este mundo 💖',
  'Sos mi persona favorita en todo el universo 🌸',
  'Tu risa es mi sonido preferido 🎶',
  'Como podes ser TAN TAN TAN HERMOSA X DIOSSSS 🥰',
  'Vi ese orto y no supe a qué santo rezarle 💫',
  'Genia, diosa, preciosa, divina, sol, luz, mí energía favorita 🌷',
  'La reina indiscutida de esta casa y de mi corazón 👑',
  'Con vos quiero todo ✨',
  'HOT ❤️‍🔥',
  'Me hacés el hombre más feliz 🌹',
  'Amo todo de vos, meamoorrrt 💖',
];

const HERO_SRC = readFileSync(
  join(import.meta.dir, '..', 'src', 'components', 'Hero.tsx'),
  'utf8'
);

// ponytail: pull just the array literal — the comments above may drift.
const HERO_COMPLIMENTS_BLOCK =
  HERO_SRC.match(/const HERO_COMPLIMENTS\s*=\s*\[[\s\S]*?\];/)?.[0] ?? '';

test('Hero.tsx declares HERO_COMPLIMENTS as a non-empty array literal', () => {
  expect(HERO_COMPLIMENTS_BLOCK).toMatch(/const HERO_COMPLIMENTS\s*=\s*\[/);
});

test('HERO_COMPLIMENTS contains every PHOTO_COMPLIMENT_* from the inventory', () => {
  for (const expected of EXPECTED_COMPLIMENTS) {
    // ponytail: use a per-entry substring assertion so the failure message
    // names exactly which string is missing — much easier to fix than
    // "expected array to deeply equal".
    expect(HERO_COMPLIMENTS_BLOCK, `missing: ${expected}`).toContain(expected);
  }
});

test('HERO_COMPLIMENTS has exactly the 12 inventory entries (no extras)', () => {
  // ponytail: count only string literals (lines wrapped in single quotes) so
  // comments and the closing bracket don't get counted.
  const entries = HERO_COMPLIMENTS_BLOCK.match(/^\s*'[^']+'\s*,?$/gm) ?? [];
  expect(entries).toHaveLength(12);
});
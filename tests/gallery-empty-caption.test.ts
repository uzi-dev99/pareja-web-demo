/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Regression: when a photo has no caption, the gallery must NOT render the
 * "Sin descripción" placeholder (the user found it distracting). The
 * caption row should be hidden entirely.
 *
 * ponytail: source-level test — Gallery.tsx still uses photo.caption as the
 * only caption source. The placeholder string is gone.
 */

import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = readFileSync(
  join(import.meta.dir, '..', 'src', 'components', 'Gallery.tsx'),
  'utf8'
);

test('Gallery caption row is hidden when caption is empty (no Sin descripción fallback)', () => {
  // ponytail: assert both halves of the contract.
  //   1. the literal fallback string is gone from JSX (not from comments).
  //   2. the <p> is wrapped in a truthy guard so it doesn't render empty.
  const jsxOnly = SRC.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, '');
  expect(jsxOnly).not.toMatch(/Sin\s+descripción/i);
  expect(SRC).toMatch(/\{photo\.caption\s*&&\s*\(/);
});

test('Gallery still renders caption text when photo.caption is present', () => {
  // ponytail: the guard above must not accidentally hide real captions.
  expect(SRC).toMatch(/"\{photo\.caption\}"/);
});
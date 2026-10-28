/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: scripts/build-pwa-icons.mjs is the one-shot script that
 * rasterizes public/favicon.svg into the three PWA PNG icons:
 *   - public/icon-192.png
 *   - public/icon-512.png
 *   - public/apple-touch-icon.png
 *
 * ponytail: source-level test against the script source. We don't run
 * the script — the icons themselves are tested for existence + dimensions
 * in tests/pwa-icons.test.ts.
 */

import { test, expect } from 'bun:test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const PATH = join(ROOT, 'scripts', 'build-pwa-icons.mjs');

test('scripts/build-pwa-icons.mjs exists', () => {
  expect(existsSync(PATH)).toBe(true);
});

test('script imports sharp as the rasterizer', () => {
  // ponytail: sharp is the only tool that produces crisp PNGs from an SVG
  // at arbitrary sizes without external CLI dependencies.
  const src = readFileSync(PATH, 'utf8');
  expect(src).toMatch(/from\s+['"]sharp['"]/);
});

test('script reads public/favicon.svg as the source', () => {
  const src = readFileSync(PATH, 'utf8');
  expect(src).toMatch(/favicon\.svg/);
});

test('script emits all three target PNG sizes (192, 512, 180)', () => {
  const src = readFileSync(PATH, 'utf8');
  // ponytail: each size is named explicitly so a future change cannot
  // accidentally drop one of the three without failing CI.
  expect(src).toMatch(/\b192\b/);
  expect(src).toMatch(/\b512\b/);
  expect(src).toMatch(/\b180\b/);
  expect(src).toMatch(/icon-192\.png/);
  expect(src).toMatch(/icon-512\.png/);
  expect(src).toMatch(/apple-touch-icon\.png/);
});
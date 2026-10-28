/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: src/main.tsx registers the pass-through service worker so
 * Chrome sees the page as installable. The registration must be guarded
 * with `'serviceWorker' in navigator` so it silently no-ops on browsers
 * without SW support (and any failure must be swallowed — the app should
 * not break on browsers that block SW).
 *
 * ponytail: source-level test against the actual file.
 */

import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const PATH = join(ROOT, 'src', 'main.tsx');
const SRC = readFileSync(PATH, 'utf8');

test('main.tsx registers /sw.js', () => {
  expect(SRC).toMatch(
    /navigator\.serviceWorker\.register\(\s*['"]\/sw\.js['"]/
  );
});

test('main.tsx guards the registration with a SW feature check', () => {
  // ponytail: skipping the feature check throws on browsers that don't
  // ship ServiceWorker (older Safari). The check makes the registration
  // a no-op there instead of an unhandled error.
  expect(SRC).toMatch(/['"]serviceWorker['"]\s+in\s+navigator/);
});

test('main.tsx swallows registration failures', () => {
  // ponytail: a rejected promise here surfaces in DevTools but does not
  // break the page. The contract is .catch(() => {}) so it stays silent.
  expect(SRC).toMatch(/\.catch\(\s*\(\s*\)\s*=>\s*\{\s*\}\s*\)/);
});
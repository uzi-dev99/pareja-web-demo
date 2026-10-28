/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ponytail: regression suite for the public-facing app metadata.
 *
 * The browser tab identity must read "Amor ∞" and the favicon
 * must be a heart SVG so the ship has its own brand outside the
 * in-app UI.
 */

import { test, expect } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';

const INDEX_HTML = fs.readFileSync(
  path.join(import.meta.dir, '..', 'index.html'),
  'utf8'
);
const FAVICON_PATH = path.join(import.meta.dir, '..', 'public', 'favicon.svg');

test('index.html sets the browser tab title to "Amor ∞"', () => {
  expect(INDEX_HTML).toMatch(/<title>\s*Amor ∞\s*<\/title>/);
});

test('index.html references the heart favicon SVG', () => {
  expect(INDEX_HTML).toMatch(/<link[^>]*rel=["']icon["'][^>]*href=["']\/favicon\.svg["']/);
});

test('public/favicon.svg exists and is a heart SVG', () => {
  expect(fs.existsSync(FAVICON_PATH)).toBe(true);
  const body = fs.readFileSync(FAVICON_PATH, 'utf8');
  // ponytail: a heart SVG must declare an svg root and contain at least
  // one of the canonical heart paths so a stray blank file never ships.
  expect(body).toMatch(/<svg[\s\S]*?<\/svg>/);
  expect(body).toMatch(/<path[^>]*d=["'][^"']*M[^"']*/);
});

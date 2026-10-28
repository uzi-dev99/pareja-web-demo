/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: the Hero carousel — the first thing you see when the site
 * opens — shows the most recently uploaded photos first, so a new
 * "catgada" lands on the center card instead of at the far end of the
 * ribbon.
 *
 * The server answers `GET /api/photos?bucket=public` with
 * `ORDER BY created_at ASC` because the Gallery groups by month and wants
 * the natural order. So the descending sort belongs in the Hero, NOT in
 * that shared query: flipping the query would silently reorder every
 * month in the Gallery too, which is not what was asked for.
 *
 * ponytail: source-level guard, same style as
 * `use-photos-public-no-token.test.ts` — no renderer, no DOM. If someone
 * aliases `allMedia` back to the raw hook output, the newest upload stops
 * being first and this fails.
 */

import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const HERO = readFileSync(join(ROOT, 'src', 'components', 'Hero.tsx'), 'utf8');
const SERVER = readFileSync(join(ROOT, 'server', 'index.ts'), 'utf8');

test('Hero sorts the carousel by upload timestamp, newest first', () => {
  expect(HERO).toMatch(
    /sort\(\s*\(a,\s*b\)\s*=>\s*\(b\.createdAt\s*\?\?\s*0\)\s*-\s*\(a\.createdAt\s*\?\?\s*0\)\s*\)/
  );
});

test('the carousel renders the sorted array, not the raw hook output', () => {
  const start = HERO.indexOf('const allMedia');
  expect(start).toBeGreaterThan(-1);
  const line = HERO.slice(start, HERO.indexOf('\n', start));
  expect(line).toMatch(/apiPhotos/);
  expect(line).toMatch(/\.sort\(/);
  // the pre-sort alias `const allMedia = apiPhotos;` must be gone
  expect(line).not.toMatch(/=\s*apiPhotos\s*;/);
});

test('the shared public-bucket query stays ascending (Gallery groups by month)', () => {
  expect(SERVER).toContain("WHERE bucket = ? ORDER BY created_at ASC");
});

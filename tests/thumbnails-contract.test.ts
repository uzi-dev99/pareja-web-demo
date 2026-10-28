/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: the thumbnail pipeline is wired end to end.
 *
 *   1. `sharp` is a runtime dependency — the backend stage installs with
 *      `--production`, so a devDependency would not be in the image.
 *   2. The upload path generates the thumbnail.
 *   3. The API mapper points at the thumbnail.
 *   4. The hero serves the thumbnail (it is the biggest single download
 *      after the grid).
 *   5. The lightbox still serves the ORIGINAL — the photo quality in the
 *      lightbox is an acceptance criterion.
 *   6. The gallery keeps reading `thumbnailUrl`.
 *
 * ponytail: source-level guards, like the rest of the suite. The numeric
 * guarantees live in tests/thumbnails.test.ts (real sharp runs).
 */

import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const read = (...p: string[]) => readFileSync(join(ROOT, ...p), 'utf8');

test('sharp is a runtime dependency (the backend image installs --production)', () => {
  const pkg = JSON.parse(read('package.json'));
  expect(pkg.dependencies?.sharp).toBeTruthy();
  expect(pkg.devDependencies?.sharp).toBeUndefined();
});

test('the upload path generates a thumbnail next to the original', () => {
  const src = read('server', 'index.ts');
  expect(src).toMatch(/makeThumbnail/);
  expect(src).toMatch(/thumbFileName\(id\)/);
});

test('the API mapper points at the thumbnail', () => {
  const src = read('server', 'db.ts');
  expect(src).toMatch(/thumbUrlFor/);
  expect(src).toMatch(/thumbnailUrl:\s*thumbnailFor\(row\)/);
});

test('the hero serves the thumbnail', () => {
  const src = read('src', 'components', 'Hero.tsx');
  expect(src).toMatch(/item\.thumbnailUrl\s*\|\|\s*item\.filePath/);
  expect(src).toMatch(/currentMedia\.thumbnailUrl\s*\|\|\s*currentMedia\.filePath/);
});

test('the lightbox still serves the original file', () => {
  const src = read('src', 'components', 'Lightbox.tsx');
  expect(src).toMatch(/src=\{photo\.filePath\}/);
  expect(src).not.toMatch(/src=\{photo\.thumbnailUrl/);
});

test('the gallery keeps reading thumbnailUrl', () => {
  const src = read('src', 'components', 'Gallery.tsx');
  expect(src).toMatch(/photo\.thumbnailUrl\s*\|\|\s*photo\.filePath/);
});

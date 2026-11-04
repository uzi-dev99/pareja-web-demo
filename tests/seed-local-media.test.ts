/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * VK-547 — the seed media is vendored, not hot-linked.
 *
 * The demo used to point at images.unsplash.com, upload.wikimedia.org
 * and stream/image.mux.com. A dead CDN link was a real bug (VK-524:
 * the hover card drew a broken seed url), so every asset now lives in
 * `public/seed/` and the site depends on nothing outside its origin.
 *
 * ponytail: the test walks the data (not a hardcoded list): every url
 * of the seed has to be a local path AND the file it points to has to
 * be in `public/`. Restore one remote url in content.ts and this goes
 * red.
 */

import { expect, test } from 'bun:test';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { photos, timelineEvents, secretCollagePhotos } from '../src/data/content';

const ROOT = join(import.meta.dir, '..');
const inPublic = (url: string) => join(ROOT, 'public', url.replace(/^\//, ''));

// every url the seed ships: the gallery photos and their thumbnails, the
// timeline images, the secret collage and the video with its poster
const seedUrls: string[] = [
  ...photos.flatMap((p) => [p.filePath, p.thumbnailUrl ?? '']),
  ...timelineEvents.flatMap((e) => (e.images ?? []).map((i) => i.url)),
  ...secretCollagePhotos.map((s) => s.url)
].filter(Boolean);

test('every seed url is a local /seed/ path', () => {
  expect(seedUrls.length).toBeGreaterThan(0);
  for (const url of seedUrls) expect(url.startsWith('/seed/')).toBe(true);
});

test('every seed file is in public/ and is not empty', () => {
  for (const url of seedUrls) {
    const file = inPublic(url);
    expect(existsSync(file)).toBe(true);
    expect(statSync(file).size).toBeGreaterThan(0);
  }
});

test('the seed video is a local file with a local poster', () => {
  const video = photos.find((p) => p.mediaType === 'video');
  expect(video).toBeDefined();
  expect(video!.filePath.endsWith('.webm')).toBe(true);
  expect(video!.thumbnailUrl).toBeTruthy();
  expect(video!.thumbnailUrl!.startsWith('/seed/')).toBe(true);
  expect(existsSync(inPublic(video!.filePath))).toBe(true);
  expect(existsSync(inPublic(video!.thumbnailUrl!))).toBe(true);
});

test('the hero stream is the one documented hot-link and is not re-hosted', () => {
  const hero = readFileSync(join(ROOT, 'src', 'components', 'Hero.tsx'), 'utf8');
  expect(hero).toContain('https://stream.mux.com/');
  expect(existsSync(join(ROOT, 'public', 'seed', 'hero'))).toBe(false);
});

// ── no third-party host left in the code ───────────────────────────────────
// The scan covers every source file of src/ and server/: a hot-link that
// comes back (in a component, in a comment, in a default value) would
// break the demo again.
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return /\.(ts|tsx)$/.test(e.name) ? [p] : [];
  });

// ponytail: the only hosts allowed in the source are the SVG namespace
// (a name, never fetched), the local API and the hero stream on Mux (unknown
// licence, not re-hosted: the one documented hot-link in Hero.tsx).
const ALLOWED_HOSTS = new Set(['www.w3.org', '127.0.0.1', 'stream.mux.com', 'image.mux.com']);

test('no third-party host is left in src/ or server/', () => {
  const files = [...walk(join(ROOT, 'src')), ...walk(join(ROOT, 'server'))];
  expect(files.length).toBeGreaterThan(0);
  const hits: string[] = [];
  for (const file of files) {
    // the upload form shows "https://..." as a placeholder for the user
    // to paste a link: a hint, not a fetched asset
    const text = readFileSync(file, 'utf8').replaceAll('https://...', '');
    for (const m of text.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
      if (!ALLOWED_HOSTS.has(m[1])) hits.push(`${file}: ${m[1]}`);
    }
  }
  expect(hits).toEqual([]);
});

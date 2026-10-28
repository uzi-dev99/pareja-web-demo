/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: the server produces one small WebP per photo and the API
 * points at it.
 *
 *   1. makeThumbnail() returns a WebP that fits the byte budget
 *      (THUMB_MAX_BYTES = 150 KB = 153.600 B). The budget is what makes
 *      the page AC true: 12 photos x 153.600 B = 1.843.200 B < 2 MB.
 *   2. A 12-photo mobile page stays under the 2 MB page budget, with the
 *      REAL JSON payload measured, not an estimate.
 *   3. A small photo is not enlarged.
 *   4. rowToPhoto() returns the thumbnail URL only when the file exists;
 *      otherwise it returns the original (seed rows, deleted files, a
 *      partial backfill) — every consumer reads `thumbnailUrl || filePath`.
 *   5. The backfill creates the missing thumbnails and is idempotent.
 *
 * ponytail: real runtime checks (sharp + a temp volume), not source greps.
 * The numbers here are the AC; a source grep cannot prove them.
 */

import { test, expect } from 'bun:test';
import { mkdtempSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { makeThumbnail, thumbUrlFor, THUMB_MAX_BYTES, THUMB_LONGEST_SIDE } from '../server/thumbs';

/** A high-entropy JPEG: the worst case for the WebP encoder. */
async function noisyJpeg(width: number, height: number): Promise<Buffer> {
  return sharp(await noise(width, height), { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 90 })
    .toBuffer();
}

/** A high-entropy PNG: lossless, so the noise survives into the WebP. */
async function noisyPng(width: number, height: number): Promise<Buffer> {
  return sharp(await noise(width, height), { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();
}

async function noise(width: number, height: number): Promise<Buffer> {
  const raw = Buffer.alloc(width * height * 3);
  let s = 12345;
  for (let i = 0; i < raw.length; i++) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    raw[i] = (s >> 16) & 0xff;
  }
  return raw;
}

test('makeThumbnail returns a WebP that fits the byte budget', async () => {
  const src = await noisyJpeg(1200, 900);
  const out = await makeThumbnail(src);
  expect(out.byteLength).toBeLessThanOrEqual(THUMB_MAX_BYTES);
  const meta = await sharp(out).metadata();
  expect(meta.format).toBe('webp');
  expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(THUMB_LONGEST_SIDE);
});

test('a 12-photo mobile page stays under the 2 MB budget', async () => {
  // ponytail: measure the REAL payload, not an estimate. 12 photos x
  // 153.600 B = 1.843.200 B; the JSON is measured live so a growing
  // payload (more photos, captions, tags) fails the test instead of
  // breaking AC1 in silence.
  const dir = mkdtempSync(join(tmpdir(), 'nh-page-'));
  process.env.UPLOAD_DIR = dir;
  process.env.DB_PATH = join(dir, 'app.db');
  const { rowToPhoto } = await import('../server/db');

  const photos = Array.from({ length: 12 }, (_, i) =>
    rowToPhoto({
      id: `photo-${i}`,
      bucket: 'public' as const,
      carousel_event_id: null,
      position: null,
      file_path: `/uploads/photo-${i}.jpg`,
      original_name: `photo-${i}.jpg`,
      caption: 'Un momento especial de nuestro álbum',
      month: 'febrero',
      year: 2026,
      date_str: '14 de febrero',
      location: 'Mar del Plata',
      tags: JSON.stringify(['viaje', 'cumple']),
      created_at: 1760000000
    })
  );

  const jsonBytes = Buffer.byteLength(JSON.stringify(photos));
  expect(jsonBytes + 12 * THUMB_MAX_BYTES).toBeLessThan(2_000_000);
});

test('a 700x700 photo still fits the byte budget', async () => {
  // ponytail: the regression fixture. A source that is already at the
  // smallest rung of the ladder cannot be shrunk by `withoutEnlargement`,
  // so the ladder needs a rung BELOW the source size or the cap is not
  // guaranteed (measured: 234.462 B for a 700x700 noise, cap 153.600 B).
  const src = await noisyPng(700, 700);
  const out = await makeThumbnail(src);
  expect(out.byteLength).toBeLessThanOrEqual(THUMB_MAX_BYTES);
});

test('a small photo is not enlarged', async () => {
  const src = await noisyJpeg(320, 240);
  const out = await makeThumbnail(src);
  const meta = await sharp(out).metadata();
  expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBeLessThanOrEqual(320);
});

test('rowToPhoto falls back to the original when the thumbnail is missing', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'nh-thumbs-'));
  process.env.UPLOAD_DIR = dir;
  process.env.DB_PATH = join(dir, 'app.db');
  const { rowToPhoto } = await import('../server/db');

  const row = {
    id: 'photo-1',
    bucket: 'public' as const,
    carousel_event_id: null,
    position: null,
    file_path: '/uploads/photo-1.jpg',
    original_name: 'photo-1.jpg',
    caption: '',
    month: null,
    year: null,
    date_str: null,
    location: '',
    tags: '[]',
    created_at: 1
  };

  expect(rowToPhoto(row).thumbnailUrl).toBe('/uploads/photo-1.jpg');

  mkdirSync(join(dir, 'thumbs'), { recursive: true });
  writeFileSync(join(dir, 'thumbs', 'photo-1.webp'), 'x');
  expect(rowToPhoto(row).thumbnailUrl).toBe(thumbUrlFor('photo-1'));
});

test('the backfill creates the missing thumbnails and is idempotent', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'nh-backfill-'));
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'a.jpg'), await noisyJpeg(200, 150));
  writeFileSync(join(dir, 'b.jpg'), await noisyJpeg(200, 150));
  process.env.UPLOAD_DIR = dir;

  const { main } = await import('../server/backfill-thumbs');
  await main();

  const thumbA = join(dir, 'thumbs', 'a.webp');
  const thumbB = join(dir, 'thumbs', 'b.webp');
  expect(statSync(thumbA).size).toBeGreaterThan(0);
  expect(statSync(thumbB).size).toBeGreaterThan(0);
  const before = readFileSync(thumbA);

  // ponytail: a second run must not touch anything (the prod run is
  // re-runnable after a partial failure).
  await main();
  expect(readFileSync(thumbA).equals(before)).toBe(true);
});

test('the backfill reports a basename collision instead of counting it as skipped', async () => {
  // ponytail: x.jpg and x.png map to the same x.webp. The operator must
  // see the collision — a silent "skipped" makes the runbook counter lie.
  const dir = mkdtempSync(join(tmpdir(), 'nh-collision-'));
  writeFileSync(join(dir, 'x.jpg'), await noisyJpeg(200, 150));
  writeFileSync(join(dir, 'x.png'), await noisyPng(200, 150));
  process.env.UPLOAD_DIR = dir;

  const lines: string[] = [];
  const realLog = console.log;
  const realError = console.error;
  console.log = (...a: unknown[]) => { lines.push(a.map(String).join(' ')); };
  console.error = (...a: unknown[]) => { lines.push(a.map(String).join(' ')); };
  try {
    const { main } = await import('../server/backfill-thumbs');
    await main();
  } finally {
    console.log = realLog;
    console.error = realError;
  }

  const out = lines.join('\n');
  expect(out).toMatch(/x\.png/);
  expect(out).toMatch(/collision/i);
  expect(out).toMatch(/1 failed/);
});

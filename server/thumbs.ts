/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Thumbnail generation: one WebP per photo, written next to the original
 * so the same nginx `location /uploads/` alias serves it. No config change.
 *
 * ponytail: one variant, one route, no srcset contract. The gallery cell is
 * ~170 CSS px wide on mobile and ~300 px on desktop, so a 1200 px WebP is
 * already 2-4x the CSS size — a second variant would add a contract nobody
 * reads.
 */

import sharp from 'sharp';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** ponytail: 12 photos x 150 KB = 1.8 MB, under the 2 MB page budget. */
export const THUMB_MAX_BYTES = 150 * 1024;
export const THUMB_LONGEST_SIDE = 1200;
export const THUMB_DIR = 'thumbs';

// ponytail: a quality/size ladder instead of one fixed quality. The budget
// is a hard byte cap and a high-detail photo at 1200/q72 measured 210 KB
// (worst case 390 KB). Each rung re-encodes from the original; the last rung
// fits even for pathological noise (measured 136 KB).
// ponytail: the last rung is BELOW the smallest possible source, because
// `withoutEnlargement` makes every rung a no-op for a source that is
// already small — without it a 700x700 noise stayed at 234 KB (measured).
const LADDER: ReadonlyArray<readonly [number, number]> = [
  [1200, 72],
  [1200, 55],
  [1000, 45],
  [800, 40],
  [700, 35],
  [500, 30]
];

export function thumbsRoot(uploadDir: string): string {
  return join(uploadDir, THUMB_DIR);
}

export function thumbFileName(id: string): string {
  return `${id}.webp`;
}

/** Thumbnail URL for a photo id. Convention only — the DB has no column. */
export function thumbUrlFor(id: string): string {
  return `/uploads/${THUMB_DIR}/${thumbFileName(id)}`;
}

/** True when the thumbnail file exists on disk. */
export function thumbExists(id: string, uploadDir: string): boolean {
  return existsSync(join(thumbsRoot(uploadDir), thumbFileName(id)));
}

/**
 * Encode the thumbnail. `src` is a Buffer or a file path (sharp reads the
 * path itself, so a 25 MB upload is never held twice in memory).
 * Returns a WebP of at most THUMB_MAX_BYTES when the source allows it;
 * otherwise the smallest attempt (still a valid WebP).
 */
export async function makeThumbnail(src: Buffer | string): Promise<Buffer> {
  let smallest: Buffer = Buffer.alloc(0);
  for (const [longest, quality] of LADDER) {
    const out = await sharp(src)
      // ponytail: rotate() with no argument auto-orients from EXIF — iPhone
      // photos carry the rotation there, otherwise they land sideways.
      .rotate()
      .resize({ width: longest, height: longest, fit: 'inside', withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
    smallest = out;
    if (out.byteLength <= THUMB_MAX_BYTES) return out;
  }
  return smallest;
}

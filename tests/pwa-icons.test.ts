/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: the three PWA PNG icons exist at the expected sizes and live
 * where the manifest + index.html reference them. Sizes are read from the
 * PNG IHDR chunk directly — no image-decoding dependency required.
 *
 * ponytail: PNG IHDR layout (after the 8-byte signature):
 *   - 4 bytes: chunk length (big-endian, 13 for IHDR)
 *   - 4 bytes: "IHDR"
 *   - 4 bytes: width
 *   - 4 bytes: height
 *   - ...
 * Reading the first 24 bytes is enough to grab width and height.
 */

import { test, expect } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const PUBLIC = join(ROOT, 'public');

function readPngDimensions(path: string): { width: number; height: number } {
  const buf = readFileSync(path);
  // ponytail: skip the 8-byte PNG signature, then 8 bytes into the IHDR
  // chunk (4 length + 4 type) to land on the width.
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  return { width, height };
}

const ICONS = [
  { file: 'icon-192.png', min: 192 },
  { file: 'icon-512.png', min: 512 },
  { file: 'apple-touch-icon.png', min: 180 },
];

for (const { file, min } of ICONS) {
  test(`public/${file} exists`, () => {
    expect(existsSync(join(PUBLIC, file))).toBe(true);
  });

  test(`public/${file} is at least ${min}x${min}`, () => {
    // ponytail: the install criteria require dimensions ≥ the named size,
    // not exactly equal (browsers tolerate upscaled images). We assert ≥
    // to match that contract.
    const dims = readPngDimensions(join(PUBLIC, file));
    expect(dims.width).toBeGreaterThanOrEqual(min);
    expect(dims.height).toBeGreaterThanOrEqual(min);
  });

  test(`public/${file} has the PNG signature`, () => {
    // ponytail: guards against the file silently becoming HTML or a
    // text fallback (common when a deployment serves a 404 page).
    const buf = readFileSync(join(PUBLIC, file));
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    expect(Array.from(buf.subarray(0, 8))).toEqual(sig);
  });
}
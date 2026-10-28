/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Gate test: asserts the canonical Petdex spritesheet dimensions assumed by
 * `src/pets/frames.ts`. If these dimensions drift, every FRAME_W/FRAME_H
 * constant is wrong and the avatars render at the wrong scale and offset.
 *
 * ponytail: zero deps — parses the WebP RIFF header manually.
 */

import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Minimal WebP RIFF header parser — extracts width & height from VP8/VP8L chunks.
// VP8X (extended) is not supported here; none of the Petdex sheets use it.
function webpDimensions(buf: Buffer): { width: number; height: number } {
  if (buf.toString('ascii', 0, 4) !== 'RIFF') throw new Error('not a RIFF file');
  if (buf.toString('ascii', 8, 12) !== 'WEBP') throw new Error('not a WEBP file');
  const fourCC = buf.toString('ascii', 12, 16);
  if (fourCC === 'VP8 ') {
    const w = buf.readUInt16LE(26) & 0x3fff;
    const h = buf.readUInt16LE(28) & 0x3fff;
    return { width: w, height: h };
  }
  if (fourCC === 'VP8L') {
    const b0 = buf[21]!;
    const b1 = buf[22]!;
    const b2 = buf[23]!;
    const b3 = buf[24]!;
    const w = 1 + (((b1 & 0x3f) << 8) | b0);
    const h = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
    return { width: w, height: h };
  }
  throw new Error(`unsupported WebP chunk: ${fourCC}`);
}

const CATS = ['canela', 'copo', 'trufa', 'nube'] as const;
const EXPECTED_W = 1536;
const EXPECTED_H = 1872;

for (const cat of CATS) {
  test(`spritesheet for ${cat} is ${EXPECTED_W}x${EXPECTED_H}`, () => {
    const path = join(process.cwd(), 'public', 'pets', cat, 'spritesheet.webp');
    const buf = readFileSync(path);
    const { width, height } = webpDimensions(buf);
    expect(width).toBe(EXPECTED_W);
    expect(height).toBe(EXPECTED_H);
  });
}

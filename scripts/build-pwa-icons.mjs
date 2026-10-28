/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * One-shot rasterizer for the PWA icons. Reads public/favicon.svg (the
 * heart in brand pink #ff85a1) and emits three opaque-background PNGs
 * into public/:
 *
 *   - public/icon-192.png          (Chrome PWA manifest, required 192x192)
 *   - public/icon-512.png          (Chrome PWA manifest, required 512x512)
 *   - public/apple-touch-icon.png  (iOS Safari web clip, 180x180,
 *                                    served at the root URL path)
 *
 * ponytail: this is a dev-time tool, not a build step. Run it once after
 * adding favicon.svg, commit the resulting PNGs, and never wire it into
 * `bun run build`. sharp is only in devDependencies (~30 MB) so a
 * production bundle stays clean.
 *
 * Usage: `bun scripts/build-pwa-icons.mjs`
 */

import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SVG = readFileSync(resolve(ROOT, 'public', 'favicon.svg'));

// ponytail: background color matches the brand dark (#0a060d) so the
// icons sit flush against the home-screen aesthetic on Android/iOS.
const BACKGROUND = { r: 10, g: 6, b: 13 };

const TARGETS = [
  { size: 192, out: 'icon-192.png' },
  { size: 512, out: 'icon-512.png' },
  { size: 180, out: 'apple-touch-icon.png' },
];

for (const { size, out } of TARGETS) {
  await sharp(SVG, { density: 384 })
    .resize(size, size, { fit: 'contain', background: BACKGROUND })
    .png()
    .toFile(resolve(ROOT, 'public', out));
  console.log(`wrote public/${out} (${size}x${size})`);
}
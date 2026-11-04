/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * VK-547 — vendor the demo's media into the repo.
 *
 * The demo used to hot-link ~48 assets from three third-party hosts
 * (images.unsplash.com, upload.wikimedia.org) and the hero stream on mux.com. The hero stream stays hot-linked on purpose (unknown licence, see docs). A
 * dead CDN link was a real bug once (VK-524: the hover card showed a
 * broken seed URL), so the media now lives in `public/seed/` and the
 * site depends on nothing outside its own origin.
 *
 * Run it with the runtime the repo already uses (no new dependency):
 *
 *   node scripts/vendor-seed-media.mjs     # or: bun scripts/vendor-seed-media.mjs
 *
 * It downloads every file, checks the magic bytes (a 200 with an HTML
 * body is not an image), writes the local copies under `public/seed/`
 * and repoints `src/data/content.ts` at them. Idempotent: running it
 * twice downloads the same bytes and rewrites nothing.
 *
 * ponytail: the committed files under public/seed/ are the source of
 * truth; this script only exists to reproduce them.
 */

import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEED = join(ROOT, 'public', 'seed');

// ── Sources ─────────────────────────────────────────────────────────────────
// The photo ids are the ones the seed used to hot-link (src/data/content.ts).
const PHOTO_IDS = [
  'photo-1419833173245-f59e1b93f9ee',
  'photo-1464349095431-e9a21285b5f3',
  'photo-1475924156734-496f6cac6ec1',
  'photo-1476514525535-07fb3b4ae5f1',
  'photo-1495360010541-f48722b34f7d',
  'photo-1501339847302-ac426a4a7cbb',
  'photo-1511671782779-c97d3d27a1d4',
  'photo-1511988617509-a57c8a288659',
  'photo-1514888286974-6c03e2ca1dba',
  'photo-1516589178581-6cd7833ae3b2',
  'photo-1517256064527-09c73fc73e38',
  'photo-1517841905240-472988babdf9',
  'photo-1518199266791-5375a83190b7',
  'photo-1522673607200-164d1b6ce486',
  'photo-1529333166437-7750a6dd5a70',
  'photo-1533738363-b7f9aef128ce',
  'photo-1534528741775-53994a69daeb',
  'photo-1535930891776-0c2dfb7fda1a',
  'photo-1543852786-1cf6624b9987',
  'photo-1548802673-380ab8ebc7b7',
  'photo-1555396273-367ea4eb4db5',
  'photo-1561948955-570b270e7c36',
  'photo-1573865526739-10659fec78a5',
  'photo-1574158622682-e40e69881006'
];

// The width the site actually renders (the widest `?w=` of the old URLs).
const PHOTO_WIDTH = 1200;
const PHOTO_QUALITY = 75;

const photoUrl = (id) =>
  `https://images.unsplash.com/${id}?fm=jpg&fit=crop&w=${PHOTO_WIDTH}&q=${PHOTO_QUALITY}`;

// Wikimedia Commons: "Cat playing with a laser pointer" (CC BY-SA 3.0,
// Clément Bucco-Lechat). The 480p VP9 transcode is what the site played.
const VIDEO = {
  url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/7/7a/Cat_playing_with_a_laser_pointer.webm/Cat_playing_with_a_laser_pointer.webm.480p.vp9.webm',
  file: 'video/cat-laser-480p.webm',
  kind: 'webm'
};
const VIDEO_POSTER = {
  url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7a/Cat_playing_with_a_laser_pointer.webm/960px--Cat_playing_with_a_laser_pointer.webm.jpg',
  file: 'video/cat-laser-480p.jpg',
  kind: 'jpg'
};

// ── Helpers ────────────────────────────────────────────────────────────────
const isJpg = (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
const isWebm = (b) => b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3;
// ISO-BMFF: the init segment starts with 'ftyp', a media fragment with
// 'moof' (or 'styp'/'sidx')
const MP4_BOXES = ['ftyp', 'styp', 'moof', 'sidx', 'emsg', 'prft'];
const isMp4 = (b) => MP4_BOXES.includes(b.toString('latin1', 4, 8));
const MAGIC = { jpg: isJpg, webm: isWebm, mp4: isMp4 };

let total = 0;

async function download(url, file, kind) {
  const res = await fetch(url, { redirect: 'follow' });
  if (res.status !== 200) throw new Error(`${res.status} ${url}`);
  let body = Buffer.from(await res.arrayBuffer());
  if (body.length === 0) throw new Error(`empty body ${url}`);
  if (!MAGIC[kind](body)) throw new Error(`not a ${kind} (bad magic bytes): ${url}`);
  // ponytail: the CDN sends a fat JPEG (~200 KB); sharp (already a
  // dependency, see server/thumbs.ts) re-encodes it at the same visual
  // quality in ~60% of the bytes, and the repo is public.
  if (kind === 'jpg' && file.startsWith('photos/')) {
    body = await sharp(body).jpeg({ quality: 78, mozjpeg: true }).toBuffer();
  }
  const dest = join(SEED, file);
  await mkdir(dirname(dest), { recursive: true });
  await writeFile(dest, body);
  total += body.length;
  console.log(`  ${file}  ${(body.length / 1024).toFixed(0)} KB`);
  return dest;
}

// ── Content rewrite ────────────────────────────────────────────────────────
// Every old URL becomes its local path. Idempotent: with the URLs already
// replaced there is nothing left to replace.
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function rewrite(file, rules) {
  const path = join(ROOT, file);
  const before = await readFile(path, 'utf8');
  let after = before;
  for (const [from, to] of rules) {
    const rx = from instanceof RegExp ? from : new RegExp(escapeRe(from), 'g');
    after = after.replace(rx, to);
  }
  if (after !== before) {
    await writeFile(path, after);
    console.log(`${file}: URLs repointed at /seed/`);
  }
}

async function rewriteContent() {
  const photoRules = PHOTO_IDS.map((id) => [
    new RegExp(`https://images\\.unsplash\\.com/${id}\\?[^'"\`\\s]+`, 'g'),
    `/seed/photos/${id}.jpg`
  ]);
  // every old URL of a photo id (w=1200, w=600, w=800) points to the
  // one local file
  await rewrite(join('src', 'data', 'content.ts'), [
    ...photoRules,
    [VIDEO.url, `/seed/${VIDEO.file}`],
    [VIDEO_POSTER.url, `/seed/${VIDEO_POSTER.file}`]
  ]);
  // the default image of a custom timeline event
  await rewrite(join('src', 'components', 'AddMemoryModal.tsx'), photoRules);
}

// ── Run ────────────────────────────────────────────────────────────────────
console.log('photos:');
for (const id of PHOTO_IDS) {
  await download(photoUrl(id), `photos/${id}.jpg`, 'jpg');
}

console.log('seed video:');
await download(VIDEO.url, VIDEO.file, VIDEO.kind);
await download(VIDEO_POSTER.url, VIDEO_POSTER.file, VIDEO_POSTER.kind);

await rewriteContent();
console.log(`total: ${(total / 1024 / 1024).toFixed(2)} MB in public/seed/`);

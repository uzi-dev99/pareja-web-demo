/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: the phone does not upload the 8 MB original.
 *
 *   1. compressImage() exists, caps the longest side at 2048 px and
 *      encodes JPEG at quality 0.8 — the values the ticket asks for.
 *   2. It never throws: an undecodable format (HEIC) or a canvas failure
 *      falls back to the untouched original, so the upload still happens.
 *   3. usePhotos compresses BEFORE computing the total bytes, so the
 *      progress bar measures the bytes that actually travel.
 *   4. The compressed file keeps a .jpg name — the server derives the
 *      stored extension from the file name.
 *   5. A file with an unknown MIME type is still compressed (a browser
 *      that does not know the extension gives type === '').
 *   6. usePhotos compresses ONE photo at a time: decoding ten 12 MP
 *      photos in parallel keeps ten bitmaps alive (~500 MB) and the
 *      mobile tab dies before uploading.
 *   7. The carousel replacement compresses too — it has its own uploader,
 *      it does not go through addPhotos.
 *
 * ponytail: source-level guards for the wiring, runtime checks for the
 * logic (the browser APIs are stubbed: createImageBitmap + canvas).
 */

import { test, expect } from 'bun:test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const read = (...p: string[]) => readFileSync(join(ROOT, ...p), 'utf8');

/**
 * Minimal browser stubs: createImageBitmap + a canvas that returns a tiny
 * JPEG. `onStart`/`onEnd` observe how many decodes are alive at once.
 */
function stubBrowser(opts: { delayMs?: number; onStart?: () => void; onEnd?: () => void } = {}): () => void {
  Object.assign(globalThis, {
    createImageBitmap: async () => {
      opts.onStart?.();
      if (opts.delayMs) await new Promise((r) => setTimeout(r, opts.delayMs));
      opts.onEnd?.();
      return { width: 3000, height: 2000, close() {} };
    },
    document: {
      createElement: () => ({
        width: 0,
        height: 0,
        getContext: () => ({ fillRect() {}, drawImage() {} }),
        toBlob: (cb: (b: Blob | null) => void) => cb(new Blob([new Uint8Array(512)], { type: 'image/jpeg' }))
      })
    }
  });
  return () => {
    Reflect.deleteProperty(globalThis, 'createImageBitmap');
    Reflect.deleteProperty(globalThis, 'document');
  };
}

function bigFile(name: string, type = 'image/jpeg'): File {
  return new File([new Uint8Array(2 * 1024 * 1024)], name, { type });
}

test('src/utils/compressImage.ts exists', () => {
  expect(existsSync(join(ROOT, 'src', 'utils', 'compressImage.ts'))).toBe(true);
});

test('compressImage caps the longest side at 2048 px and encodes JPEG q0.8', () => {
  const src = read('src', 'utils', 'compressImage.ts');
  expect(src).toMatch(/MAX_UPLOAD_SIDE\s*=\s*2048\b/);
  expect(src).toMatch(/UPLOAD_QUALITY\s*=\s*0\.8\b/);
  expect(src).toMatch(/toBlob\([^)]*'image\/jpeg'/);
});

test('compressImage honours the EXIF orientation', () => {
  const src = read('src', 'utils', 'compressImage.ts');
  expect(src).toMatch(/imageOrientation:\s*'from-image'/);
});

test('compressImage never throws — it falls back to the original file', () => {
  const src = read('src', 'utils', 'compressImage.ts');
  expect(src).toMatch(/catch\s*\{[\s\S]{0,200}return file;/);
});

test('the compressed file keeps a .jpg name', () => {
  const src = read('src', 'utils', 'compressImage.ts');
  expect(src).toMatch(/'\.jpg'/);
});

test('usePhotos compresses before it measures the bytes to upload', () => {
  const src = read('src', 'hooks', 'usePhotos.ts');
  expect(src).toMatch(/import \{ compressImage \} from '\.\.\/utils\/compressImage'/);
  const compressAt = src.indexOf('compressImage');
  const totalAt = src.indexOf('totalBytes');
  expect(compressAt).toBeGreaterThan(-1);
  expect(compressAt).toBeLessThan(totalAt);
});

test('usePhotos uploads the compressed files, not the originals', () => {
  const src = read('src', 'hooks', 'usePhotos.ts');
  expect(src).toMatch(/for \(const file of prepared\)/);
});

test('a file with an unknown MIME type is still compressed', async () => {
  // ponytail: a browser that does not know the extension hands over
  // type === '' — the file must not skip the compression.
  const restore = stubBrowser();
  try {
    const { compressImage } = await import('../src/utils/compressImage');
    const file = bigFile('photo.bin', '');
    const out = await compressImage(file);
    expect(out.name).toBe('photo.jpg');
    expect(out.size).toBeLessThan(file.size);
  } finally {
    restore();
  }
});

test('usePhotos compresses one photo at a time', async () => {
  // ponytail: decoding in parallel keeps one bitmap per photo alive
  // (~48 MB for a 12 MP photo) — ten of them kill the mobile tab.
  let live = 0;
  let maxLive = 0;
  const restore = stubBrowser({
    delayMs: 5,
    onStart: () => { live++; maxLive = Math.max(maxLive, live); },
    onEnd: () => { live--; }
  });
  try {
    const { prepareFiles } = await import('../src/hooks/usePhotos');
    const out = await prepareFiles([bigFile('a.jpg'), bigFile('b.jpg'), bigFile('c.jpg')]);
    expect(out).toHaveLength(3);
    expect(maxLive).toBe(1);
  } finally {
    restore();
  }
});

test('the carousel replacement compresses the photos before uploading them', () => {
  // ponytail: TimelineCarousel has its own uploader, it does not go
  // through addPhotos — without this the 8 MB original still travels.
  const src = read('src', 'components', 'TimelineCarousel.tsx');
  expect(src).toMatch(/import \{ compressImage \} from '\.\.\/utils\/compressImage'/);
  expect(src).toMatch(/form\.append\('files', await compressImage\(f\)\)/);
});

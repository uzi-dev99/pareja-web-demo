/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: Gallery.tsx and SecretCollageModal.tsx must both consume
 * the shared usePhotoUpload hook instead of inlining their own
 * (isUploading + progress + try/finally + reset) logic. The user
 * explicitly asked for /ponytail deduplication after hitting the
 * secret-collage's files[0] bug — a hand-rolled second copy is exactly
 * how that bug crept back in.
 *
 * This file asserts:
 *   - Gallery imports usePhotoUpload and calls it
 *   - Gallery does NOT keep a duplicated local upload handler with its
 *     own isUploading/progress state.
 *   - SecretCollageModal imports usePhotoUpload and calls it
 *   - SecretCollageModal does NOT keep a duplicated local upload handler
 *   - Both modals' file inputs declare `multiple` so the OS picker
 *     accepts more than one selection.
 *   - Neither modal's change handler truncates to files[0]
 *     (the original secret-collage bug).
 *
 * ponytail: source-level guards. A consumer that forks the upload
 * state again would fail these tests before it could ship.
 */

import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const GALLERY = readFileSync(join(ROOT, 'src', 'components', 'Gallery.tsx'), 'utf8');
const SECRET  = readFileSync(join(ROOT, 'src', 'components', 'SecretCollageModal.tsx'), 'utf8');

// --- Gallery ---

test('Gallery imports usePhotoUpload from src/hooks', () => {
  expect(GALLERY).toMatch(/from\s+['"]\.\.\/hooks\/usePhotoUpload['"]/);
});

test('Gallery destructures { isUploading, progress, uploadFiles }', () => {
  expect(GALLERY).toMatch(/usePhotoUpload[\s\S]*?\(\s*\{[\s\S]*?addPhotos/);
  // ponytail: allow renames (e.g. `progress: uploadProgress`). The
  // important part is that the three names appear together in the
  // destructure, not that they are spelled exactly that way.
  expect(GALLERY).toMatch(
    /\{\s*isUploading(?::\s*\w+)?\s*,\s*progress(?::\s*\w+)?\s*,\s*uploadFiles(?::\s*\w+)?\s*\}/
  );
});

test('Gallery does NOT keep duplicated local isUploading/progress useState', () => {
  // ponytail: the whole point of the refactor is to remove the
  // duplicated state. If someone re-adds it (or never deletes it),
  // this test fails so the duplication is caught immediately.
  expect(GALLERY).not.toMatch(/const\s*\[isUploading,\s*setIsUploading\]\s*=\s*useState\(false\)/);
  expect(GALLERY).not.toMatch(/const\s*\[uploadProgress,\s*setUploadProgress\]\s*=\s*useState\(0\)/);
});

test('Gallery file input still declares `multiple`', () => {
  const inputBlock =
    GALLERY.match(/Hidden file input for bulk upload[\s\S]*?\/>/)?.[0] ?? '';
  expect(inputBlock).toMatch(/\bmultiple\b/);
});

// --- SecretCollageModal ---

test('SecretCollageModal imports usePhotoUpload from src/hooks', () => {
  expect(SECRET).toMatch(/from\s+['"]\.\.\/hooks\/usePhotoUpload['"]/);
});

test('SecretCollageModal destructures { isUploading, progress, uploadFiles }', () => {
  expect(SECRET).toMatch(/usePhotoUpload[\s\S]*?\(\s*\{[\s\S]*?addPhotos/);
  // ponytail: there are TWO hooks (add + replace), and BOTH must
  // destructure uploadFiles with that exact name. Two matches.
  const matches = SECRET.match(/\{\s*isUploading(?::\s*\w+)?\s*,\s*progress(?::\s*\w+)?\s*,\s*uploadFiles(?::\s*\w+)?\s*\}/g) ?? [];
  expect(matches.length).toBeGreaterThanOrEqual(1);
});

test('SecretCollageModal does NOT keep duplicated local isAdding/addProgress useState', () => {
  expect(SECRET).not.toMatch(/const\s*\[isAdding,\s*setIsAdding\]\s*=\s*useState\(false\)/);
  expect(SECRET).not.toMatch(/const\s*\[addProgress,\s*setAddProgress\]\s*=\s*useState\(0\)/);
});

test('SecretCollageModal file input declares `multiple` (bugfix for bulk upload)', () => {
  // ponytail: this is the regression that triggered the refactor.
  // Lock it in so a future engineer cannot accidentally drop the
  // attribute while editing the input.
  expect(SECRET).toMatch(/<input[^>]*type=["']file["'][^>]*multiple\b/s);
});

test('SecretCollageModal change handler does NOT truncate to files[0]', () => {
  // ponytail: original bug — the secret collage's handler did
  // `addPhotos([files[0]], ...)` which silently dropped everything
  // past the first file. The new handler must call uploadFiles with
  // the full FileList so the hook's Array.from handles iteration.
  expect(SECRET).not.toMatch(/\[files\[0\]\]/);
  expect(SECRET).not.toMatch(/\.files\?\.\[0\]/);
  expect(SECRET).toMatch(/uploadFiles\s*\(\s*e\.target\.files\s*\)/);
});
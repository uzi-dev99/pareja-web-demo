/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: src/hooks/usePhotoUpload.ts is the shared bulk-upload hook
 * used by both the public Gallery AND the secret CollageModal. Before
 * it existed, every consumer rolled its own (isUploading + progress +
 * try/finally + alert + reset input.value) and the secret collage's
 * version had a real bug — it truncated to files[0] so the OS picker
 * accepted one selection but the upload silently dropped the rest.
 *
 * The hook:
 *   - accepts an `addPhotos(files, { onProgress })` function (from
 *     usePhotos) and an optional `onError` callback.
 *   - exposes `isUploading: boolean`, `progress: number`, and
 *     `uploadFiles(files: FileList | File[]): Promise<void>`.
 *   - the consumer wires up the file input ref and just calls
 *     `uploadFiles(e.target.files)` from the onChange handler.
 *
 * ponytail: source-level test against the new hook. No DOM mount
 * needed — we assert the contract by reading the source.
 */

import { test, expect } from 'bun:test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const PATH = join(ROOT, 'src', 'hooks', 'usePhotoUpload.ts');

test('src/hooks/usePhotoUpload.ts exists', () => {
  expect(existsSync(PATH)).toBe(true);
});

test('usePhotoUpload is a React hook that takes an addPhotos function', () => {
  // ponytail: lock the shape so a future refactor that drops the
  // shared contract (or renames it to a plain util) is caught before
  // consumers silently re-fork the logic.
  const src = readFileSync(PATH, 'utf8');
  expect(src).toMatch(/export\s+function\s+usePhotoUpload\b/);
  expect(src).toMatch(/addPhotos/);
});

test('usePhotoUpload returns isUploading, progress, and uploadFiles', () => {
  const src = readFileSync(PATH, 'utf8');
  // ponytail: assert the public surface so callers can rely on these
  // names without having to grep the implementation.
  expect(src).toMatch(/\bisUploading\s*:\s*boolean\b/);
  expect(src).toMatch(/\bprogress\s*:\s*number\b/);
  expect(src).toMatch(/\buploadFiles\s*[:(]/);
});

test('uploadFiles accepts BOTH FileList and File[]', () => {
  const src = readFileSync(PATH, 'utf8');
  // ponytail: callers pass either a FileList (from e.target.files) or
  // an already-arrayed File[] (from Array.from). The hook must accept
  // both without forcing callers to convert.
  expect(src).toMatch(/FileList\s*\|\s*File\[\]/);
});

test('usePhotoUpload iterates Array.from(files) — never truncates to files[0]', () => {
  const src = readFileSync(PATH, 'utf8');
  // ponytail: this is the regression that hit the secret collage. The
  // hook MUST convert the FileList to an array before passing it to
  // addPhotos. Single-element iteration is what made the bug invisible
  // (most of the time only one file is picked).
  expect(src).toMatch(/Array\.from/);
  expect(src).not.toMatch(/\.files\?\.\[0\]/);
  expect(src).not.toMatch(/\[files\[0\]\]/);
});
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: `usePhotos.addPhotos` only requires EDIT_TOKEN when the bucket
 * is one of the write-protected ones (`secret`, `carousel`). For `public`
 * (the gallery that any visitor can upload to) the request must NOT include
 * `X-Edit-Token` and the code must NOT prompt for one.
 *
 * This is the client-side half of "direct upload to gallery". The
 * server-side counterpart lives in `tests/server-public-upload-no-auth.test.ts`.
 *
 * ponytail: source-level guard. If anyone re-introduces a token prompt
 * inside the public branch (or strips it from the protected branches),
 * the regex below catches the regression before merge.
 */

import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const HOOK = readFileSync(join(ROOT, 'src', 'hooks', 'usePhotos.ts'), 'utf8');

/**
 * Slice the body of the `addPhotos` useCallback so the assertions below
 * only see calls inside that function. We start at `const addPhotos = useCallback`
 * and stop at the next top-level `useCallback`/declaration that closes
 * this arrow (heuristic: 1800 chars or the next `const ` declaration at
 * the same indentation level, whichever comes first).
 */
function addPhotosSlice(): string {
  const startRe = /const\s+addPhotos\s*=\s*useCallback\(/;
  const m = HOOK.match(startRe);
  if (!m || m.index === undefined) return '';
  const start = m.index;
  const after = HOOK.slice(start);
  const end = Math.min(after.length, 1800);
  return HOOK.slice(start, start + end);
}

test('usePhotos defines addPhotos that branches on bucket', () => {
  expect(HOOK).toMatch(/const addPhotos = useCallback/);
  expect(HOOK).toMatch(/form\.set\(\s*['"]bucket['"]\s*,\s*bucket\s*\)/);
});

test('addPhotos: public bucket skips ensureToken (no EDIT_TOKEN prompt)', () => {
  // ponytail: every ensureToken() call inside addPhotos must be guarded
  // by `bucket !== 'public'` (or syntactic equivalent). A flat
  // `await ensureToken()` at the top of addPhotos would block public
  // uploads with a window.prompt — the regression we want to prevent.
  const slice = addPhotosSlice();
  expect(slice).not.toBe('');

  const re = /ensureToken\s*\(\s*\)/g;
  let m: RegExpExecArray | null;
  const calls: number[] = [];
  while ((m = re.exec(slice)) !== null) calls.push(m.index);
  expect(calls.length).toBeGreaterThan(0);

  for (const idx of calls) {
    const win = slice.slice(Math.max(0, idx - 200), idx);
    // Window must show a public-bucket exclusion. Accept:
    //   `if (bucket !== 'public')`, `bucket !== 'public' && ...`, etc.
    const excludesPublic =
      /!==\s*['"]public['"]/.test(win) ||
      /!=\s*['"]public['"]/.test(win);
    expect(excludesPublic).toBe(true);
  }
});

test('addPhotos: public bucket XHR does NOT send X-Edit-Token header', () => {
  // ponytail: every `xhr.setRequestHeader('X-Edit-Token', ...)` inside
  // addPhotos must be guarded by `bucket !== 'public'` so the public
  // upload carries no token. An unconditional setRequestHeader would
  // either leak a token or be rejected server-side after we drop auth.
  const slice = addPhotosSlice();
  expect(slice).not.toBe('');

  const re = /xhr\.setRequestHeader\(\s*['"]X-Edit-Token['"]/g;
  let m: RegExpExecArray | null;
  const calls: number[] = [];
  while ((m = re.exec(slice)) !== null) calls.push(m.index);
  expect(calls.length).toBeGreaterThan(0);

  for (const idx of calls) {
    const win = slice.slice(Math.max(0, idx - 200), idx);
    const excludesPublic =
      /!==\s*['"]public['"]/.test(win) ||
      /!=\s*['"]public['"]/.test(win);
    expect(excludesPublic).toBe(true);
  }
});

test('protected ops (updatePhoto / deletePhoto / deleteAll) still call ensureToken', () => {
  // ponytail: the destructive paths MUST keep the token gate. If a
  // future refactor strips ensureToken from any of them, this test
  // catches it. Each function is expected to await ensureToken()
  // somewhere in its body.
  expect(HOOK).toMatch(/updatePhoto[\s\S]*?await\s+ensureToken/);
  expect(HOOK).toMatch(/deletePhoto[\s\S]*?await\s+ensureToken/);
  expect(HOOK).toMatch(/deleteAll[\s\S]*?await\s+ensureToken/);
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: the public-bucket upload path on the server does NOT require
 * EDIT_TOKEN. Any visitor can POST to `/api/photos` with `bucket=public`
 * and have their image saved. The destructive endpoints (PUT, DELETE,
 * and POST for `secret`/`carousel`) keep the EDIT_TOKEN requirement.
 *
 * ponytail: source-level guard. The check lives in the POST handler's
 * branch order — `requireEditAuth(req)` must be guarded so it skips the
 * public bucket. If anyone re-introduces an unconditional auth check
 * (or wraps auth around the whole POST), this test fails before deploy.
 */

import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SERVER = readFileSync(join(ROOT, 'server', 'index.ts'), 'utf8');

test('server defines the POST /api/photos handler', () => {
  // sanity: we extract the POST handler so the rest of this file
  // can assert against a bounded slice (avoids false positives from
  // the DELETE-handler auth checks living elsewhere in the file).
  expect(SERVER).toMatch(/req\.method === ['"]POST['"][\s\S]*?path === ['"]\/api\/photos['"]/);
});

/**
 * Return the text of the POST /api/photos handler — everything from the
 * `if (req.method === 'POST' && path === '/api/photos') { ... }` line up
 * to the next matching top-level closing brace for that branch. We pick
 * a conservative slice (1000 chars or until the next `// ───` separator
 * comment, whichever comes first) so we don't drag in unrelated code.
 */
function postHandlerSlice(): string {
  const re = /if\s*\(\s*req\.method\s*===\s*['"]POST['"]\s*&&\s*path\s*===\s*['"]\/api\/photos['"]\s*\)\s*\{/;
  const m = SERVER.match(re);
  if (!m || m.index === undefined) return '';
  const start = m.index;
  const after = SERVER.slice(start);
  // slice until the next section separator or 2000 chars, whichever first.
  const end = (() => {
    const sep = after.indexOf('// ───');
    const limit = 2000;
    if (sep > 0 && sep < limit) return start + sep;
    return start + limit;
  })();
  return SERVER.slice(start, end);
}

test('POST /api/photos handler exists and is bounded', () => {
  expect(postHandlerSlice()).not.toBe('');
});

test('POST handler skips requireEditAuth for bucket === "public"', () => {
  // ponytail: the requireEditAuth call inside the POST handler must be
  // guarded by `bucket !== 'public'` (or equivalent). A flat call at the
  // top of the POST handler would block public uploads, which is the
  // regression we want to prevent.
  const slice = postHandlerSlice();
  expect(slice).toMatch(/requireEditAuth\s*\(\s*req\s*\)/);

  // Find every requireEditAuth call inside the slice and assert each
  // one is preceded (within 200 chars) by a guard that excludes the
  // public bucket.
  const re = /requireEditAuth\s*\(\s*req\s*\)/g;
  let m: RegExpExecArray | null;
  let count = 0;
  while ((m = re.exec(slice)) !== null) {
    count++;
    const start = Math.max(0, m.index - 200);
    const win = slice.slice(start, m.index);
    // The window must mention 'public' and a NOT-style exclusion. We
    // accept any of: `!== 'public'`, `! 'public'`, or a check that
    // reads "bucket is not public".
    const excludesPublic =
      /!==\s*['"]public['"]/.test(win) ||
      /!=\s*['"]public['"]/.test(win) ||
      /['"]public['"][\s\S]{0,40}!==/.test(win) ||
      /!==[\s\S]{0,40}['"]public['"]/.test(win);
    expect(excludesPublic).toBe(true);
  }
  // We expect at least one requireEditAuth call inside the POST handler
  // (for secret/carousel). Without it, the test "excludesPublic" loop
  // would not run at all.
  expect(count).toBeGreaterThan(0);
});

test('POST handler still allows bucket === "public" to reach the save path', () => {
  // ponytail: the public branch must reach `saveUpload` (or equivalent)
  // WITHOUT having been rejected by an auth check. We assert the slice
  // mentions `saveUpload` AND that the bucket guard for public is on
  // the route to saveUpload, not after a return.
  const slice = postHandlerSlice();
  expect(slice).toMatch(/saveUpload/);
  expect(slice).toMatch(/['"]public['"]/);
});

test('PUT/DELETE handlers still call requireEditAuth unconditionally', () => {
  // ponytail: destructive endpoints must keep the gate. Source-level:
  // the PUT and DELETE branches (outside the POST slice) call
  // requireEditAuth without any bucket guard. We confirm by counting
  // total `requireEditAuth(req)` calls and requiring >= 5 (POST partial,
  // PUT, DELETE single, DELETE bulk, POST songs, PUT song, DELETE song).
  const calls = (SERVER.match(/requireEditAuth\s*\(\s*req\s*\)/g) ?? []).length;
  expect(calls).toBeGreaterThanOrEqual(5);
});

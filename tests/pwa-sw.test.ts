/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: public/sw.js is a minimal pass-through service worker whose
 * only job is to satisfy Chrome's "page must register a service worker
 * with a fetch handler" install criterion.
 *
 * We deliberately do NOT add caching logic. Caching without a deploy-time
 * cache-bust strategy is the most common cause of "old app stuck in
 * service worker" tickets. Re-introduce caching only with a coordinated
 * version-bump plan.
 *
 * ponytail: source-level test against the actual file on disk.
 */

import { test, expect } from 'bun:test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const PATH = join(ROOT, 'public', 'sw.js');

test('public/sw.js exists', () => {
  expect(existsSync(PATH)).toBe(true);
});

test('sw.js registers install / activate / fetch handlers', () => {
  const src = readFileSync(PATH, 'utf8');
  // ponytail: the install criterion is "must have a fetch handler" — the
  // others are best-practice but not strictly required. We assert them
  // anyway because the file is otherwise empty noise.
  expect(src).toMatch(/addEventListener\(\s*['"]install['"]/);
  expect(src).toMatch(/addEventListener\(\s*['"]activate['"]/);
  expect(src).toMatch(/addEventListener\(\s*['"]fetch['"]/);
});

test('sw.js does NOT contain any caching logic', () => {
  // ponytail: guard against accidental cache additions. If a future
  // engineer adds caching here without a deploy-time cache bust, this
  // test forces them to update the contract on purpose.
  const src = readFileSync(PATH, 'utf8');
  expect(src).not.toMatch(/caches\.open/);
  expect(src).not.toMatch(/caches\.match/);
  expect(src).not.toMatch(/CacheStorage/);
});
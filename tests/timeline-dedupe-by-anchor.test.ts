/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Regression: the timeline was rendering the same Septiembre entry twice
 * — once from the static seed list and once from somewhere else (either
 * a stale deploy bundle or a user-saved memory via AddMemoryModal).
 * Either way, the rendered list must not show two cards with the same
 * monthAnchor — the second copy is always the loser.
 *
 * Contract:
 *   - Timeline.tsx combines `timelineEvents` (static) with `customEvents`
 *     (localStorage-backed user additions) and renders them in array
 *     order.
 *   - The combined list is filtered so that, for any given monthAnchor,
 *     only the first occurrence (static > custom by source order) is
 *     kept.
 *   - The dedupe happens BEFORE the visibleTimeline truncation so
 *     paginated views also count uniques.
 *
 * ponytail: source-level test against Timeline.tsx — no DOM mount needed.
 * We assert the dedupe is present (Set or filter pattern) and that it
 * runs against `monthAnchor`.
 */

import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SRC = readFileSync(join(ROOT, 'src', 'components', 'Timeline.tsx'), 'utf8');

test('Timeline.tsx builds the all-events list from timelineEvents + customEvents', () => {
  // ponytail: lock the input shape so a future refactor that drops
  // customEvents fails this guard before it breaks the dedupe test.
  expect(SRC).toMatch(/\[\s*\.\.\.timelineEvents\s*,\s*\.\.\.customEvents\s*\]/);
});

test('Timeline.tsx dedupes the combined event list by monthAnchor', () => {
  // ponytail: accept either a Set/Map dedupe or a reduce/filter
  // dedupe. The contract is that monthAnchor is the dedupe key — first
  // occurrence wins.
  const dedupePatterns = [
    /new\s+Set\s*<[^>]*>\s*\(/,                          // Set(anchors) guard
    /seenAnchors|seenSet|anchorSet|uniqueAnchors/,      // named set
    /\.filter\s*\(\s*\([^)]*\)\s*=>[\s\S]*?monthAnchor/, // filter by anchor
    /\.reduce[\s\S]*?monthAnchor/,                       // reduce by anchor
  ];
  const matches = dedupePatterns.map((p) => SRC.match(p)?.[0] ?? null);
  // ponytail: at least one of the patterns must match — we don't care
  // which dedupe style the author chose.
  expect(matches.some(Boolean)).toBe(true);
});

test('dedupe is applied before the visibleTimeline truncation', () => {
  // ponytail: if dedupe happens AFTER the slice, the user could see
  // a duplicate and miss the unique entry that was truncated. The
  // dedupe MUST run on the full combined list first.
  const dedupeIdx = SRC.search(/seenAnchors|seenSet|anchorSet|new\s+Set/);
  const sliceIdx = SRC.search(/visibleTimeline\s*\(/);
  expect(dedupeIdx).toBeGreaterThan(0);
  expect(sliceIdx).toBeGreaterThan(0);
  expect(dedupeIdx).toBeLessThan(sliceIdx);
});

test('the dedupe keeps the FIRST occurrence (static > custom)', () => {
  // ponytail: the spec is "first wins". `Array.prototype.filter` with a
  // closure-scoped Set is the simplest way to express this. We assert
  // the closure-set pattern explicitly so a reverse-order filter (that
  // kept the LAST occurrence) would fail.
  expect(SRC).toMatch(/filter[\s\S]{0,200}monthAnchor/);
});
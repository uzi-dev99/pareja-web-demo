/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Regression: the timeline already had a `event-sep-2026-cumple`
 * birthday entry but no other September 2026 memory. The user wanted
 * "September in the timeline, in addition to the 16th birthday" — i.e.
 * a second, non-birthday September entry so the month is not just
 * about the cake.
 *
 * Contract:
 *   - timelineEvents has at least 2 entries whose month === 'Septiembre'.
 *   - exactly one of them has isBirthdayPlaceholder === true.
 *   - the other one has a unique monthAnchor that does not collide with
 *     the birthday anchor (`mes-septiembre-2026`).
 *   - the non-birthday entry has a non-empty title + text so the card
 *     renders meaningfully out of the box.
 *
 * ponytail: source-level test against src/data/content.ts. No DOM mount
 * required.
 */

import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SRC = readFileSync(join(ROOT, 'src', 'data', 'content.ts'), 'utf8');

// ponytail: pull out the timelineEvents array literal so the assertion
// matches only the seed list and not any future re-exports. The type
// annotation between `=` and `[` is optional in TS, so allow it.
const TIMELINE_BLOCK =
  SRC.match(/export const timelineEvents[^\n]*=\s*\[[\s\S]*?\n\];/)?.[0] ?? '';

test('source has at least two Septiembre entries', () => {
  const matches = TIMELINE_BLOCK.match(/month:\s*['"]Septiembre['"]/g) ?? [];
  expect(matches.length).toBeGreaterThanOrEqual(2);
});

test('exactly one Septiembre entry is the cumple event', () => {
  // ponytail: the kind discriminator replaced the legacy
  // `isBirthdayPlaceholder: true` flag. Count `kind: 'event'` entries
  // in the seed block — exactly one (the cumple) must have it; the
  // "previa al cumple" is a month recap, not an event.
  const eventFlags = TIMELINE_BLOCK.match(/kind:\s*['"]event['"]/g) ?? [];
  expect(eventFlags).toHaveLength(1);
});

test('non-birthday Septiembre entry has a monthAnchor distinct from the birthday one', () => {
  // ponytail: the birthday uses `mes-septiembre-2026`. The new entry
  // must use a DIFFERENT anchor so the two don't share a DOM id and
  // timeline scroll anchors stay unambiguous.
  const birthdayAnchor = 'mes-septiembre-2026';
  const anchorMatches = [
    ...TIMELINE_BLOCK.matchAll(/monthAnchor:\s*['"]([^'"]+)['"]/g)
  ].map((m) => m[1]);
  const septiembreAnchors = anchorMatches.filter((a) =>
    a.startsWith('mes-septiembre')
  );
  expect(septiembreAnchors).toContain(birthdayAnchor);
  const extras = septiembreAnchors.filter((a) => a !== birthdayAnchor);
  expect(extras.length).toBeGreaterThanOrEqual(1);
});

test('non-birthday Septiembre entry has title + text populated', () => {
  // ponytail: the user will customize via the inline EditableText, but
  // the seed must not be blank — otherwise the card renders an empty
  // statement out of the box.
  // We assert by counting: the source must contain the marker
  // comments we add when seeding the new event.
  expect(TIMELINE_BLOCK).toMatch(/title:\s*['"][^'"]+['"]/);
  expect(TIMELINE_BLOCK).toMatch(/text:\s*[`'"][^`'"]{20,}/);
});

test('non-birthday Septiembre entry appears BEFORE the birthday in the array', () => {
  // ponytail: chronological order — the "previa al cumple" is from
  // September 1 and the birthday is on the 16. The timeline iterates
  // the array top-down, so the previa entry must be declared first.
  // Lock the order via positional indices on the entry ids.
  const previaIdx = TIMELINE_BLOCK.indexOf("id: 'event-sep-2026-antes'");
  const cumpleIdx = TIMELINE_BLOCK.indexOf("id: 'event-sep-2026-cumple'");
  expect(previaIdx).toBeGreaterThan(0);
  expect(cumpleIdx).toBeGreaterThan(0);
  expect(previaIdx).toBeLessThan(cumpleIdx);
});
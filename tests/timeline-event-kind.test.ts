/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: TimelineEvent gains a `kind` discriminator so we can store
 * both monthly recaps AND specific-day events (birthday, anniversary,
 * etc.) in the same timeline without tagging them as 'birthday'.
 *
 *   1. `kind: 'month' | 'event'` is on the interface (required).
 *   2. `eventAnchor?: string` exists for events (so the server-side
 *      photo bucket can key per-event without colliding with the
 *      month's carousel bucket).
 *   3. AddMemoryModal has a `kind` state and a dropdown to choose
 *      'month' recap vs 'event' day.
 *   4. AddMemoryModal generates `eventAnchor: event-${slug}-${year}`
 *      when kind === 'event'.
 *   5. Timeline groups events by (year, month) and orders them as
 *      month recap first, then its events for that month, before
 *      moving to the next month.
 *
 * ponytail: source-level guards. The kind discriminator is the load-
 * bearing piece of the new timeline data model — losing it (e.g. by
 * dropping it from the interface in a refactor) would silently break
 * the sort and the server carousel keying.
 */

import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const TYPES = readFileSync(join(ROOT, 'src', 'types.ts'), 'utf8');
const ADD_MODAL = readFileSync(join(ROOT, 'src', 'components', 'AddMemoryModal.tsx'), 'utf8');
const TIMELINE = readFileSync(join(ROOT, 'src', 'components', 'Timeline.tsx'), 'utf8');
// ponytail: el comparador vive en el util puro (src/utils/timelineMonths.ts),
// no en el JSX: los guards de esta línea leen el util.
const UTIL = readFileSync(join(ROOT, 'src', 'utils', 'timelineMonths.ts'), 'utf8');

// 1. kind discriminator
test('TimelineEvent.kind is "month" | "event"', () => {
  expect(TYPES).toMatch(/kind:\s*['"]month['"]\s*\|\s*['"]event['"]/);
});

// 2. eventAnchor field for events
test('TimelineEvent has optional eventAnchor string', () => {
  expect(TYPES).toMatch(/eventAnchor\?:\s*string/);
});

// 3. AddMemoryModal dropdown for kind
test('AddMemoryModal declares kind state', () => {
  // ponytail: the modal must own its kind state until save time. The
  // dropdown's onChange calls setKind.
  expect(ADD_MODAL).toMatch(/useState<['"]month['"]\s*\|\s*['"]event['"]>/);
  expect(ADD_MODAL).toMatch(/setKind\(/);
});

test('AddMemoryModal offers a month-vs-event choice', () => {
  // ponytail: the UI lets the user pick between recap ('month') and
  // specific day ('event'). On mobile-first designs this is a pair of
  // big tap targets rather than a tiny <select> — lock the two label
  // strings so the choice cannot disappear silently.
  expect(ADD_MODAL).toMatch(/Mes\s*\(recap mensual\)/);
  expect(ADD_MODAL).toMatch(/Evento específico/);
});

// 4. AddMemoryModal builds eventAnchor when kind === 'event'
test('AddMemoryModal builds eventAnchor only for kind=event', () => {
  // ponytail: anchor format is event-${slug}-${year} per the design.
  expect(ADD_MODAL).toMatch(/event-\$\{[\s\S]+?\}\-\$\{year\}/);
  // The eventAnchor must be assigned inside the kind === 'event' branch
  // (or via a ternary) — never set for kind === 'month'.
  expect(ADD_MODAL).toMatch(/kind\s*===\s*['"]event['"][\s\S]{0,300}?eventAnchor/);
});

// 5. Timeline groups by (year, month) and orders month recap → events
test('the timeline sort groups by (year, month) and puts the recap first', () => {
  // ponytail: the sort is the load-bearing behavior. Lock that it
  // (a) compares by year, (b) then by month via a canonical order,
  // and (c) places kind === 'month' before kind === 'event' within
  // each (year, month) group. We assert the source does NOT keep
  // the legacy flat order (which was just array index / insertion
  // order).
  expect(UTIL).toMatch(/a\.year[\s\S]{0,80}?b\.year/);
  expect(UTIL).toMatch(/monthsListOrder|MONTHS_ORDER|MESES_ORDER/);
  // Within a group, month recap first, events after.
  expect(UTIL).toMatch(/a\.kind\s*===\s*['"]month['"][\s\S]{0,300}?1/);
  // ponytail: y el componente usa ese util (no un sort propio en el JSX).
  expect(TIMELINE).toMatch(/visibleTimeline\s*\(/);
});

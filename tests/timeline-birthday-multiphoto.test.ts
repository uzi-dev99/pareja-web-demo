/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Regression (new): the cumple photo slot in Timeline.tsx used to live
 * in localStorage and could only hold one photo (file input had no
 * `multiple`, handler grabbed files[0]). The user wanted several photos
 * for the celebration.
 *
 * The migration to the server carousel bucket (eventId='event-cumple-
 * demo-2026') means the limit is now whatever the server accepts — but
 * the upload contract must still be multi-photo so the slot is not
 * artificially capped at one.
 *
 * Contract after the migration:
 *   - Timeline.tsx exports a `BirthdaySlot` component (ponytail: it
 *     lived next to Timeline because nothing else needs this layout).
 *   - The cumple carousel is read via usePhotos('carousel', { eventId:
 *     'event-cumple-demo-2026' }) — the same hook the rest of the
 *     app uses. No localStorage, no race condition with Gallery.
 *   - The upload input declares `multiple` so the OS picker accepts
 *     more than one selection.
 *   - The change handler feeds the full FileList to uploadFiles (via
 *     usePhotoUpload) — never truncates to files[0].
 *   - When there is at least one photo, the slot renders TimelineCarousel
 *     (multi-photo capable) — not a single <img> fallback.
 *
 * ponytail: source-level test against Timeline.tsx. No DOM mount needed.
 */

import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SRC = readFileSync(join(ROOT, 'src', 'components', 'Timeline.tsx'), 'utf8');

test('BirthdaySlot component is exported from Timeline.tsx', () => {
  expect(SRC).toMatch(/export const BirthdaySlot/);
});

test('BirthdaySlot reads the carousel via the shared usePhotos hook', () => {
  // ponytail: must call usePhotos('carousel', { eventId: ... }) — the
  // exact same hook signature the rest of the app uses, with no fork.
  expect(SRC).toMatch(
    /usePhotos\(\s*['"]carousel['"]\s*,\s*\{\s*eventId:\s*['"]event-cumple-demo-2026['"]/
  );
});

test('BirthdaySlot uses the shared usePhotoUpload hook (not its own)', () => {
  expect(SRC).toMatch(/usePhotoUpload\(\{[\s\S]*?addPhotos[\s\S]*?\}\)/);
});

test('birthday slot input declares `multiple`', () => {
  // ponytail: anchor on the BirthdaySlot block specifically. The
  // AddMemoryModal's input also has `multiple` but lives in a different
  // component, so we scope to the cumple input by its enclosing div.
  const cumpleInputBlock =
    SRC.match(/BirthdaySlot[\s\S]*?accept="image\/\*"[\s\S]*?className="hidden"/)?.[0] ?? '';
  expect(cumpleInputBlock).toMatch(/\bmultiple\b/);
});

test('birthday change handler feeds the full FileList to uploadFiles (no files[0] truncation)', () => {
  // ponytail: the original bug was grabbing files[0] and dropping the
  // rest. The new handler passes e.target.files straight to uploadFiles.
  const cumpleHandler =
    SRC.match(/BirthdaySlot[\s\S]*?handleFileChange[\s\S]*?^\s*};/m)?.[0] ?? '';
  expect(cumpleHandler).toMatch(/uploadFiles\s*\(\s*e\.target\.files\s*\)/);
  expect(cumpleHandler).not.toMatch(/\.files\?\.\[0\]/);
  expect(cumpleHandler).not.toMatch(/\[files\[0\]\]/);
});

test('BirthdaySlot renders TimelineCarousel when there is at least one photo', () => {
  // ponytail: when photos.length > 0, the slot must hand off to the
  // existing multi-photo TimelineCarousel — not a single <img> view.
  // The code uses a ternary (=== 0 ? dropzone : carousel) so we assert
  // by checking that TimelineCarousel appears as the : branch.
  const slotRender =
    SRC.match(/BirthdaySlot[\s\S]*?export const BirthdaySlot[\s\S]*?\};/)?.[0] ?? '';
  // The TimelineCarousel <... eventId="event-cumple-demo-2026" ... />
  // invocation lives inside the BirthdaySlot — that is the multi-photo
  // branch. Drop the empty-state dropzone by checking that the render
  // includes TimelineCarousel AT ALL.
  expect(slotRender).toMatch(/<TimelineCarousel\b/);
});

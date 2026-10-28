/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: the birthday photo slot reads/writes through the server
 * carousel bucket (eventId='event-cumple-demo-2026'), NOT through
 * localStorage data URLs.
 *
 * Why: the legacy implementation stored the photo as a data URL in
 * localStorage under 'pareja_birthday_photo_2026'. Two
 * components (Timeline.tsx and Gallery.tsx) wrote to that key with
 * different shapes (JSON array vs bare string), causing a race
 * condition where reloading the page silently dropped the photo.
 * localStorage also caps at ~5MB per origin so a high-res photo
 * broke the quota and the user's upload disappeared.
 *
 * Now the photo lives in the server carousel bucket keyed by the
 * cumple's eventAnchor. The same usePhotoUpload + usePhotos hooks
 * the rest of the app already uses — no new persistence layer, no
 * localStorage at all for this slot.
 *
 * ponytail: source-level guards. The next refactor that "simplifies"
 * back to localStorage (because it's only one photo) reintroduces
 * the same race condition.
 */

import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const TIMELINE = readFileSync(join(ROOT, 'src', 'components', 'Timeline.tsx'), 'utf8');
const GALLERY = readFileSync(join(ROOT, 'src', 'components', 'Gallery.tsx'), 'utf8');

// 1. No more localStorage birthday key anywhere.
test('Timeline no longer references the birthday localStorage key', () => {
  // ponytail: the only way the legacy key can leak back in is if
  // someone copy-pastes the old handleFileInputChange handler.
  expect(TIMELINE).not.toMatch(/pareja_birthday_photo/);
  expect(TIMELINE).not.toMatch(/birthdayPhotos/);
  expect(TIMELINE).not.toMatch(/handlePhotoSelect/);
  expect(TIMELINE).not.toMatch(/BirthdayMultiView/);
});

// 2. Timeline uses the shared usePhotos + usePhotoUpload hooks for
//    the birthday slot. Same hooks Gallery and SecretCollageModal
//    use — single upload pipeline, no fork.
test('Timeline imports usePhotos and usePhotoUpload for the cumple slot', () => {
  expect(TIMELINE).toMatch(/from\s+['"]\.\.\/hooks\/usePhotos['"]/);
  expect(TIMELINE).toMatch(/from\s+['"]\.\.\/hooks\/usePhotoUpload['"]/);
});

// 3. Timeline fetches the cumple carousel from the server with the
//    agreed eventAnchor — same key the AddMemoryModal builds.
test('Timeline reads the cumple carousel with eventId=event-cumple-demo-2026', () => {
  // ponytail: the BirthdaySlot calls usePhotos({ bucket: 'carousel',
  // eventId: 'event-cumple-demo-2026' }). The literal IS the source of
  // truth — if anyone renames the cumple's eventAnchor they have to
  // update both content.ts and this call, and this test catches the
  // mismatch.
  const cumpleHook = TIMELINE.match(
    /usePhotos\(\s*['"]carousel['"]\s*,\s*\{\s*eventId:\s*['"]event-cumple-demo-2026['"]/
  );
  expect(cumpleHook).not.toBeNull();
});

// 4. Gallery no longer injects a synthetic birthday photo.
test('Gallery does not synthesize a birthday photo anymore', () => {
  // ponytail: Gallery used to splice a 'photo-sep-custom-cumple'
  // entry into the photos list from localStorage. Now the cumple
  // lives in the timeline only; it must not duplicate into the
  // gallery grid.
  expect(GALLERY).not.toMatch(/photo-sep-custom-cumple/);
  expect(GALLERY).not.toMatch(/customBirthdayPhoto/);
  expect(GALLERY).not.toMatch(/pareja_birthday_photo/);
});

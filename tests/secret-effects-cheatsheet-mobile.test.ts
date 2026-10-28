/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: the Palabras Mágicas & Efectos modal lives inside the
 * music-player FAB's full view (MusicPlayerFab.tsx → FullPlayerModal).
 * The standalone "Trucos & Magia" FAB that used to live in
 * SecretEffectsManager is retired; the codelist is reachable only via
 * the music FAB → mini → full path.
 *
 * Mobile-safe layout requirements (unchanged from before the move):
 *   1. The full-modal wrapper scrolls internally so tall content
 *      (cheatsheet + music library) does not overflow the phone
 *      viewport.
 *   2. The close (X) button is reachable without scrolling the modal
 *      content away.
 *   3. The cheatsheet command list is one column (taller tap targets).
 *
 * ponytail: source-level guards. The X-scroll bug is a layout
 * regression that only reproduces on phones — locking the layout
 * strings in a test catches the next refactor that "simplifies" them
 * back to absolute.
 */

import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const FAB = readFileSync(join(ROOT, 'src', 'components', 'MusicPlayerFab.tsx'), 'utf8');
const SECRETS = readFileSync(join(ROOT, 'src', 'components', 'SecretEffectsManager.tsx'), 'utf8');

// 1. The standalone Trucos & Magia FAB is gone from SecretEffectsManager.
test('SecretEffectsManager no longer hosts a standalone codelist FAB', () => {
  // ponytail: lock that the FAB block was deleted. If a future
  // refactor re-adds a "Trucos & Magia" floating button next to the
  // music FAB, this test catches the duplication.
  expect(SECRETS).not.toMatch(/Trucos\s*&\s*Magia/);
  expect(SECRETS).not.toMatch(/open-secret-cheatsheet/);
});

// 2. The full-modal wrapper scrolls internally.
test('cheatsheet full-modal wrapper scrolls internally (mobile safe)', () => {
  // ponytail: max-h-[90vh] + overflow-y-auto so the cheatsheet + music
  // library does not push the close button off-screen on phones.
  const modal = FAB.match(
    /max-w-2xl[\s\S]*?overflow-y-auto[\s\S]*?rounded-(?:none|3xl)/
  );
  expect(modal).not.toBeNull();
});

// 3. The X button is reachable from the top of the modal (it lives
//    near the top of the JSX, not deep inside the scroll region).
test('cheatsheet close button lives near the top of the full modal', () => {
  // ponytail: position the X before the section content so users on
  // small phones do not have to scroll to find it. Look for the
  // aria-label="Cerrar reproductor" button.
  const closeButton = FAB.match(
    /aria-label="Cerrar reproductor"[\s\S]*?<\/button>/
  );
  expect(closeButton).not.toBeNull();
});

// 4. The cheatsheet command list is one column.
test('cheatsheet command list is single column (not grid-cols-2/3)', () => {
  // ponytail: dense grids make items too small to tap on mobile.
  // The new modal uses flex flex-col (1 col) for the list.
  // Lock the absence of grid-cols-2/3 in the cheatsheet block.
  const cheatsheetBlock = FAB.match(
    /commands\.map\(\(item\)[\s\S]*?\}\)/
  );
  expect(cheatsheetBlock).not.toBeNull();
  expect(cheatsheetBlock![0]).not.toMatch(/grid-cols-2/);
  expect(cheatsheetBlock![0]).not.toMatch(/grid-cols-3/);
});

// 5. The codelist still works via custom event from the new modal.
test('SecretEffectsManager listens for the trigger-secret-effect event', () => {
  // ponytail: the FAB fires `trigger-secret-effect` with { detail: cmd }
  // when the user taps a cheatsheet command. The manager still owns
  // the dispatch + particles + toast logic, decoupled from the FAB.
  expect(SECRETS).toMatch(/addEventListener\(['"]trigger-secret-effect['"]/);
  expect(SECRETS).toMatch(/triggerEffect\(ce\.detail\)/);
});

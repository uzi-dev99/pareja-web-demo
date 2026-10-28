/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: the gallery's "Subir fotos (masivo)" button must be visible to
 * every visitor — no edit-mode toggle required. The destructive operations
 * ("Borrar todas", per-photo edit/delete buttons) STAY gated behind
 * isEditMode because they need the EDIT_TOKEN.
 *
 * This file locks that split in:
 *   - The "Subir fotos" button (and its progress UI) renders outside the
 *     `<AnimatePresence isEditMode>` block.
 *   - The "Borrar todas" button stays inside `isEditMode && (...)`.
 *   - The file input and `handleFileChange` wiring still exist (so the
 *     refactor can't drop the input handler by accident).
 *
 * ponytail: source-level guards. A future change that wraps the upload
 * button back inside `isEditMode` (or that moves delete outside) fails
 * this test before it ships.
 */

import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const GALLERY = readFileSync(join(ROOT, 'src', 'components', 'Gallery.tsx'), 'utf8');

/**
 * Extract the textual content of the `<AnimatePresence>` block that wraps
 * the "Edit Mode Toolbar". The presence of `isEditMode && (` inside it
 * (as text) tells us the conditional gate is textually preserved. Returns
 * the matched slice (or '' if not found).
 *
 * Implementation note: we walk the JSX manually instead of using a regex
 * because a regex that starts at any `{/*` comment can drift across other
 * JSX comments and capture the always-visible upload block by mistake.
 * We locate the `isEditMode && (` trigger, walk BACKWARDS to the nearest
 * preceding `<AnimatePresence>` opener, then FORWARDS to the matching
 * `</AnimatePresence>` close (counting opens/closes so a nested
 * AnimatePresence — e.g. the progress-bar one — does not desync the bound).
 */
function editModeToolbarBlock(): string {
  const trigger = 'isEditMode && (';
  const triggerIdx = GALLERY.indexOf(trigger);
  if (triggerIdx < 0) return '';

  // Walk backwards to the nearest preceding `<AnimatePresence>` opener.
  // lastIndexOf returns the LAST occurrence at or before the index, which
  // is the closest opener above the trigger.
  const openIdx = GALLERY.lastIndexOf('<AnimatePresence>', triggerIdx);
  if (openIdx < 0) return '';

  // Walk forwards, counting opens and closes, until depth returns to 0.
  const OPEN = '<AnimatePresence>';
  const CLOSE = '</AnimatePresence>';
  let depth = 1;
  let cursor = openIdx + OPEN.length;
  while (cursor < GALLERY.length && depth > 0) {
    const nextOpen = GALLERY.indexOf(OPEN, cursor);
    const nextClose = GALLERY.indexOf(CLOSE, cursor);
    if (nextClose < 0) break;
    if (nextOpen >= 0 && nextOpen < nextClose) {
      depth++;
      cursor = nextOpen + OPEN.length;
    } else {
      depth--;
      cursor = nextClose + CLOSE.length;
    }
  }

  return GALLERY.slice(openIdx, cursor);
}

test('Gallery renders an "Edit Mode Toolbar" AnimatePresence block', () => {
  // ponytail: sanity check — we extract the same block shape the rest
  // of this file asserts against. If Gallery.tsx is rewritten and the
  // block vanishes, this test fails first so the others don't false-pass.
  expect(editModeToolbarBlock()).not.toBe('');
});

test('Gallery "Subir fotos (masivo)" button lives OUTSIDE the edit-mode AnimatePresence', () => {
  // ponytail: the upload CTA must be reachable without toggling edit mode.
  // Source-level: we search the whole Gallery.tsx and require at least one
  // upload button reference whose enclosing JSX is NOT inside the
  // AnimatePresence block we extracted above.
  const toolbar = editModeToolbarBlock();

  // Find every "Subir fotos (masivo)" button JSX in Gallery.tsx and check
  // whether each occurrence is inside the toolbar block.
  const uploadButtonRegex =
    /<button[^>]*type=["']button["'][\s\S]*?>[\s\S]*?Subir fotos[\s\S]*?<\/button>/g;
  const allUploadButtons = GALLERY.match(uploadButtonRegex) ?? [];
  expect(allUploadButtons.length).toBeGreaterThan(0);

  const buttonsInsideToolbar = allUploadButtons.filter((b) => toolbar.includes(b));
  expect(buttonsInsideToolbar.length).toBe(0);
});

test('Gallery "Borrar todas" button STAYS inside the edit-mode AnimatePresence', () => {
  // ponytail: delete-all is destructive and must keep the token gate.
  // Source-level: at least one "Borrar todas" button must appear inside
  // the edit-mode toolbar block we extracted.
  const toolbar = editModeToolbarBlock();
  expect(toolbar).toMatch(/Borrar todas/);
});

test('Gallery hidden file input + onChange handler are still wired up', () => {
  // ponytail: refactor cannot drop the input or the change handler.
  // If either vanishes, the upload button has nothing to drive.
  expect(GALLERY).toMatch(/<input[\s\S]*?type=["']file["'][\s\S]*?multiple/);
  expect(GALLERY).toMatch(/handleFileChange/);
});

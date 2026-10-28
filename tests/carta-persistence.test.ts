/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Regression: the carta loses its saved content on reload. The root cause
 * is that WriteLetterModal generates a brand-new id (`custom-drop-{ts}`)
 * on every save, and the SecretLetter then writes that to localStorage
 * with the new id. After reload, EditableText is keyed on the *new* id,
 * but the server-side override for that key does not exist (the inline
 * editor only knows the original id). The defaultValue fallback hides the
 * problem in most cases, but if the inline editor's override for the
 * original id ever wins, the displayed content drifts.
 *
 * ponytail: source-level test — assert the contract that the saved letter
 * keeps the initial id, so the EditableText override key stays stable
 * across modal saves.
 */

import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const LETTER_SRC = readFileSync(
  join(import.meta.dir, '..', 'src', 'components', 'SecretLetter.tsx'),
  'utf8'
);

const MODAL_SRC = readFileSync(
  join(import.meta.dir, '..', 'src', 'components', 'WriteLetterModal.tsx'),
  'utf8'
);

test('SecretLetter normalizes the saved letter id back to the initial id', () => {
  // ponytail: handleSaveEdit must overwrite whatever id the modal produced
  // with initialLetterDrops[0].id. That keeps the EditableText override key
  // stable so the inline-edit override and the modal save share the same
  // storage slot.
  expect(LETTER_SRC).toMatch(/initialLetterDrops\[0\]\.id/);
  expect(LETTER_SRC).toMatch(
    /const handleSaveEdit[\s\S]*?id:\s*initialLetterDrops\[0\]\.id[\s\S]*?\}/
  );
});

test('WriteLetterModal still receives the user content but does not own the id', () => {
  // ponytail: the modal can keep generating ids for its own internal model,
  // but the parent component is responsible for normalizing. We assert that
  // SecretLetter intercepts the save with its own handleSaveEdit so the id
  // override is applied at the storage boundary.
  expect(LETTER_SRC).toMatch(/onSave=\{handleSaveEdit\}/);
  // ponytail: belt-and-suspenders — make sure no one reverts to writing the
  // modal-generated id straight into localStorage without normalization.
  expect(LETTER_SRC).not.toMatch(
    /localStorage\.setItem\(\s*STORAGE_KEY_SINGLE_LETTER\s*,\s*JSON\.stringify\(\s*updatedLetter\s*\)/
  );
});
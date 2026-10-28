/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Regression: user reported "al dar cargar foto desaparece el popup".
 *
 * Root cause: the hidden file inputs live OUTSIDE the <motion.div> that
 * carries `onClick={(e) => e.stopPropagation()}`. When the user clicks
 * "Agregar foto" the button programmatically calls
 * `addFileRef.current?.click()` to open the OS file picker. That
 * `HTMLElement.click()` dispatches a synthetic click event that BUBBLES
 * up the DOM tree. The inputs' parent is the backdrop div whose
 * `onClick={handleClose}` closes the modal — so the synthetic click
 * fires handleClose and the modal disappears before the upload even
 * starts.
 *
 * Fix contract:
 *   - The hidden file inputs must declare an `onClick` that calls
 *     `e.stopPropagation()` so the synthetic click never reaches the
 *     backdrop's close handler.
 *   - The change handler must NOT propagate either (click on the
 *     input's "open" button can fire both events depending on the OS).
 *
 * ponytail: source-level test against SecretCollageModal.tsx. Both
 * inputs are matched by the regex so any future re-introduction (or
 * addition of a third hidden input) is caught immediately.
 */

import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SRC = readFileSync(join(ROOT, 'src', 'components', 'SecretCollageModal.tsx'), 'utf8');

test('each hidden file input in SecretCollageModal declares stopPropagation on its click', () => {
  // ponytail: match each `<input ref={...} type="file" ...>` block
  // individually so the assertion checks BOTH the add and replace
  // inputs. The block spans from `<input ref=` up to the closing `/>`.
  const inputBlocks = [
    ...SRC.matchAll(/<input\s+ref=\{(\w+)Ref\}\s+type=["']file["'][\s\S]*?\/>/g)
  ];
  expect(inputBlocks.length).toBeGreaterThanOrEqual(2);
  for (const match of inputBlocks) {
    const block = match[0];
    // ponytail: the synthetic click must be stopped. Assert both the
    // exact stopPropagation pattern and the presence of an onClick
    // handler (so a future re-write cannot accidentally drop it).
    expect(block, `input "${match[1]}Ref" missing stopPropagation`).toMatch(
      /onClick=\{[\s\S]*?e\.stopPropagation\(\)[\s\S]*?\}/
    );
  }
});
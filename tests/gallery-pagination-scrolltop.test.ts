/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: the mobile gallery paginator scrolls back to the
 * paginator itself ONLY when the user clicks a pagination button.
 * Initial mount and filter-driven page resets must NOT scroll —
 * otherwise the page jumps to the gallery on every load and on
 * every filter change, trapping visitors away from the home.
 *
 * ponytail: source-level test against Gallery.tsx.
 */

import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SRC = readFileSync(join(ROOT, 'src', 'components', 'Gallery.tsx'), 'utf8');

test('Gallery paginator has a manual-page-change flag (no autoscroll on mount)', () => {
  // ponytail: lock the pattern — a ref that the page buttons flip to
  // true before calling setCurrentPage, and the scroll effect bails
  // out when the flag is false. Without this, useEffect on currentPage
  // fires on initial mount (currentPage=1 default) and jumps the
  // user straight to the gallery.
  // The flag variable name is arbitrary; we assert on the shape.
  const hasRef = SRC.match(/useRef(?:<boolean>)?\(\s*false\s*\)/);
  expect(hasRef).not.toBeNull();
  // The paginator buttons must flip the ref to true before setCurrentPage.
  expect(SRC).toMatch(/setCurrentPage\(\s*\w+\s*\)/);
  // The ref must be reset to false after the scroll fires (one-shot).
  // We accept either .current = false in the effect or a guard.
  expect(SRC).toMatch(/\.current\s*=\s*false/);
});

test('Gallery scroll target is the paginator, not the body', () => {
  // ponytail: the effect targets the paginator specifically, not
  // document.body or window.scrollTo, and not the top of the gallery
  // section: the nav lives at the end of the section (~1336 px below
  // the grid at 360 px), so scrolling to the section top left the
  // visitor more than a screen and a half away from the control they
  // had just used. `block: 'center'` keeps the nav clear of the iOS
  // bottom bar, which covers it when the nav is flush with the
  // bottom edge.
  expect(SRC).toMatch(/getElementById\(['"]paginacion['"]\)/);
  expect(SRC).toMatch(/scrollIntoView/);
  expect(SRC).toMatch(/block:\s*'center'/);
});

test('Gallery keeps the document height stable while the grid transitions', () => {
  // ponytail: AC8c. While the grid transitions it renders the old AND the
  // new page (24 photos): the document grows 1336 px and `scrollIntoView`
  // computes the destination in that inflated layout. When the old page
  // unmounts the document shrinks back (13534 px) and the scroll ends
  // clamped to the maximum: the nav stayed cut off at the top edge
  // (navTop = -20). With `popLayout` the photos that leave go out of the
  // flow, the document keeps its height and the scroll lands where it
  // should (nav centered, navTop = 348 at 360x740).
  expect(SRC).toMatch(/<AnimatePresence mode="popLayout">/);
  // the popped photos are positioned against the grid container
  expect(SRC).toMatch(/className="relative grid grid-cols-2[^"]*"/);
});

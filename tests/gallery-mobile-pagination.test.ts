/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: Gallery.tsx paginates photos on every viewport.
 *
 *   1. Page size constant PAGE_SIZE = 12. Locked so a future tweak
 *      (e.g. 24) is a deliberate decision, not a silent change.
 *   2. State `currentPage` resets to 1 when the active month OR tag
 *      filter changes — otherwise the user lands on page 7 after a
 *      filter and sees an empty grid.
 *   3. Mobile layout is `grid-cols-2` (NOT 1, NOT 3). The aspect
 *      ratio must be compact (`aspect-[3/4]` or shorter) so 2 photos
 *      fit comfortably per row at 360–414px viewport widths.
 *   4. Desktop keeps the existing 3/4-col masonry grid — paginating
 *      does not change the grid template.
 *   5. Pagination controls render only when totalPages > 1, on every
 *      viewport. Otherwise the paginator floats uselessly.
 *
 * ponytail: source-level guards. The pagination math is one useMemo
 * + one useEffect; anything fancier (infinite scroll, virtualization)
 * is a separate change.
 */

import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SRC = readFileSync(join(ROOT, 'src', 'components', 'Gallery.tsx'), 'utf8');

test('Gallery declares PAGE_SIZE = 12', () => {
  expect(SRC).toMatch(/PAGE_SIZE\s*=\s*12\b/);
});

test('Gallery has no viewport gate: the same page size everywhere', () => {
  // ponytail: una sola constante para todos los viewports — sin
  // `isMobile` ni su effect de matchMedia, que además hacían el
  // primer render de mobile con la galería entera.
  expect(SRC).not.toMatch(/isMobile/);
  expect(SRC).not.toMatch(/MOBILE_BREAKPOINT_PX/);
  // ponytail: el reset a la página 1 vive en un effect pegado al que
  // se borra (el del matchMedia): se fija acá para que no se pierda.
  expect(SRC).toMatch(/setCurrentPage\(1\)/);
});

test('Gallery tracks currentPage state', () => {
  // ponytail: currentPage is the only piece of pagination state. The
  // paginator reads it; filters reset it. TS infers number from the
  // literal 1, so the generic annotation is optional.
  expect(SRC).toMatch(/useState(?:<number>)?\(\s*1\s*\)/);
  expect(SRC).toMatch(/setCurrentPage/);
});

test('Gallery resets currentPage to 1 when filters change', () => {
  // ponytail: an effect that listens to activeMonth + activeTag and
  // resets the page. Without this, filtering to a month with 3 photos
  // while on page 7 of "all" leaves the user with an empty grid.
  const resetEffect = SRC.match(
    /useEffect\([\s\S]{0,200}?setCurrentPage\(\s*1\s*\)[\s\S]{0,200}?\},\s*\[[^\]]*activeMonth[^\]]*activeTag[^\]]*\]/
  );
  expect(resetEffect).not.toBeNull();
});

test('Gallery recorta currentPage cuando totalPages baja', () => {
  // ponytail: al borrar fotos la lista filtrada se encoge y totalPages
  // baja; sin este recorte currentPage queda fuera de rango, el slice
  // sale vacío (grid en blanco) y el nav se queda sin página activa.
  const clamp = SRC.match(
    /useEffect\([\s\S]{0,200}?setCurrentPage\(\s*\(p\)\s*=>\s*Math\.min\(\s*p\s*,\s*totalPages\s*\)\s*\)[\s\S]{0,120}?\},\s*\[[^\]]*totalPages[^\]]*\]/
  );
  expect(clamp).not.toBeNull();
});

test('Gallery mobile grid is 2 columns with compact aspect', () => {
  // ponytail: the mobile grid template must be exactly `grid-cols-2`
  // and must override the desktop 1/2/3/4-col masonry with a tighter
  // aspect ratio so the page reads as a gallery, not a feed.
  expect(SRC).toMatch(/grid-cols-2\b/);
  expect(SRC).toMatch(/aspect-\[3\/4\]|aspect-\[4\/5\]|aspect-\[1\/1\]/);
});

test('Gallery keeps the 3/4-col grid on desktop', () => {
  // ponytail: lock the desktop cols at md/lg so the mobile-first
  // refactor doesn't accidentally apply the 2-col layout to tablets
  // and up. Mobile (no md: prefix) may be 2-col.
  expect(SRC).toMatch(/md:grid-cols-3\s+lg:grid-cols-4/);
});

test('Gallery paginator renders only when there is more than one page', () => {
  // ponytail: the paginator JSX must be gated on totalPages > 1 so
  // a single-page filter does not show a useless "‹ 1 ›" control.
  // We don't assert the runtime value (that needs render) — we lock
  // that the conditional uses the page count variable.
  const paginatorMatch = SRC.match(
    /totalPages\s*>\s*1[\s\S]{0,3000}?<\/nav>/);
  expect(paginatorMatch).not.toBeNull();
});

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: the mobile gallery paginator renders a sliding window, not
 * one button per page, and the row keeps fitting in the narrowest
 * viewport.
 *
 *   1. The rendered pages are a bounded window: first page, last page,
 *      the active page and an ellipsis for each skipped stretch. At
 *      most 3 page buttons + 2 ellipses = 268 px, which fits in the
 *      288 px available at a 320 px viewport.
 *   2. The active page is ALWAYS in the rendered window, so the
 *      `aria-current="page"` marker is never off-screen.
 *   3. Page 1 and the last page are always one tap away; page 2 is one
 *      tap away from page 1.
 *   4. The window size does not grow with the number of pages.
 *
 * ponytail: the window math is a pure function so it is tested with
 * real numbers instead of regexes over the JSX.
 */

import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildPageWindow, type PageItem } from '../src/utils/pagination';

// ponytail: la fórmula de la fila con los valores reales del repo:
// target 44 px (w-11), elipsis w-3 = 12 px, gap-1 = 4 px.
const TARGET = 44;
const ELLIPSIS = 12;
const GAP = 4;
const USABLE_320 = 288; // 320 px de viewport - px-4 x 2

function rowWidth(items: PageItem[]): number {
  const pages = items.filter((i) => i !== 'gap').length;
  const ellipses = items.filter((i) => i === 'gap').length;
  // 2 flechas + los items de la ventana, con un hueco entre cada par.
  return TARGET * (pages + 2) + ELLIPSIS * ellipses + GAP * (items.length + 1);
}

test('la ventana muestra la activa, la primera y la última', () => {
  expect(buildPageWindow(30, 15)).toEqual([1, 'gap', 15, 'gap', 30]);
});

test('la activa siempre queda dentro de la ventana (30+ páginas)', () => {
  for (let page = 1; page <= 30; page++) {
    expect(buildPageWindow(30, page)).toContain(page);
  }
});

test('la 1, la 2 y la última se tocan con toques', () => {
  // la 1 y la última están siempre en la ventana (un toque); la 2
  // aparece en la ventana al llegar a la 1 (un toque más).
  expect(buildPageWindow(30, 1)).toContain(2);
  for (let page = 1; page <= 30; page++) {
    const w = buildPageWindow(30, page);
    expect(w).toContain(1);
    expect(w).toContain(30);
  }
});

test('una activa fuera de rango no rompe la ventana', () => {
  // ponytail: tras cambiar un filtro el estado puede quedar por
  // encima del total de páginas; la ventana se acota sola.
  expect(buildPageWindow(3, 9)).toEqual([1, 2, 3]);
  expect(buildPageWindow(1, 1)).toEqual([]);
  // con más de 3 páginas, el clamp es lo que acota la activa: sin él la
  // ventana renderizaría un botón de página que no existe.
  expect(buildPageWindow(30, 99)).toEqual([1, 'gap', 30]);
});

test('la fila no crece con el número de páginas', () => {
  // 3 botones de 44 px + 2 elipsis = 268 px: entra en los 288 px de un
  // viewport de 320 px sin encoger ningún target.
  for (const [total, active] of [[18, 6], [30, 15], [300, 150]] as const) {
    const w = buildPageWindow(total, active);
    expect(w.filter((i) => i !== 'gap').length).toBeLessThanOrEqual(3);
    expect(w.filter((i) => i === 'gap').length).toBeLessThanOrEqual(2);
    expect(rowWidth(w)).toBeLessThanOrEqual(USABLE_320);
  }
});

const ROOT = join(import.meta.dir, '..');
const SRC = readFileSync(join(ROOT, 'src', 'components', 'Gallery.tsx'), 'utf8');
// ponytail: los asserts del nav se anclan a SU bloque: un match global
// al archivo pasaría aunque el nav tuviera botones de 36 px (y otras 3
// apariciones de la clase en otro lado del repo).
const NAV = SRC.match(/\{totalPages\s*>\s*1[\s\S]{0,3000}?<\/nav>/)?.[0] ?? '';

test('el paginador no renderiza un botón por página', () => {
  expect(SRC).not.toMatch(/Array\.from\(\{\s*length:\s*totalPages\s*\}\)/);
  expect(SRC).toMatch(/buildPageWindow/);
});

test('el nav mantiene la línea de base, el gap-1 y los targets de 44 px', () => {
  expect(NAV).not.toBe('');
  // ponytail: the regex is anchored on the nav's id — a bare /gap-1/
  // would match the filters' `gap-1.5`.
  expect(NAV).toMatch(/id="paginacion"[\s\S]{0,200}justify-center gap-1"/);
  expect(NAV).toMatch(/aria-label="Paginación de la galería"/);
  expect(NAV).toMatch(/aria-current=\{isActive \? 'page' : undefined\}/);
  // AC8: los tres controles interactivos del nav (la flecha ‹, el botón
  // de página y la flecha ›) con target de 44x44 px que no se encoge
  // (shrink-0) — contados sobre el bloque del nav, no sobre el archivo.
  expect((NAV.match(/w-11 h-11 shrink-0/g) ?? []).length).toBe(3);
  // y el target viejo de 36 px desaparece del archivo.
  expect(SRC).not.toMatch(/min-w-9 h-9/);
});

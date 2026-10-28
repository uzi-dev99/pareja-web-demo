/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: the timeline shows the newest months first, two per page,
 * and every month renders its recap right before its own events.
 *
 *   1. On load only the 2 most recent (year, month) groups render, and
 *      the newest one comes first.
 *   2. The order does not depend on the order of the input and crosses
 *      years (2026 before 2025).
 *   3. Each "Cargar más" click reveals 2 more months; after 4 clicks over
 *      the 9-month seed every card is on screen.
 *   4. Inside a month the recap (kind === 'month') goes before its
 *      events (kind === 'event'), even if the input arrives reversed.
 *
 * ponytail: the sort and the slice live in a pure util
 * (src/utils/timelineMonths.ts) so the order is tested with real data
 * instead of with regexes over the JSX.
 */

import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MONTHS_PER_PAGE, monthKey, monthOrdinal, visibleTimeline } from '../src/utils/timelineMonths';

const ROOT = join(import.meta.dir, '..');
const TIMELINE = readFileSync(join(ROOT, 'src', 'components', 'Timeline.tsx'), 'utf8');
const UTIL = readFileSync(join(ROOT, 'src', 'utils', 'timelineMonths.ts'), 'utf8');

const ev = (
  month: string,
  year: number,
  kind: 'month' | 'event',
  id = `${kind}-${month}-${year}`
) => ({ id, month, year, kind });

const NINE = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre']
  .map((m) => ev(m, 2026, 'month'));
const DATA = [...NINE, ev('Septiembre', 2026, 'event')];

test('AC1: carga con los 2 meses más recientes, el más nuevo primero', () => {
  const { visible, months } = visibleTimeline(DATA, MONTHS_PER_PAGE);
  expect(visible.map((e) => e.id)).toEqual(['month-Septiembre-2026', 'event-Septiembre-2026', 'month-Agosto-2026']);
  expect(months.length).toBe(9);
});

test('AC1: el orden no depende del orden de entrada y cruza años', () => {
  const { visible } = visibleTimeline(
    [ev('Enero', 2026, 'month'), ev('Diciembre', 2025, 'month'), ev('Marzo', 2026, 'month')],
    3
  );
  expect(visible.map(monthKey)).toEqual(['2026-Marzo', '2026-Enero', '2025-Diciembre']);
});

test('AC2: cada clic suma 2 meses y a los 4 clics ya están todos', () => {
  let count = MONTHS_PER_PAGE;
  let clicks = 0;
  while (count < visibleTimeline(DATA, count).months.length) {
    count += MONTHS_PER_PAGE;
    clicks += 1;
  }
  expect(clicks).toBe(4);
  expect(visibleTimeline(DATA, count).visible.length).toBe(DATA.length);
});

test('AC3: el recap sale justo antes de sus eventos aunque lleguen al revés', () => {
  const { visible } = visibleTimeline([ev('Septiembre', 2026, 'event'), ev('Septiembre', 2026, 'month')], 1);
  expect(visible.map((e) => e.kind)).toEqual(['month', 'event']);
});

test('AC2: el timeline tiene el botón "Cargar más" con su estado', () => {
  // ponytail: source-level guards — el botón y su condición viven en el
  // JSX, el estado en el componente. Se fijan los tokens que el contrato
  // exige (nombre del botón, condición por meses y salto de 2).
  expect(TIMELINE).toMatch(/Cargar más/);
  expect(TIMELINE).toMatch(/visibleMonths\s*<\s*months\.length/);
  expect(TIMELINE).toMatch(/setVisibleMonths\(\(n\)\s*=>\s*n\s*\+\s*MONTHS_PER_PAGE\)/);
});

test('D4: el ordinal del badge va de 1 (Enero) a 9 (Septiembre) sobre el seed de 9 meses', () => {
  // ponytail: el ordinal es cronológico (Enero=1 … Septiembre=9) y sale
  // de la lista COMPLETA de meses, así no cambia al revelar más meses.
  // La fórmula invertida (indexOf + 1) daría Enero=9 y Septiembre=1.
  const { months } = visibleTimeline(DATA, MONTHS_PER_PAGE);
  expect(NINE.map((e) => monthOrdinal(months, monthKey(e)))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  // el cumple comparte el mes de Septiembre: mismo ordinal que su recap.
  expect(monthOrdinal(months, monthKey(DATA[DATA.length - 1]))).toBe(9);
});

test('D4: el componente pide el ordinal al util', () => {
  expect(TIMELINE).toMatch(/monthOrdinal\(\s*months\s*,\s*monthKey\(\s*event\s*\)\s*\)/);
});

test('AC3: ni el componente ni el util dan vuelta el array', () => {
  // ponytail: el orden nuevo (descendente) se ordena en el util; un
  // `.reverse()` reintroduciría el error de orden sin que los tests
  // puros lo vieran.
  expect(TIMELINE).not.toMatch(/showAll/);
  expect(TIMELINE).not.toMatch(/\.reverse\(/);
  expect(UTIL).not.toMatch(/\.reverse\(/);
});

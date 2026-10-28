/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Orden y corte de los meses del timeline.
 *
 * La home muestra el timeline más corto: 2 meses por página, del más
 * nuevo al más viejo, y cada mes con su recap justo antes de sus
 * eventos. La lógica vive acá (puro, testeable) y no en el JSX.
 */

import type { TimelineEvent } from '../types';

export const MONTHS_PER_PAGE = 2;

const MONTHS_ORDER = new Map<string, number>([
  ['Enero', 1], ['Febrero', 2], ['Marzo', 3], ['Abril', 4],
  ['Mayo', 5], ['Junio', 6], ['Julio', 7], ['Agosto', 8],
  ['Septiembre', 9], ['Octubre', 10], ['Noviembre', 11], ['Diciembre', 12]
]);

type Dated = Pick<TimelineEvent, 'year' | 'month' | 'kind'>;

// ponytail: group key is (year, month), never monthAnchor: Septiembre has two anchors.
export const monthKey = (e: Dated): string => `${e.year}-${e.month}`;

// ponytail: ordinal cronológico del mes en el badge (Enero=1 … Septiembre=9).
// `months` viene del más nuevo al más viejo, así que el ordinal es la
// posición contada desde el final; usa la lista COMPLETA de meses, para
// que el número no cambie al revelar más meses.
export const monthOrdinal = (months: string[], key: string): number =>
  months.length - months.indexOf(key);

// Newest month first; inside a month the recap goes before its events (never reverse()).
export function visibleTimeline<T extends Dated>(
  events: T[],
  monthCount: number
): { visible: T[]; months: string[] } {
  const sorted = [...events].sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    const am = MONTHS_ORDER.get(a.month) ?? 0;
    const bm = MONTHS_ORDER.get(b.month) ?? 0;
    if (am !== bm) return bm - am;
    if (a.kind === b.kind) return 0;
    return a.kind === 'month' ? -1 : 1;
  });
  const months = [...new Set(sorted.map(monthKey))];
  const shown = new Set(months.slice(0, monthCount));
  return { visible: sorted.filter((e) => shown.has(monthKey(e))), months };
}

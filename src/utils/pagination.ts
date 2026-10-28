/**
 * Ventana deslizante de páginas del paginador móvil.
 *
 * Un botón por página mide 80 + 44·N px de fila: a 360 px (328 px
 * disponibles) con 18 páginas sobran 661 px y el `justify-center`
 * reparte el desborde 238 px por lado — las primeras páginas y los
 * botones ‹/› quedan recortados e inalcanzables.
 *
 * La ventana renderiza como máximo 3 botones de página (la primera,
 * la activa y la última) más un elipsis decorativo por tramo
 * saltado: con targets de 44 px son 268 px de fila, que entran en
 * los 288 px de un viewport de 320 px.
 */
export type PageItem = number | 'gap';

export function buildPageWindow(totalPages: number, currentPage: number): PageItem[] {
  if (totalPages <= 1) return [];
  // con 3 páginas o menos entran todas: no hay tramo que saltar.
  if (totalPages <= 3) {
    const all: PageItem[] = [];
    for (let page = 1; page <= totalPages; page += 1) all.push(page);
    return all;
  }

  const active = Math.min(Math.max(currentPage, 1), totalPages);

  // ponytail: la 2 siempre a la vista cuando la activa es 1 o 2 — el
  // AC 1 la pide a un toque de la 1.
  const pages = new Set<number>([1, active, totalPages]);
  if (active <= 2) pages.add(2);

  const items: PageItem[] = [];
  let prev = 0;
  for (const page of [...pages].sort((a, b) => a - b)) {
    if (prev && page - prev > 1) items.push('gap');
    items.push(page);
    prev = page;
  }
  return items;
}

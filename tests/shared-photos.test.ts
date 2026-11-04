/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * VK-546 (M1) — UNA sola lista de fotos, la de App.
 *
 * Antes el Hero, el Timeline y la galería cada uno hacía su propio
 * `usePhotos('public')`: tres listas distintas y tres pedidos. El
 * botón "Ver fotos de {mes}" del timeline miraba su propia copia, así
 * que una subida, una edición o un borrado en la galería sólo se veían
 * después de un F5.
 *
 * Ahora App es dueño de la lista (`usePhotos('public')` una sola vez) y
 * la pasa por props. Estos tests montan el circuito real —el dueño, la
 * galería y el timeline— y comprueban que un borrado en la galería
 * mueve el botón del timeline sin recargar.
 *
 * ponytail: sin runner de DOM — el runtime de tests/helpers/render.ts
 * (hooks y efectos reales, markup con react-dom/server).
 */

import { afterEach, expect, test } from 'bun:test';
import React from 'react';
import { Gallery } from '../src/components/Gallery';
import { Timeline } from '../src/components/Timeline';
import { usePhotos, type PhotosApi } from '../src/hooks/usePhotos';
import { findElements, mount, textOf } from './helpers/render';
import { stubDom, type DomStub } from './helpers/dom';

let dom: DomStub | null = null;

afterEach(() => {
  dom?.restore();
  dom = null;
});

const photo = (over: Record<string, unknown> = {}) => ({
  id: 'db-1',
  filePath: '/uploads/db-1.jpg',
  thumbnailUrl: '/uploads/db-1-thumb.jpg',
  caption: 'Una foto de la base',
  month: 'Septiembre',
  year: 2026,
  tags: ['Copo'],
  createdAt: 1_700_000_000,
  ...over
});

/** The public bucket answers with these photos; everything else is empty. */
const serve = (get: () => unknown[], calls: string[] = []) => {
  dom!.fetchJson((url) => {
    calls.push(url);
    return url.includes('bucket=public') ? get() : [];
  });
  return calls;
};

test('M1: un borrado en la galería mueve el botón "Ver fotos de {mes}" del timeline', async () => {
  dom = stubDom();
  // la "base": el servidor borra la foto cuando el visitante la borra
  let inDb = [photo({ month: 'Septiembre', year: 2026 })];
  const calls = serve(() => inDb);

  // ── el dueño de la lista (App en la app): UNA instancia ──────────
  let shared!: PhotosApi;
  const Owner: React.FC = () => {
    shared = usePhotos('public');
    return null;
  };
  const owner = mount(Owner, {});
  await owner.settle();
  expect(shared.photos).toHaveLength(1);

  // ── el timeline, con la lista compartida ─────────────────────────
  const timeline = mount(Timeline as never, { photos: shared.photos });
  await timeline.settle();
  expect(timeline.html()).toContain('Ver fotos de Septiembre');

  // ── la galería, con la MISMA instancia ────────────────────────────
  const gallery = mount(Gallery as never, { photosApi: shared, isEditMode: true });
  await gallery.settle();
  expect(gallery.html()).toContain('Una foto de la base');

  // ── el visitante borra una foto en la galería ─────────────────────
  const del = findElements(gallery.tree(), (props) => props['aria-label'] === 'Borrar')[0];
  expect(del).toBeDefined();
  inDb = []; // el servidor ya la borró
  await del.props.onClick({ stopPropagation() {} });
  await owner.settle();

  // la lista compartida quedó vacía (el borrado pasó por la instancia
  // compartida: el botón "Borrar" de la galería la usó)
  expect(shared.photos).toHaveLength(0);

  // ── el timeline se entera, sin recargar ──────────────────────────
  timeline.render({ photos: shared.photos });
  await timeline.settle();
  expect(timeline.html()).not.toContain('Ver fotos de Septiembre');

  // y nadie pidió la lista por su cuenta: dos GET públicas, la del
  // dueño y el refresh de esa misma instancia tras el borrado (si el
  // Hero, el Timeline o la galería pidieran la suya, serían más).
  const gets = calls.filter((u) => u.includes('bucket=public'));
  expect(gets).toHaveLength(2);
});

test('M1: el Hero y el Timeline no piden su propia lista de fotos', async () => {
  dom = stubDom();
  const calls = serve(() => [photo({ month: 'Septiembre', year: 2026 })]);

  // El Hero y el Timeline reciben la lista por props (la de App): si
  // alguno volviera a usePhotos('public'), haría su propia GET.
  const { Hero } = await import('../src/components/Hero');
  const hero = mount(Hero as never, { photos: [] });
  const timeline = mount(Timeline as never, { photos: [] });
  await hero.settle();
  await timeline.settle();

  const gets = calls.filter((u) => u.includes('bucket=public'));
  expect(gets).toEqual([]);
});

test('M1: App pide la lista de fotos UNA sola vez y la pasa a los tres', async () => {
  dom = stubDom();
  const calls = serve(() => []);

  const { default: App } = await import('../src/App');
  const app = mount(App as never, {});
  await app.settle();

  // una sola GET pública: la del dueño (App)
  expect(calls.filter((u) => u.includes('bucket=public'))).toHaveLength(1);
});

test('M1: App pasa la lista compartida al Hero, al Timeline y a la galería', () => {
  // ponytail: el runtime de test no monta los hijos del App (no hay
  // runner de DOM), así que el cableado se comprueba sobre el fuente:
  // es el mismo patrón que tests/app-section-order.test.ts.
  const src = require('node:fs').readFileSync(
    require('node:path').join(import.meta.dir, '..', 'src', 'App.tsx'),
    'utf8'
  ) as string;

  expect(src.match(/usePhotos\('public'\)/g)?.length).toBe(1);
  expect(src).toMatch(/<Hero\s+photos=\{publicPhotos\.photos\}/);
  expect(src).toMatch(/<Timeline[\s\S]*?photos=\{publicPhotos\.photos\}/);
  expect(src).toMatch(/<Gallery[\s\S]*?photosApi=\{publicPhotos\}/);
});

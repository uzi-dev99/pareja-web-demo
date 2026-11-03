/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: VK-524 — the gallery gets the 3D treatment that used to
 * live in "MES A MES", and "MES A MES" goes back to the flat list.
 *
 *   AC1: the gallery header is a 3D composition (layers of glass panels
 *        at different depths) that tilts with the pointer; no tilt on
 *        touch (pointer: coarse) and usable at 390 px.
 *   AC2: hover and keyboard focus-visible lift a photo as a 3D card
 *        (tilt + depth + caption panel); leaving restores it.
 *   AC3: "MES A MES" is flat again (no cylinder) and still opens the
 *        gallery with its month filter.
 *   AC4: the hashtag wall folds to the top 8 + "ver más" / "ver menos".
 *   AC5: with prefers-reduced-motion nothing tilts and the cards stay
 *        static.
 *
 * ponytail: source-level guards + the pure helpers behind them. The
 * pixel behaviour is checked by the owner's screenshots (D/shots).
 */

import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { canTilt, sameMonth, tiltFor, visibleTags } from '../src/utils/carousel3d';

const ROOT = join(import.meta.dir, '..');
const read = (...p: string[]) => readFileSync(join(ROOT, ...p), 'utf8');
const GALLERY = read('src', 'components', 'Gallery.tsx');
const TIMELINE = read('src', 'components', 'Timeline.tsx');
const CAROUSEL = read('src', 'components', 'TimelineCarousel.tsx');
const APP = read('src', 'App.tsx');
const CSS = read('src', 'index.css');

// ─── AC1: la cabecera 3D ───────────────────────────────────────────────

test('AC1: la cabecera tiene perspectiva y un escenario 3D', () => {
  expect(GALLERY).toMatch(/gallery-3d/);
  expect(GALLERY).toMatch(/gallery-3d-stage/);
  expect(GALLERY).toMatch(/perspective: `\$\{PERSPECTIVE\}px`/);
  // los paneles de vidrio flotan a distintas profundidades
  expect(CSS).toMatch(/gallery-3d-panel--upload/);
  expect(CSS).toMatch(/gallery-3d-panel--tags/);
  expect(CSS).toMatch(/translateZ\(var\(--z/);
});

test('AC1: la inclinación se apaga en táctil (pointer: coarse)', () => {
  expect(GALLERY).toMatch(/\(pointer: coarse\)/);
  expect(canTilt({ coarse: true, reduced: false })).toBe(false);
  // el puntero escribe el ángulo: no hay rAF ni re-render
  expect(GALLERY).toMatch(/setProperty\('--tilt-x'/);
  expect(GALLERY).not.toMatch(/requestAnimationFrame/);
});

test('AC1: a 390 px la composición se aplana (usable)', () => {
  expect(CSS).toMatch(/@media \(max-width: 639px\)/);
  // sin profundidad no hay escalado: la cabecera no se sale del viewport
  expect(CSS).toMatch(/\.gallery-3d-panel \{ --z: 0px; \}/);
});

test('AC1: la inclinación sigue al puntero (matemática pura)', () => {
  const { rotateX, rotateY } = tiltFor(0.5, -0.5, 8);
  expect(rotateX).toBeCloseTo(4, 5);
  expect(rotateY).toBeCloseTo(4, 5);
});

// ─── AC2: la foto como tarjeta 3D ─────────────────────────────────────

test('AC2: la foto se levanta con el puntero y con el teclado', () => {
  expect(GALLERY).toMatch(/gallery-card3d/);
  // el teclado tiene que poder llegar a la foto
  expect(GALLERY).toMatch(/tabIndex=\{0\}/);
  expect(GALLERY).toMatch(/role="button"/);
  expect(CSS).toMatch(/\.gallery-card3d:hover/);
  expect(CSS).toMatch(/\.gallery-card3d:focus-visible/);
  // profundidad + inclinación
  expect(CSS).toMatch(/translate3d\(0, -6px, 26px\) rotateX\(var\(--tilt-x\)\)/);
  // el panel del pie avanza hacia el espectador
  expect(CSS).toMatch(/gallery-card3d-caption/);
});

test('AC2: al salir la foto vuelve a su lugar', () => {
  expect(GALLERY).toMatch(/onPointerLeave=\{tiltOn \? resetTilt : undefined\}/);
  expect(GALLERY).toMatch(/setProperty\('--tilt-x', '0deg'\)/);
});

// ─── AC3: "MES A MES" plano, con su enlace a la galería ───────────────

test('AC3: el cilindro 3D de mes a mes desapareció', () => {
  expect(TIMELINE).not.toMatch(/MonthCardsCylinder/);
  expect(TIMELINE).not.toMatch(/MonthCard/);
  expect(CAROUSEL).not.toMatch(/MonthCardsCylinder/);
  expect(CAROUSEL).not.toMatch(/cylinderLayout/);
  expect(CAROUSEL).not.toMatch(/MonthCard/);
});

test('AC3: "MES A MES" sigue abriendo la galería con el filtro de mes', () => {
  // el enlace existe y se usa
  expect(TIMELINE).toMatch(/onOpenGalleryMonth\?\.\(event\.month\)/);
  expect(APP).toMatch(/onOpenGalleryMonth=\{handleOpenGalleryMonth\}/);
  expect(APP).toMatch(/setGalleryFilterMonth\(month\)/);
  // y la galería lo aplica como filtro de mes
  expect(GALLERY).toMatch(/setActivePhotoMonth\(initialMonthFilter\)/);
  expect(GALLERY).toMatch(/sameMonth\(p\.month, activePhotoMonth\)/);
  expect(sameMonth('Septiembre', 'septiembre')).toBe(true);
});

// ─── AC4: el muro de hashtags se pliega ────────────────────────────────

test('AC4: hashtags: los 8 primeros y el toggle "ver más" / "ver menos"', () => {
  expect(GALLERY).toMatch(/const TAG_LIMIT = 8;/);
  expect(GALLERY).toMatch(/visibleTags\(allTags, tagsExpanded, TAG_LIMIT\)/);
  expect(GALLERY).toMatch(/ver más/);
  expect(GALLERY).toMatch(/ver menos/);
  expect(visibleTags(['a', 'b', 'c'], false, 2)).toEqual(['a', 'b']);
});

// ─── AC5: movimiento reducido ──────────────────────────────────────────

test('AC5: con movimiento reducido nada se inclina ni se levanta', () => {
  expect(GALLERY).toMatch(/\(prefers-reduced-motion: reduce\)/);
  expect(canTilt({ coarse: false, reduced: true })).toBe(false);
  const block = CSS.match(/@media \(prefers-reduced-motion: reduce\)[\s\S]*?\n\}/)?.[0] ?? '';
  expect(block).toMatch(/transition: none/);
  expect(block).toMatch(/transform: none/);
});

test('AC5: sólo se animan transform y opacity en el CSS nuevo', () => {
  const block = CSS.slice(CSS.indexOf('Gallery 3D (VK-524)'));
  const transitions = block.match(/transition:[^;]+;/g) ?? [];
  for (const t of transitions) {
    // "none" es el caso de movimiento reducido: no se anima nada
    expect(t).toMatch(/transform|opacity|none/);
  }
});

test('AC2: la foto de la tarjeta es decorativa (alt vacío) para que un enlace roto no imprima el pie sobre los chips', () => {
  const card = GALLERY.slice(GALLERY.indexOf('gallery-card3d-media'));
  expect(card.slice(0, card.indexOf('<img') + 300)).toMatch(/alt=""/);
});

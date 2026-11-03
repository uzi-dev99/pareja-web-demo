/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * VK-528 — el teclado de la tarjeta de la galería.
 *
 * En modo edición la tarjeta tiene sus botones (Editar / Borrar). Con
 * Enter o Space sobre ellos se abría el visor de fotos: el keydown de la
 * tarjeta se tragaba el del botón.
 *
 * El guard es una línea y vive en un util puro (src/utils/carousel3d.ts)
 * para poder probarlo sin un runner de DOM.
 */

import { expect, test } from 'bun:test';
import { isCardActivation } from '../src/utils/carousel3d';

test('Enter y Space sobre la tarjeta la activan', () => {
  const card = {} as EventTarget;
  expect(isCardActivation({ key: 'Enter', target: card, currentTarget: card })).toBe(true);
  expect(isCardActivation({ key: ' ', target: card, currentTarget: card })).toBe(true);
});

test('la tecla de un botón dentro de la tarjeta no abre el visor', () => {
  const card = {} as EventTarget;
  const button = {} as EventTarget;
  expect(isCardActivation({ key: 'Enter', target: button, currentTarget: card })).toBe(false);
  expect(isCardActivation({ key: ' ', target: button, currentTarget: card })).toBe(false);
});

test('otra tecla no activa la tarjeta', () => {
  const card = {} as EventTarget;
  expect(isCardActivation({ key: 'a', target: card, currentTarget: card })).toBe(false);
  expect(isCardActivation({ key: 'Escape', target: card, currentTarget: card })).toBe(false);
});

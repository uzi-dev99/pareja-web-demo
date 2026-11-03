/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: the 3D helpers shared by the gallery (VK-524) and by the
 * flat carousels.
 *
 *   1. tiltFor turns normalized pointer offsets into degrees (the card
 *      leans away from the edge the pointer is on).
 *   2. canTilt is false on touch (pointer: coarse) and false with
 *      reduced motion.
 *   3. visibleTags folds the hashtag wall to the top N.
 *   4. sameMonth matches the month of a memory, case-insensitively.
 *   5. The media helpers: a .mp4 is a video even if the row says image.
 *
 * ponytail: the math lives in a pure util (src/utils/carousel3d.ts) so
 * it is tested with numbers instead of with a DOM.
 */

import { expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  canTilt,
  isVideoMedia,
  isVideoUrl,
  mediaUrl,
  sameMonth,
  tiltFor,
  visibleTags
} from '../src/utils/carousel3d';
import { TimelineCarousel } from '../src/components/TimelineCarousel';
import type { Photo } from '../src/types';

test('el puntero en el centro no inclina nada', () => {
  const t = tiltFor(0, 0, 8);
  expect(t.rotateX).toBeCloseTo(0, 5);
  expect(t.rotateY).toBeCloseTo(0, 5);
});

test('el puntero arriba/izquierda hunde esa esquina', () => {
  // ponytail: convención de las tarjetas que se inclinan: la esquina
  // más cercana al puntero se hunde (rotateX/rotateY positivos).
  const t = tiltFor(-1, -1, 8);
  expect(t.rotateX).toBeCloseTo(8, 5);
  expect(t.rotateY).toBeCloseTo(-8, 5);
});

test('la inclinación no pasa del máximo pedido', () => {
  const t = tiltFor(1, 1, 6);
  expect(Math.abs(t.rotateX)).toBeLessThanOrEqual(6);
  expect(Math.abs(t.rotateY)).toBeLessThanOrEqual(6);
});

test('sin tilt en táctil ni con movimiento reducido', () => {
  expect(canTilt({ coarse: false, reduced: false })).toBe(true);
  // pointer: coarse (táctil) → la composición queda plana
  expect(canTilt({ coarse: true, reduced: false })).toBe(false);
  // movimiento reducido → nada se inclina
  expect(canTilt({ coarse: false, reduced: true })).toBe(false);
  expect(canTilt({ coarse: true, reduced: true })).toBe(false);
});

test('el muro de hashtags muestra los 8 primeros y el resto detrás del "ver más"', () => {
  const tags = Array.from({ length: 30 }, (_, i) => `#tag${i}`);
  expect(visibleTags(tags, false, 8)).toHaveLength(8);
  expect(visibleTags(tags, false, 8)[0]).toBe('#tag0');
  // expandido: la pared entera
  expect(visibleTags(tags, true, 8)).toHaveLength(30);
  // una pared corta no inventa tags
  expect(visibleTags(['#a', '#b'], false, 8)).toEqual(['#a', '#b']);
});

test('sameMonth compara el mes del recuerdo sin mirar mayúsculas', () => {
  expect(sameMonth('Febrero', 'febrero')).toBe(true);
  expect(sameMonth('Febrero', ' Febrero ')).toBe(true);
  expect(sameMonth('Febrero', 'Marzo')).toBe(false);
  // una foto subida sin mes no matchea ningún mes
  expect(sameMonth(undefined, 'Febrero')).toBe(false);
});

test('isVideoUrl tells a video file from an image (called, not grepped)', () => {
  expect(isVideoUrl('https://assets.mixkit.co/videos/preview/clip-33318-large.mp4')).toBe(true);
  expect(isVideoUrl('https://x/clip.MP4?token=1')).toBe(true);
  expect(isVideoUrl('https://x/clip.webm#t=2')).toBe(true);
  expect(isVideoUrl('https://x/foto.jpg')).toBe(false);
  expect(isVideoUrl('https://x/foto.mp4.png')).toBe(false);
  expect(isVideoUrl('https://x/foto')).toBe(false);
});

test('a video renders its own file, not its poster image', () => {
  // un .mp4 con thumbnail (poster)would play a jpg: black card
  expect(mediaUrl('/uploads/clip.mp4', '/uploads/thumb-clip.jpg', true)).toBe('/uploads/clip.mp4');
  expect(mediaUrl('/uploads/foto.jpg', '/uploads/thumb-foto.jpg', false)).toBe('/uploads/thumb-foto.jpg');
  expect(mediaUrl('/uploads/foto.jpg', undefined, false)).toBe('/uploads/foto.jpg');
});

test('el carrusel plano sigue renderizando el .mp4 como video', () => {
  // ponytail: render de verdad (no grep del fuente): una fila de video
  // con poster (el server responde el video con su poster como
  // thumbnail) tiene que renderizar un <video>, no el <img> del poster.
  const videoRow: Photo = {
    id: 'v1',
    filePath: 'https://x/clip.mp4',
    thumbnailUrl: 'https://x/poster.jpg',
    mediaType: 'video',
    caption: 'un video',
    month: 'Enero',
    year: 2026,
    tags: []
  };
  const html = renderToStaticMarkup(
    React.createElement(TimelineCarousel, {
      images: [videoRow],
      eventTitle: 'Un mes',
      eventDate: 'Enero 2026'
    })
  );
  expect(html).toMatch(/<video/);
  expect(html).toMatch(/clip\.mp4/);
  expect(html).not.toMatch(/<img/);
});

test('isVideoMedia decide por la fila o por el archivo, nunca por el poster', () => {
  // el poster de un video es una imagen: preguntar por el thumbnail
  // mostraba el poster en vez del video.
  expect(isVideoMedia({ mediaType: 'video', filePath: 'https://x/clip.mp4' })).toBe(true);
  expect(isVideoMedia({ filePath: 'https://x/clip.mp4' })).toBe(true);
  expect(isVideoMedia({ mediaType: 'image', filePath: 'https://x/foto.jpg' })).toBe(false);
  // la fila manda aunque el archivo no lo diga
  expect(isVideoMedia({ mediaType: 'video', filePath: 'https://x/foto.jpg' })).toBe(true);
});

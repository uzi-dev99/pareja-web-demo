/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PWD-499 — the hero marquee, rendered.
 *
 * The suite has no DOM runner, but react-dom/server is already a
 * dependency: the components are rendered to markup and the markup is
 * asserted. These are real renders, not greps over the source.
 *
 * AC — F2 (no broken video tiles), F3 (the keyboard compliment lands on
 * the slide, not on the corner of the screen), F4 (the cloned strip is
 * out of the tab order and hidden from the screen reader), F5 (the fixed
 * navbar has a background).
 */

import { expect, test } from 'bun:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ImageMarquee } from '../src/components/ImageMarquee';
import { complimentSpot, Hero, marqueePhotos } from '../src/components/Hero';
import type { Photo } from '../src/types';

const photo = (id: string, filePath = `${id}.jpg`): Photo => ({
  id,
  filePath,
  thumbnailUrl: filePath,
  caption: `Foto ${id}`,
  month: 'Enero',
  year: 2026,
  tags: []
});

test('the cloned strip is hidden from the screen reader and out of the tab order', () => {
  const html = renderToStaticMarkup(
    React.createElement(ImageMarquee, { photos: [photo('a'), photo('b')] })
  );
  // two photos, two copies: four buttons
  expect(html.match(/<button/g)?.length).toBe(4);
  // the two clones are aria-hidden and not focusable
  expect(html.match(/aria-hidden="true"/g)?.length).toBe(2);
  expect(html.match(/tabindex="-1"/g)?.length).toBe(2);
});

test('the marquee skips the rows whose rendered url is a video file', () => {
  const videoRow = photo('video', 'https://assets.mixkit.co/videos/preview/clip-33318-large.mp4');
  const videoWithPoster: Photo = {
    ...videoRow,
    thumbnailUrl: 'https://images.unsplash.com/photo-1.jpg'
  };
  expect(marqueePhotos([photo('a'), videoRow]).map((p) => p.id)).toEqual(['a']);
  // a video with a real poster keeps its poster
  expect(marqueePhotos([videoWithPoster]).map((p) => p.id)).toEqual(['video']);
});

test('the keyboard compliment lands on the slide, not on the corner of the screen', () => {
  const rect = { left: 300, top: 500, width: 320, height: 400 };
  // a keyboard activation has no pointer coordinates
  const spot = complimentSpot(0, 0, rect, 1280, 800);
  expect(spot.x).toBe(460);
  expect(spot.y).toBe(700);
  // and it never leaves the screen
  expect(complimentSpot(0, 0, { left: -900, top: -900, width: 100, height: 100 }, 1280, 800)).toEqual({
    x: 60,
    y: 40
  });
  expect(complimentSpot(0, 0, { left: 5000, top: 5000, width: 100, height: 100 }, 1280, 800)).toEqual({
    x: 1220,
    y: 760
  });
  // a mouse click keeps the pointer position
  expect(complimentSpot(120, 240, rect, 1280, 800)).toEqual({ x: 120, y: 240 });
});

test('the fixed navbar has a background so it does not overlap the content below', () => {
  const html = renderToStaticMarkup(React.createElement(Hero, {}));
  const header = html.match(/<header[^>]*>/)?.[0] ?? '';
  expect(header).toContain('bg-gradient-to-b');
});

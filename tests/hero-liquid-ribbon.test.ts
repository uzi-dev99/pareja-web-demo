/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PWD-522 — el fondo liquid ribbon se mudó del CTA al hero.
 *
 * El owner (2026-11-03) pidió la cinta liquid detrás del hero ("Nuestro
 * Álbum" + la tira de fotos) y un CTA calmado, sin segundo video.
 *
 * Estos son contratos de fuente y de render (mismo estilo que el resto de
 * la suite: no hay runner de DOM, `react-dom/server` ya es dependencia).
 *
 * AC1 — el hero muestra la cinta detrás del heading y del strip.
 * AC2 — el CTA no tiene video y conserva botones/copy.
 * AC3 — un solo <video> en la página; con movimiento reducido, el poster.
 */

import { test, expect } from 'bun:test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type Hls from 'hls.js';
import { HERO_VEEL_ALPHA, Hero, startStream } from '../src/components/Hero';
import { CtaSection } from '../src/components/CtaSection';

const ROOT = join(import.meta.dir, '..');
// ponytail: a missing file reads as empty so the failure is an assertion
// about the feature, not an ENOENT crash.
const read = (p: string) =>
  existsSync(join(ROOT, p)) ? readFileSync(join(ROOT, p), 'utf8') : '';

const HERO_SRC = read('src/components/Hero.tsx');
const CTA_SRC = read('src/components/CtaSection.tsx');

const heroHtml = renderToStaticMarkup(React.createElement(Hero, {}));
const ctaHtml = renderToStaticMarkup(
  React.createElement(CtaSection, { onOpenSecretModal: () => {} })
);

// AC1 — la cinta liquid es el fondo del hero: un <video> con poster, antes
// del copy en el DOM (o sea, debajo) y el copy arriba (z-10).
test('the hero renders the liquid ribbon video behind its copy', () => {
  expect(heroHtml.match(/<video/g)?.length).toBe(1);
  expect(heroHtml).toMatch(/poster="https:\/\/image\.mux\.com\//);
  expect(heroHtml).toMatch(/muted/);
  expect(heroHtml).toMatch(/autoPlay/);
  expect(heroHtml).toMatch(/loop/);
  expect(heroHtml).toMatch(/playsInline/);
  // el video es decorativo
  expect(heroHtml).toMatch(/<video[^>]*aria-hidden="true"/);
  // el video va antes del heading (en el DOM, debajo) y el copy en z-10
  expect(heroHtml.indexOf('<video')).toBeLessThan(heroHtml.indexOf('<h1'));
  expect(heroHtml).toMatch(/relative z-10/);
});

// AC1 — el stream: Safari reproduce HLS nativo, el resto usa hls.js y el
// poster queda si el navegador no puede.
type FakeVideo = HTMLVideoElement & { removed: boolean; loaded: number };

const fakeVideo = (hls: string): FakeVideo => {
  const video = {
    src: '',
    canPlayType: () => hls,
    removed: false,
    loaded: 0,
    removeAttribute: () => {
      video.removed = true;
      video.src = '';
    },
    load: () => {
      video.loaded++;
    }
  };
  return video as unknown as FakeVideo;
};

const calls: string[] = [];
const optionsSeen: { capLevelToPlayerSize?: boolean }[] = [];

class FakeHls {
  static isSupported = () => true;
  static Events = { ERROR: 'error' };
  constructor(options: { capLevelToPlayerSize?: boolean }) {
    optionsSeen.push(options);
    calls.push('new');
  }
  loadSource(src: string) {
    calls.push(`loadSource:${src}`);
  }
  attachMedia() {
    calls.push('attachMedia');
  }
  on() {}
  destroy() {
    calls.push('destroy');
  }
}

test('a browser with native HLS plays the stream without hls.js', async () => {
  const video = fakeVideo('probably');
  const stop = await startStream(video, 'https://x/stream.m3u8');
  expect(video.src).toBe('https://x/stream.m3u8');
  stop();
  expect(video.src).toBe('');
});

test('the rest of the browsers load hls.js on demand and cap the level to the player', async () => {
  calls.length = 0;
  optionsSeen.length = 0;
  const video = fakeVideo('');
  const stop = await startStream(video, 'https://x/stream.m3u8', async () => ({
    default: FakeHls as unknown as typeof Hls
  }));
  expect(calls).toContain('loadSource:https://x/stream.m3u8');
  expect(calls).toContain('attachMedia');
  expect(optionsSeen[0]?.capLevelToPlayerSize).toBe(true);
  stop();
  expect(calls).toContain('destroy');
});

test('without HLS support the video keeps its poster', async () => {
  const video = fakeVideo('');
  const stop = await startStream(video, 'https://x/stream.m3u8', async () => ({
    default: { isSupported: () => false, Events: { ERROR: 'error' } } as unknown as typeof Hls
  }));
  expect(video.src).toBe('');
  expect(typeof stop).toBe('function');
});

test('a broken hls.js download keeps the poster too', async () => {
  const video = fakeVideo('');
  const stop = await startStream(video, 'https://x/stream.m3u8', async () => {
    throw new Error('offline');
  });
  expect(video.src).toBe('');
  expect(typeof stop).toBe('function');
});

// AC3 — si el stream falla (o el navegador no decodifica H.264) el <video>
// queda con la MediaSource muerta y se ve negro: hay que resetear el
// elemento para que vuelva el poster.
test('a fatal stream error resets the video so the poster shows again', async () => {
  const video = fakeVideo('');
  let onError: ((event: unknown, data: { fatal: boolean }) => void) | undefined;
  class FatalHls {
    static isSupported = () => true;
    static Events = { ERROR: 'error' };
    constructor(_options: { capLevelToPlayerSize?: boolean }) {}
    loadSource(_src: string) {}
    attachMedia() {}
    on(_event: string, cb: (event: unknown, data: { fatal: boolean }) => void) {
      onError = cb;
    }
    destroy() {}
  }
  const stop = await startStream(video, 'https://x/stream.m3u8', async () => ({
    default: FatalHls as unknown as typeof Hls
  }));
  onError?.(undefined, { fatal: true });
  expect(video.removed).toBe(true);
  expect(video.loaded).toBeGreaterThan(0);
  stop();
});

// AC1 — el velo del hero: con el video más claro posible (blanco) el heading
// blanco y el subtítulo rosado siguen con 4.5:1 o más.
const srgb = (c: number) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
};
const luminance = (r: number, g: number, b: number) =>
  0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const contrast = (fg: [number, number, number], bg: [number, number, number]) => {
  const [a, b] = [luminance(...fg), luminance(...bg)].sort((x, y) => y - x);
  return (a + 0.05) / (b + 0.05);
};

test('the hero veil keeps the heading readable over the brightest frame', () => {
  // peor caso: el video en blanco puro debajo del velo del sitio (#0d050c)
  const veil: [number, number, number] = [13, 5, 12];
  const white: [number, number, number] = [255, 255, 255];
  const over = white.map((c, i) =>
    Math.round(HERO_VEEL_ALPHA * veil[i] + (1 - HERO_VEEL_ALPHA) * c)
  ) as [number, number, number];
  expect(contrast(white, over)).toBeGreaterThanOrEqual(4.5);
  // el subtítulo del hero (#fcd5df) también
  expect(contrast([252, 213, 223], over)).toBeGreaterThanOrEqual(4.5);
});

// AC3 — un solo video en la página: el del hero. El CTA no lo tiene.
test('the page has a single video element: the hero ribbon', () => {
  expect(heroHtml.match(/<video/g)?.length).toBe(1);
  expect(ctaHtml).not.toMatch(/<video/);
});

// AC3 — con movimiento reducido el fondo queda en el poster, quieto.
test('the hero honours prefers-reduced-motion', () => {
  expect(HERO_SRC).toMatch(/prefersReducedMotion/);
  expect(HERO_SRC).toMatch(/reduced/);
});

// AC2 — el CTA conserva layout, botones y copy, con un fondo calmo.
test('the CTA keeps its heading, copy and two buttons on a calm background', () => {
  expect(ctaHtml).toMatch(/<h2\b/);
  expect(ctaHtml).toMatch(/Ver nuestros recuerdos/);
  expect(ctaHtml).toMatch(/Abrir el área secreta/);
  expect(ctaHtml.match(/<button/g)?.length).toBe(2);
  // fondo calmo: el gradiente oscuro del sitio, sin video
  expect(CTA_SRC).toMatch(/radial-gradient|linear-gradient/);
  expect(CTA_SRC).not.toMatch(/<video/);
  expect(CTA_SRC).not.toMatch(/\.m3u8/);
});

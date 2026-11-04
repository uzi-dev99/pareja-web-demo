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
import {
  HERO_VEIL_ALPHA,
  HERO_VEIL_ALPHA_TEXT,
  Hero,
  startStream,
  syncStreamPlayback
} from '../src/components/Hero';
import { prefersReducedMotion } from '../src/utils/carousel3d';
import { CtaSection } from '../src/components/CtaSection';

const ROOT = join(import.meta.dir, '..');
// ponytail: a missing file reads as empty so the failure is an assertion
// about the feature, not an ENOENT crash.
const read = (p: string) =>
  existsSync(join(ROOT, p)) ? readFileSync(join(ROOT, p), 'utf8') : '';

const CTA_SRC = read('src/components/CtaSection.tsx');

const heroHtml = renderToStaticMarkup(React.createElement(Hero, { photos: [] }));
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
  let destroys = 0;
  class FatalHls {
    static isSupported = () => true;
    static Events = { ERROR: 'error' };
    constructor(_options: { capLevelToPlayerSize?: boolean }) {}
    loadSource(_src: string) {}
    attachMedia() {}
    on(_event: string, cb: (event: unknown, data: { fatal: boolean }) => void) {
      onError = cb;
    }
    destroy() {
      destroys++;
    }
  }
  const stop = await startStream(video, 'https://x/stream.m3u8', async () => ({
    default: FatalHls as unknown as typeof Hls
  }));
  onError?.(undefined, { fatal: true });
  expect(video.removed).toBe(true);
  expect(video.loaded).toBeGreaterThan(0);
  expect(destroys).toBe(1);
  stop();
  // ponytail: el cleanup NO destruye otra vez (la libreria se queja del
  // segundo destroy).
  expect(destroys).toBe(1);
});

// AC1 — el velo del hero: con el video más claro posible (blanco) el
// heading y el subtítulo siguen legibles en el PEOR caso: el borde del
// texto, donde el velo todavía tiene su alfa denso. El heading es un
// gradiente oro→rosa que termina en #ff4d6d (texto grande: 3:1); el
// subtítulo (#fcd5df) es texto normal (4.5:1).
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
// el frame más claro posible (blanco) debajo del velo del sitio (#0d050c)
const VEIL: [number, number, number] = [13, 5, 12];
const overVeil = (alpha: number): [number, number, number] =>
  VEIL.map((c, i) =>
    Math.round(alpha * c + (1 - alpha) * 255)
  ) as [number, number, number];

test('the hero veil keeps the heading readable over the brightest frame', () => {
  const white: [number, number, number] = [255, 255, 255];
  // el peor caso: el borde del texto (no el centro del velo)
  const worst = overVeil(HERO_VEIL_ALPHA_TEXT);
  expect(contrast(white, worst)).toBeGreaterThanOrEqual(4.5);
  // el heading: el final del gradiente (#ff4d6d) es texto grande (3:1)
  expect(contrast([255, 77, 109], worst)).toBeGreaterThanOrEqual(3);
  // el subtítulo del hero (#fcd5df) también
  expect(contrast([252, 213, 223], worst)).toBeGreaterThanOrEqual(4.5);
  // y en el centro del velo (más denso) también
  const centre = overVeil(HERO_VEIL_ALPHA);
  expect(contrast(white, centre)).toBeGreaterThanOrEqual(4.5);
  expect(contrast([252, 213, 223], centre)).toBeGreaterThanOrEqual(4.5);
});

// AC3 — el hero no reproduce el fondo con movimiento reducido.
test('the hero honours prefers-reduced-motion', () => {
  // ponytail: el test corre el RENDER (no busca el nombre de una
  // variable): con movimiento reducido el hero no pide autoplay y el
  // fondo queda en el poster, quieto.
  const g = globalThis as { window?: unknown; matchMedia?: unknown };
  const realWindow = g.window;
  const realMatchMedia = g.matchMedia;
  try {
    // bun no tiene window: se le da el propio globalThis (que ya tiene
    // addEventListener) con un matchMedia.
    g.window = globalThis;
    g.matchMedia = (q: string) => ({ matches: q.includes('reduce') });
    expect(prefersReducedMotion()).toBe(true);
    const html = renderToStaticMarkup(React.createElement(Hero, { photos: [] }));
    expect(html).not.toMatch(/autoPlay/);
    expect(html).toMatch(/poster=/);
  } finally {
    g.window = realWindow;
    g.matchMedia = realMatchMedia;
  }
});

test('prefersReducedMotion reads the OS setting', () => {
  const real = (globalThis as { window?: unknown }).window;
  try {
    (globalThis as { window?: unknown }).window = {
      matchMedia: (q: string) => ({ matches: q.includes('reduce') })
    };
    expect(prefersReducedMotion()).toBe(true);
    (globalThis as { window?: unknown }).window = { matchMedia: () => ({ matches: false }) };
    expect(prefersReducedMotion()).toBe(false);
    // sin window (SSR/tests) el sitio no assume nada
    (globalThis as { window?: unknown }).window = undefined;
    expect(prefersReducedMotion()).toBe(false);
  } finally {
    (globalThis as { window?: unknown }).window = real;
  }
});

// AC3 — la cinta se pausa cuando el hero sale de pantalla.
test('the ribbon pauses when the hero is out of view and resumes when it is back', () => {
  const calls: string[] = [];
  const video = {
    play: () => {
      calls.push('play');
      return Promise.resolve();
    },
    pause: () => calls.push('pause')
  } as unknown as HTMLVideoElement;
  syncStreamPlayback(video, false);
  expect(calls).toEqual(['pause']);
  syncStreamPlayback(video, true);
  expect(calls).toEqual(['pause', 'play']);
});

// AC3 — un solo video en la página: el del hero. El CTA no lo tiene.
test('the page has a single video element: the hero ribbon', () => {
  expect(heroHtml.match(/<video/g)?.length).toBe(1);
  expect(ctaHtml).not.toMatch(/<video/);
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

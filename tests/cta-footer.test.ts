/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PWD-496 — closing CTA + footer.
 *
 * The end of the album became a cinematic CTA: HLS video background with a
 * poster fallback, a centred serif-italic heading, two liquid-glass buttons
 * wired to the site's existing actions, and a minimal footer bar.
 *
 * These are source-level contracts (same style as the rest of the suite:
 * no DOM test runner in this repo, `tsc` covers the type contract).
 *
 * AC1 — composition + liquid-glass styles.
 * AC2 — HLS support / failure keeps the poster and the layout.
 * AC3 — the CTA is mounted in App.tsx before the footer.
 */

import { test, expect } from 'bun:test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import type Hls from 'hls.js';
import { startStream } from '../src/components/CtaSection';

const ROOT = join(import.meta.dir, '..');
// ponytail: a missing file reads as empty so the failure is an assertion
// about the feature, not an ENOENT crash.
const read = (p: string) =>
  existsSync(join(ROOT, p)) ? readFileSync(join(ROOT, p), 'utf8') : '';

const CTA = read('src/components/CtaSection.tsx');
const FOOTER = read('src/components/Footer.tsx');
const APP = read('src/App.tsx');

// AC3 — the closing CTA is mounted in the app, above the footer.
test('App.tsx mounts the CTA section before the footer', () => {
  const cta = APP.indexOf('<CtaSection');
  const footer = APP.indexOf('<Footer');
  expect(cta).toBeGreaterThan(-1);
  expect(footer).toBeGreaterThan(-1);
  expect(cta).toBeLessThan(footer);
});

// AC1 — prompt composition: video background, fades, heading, two buttons.
test('CTA section keeps the prompt composition', () => {
  expect(CTA).toMatch(/<video\b/);
  expect(CTA).toMatch(/autoPlay/);
  expect(CTA).toMatch(/playsInline/);
  // top + bottom fade into the dark page background
  expect(CTA.match(/linear-gradient\(to (bottom|top)/g)?.length).toBe(2);
  // heading + subtext
  expect(CTA).toMatch(/<h2\b/);
  expect(CTA).toMatch(/<p\b/);
});

// AC1 — the liquid-glass styles of the prompt (blurred backdrop + masked
// gradient border).
test('CTA section ships the prompt liquid-glass styles', () => {
  expect(CTA).toMatch(/backdrop-filter:\s*blur\(50px\)/);
  expect(CTA).toMatch(/-webkit-backdrop-filter:\s*blur\(50px\)/);
  expect(CTA).toMatch(/mask-composite:\s*exclude/);
  expect(CTA).toMatch(/inset 0 1px 1px rgba\(255, 255, 255, 0\.15\)/);
  expect(CTA).toMatch(/liquid-glass-strong/);
});

// AC1 — two CTA buttons, both with the prompt's arrow icon, wired to the
// site's existing actions (photo wall + secret area).
test('CTA section has two buttons wired to existing site actions', () => {
  expect(CTA.match(/<ArrowUpRight/g)?.length).toBe(2);
  expect(CTA).toMatch(/#galeria/);
  expect(CTA).toMatch(/onOpenSecretModal/);
});

// AC1 — heading in the site serif, italic; body copy in Spanish.
test('CTA heading uses the site serif in italic', () => {
  expect(CTA).toMatch(/font-serif/);
  expect(CTA).toMatch(/italic/);
});

// AC2 — HLS plays through hls.js, Safari plays it natively, and the poster
// is always the fallback (video failure or unsupported HLS).
test('CTA background streams HLS with a poster fallback', () => {
  expect(CTA).toMatch(/\.m3u8/);
  expect(CTA).toMatch(/poster=/);
  // the stream starts when the section enters the screen, not at page load
  expect(CTA).toMatch(/IntersectionObserver/);
});

// AC2 — the stream itself, exercised: the native path (Safari), the hls.js
// path (the rest) and the fallback that keeps the poster.
const fakeVideo = (hls: string) => {
  const video = {
    src: '',
    canPlayType: () => hls,
    removeAttribute: () => {
      video.src = '';
    },
    load: () => {}
  };
  return video as unknown as HTMLVideoElement;
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

// AC2 — the site's motion rule: reduced motion keeps the poster still.
test('CTA background honours prefers-reduced-motion', () => {
  expect(CTA).toMatch(/prefers-reduced-motion:\s*reduce/);
});

// The footer is now the minimal bar of the prompt, and it keeps the
// heart easter egg (and its counter) that the album already had.
test('Footer is the minimal bar and keeps the heart easter egg', () => {
  expect(FOOTER).toMatch(/border-t border-white\/10/);
  expect(FOOTER).not.toMatch(/bg-\[#0d0711\]/);
  expect(FOOTER).toMatch(/onHeartClick/);
  expect(FOOTER).toMatch(/heartClickCount/);
});

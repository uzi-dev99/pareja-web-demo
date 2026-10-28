/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: App.tsx renders the sections in the agreed order so the
 * birthday page is "home → cats → countdown → monthly recap → specific
 * day → photo wall" on mobile, not the legacy order.
 *
 * Expected order, top to bottom in the JSX:
 *
 *   <Hero />
 *   <CatTamagotchiBox />
 *   <TimeCounter ... />          (still part of the home, per q1)
 *   <Timeline ... />
 *   <SecretLetter ... />         (the "carta", moved below Timeline)
 *   <Gallery ... />
 *   <Footer ... />
 *
 * The MusicPlayerFab and SecretEffectsManager are overlays (FABs),
 * not section order — they live alongside the sections but their
 * position in the source is not what this contract enforces.
 *
 * ponytail: source-level test. A future "let me just clean up the
 * JSX" PR cannot silently reorder the sections and put the letter
 * back above the cats, breaking the birthday page flow.
 */

import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const SRC = readFileSync(join(ROOT, 'src', 'App.tsx'), 'utf8');

// Find the first occurrence index of each section marker in the JSX.
// Each marker is the start of the component tag (with or without props).
const idx = (tag: string): number => SRC.indexOf(`<${tag}`);
const positions: Record<string, number> = {
  Hero: idx('Hero'),
  TimeCounter: idx('TimeCounter'),
  CatTamagotchiBox: idx('CatTamagotchiBox'),
  Timeline: idx('Timeline'),
  SecretLetter: idx('SecretLetter'),
  Gallery: idx('Gallery'),
  Footer: idx('Footer')
};

test('every expected section is present in App.tsx', () => {
  for (const [name, pos] of Object.entries(positions)) {
    expect(pos).toBeGreaterThan(-1);
  }
});

test('section order is home → cats → countdown → timeline → letter → gallery → footer', () => {
  expect(positions.Hero).toBeLessThan(positions.CatTamagotchiBox);
  expect(positions.CatTamagotchiBox).toBeLessThan(positions.TimeCounter);
  expect(positions.TimeCounter).toBeLessThan(positions.Timeline);
  expect(positions.Timeline).toBeLessThan(positions.SecretLetter);
  expect(positions.SecretLetter).toBeLessThan(positions.Gallery);
  expect(positions.Gallery).toBeLessThan(positions.Footer);
});

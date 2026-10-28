/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Regression: Trufa (the black panther) has themeColor #1f1f2e — a deep
 * neutral that was chosen to make her bowl/bubble borders read "michi negro".
 * The speech-bubble label used to render the pill text in `cat.themeColor`,
 * which made Trufa's name disappear as dark-on-dark against the dark room.
 *
 * The contract: Trufa's label text must come from a separate, readable color
 * (the same light slate her tagColor already uses), while keeping the dark
 * themeColor for borders and backgrounds. Other cats keep the default of
 * label == themeColor.
 *
 * ponytail: source-level test — the actual rendering depends on inline style
 * props that aren't easy to mount in jsdom, so we assert the structure that
 * produces the readable label.
 */

import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = readFileSync(
  join(import.meta.dir, '..', 'src', 'components', 'CatTamagotchiBox.tsx'),
  'utf8'
);

const nichoBlock = SRC.match(
  /id:\s*'black'[\s\S]*?tagColor:\s*'[^']*'/
);

test('Trufa entry exposes a labelTextColor that differs from themeColor', () => {
  expect(nichoBlock, 'Trufa entry not found in CatTamagotchiBox.tsx').not.toBeNull();
  // ponytail: must declare a separate labelTextColor override so the label
  // can stay readable even when themeColor is too dark for text.
  expect(nichoBlock![0]).toMatch(/labelTextColor:\s*['"][^'"]+['"]/);
  // ponytail: the override must not simply mirror themeColor (the original bug).
  expect(nichoBlock![0]).not.toMatch(
    /labelTextColor:\s*['"]#1f1f2e['"]/
  );
});

test('Trufa labelTextColor matches the readable slate used in her tagColor', () => {
  // ponytail: tie the two together so they cannot drift — if someone changes
  // tagColor's text color and forgets the label, this fails.
  expect(nichoBlock![0]).toMatch(/labelTextColor:\s*['"]#e2e8f0['"]/);
  expect(nichoBlock![0]).toMatch(/text-\[#e2e8f0\]/);
});

test('speech bubble label uses labelTextColor with themeColor fallback', () => {
  // ponytail: the JSX style must read the override with a `?? themeColor`
  // fallback so other cats keep working without an explicit labelTextColor.
  expect(SRC).toMatch(
    /color:\s*cat\.labelTextColor\s*\?\?\s*cat\.themeColor/
  );
});
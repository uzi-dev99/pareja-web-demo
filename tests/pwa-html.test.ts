/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: index.html wires up the PWA install surface for both Chrome
 * (manifest link + theme-color) and iOS Safari (apple-mobile-web-app-*
 * meta tags + apple-touch-icon link).
 *
 * Pitfalls verified against Apple docs, web.dev, and confirmed-bug reports:
 *   - viewport-fit=cover is REQUIRED for notched iPhones to render edge-to-edge
 *     in standalone mode. Without it Safari letterboxes in landscape.
 *   - apple-mobile-web-app-status-bar-style MUST be omitted (or set to
 *     "default"). Setting "black-translucent" combined with viewport-fit=cover
 *     creates a ~59px chin-gap bug at the bottom on iOS.
 *   - apple-mobile-web-app-title must be the SHORT label — iOS home-screen
 *     labels have a ~12-character visual limit. We use "Amor" (4 chars) and
 *     keep "Amor ∞" for the <title>.
 *   - apple-touch-icon must be reachable at /apple-touch-icon.png because
 *     iOS checks that legacy path even when also declared via <link>.
 */

import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const PATH = join(ROOT, 'index.html');
const HTML = readFileSync(PATH, 'utf8');

test('<title> is "Amor ∞"', () => {
  expect(HTML).toMatch(/<title>\s*Amor\s*∞\s*<\/title>/);
});

test('viewport meta includes viewport-fit=cover', () => {
  // ponytail: this is the load-bearing fix for notched iPhones.
  expect(HTML).toMatch(
    /<meta\s+name=["']viewport["']\s+content=["'][^"']*viewport-fit=cover[^"']*["']/
  );
});

test('Chrome / Android PWA hooks present', () => {
  expect(HTML).toMatch(
    /<link\s+rel=["']manifest["']\s+href=["']\/manifest\.json["']/
  );
  expect(HTML).toMatch(
    /<meta\s+name=["']theme-color["']\s+content=["']#0a060d["']/
  );
});

test('iOS Safari web-clip meta tags present', () => {
  expect(HTML).toMatch(
    /<meta\s+name=["']apple-mobile-web-app-capable["']\s+content=["']yes["']/
  );
  expect(HTML).toMatch(
    /<meta\s+name=["']apple-mobile-web-app-title["']\s+content=["']Amor["']/
  );
  expect(HTML).toMatch(
    /<link\s+rel=["']apple-touch-icon["']\s+href=["']\/apple-touch-icon\.png["']/
  );
});

test('apple-mobile-web-app-status-bar-style is OMITTED (chin-gap bug)', () => {
  // ponytail: presence of this tag (with any value) triggers the WebKit
  // chin-gap bug when combined with viewport-fit=cover. Asserting absence
  // catches accidental re-introductions. Strip HTML comments so the test
  // does not match its own explanatory note.
  const htmlOnly = HTML.replace(/<!--[\s\S]*?-->/g, '');
  expect(htmlOnly).not.toMatch(/apple-mobile-web-app-status-bar-style/);
});

test('og:title and twitter:title reflect the install app name', () => {
  // ponytail: keep social shares consistent with the manifest name. If
  // someone reverts these to "demo brand" the test fails and the
  // inconsistency is caught before deploy.
  expect(HTML).toMatch(
    /<meta\s+property=["']og:title["']\s+content=["']Love story["']/
  );
  expect(HTML).toMatch(
    /<meta\s+name=["']twitter:title["']\s+content=["']Love story["']/
  );
});
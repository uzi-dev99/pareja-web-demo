/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: public/manifest.json is the Web App Manifest for the demo
 * site. It must satisfy Chrome's PWA install criteria:
 *   - name OR short_name
 *   - start_url
 *   - display in {fullscreen, standalone, minimal-ui, window-controls-overlay}
 *   - icons including at least one 192px and one 512px PNG
 *   - theme_color + background_color
 *   - prefer_related_applications absent or false (otherwise the OS app
 *     store gets promoted over our install)
 *
 * Ponytail: source-level test — read the JSON, parse it, assert shape.
 * No mock, no fixtures.
 */

import { test, expect } from 'bun:test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const PATH = join(ROOT, 'public', 'manifest.json');

test('public/manifest.json exists', () => {
  expect(existsSync(PATH)).toBe(true);
});

test('manifest parses as valid JSON', () => {
  expect(() => JSON.parse(readFileSync(PATH, 'utf8'))).not.toThrow();
});

test('manifest has the install-criteria required fields', () => {
  const m = JSON.parse(readFileSync(PATH, 'utf8'));
  // ponytail: one assertion per field so the failure pinpoints which is missing.
  expect(m.name).toBe('Love story');
  expect(m.short_name).toBe('Amor');
  expect(typeof m.start_url).toBe('string');
  expect(m.start_url.length).toBeGreaterThan(0);
  expect(m.display).toMatch(/^(fullscreen|standalone|minimal-ui|window-controls-overlay)$/);
  expect(typeof m.theme_color).toBe('string');
  expect(typeof m.background_color).toBe('string');
});

test('manifest icons include a 192px and a 512px PNG', () => {
  const m = JSON.parse(readFileSync(PATH, 'utf8'));
  expect(Array.isArray(m.icons)).toBe(true);
  const sizes = (m.icons as Array<{ sizes?: string; type?: string }>).map(
    (i) => i.sizes
  );
  expect(sizes).toContain('192x192');
  expect(sizes).toContain('512x512');
  const types = (m.icons as Array<{ sizes?: string; type?: string }>).map(
    (i) => i.type
  );
  expect(types).toContain('image/png');
});

test('manifest does not promote a related native app', () => {
  // ponytail: if `prefer_related_applications` is true, Chrome shows the
  // App Store / Play Store listing instead of the install banner. We want
  // the web install path.
  const m = JSON.parse(readFileSync(PATH, 'utf8'));
  expect(m.prefer_related_applications ?? false).toBe(false);
});
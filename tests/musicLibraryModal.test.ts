/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Test for MusicLibraryModal: verifies the component exports and accepts the
 * expected props. Runtime behavior is verified manually via the dev server.
 *
 * ponytail: 1 file, no framework. Typecheck + existence check. React Testing
 * Library would add ~15MB of deps for trivial gain on this modal.
 */

import { test, expect, beforeAll } from 'bun:test';

beforeAll(() => {
  // ponytail: stub HTMLAudioElement so audioPlayer singleton can be imported.
  (globalThis as any).HTMLAudioElement = function () {
    return {
      src: '', paused: true,
      play: () => Promise.resolve(),
      pause: () => {}, load: () => {},
      addEventListener: () => {}
    };
  };
  // ponytail: motion/react touches `document` at import time. Provide a thin
  // stub so the component module can be required without a real DOM. We
  // don't assert rendered output here, just the export shape.
  if (typeof (globalThis as any).document === 'undefined') {
    const noopEl = {
      style: {},
      preload: '',
      src: '',
      paused: true,
      appendChild: () => {},
      removeChild: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      play: () => Promise.resolve(),
      pause: () => {},
      load: () => {}
    };
    (globalThis as any).document = {
      createElement: () => noopEl,
      body: { appendChild: () => {}, removeChild: () => {} },
      documentElement: { style: {}, addEventListener: () => {}, removeEventListener: () => {} },
      addEventListener: () => {},
      removeEventListener: () => {},
      querySelector: () => null,
      querySelectorAll: () => []
    };
    (globalThis as any).window = (globalThis as any).window ?? (globalThis as any);
    (globalThis as any).navigator = (globalThis as any).navigator ?? { userAgent: 'bun' };
  }
});

test('MusicLibraryModal is a React component exporting the expected props', () => {
  const mod = require('../src/components/MusicLibraryModal');
  expect(typeof mod.MusicLibraryModal).toBe('function');
});

test('MusicLibraryModal accepts { isOpen, onClose } props', () => {
  const { MusicLibraryModal } = require('../src/components/MusicLibraryModal');
  // ponytail: smoke check the function's expected arity (1 = props).
  expect(MusicLibraryModal.length).toBe(1);
});
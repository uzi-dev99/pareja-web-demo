/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: the app disables browser scroll restoration on mount so
 * every page load starts at the top of the home (Hero). Browsers
 * default to `history.scrollRestoration = 'auto'`, which restores
 * the scroll position the visitor had when they last refreshed —
 * meaning if a user scrolled to the cats / cumple card and then
 * reloaded, they would land back at the cats instead of the home.
 *
 * The fix is to set `history.scrollRestoration = 'manual'` once
 * at app mount. After that the browser always leaves scroll at
 * (0, 0) on load and the user can scroll wherever they want.
 *
 * ponytail: source-level test. Locked against a regression where
 * someone removes the manual restoration line (or replaces it with
 * 'auto').
 */

import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const APP = readFileSync(join(ROOT, 'src', 'App.tsx'), 'utf8');

test('App.tsx disables browser scroll restoration on mount', () => {
  // ponytail: must be set inside a useEffect (not at module scope),
  // because history is a window global that is only available after
  // the page mounts. Set to 'manual' so the browser stops restoring
  // the previous scroll position on reload.
  const restoreMatch = APP.match(
    /history\.scrollRestoration\s*=\s*['"]manual['"]/
  );
  expect(restoreMatch).not.toBeNull();
  // Must live inside a useEffect call (not a top-level statement),
  // otherwise SSR / module-eval ordering bites us. Use a non-greedy
  // multi-line match so nested braces inside the effect body (e.g.
  // window.scrollTo({...})) do not break the regex.
  const inEffect = APP.match(
    /useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*?history\.scrollRestoration\s*=\s*['"]manual['"][\s\S]*?\}\s*,/
  );
  expect(inEffect).not.toBeNull();
});

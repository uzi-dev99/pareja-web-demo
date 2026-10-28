/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Contract: MusicPlayerFab has 3 states — idle / mini / full — wired
 * exactly as the user described:
 *
 *   1. idle:    small circle with a music-note icon. Nothing else.
 *   2. mini:    expanded card over the FAB with title + play/pause +
 *               next. Click the FAB circle again → back to idle.
 *               Click the title text → opens the full codelist modal.
 *   3. full:    the cheatsheet / codelist modal (almost full screen)
 *               that also exposes the music library controls (upload,
 *               list of songs). Closing the modal returns to mini.
 *
 * Auto-play contract:
 *   - App.tsx calls audioPlayer.playRandom() on mount, best-effort
 *     (no throw if the browser blocks).
 *   - On the first user gesture (click / touchstart / keydown /
 *     scroll) it tries playRandom again — this covers mobile browsers
 *     that block autoplay until the user interacts with the page.
 *
 * Codelist FAB removal:
 *   - The "Trucos & Magia" floating button that previously lived in
 *     SecretEffectsManager is gone. The codelist is reachable only
 *     via the music FAB → mini → full path.
 *
 * ponytail: source-level guards. Three states is a state machine that
 * can rot if someone adds a fourth, so lock the labels and the
 * transitions explicitly.
 */

import { test, expect } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dir, '..');
const FAB = readFileSync(join(ROOT, 'src', 'components', 'MusicPlayerFab.tsx'), 'utf8');
const APP = readFileSync(join(ROOT, 'src', 'App.tsx'), 'utf8');
const SECRETS = readFileSync(join(ROOT, 'src', 'components', 'SecretEffectsManager.tsx'), 'utf8');

// ---- State machine shape ----

test('MusicPlayerFab declares the three-state enum (idle / mini / full)', () => {
  // ponytail: the state values appear literally in the source as the
  // setPlayerView argument. Lock the three labels so a typo or a
  // rename has to update the test too.
  expect(FAB).toMatch(/['"]idle['"]/);
  expect(FAB).toMatch(/['"]mini['"]/);
  expect(FAB).toMatch(/['"]full['"]/);
});

// ---- Idle state: tiny circle with music icon ----

test('MusicPlayerFab idle state renders a small circular music button', () => {
  // ponytail: the circle must be small (≤ w-12 h-12 — the smallest
  // comfortable tap target on mobile). The icon is Music (lucide).
  // Must NOT include the "Trucos & Magia" label — idle is just the icon.
  // Implementation note: the shell renders when playerView !== 'full'
  // (covers both idle and mini with the same DOM anchor), so we look
  // for the circle button block directly.
  // ponytail: the aria-label is computed (playerView === 'mini' ? ...),
  // so we anchor on the motion.button + Music icon + small-size pattern
  // rather than the exact aria-label string.
  const circleButton = FAB.match(
    /<motion\.button[\s\S]*?<Music[\s\S]*?<\/motion\.button>/
  )?.[0] ?? '';
  expect(circleButton.length).toBeGreaterThan(0);
  expect(circleButton).not.toMatch(/Trucos/);
  expect(circleButton).toMatch(/w-(?:10|11|12|14)\s+h-(?:10|11|12|14)/);
});

// ---- Mini state: title + play/pause + next, click title → full ----

test('mini state shows play/pause + next controls and title opens full', () => {
  // ponytail: the transition to full is triggered by clicking the
  // title text (not the FAB circle, not the play/pause buttons). The
  // title must be a clickable element that calls setPlayerView('full').
  expect(FAB).toMatch(/setPlayerView\(['"]full['"]\)/);
  // play/pause + next controls are in the mini state.
  expect(FAB).toMatch(/audioPlayer\.(pause|resume)\(\)/);
  expect(FAB).toMatch(/audioPlayer\.next\(\)/);
});

// ---- Full state: codelist modal with music library controls ----

test('full state renders the cheatsheet + music library controls', () => {
  // ponytail: the full modal is where the user lands when they want
  // to manage secrets AND upload songs from the same screen. It must
  // expose both — the cheatsheet command list AND a way to upload or
  // open the song library. Lock both the cheatsheet label and the
  // music-library trigger.
  expect(FAB).toMatch(/Palabras Mágicas|Palabras M&aacute;gicas|Palabras Mágicas & Efectos/);
  expect(FAB).toMatch(/Cargar Canciones|MusicLibraryModal/);
});

// ---- Toggle: clicking the FAB in mini collapses back to idle ----

test('clicking the FAB circle toggles mini ↔ idle (does not open full)', () => {
  // ponytail: the FAB circle has TWO jobs: from idle → mini, and from
  // mini → idle (collapse). It must NEVER open full on its own — only
  // the title text does. Lock that the circle's handler never sets
  // playerView to 'full'.
  const circleHandler = FAB.match(
    /handleCircleClick[\s\S]*?\}\s*,\s*\[/
  )?.[0] ?? '';
  expect(circleHandler.length).toBeGreaterThan(0);
  expect(circleHandler).not.toMatch(/['"]full['"]/);
});

// ---- Hook order (regression: React error #310) ----

test('MusicPlayerFab declares ALL hooks above any early return', () => {
  // ponytail: hooks (useState / useEffect / useCallback) must be
  // called in the same order on every render. The previous bug had
  // useCallback handlers placed AFTER the `if (!currentSong) return
  // null;` line, which made the first render skip those hooks and
  // the second render call them — React error #310: "Rendered more
  // hooks than during the previous render."
  //
  // Lock: in the parent component, the LAST hook line MUST come
  // before the EARLY RETURN line. We work in line numbers (not
  // string indices) so a comment that mentions "if (!currentSong)
  // return null" doesn't poison the check.
  const lines = FAB.split('\n');
  // Scope to the parent — everything before the line that opens
  // the FullPlayerModal sub-component.
  const fullModalLineIdx = lines.findIndex((l) => /^\s*(export\s+)?const\s+FullPlayerModal\b/.test(l));
  expect(fullModalLineIdx).toBeGreaterThan(0);
  const parentLines = lines.slice(0, fullModalLineIdx);
  const hookLineRe = /^\s*(?:const\s+\w+\s*=\s*)?\b(useState|useEffect|useCallback|useRef|useMemo|useLayoutEffect|useReducer|useContext)\s*\(/;
  const lastHookLine = (() => {
    for (let i = parentLines.length - 1; i >= 0; i--) {
      if (hookLineRe.test(parentLines[i])) return i;
    }
    return -1;
  })();
  const earlyReturnLine = (() => {
    const re = /^\s*if\s*\(\s*!\s*currentSong\s*\)\s*return\s+null/;
    for (let i = 0; i < parentLines.length; i++) {
      if (re.test(parentLines[i])) return i;
    }
    return -1;
  })();
  expect(lastHookLine).toBeGreaterThan(-1);
  expect(earlyReturnLine).toBeGreaterThan(-1);
  expect(lastHookLine).toBeLessThan(earlyReturnLine);
});

// ---- Auto-play ----

test('App.tsx calls audioPlayer.playIfReady() on mount (best-effort autoplay)', () => {
  // ponytail: the autoplay lives in App.tsx (single owner of the
  // singleton's lifecycle). playIfReady() awaits the cache so we do
  // not log "empty playlist" when refreshCache is still in flight.
  expect(APP).toMatch(/audioPlayer\.playIfReady\(\)/);
  // A user-gesture listener is registered to retry on first click /
  // touch / scroll / key. Lock the gesture list so we cover mobile
  // (touchstart) and desktop (keydown, scroll, click).
  expect(APP).toMatch(/addEventListener\(['"]click['"]/);
  expect(APP).toMatch(/addEventListener\(['"]touchstart['"]/);
});

// ---- Codelist FAB removal ----

test('SecretEffectsManager no longer renders the "Trucos & Magia" floating button', () => {
  // ponytail: the cheatsheet is reachable only via the music FAB →
  // mini → full path now. Lock that the standalone Trucos & Magia
  // FAB is gone (no fixed bottom-left element with that label).
  const fixedBottomBlock = SECRETS.match(
    /fixed\s+bottom-\d+\s+left-\d+[\s\S]{0,400}?<\/button>/
  );
  // If there is a fixed bottom-left button, it must not say "Trucos".
  if (fixedBottomBlock) {
    expect(fixedBottomBlock[0]).not.toMatch(/Trucos/);
  }
  // And the literal "Trucos & Magia" string should no longer appear
  // in the button label.
  expect(SECRETS).not.toMatch(/>\s*Trucos\s*&\s*Magia\s*</);
});

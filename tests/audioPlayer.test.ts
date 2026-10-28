/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tests for the audioPlayer singleton. Verifies:
 *  - playRandom() on an empty cache is a no-op (no throw, no current song).
 *  - playRandom() picks only songs from the cached list (never undefined).
 *  - next() on an empty cache is a no-op.
 *  - on song end, the player auto-picks another random song (auto-loop).
 *
 * ponytail: 4 tests, one file, no frameworks beyond bun:test. Mocks only
 * `fetch` (for /api/songs) and `document.createElement('audio')` (no DOM).
 */

import { test, expect, beforeEach, afterEach } from 'bun:test';

// ponytail: restore the globals this file stubs — bun:test shares one process
// across all files, so a stubbed `fetch` would hijack the real HTTP calls of
// tests/songs.test.ts and tests/content-overrides.test.ts.
const realFetch = globalThis.fetch;
const realDocument = (globalThis as any).document;

let audioStub: any;

beforeEach(() => {
  // ponytail: stub HTMLAudioElement as a no-op constructor with the smallest
  // surface the player uses (src, play, pause, addEventListener).
  audioStub = {
    src: '',
    paused: true,
    ended: false,
    _endedFn: null as null | (() => void),
    play: function () { this.paused = false; return Promise.resolve(); },
    pause: function () { this.paused = true; },
    load: function () {},
    addEventListener: function (event: string, fn: any) {
      if (event === 'ended') this._endedFn = fn;
    }
  };
  // ponytail: stub document.createElement('audio') so the prod constructor
  // can run in bun:test (no DOM). Other createElement calls return a no-op
  // object so we don't accidentally widen the prod API surface.
  (globalThis as any).document = {
    createElement: (tag: string) => (tag === 'audio' ? audioStub : {})
  };
  // ponytail: reset module cache so each test gets a fresh singleton bound
  // to the current audioStub (which holds the 'ended' callback closure).
  delete require.cache[require.resolve('../src/utils/audioPlayer')];
});

afterEach(() => {
  (globalThis as any).fetch = realFetch;
  if (realDocument === undefined) delete (globalThis as any).document;
  else (globalThis as any).document = realDocument;
});

const setFetchJson = (json: unknown) => {
  (globalThis as any).fetch = async () =>
    new Response(JSON.stringify(json), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
};

test('playRandom() on empty cache is a no-op (no throw)', async () => {
  setFetchJson([]);
  const { audioPlayer } = await import('../src/utils/audioPlayer');
  expect(() => audioPlayer.playRandom()).not.toThrow();
  expect(audioPlayer.getCurrent()).toBeNull();
});

test('playRandom() picks only songs from the cached list', async () => {
  const seed = [
    { id: 'a', title: 'A', artist: '', filePath: '/uploads/a.mp3' },
    { id: 'b', title: 'B', artist: '', filePath: '/uploads/b.mp3' }
  ];
  setFetchJson(seed);
  const { audioPlayer } = await import('../src/utils/audioPlayer');
  await audioPlayer.refreshCache();

  const ids = new Set<string>();
  for (let i = 0; i < 100; i++) {
    audioPlayer.playRandom();
    const cur = audioPlayer.getCurrent();
    expect(cur).not.toBeNull();
    ids.add(cur!.id);
  }
  expect(ids.size).toBeGreaterThanOrEqual(1);
  expect(ids.size).toBeLessThanOrEqual(2);
  for (const id of ids) expect(['a', 'b']).toContain(id);
});

test('next() on empty cache is a no-op', async () => {
  setFetchJson([]);
  const { audioPlayer } = await import('../src/utils/audioPlayer');
  expect(() => audioPlayer.next()).not.toThrow();
  expect(audioPlayer.getCurrent()).toBeNull();
});

test('on song end, auto-picks another random song (loop)', async () => {
  const seed = [
    { id: 'x', title: 'X', artist: '', filePath: '/uploads/x.mp3' },
    { id: 'y', title: 'Y', artist: '', filePath: '/uploads/y.mp3' }
  ];
  setFetchJson(seed);
  const { audioPlayer } = await import('../src/utils/audioPlayer');
  await audioPlayer.refreshCache();
  audioPlayer.playRandom();
  const before = audioPlayer.getCurrent()!.id;

  // Simulate the natural 'ended' event by invoking the stubbed callback.
  expect(typeof audioStub._endedFn).toBe('function');
  audioStub._endedFn();

  const after = audioPlayer.getCurrent()!.id;
  expect(['x', 'y']).toContain(after);
  // In 100 simulated ends with 2 songs, we expect at least one switch.
  let switched = false;
  for (let i = 0; i < 100; i++) {
    audioStub._endedFn();
    if (audioPlayer.getCurrent()!.id !== before) { switched = true; break; }
  }
  expect(switched).toBe(true);
});

test('pause() + resume() toggle audio playback (no current change)', async () => {
  // ponytail: FAB toggle calls pause() / resume() in pairs. Lock the
  // public API: pause sets paused=true, resume sets paused=false, and
  // neither mutates the current song (so the FAB stays mounted).
  setFetchJson([
    { id: 'r', title: 'R', artist: '', filePath: '/uploads/r.mp3' }
  ]);
  const { audioPlayer } = await import('../src/utils/audioPlayer');
  await audioPlayer.refreshCache();
  audioPlayer.playRandom();
  const songBefore = audioPlayer.getCurrent()!.id;

  audioPlayer.pause();
  expect(audioStub.paused).toBe(true);
  expect(audioPlayer.getCurrent()!.id).toBe(songBefore);

  audioPlayer.resume();
  expect(audioStub.paused).toBe(false);
  expect(audioPlayer.getCurrent()!.id).toBe(songBefore);
});

test('playIfReady() waits for the cache before playing (boot race)', async () => {
  // ponytail: at boot, refreshCache is async. Calling playRandom()
  // before the cache is populated logs "empty playlist" and leaves
  // getCurrent() = null, so the FAB never renders. playIfReady()
  // awaits the cache, then plays — which is what App.tsx mount calls.
  setFetchJson([
    { id: 'p', title: 'P', artist: '', filePath: '/uploads/p.mp3' },
    { id: 'q', title: 'Q', artist: '', filePath: '/uploads/q.mp3' }
  ]);
  const { audioPlayer } = await import('../src/utils/audioPlayer');
  // Do NOT call refreshCache first. Simulate the boot race where
  // App.tsx fires playIfReady() in parallel with the cache load.
  const promise = audioPlayer.playIfReady();
  // refreshCache runs after — it should resolve playIfReady's wait.
  await audioPlayer.refreshCache();
  await promise;
  expect(audioPlayer.getCurrent()).not.toBeNull();
  // We expect the cache-ready Promise to be settled (no further logs).
  expect(audioStub.src).not.toBe('');
});

test('playIfReady() plays immediately when the cache is already warm', async () => {
  // ponytail: after the boot sequence runs once, subsequent calls
  // (e.g. the first user gesture retry) should not block — they
  // play right away using the cached songs list.
  setFetchJson([
    { id: 'w', title: 'W', artist: '', filePath: '/uploads/w.mp3' }
  ]);
  const { audioPlayer } = await import('../src/utils/audioPlayer');
  await audioPlayer.refreshCache();
  await audioPlayer.playIfReady();
  expect(audioPlayer.getCurrent()!.id).toBe('w');
});

test('does not leak the stubbed fetch into the next test file', () => {
  // ponytail: the previous test stubbed `fetch` via setFetchJson. If it is
  // not restored, tests/content-overrides.test.ts never reaches its server.
  expect(globalThis.fetch).toBe(realFetch);
});
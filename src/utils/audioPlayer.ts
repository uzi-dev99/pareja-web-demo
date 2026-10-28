/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Module-level singleton that owns one HTMLAudioElement and the in-memory
 * song cache. Plays a random uploaded song when Sam opens the letter, loops
 * on 'ended', and exposes `next()` for the `next` keyboard secret command.
 *
 * ponytail: no React state, no Context/Provider. Matches the audioEngine
 * pattern in audioSynth.ts. The `MusicLibraryModal` preview uses a SEPARATE
 * inline `<audio>` so it doesn't disturb the singleton's auto-loop.
 *
 * Autoplay race: refreshCache() is async, so the cache can still be
 * empty when callers first hit playRandom(). `playIfReady()` waits for
 * the cache to populate and then plays — callers should use it instead
 * of playRandom() at boot.
 */

import type { Song } from '../types';

class AudioPlayer {
  private audio: HTMLAudioElement;
  private songs: Song[] = [];
  private current: Song | null = null;
  // ponytail: a Promise that resolves the first time refreshCache
  // populates the cache. Callers use playIfReady() to wait for it
  // without having to coordinate the refresh themselves.
  private cacheReadyPromise: Promise<void> | null = null;
  private cacheReadyResolve: (() => void) | null = null;

  constructor() {
    // ponytail: HTMLAudioElement is an abstract interface in modern browsers —
    // `new HTMLAudioElement()` throws "Illegal constructor". Use the factory.
    this.audio = document.createElement('audio');
    this.audio.preload = 'none';
    this.audio.addEventListener('ended', () => {
      // ponytail: auto-loop by picking another random song on natural end.
      this.playRandom();
    });
    this.audio.addEventListener('error', () => {
      console.warn('[audioPlayer] audio error:', this.audio.error);
    });
  }

  private ensureCacheReadyPromise(): Promise<void> {
    if (!this.cacheReadyPromise) {
      this.cacheReadyPromise = new Promise<void>((resolve) => {
        this.cacheReadyResolve = resolve;
      });
    }
    return this.cacheReadyPromise;
  }

  async refreshCache(): Promise<void> {
    try {
      const res = await fetch('/api/songs');
      if (!res.ok) throw new Error(`GET ${res.status}`);
      this.songs = (await res.json()) as Song[];
    } catch (e) {
      console.warn('[audioPlayer] refreshCache failed:', e);
    }
    // Resolve the gate so any pending playIfReady() proceeds.
    if (this.cacheReadyResolve) {
      this.cacheReadyResolve();
      this.cacheReadyResolve = null;
    }
  }

  getCurrent(): Song | null {
    return this.current;
  }

  pause(): void {
    this.audio.pause();
  }

  // ponytail: symmetrical to pause(). Called by the FAB toggle when
  // the user resumes after pausing. Mirrors the catch() used by
  // loadAndPlay() — autoplay policies reject unattended .play() calls.
  resume(): void {
    this.audio.play().catch((e) => console.warn('[audioPlayer] resume() rejected:', e));
  }

  playRandom(): void {
    if (this.songs.length === 0) {
      console.warn('[audioPlayer] empty playlist');
      return;
    }
    const idx = Math.floor(Math.random() * this.songs.length);
    this.loadAndPlay(this.songs[idx]);
  }

  next(): void {
    this.playRandom();
  }

  // ponytail: callers that want to autoplay at boot should use this
  // instead of playRandom() — it waits for the cache to populate so
  // we do not log "empty playlist" when refreshCache is still in flight.
  async playIfReady(): Promise<void> {
    if (this.songs.length === 0) {
      await this.ensureCacheReadyPromise();
    }
    this.playRandom();
  }

  private loadAndPlay(song: Song): void {
    this.current = song;
    this.audio.src = song.filePath;
    this.audio.play().catch((e) => console.warn('[audioPlayer] play() rejected:', e));
  }
}

export const audioPlayer = new AudioPlayer();
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * CRUD hook for the global song playlist.
 * Mirrors usePhotos but without a `bucket` parameter — there is one
 * global song list, sorted by created_at ASC.
 *
 * ponytail: reuses usePhotos' EDIT_TOKEN flow verbatim; one XHR per file
 * to dodge Cloudflare's free-tier per-request timeout on big uploads.
 * After every successful mutation, calls audioPlayer.refreshCache() so
 * the singleton stays in sync.
 */

import { useCallback, useEffect, useState } from 'react';
import { Song } from '../types';
import { audioPlayer } from '../utils/audioPlayer';

const TOKEN_STORAGE_KEY = 'pareja_edit_token';
const API_BASE = '/api/songs';

function getStoredToken(): string | null {
  try { return localStorage.getItem(TOKEN_STORAGE_KEY); } catch { return null; }
}

function setStoredToken(t: string): void {
  try { localStorage.setItem(TOKEN_STORAGE_KEY, t); } catch { /* ignore */ }
}

function authHeaders(): Record<string, string> {
  const t = getStoredToken();
  return t ? { 'X-Edit-Token': t } : {};
}

async function ensureToken(): Promise<string> {
  const existing = getStoredToken();
  if (existing) return existing;
  const t = window.prompt(
    'Pegá tu EDIT_TOKEN del archivo .env del servidor. Se guarda localmente para no preguntarte más.'
  );
  if (!t || !t.trim()) throw new Error('EDIT_TOKEN requerido para guardar cambios.');
  setStoredToken(t.trim());
  return t.trim();
}

export function usePlaylist() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error(`GET ${res.status}`);
      const list = (await res.json()) as Song[];
      setSongs(list);
      audioPlayer.refreshCache();
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addSongs = useCallback(
    async (files: File[], opts: { onProgress?: (pct: number) => void } = {}): Promise<Song[]> => {
      await ensureToken();
      if (files.length === 0) return [];
      const totalBytes = files.reduce((s, f) => s + f.size, 0);
      let uploadedBytes = 0;
      const sendOne = (file: File): Promise<{ ok: boolean; status: number; body: string }> =>
        new Promise((resolve, reject) => {
          const form = new FormData();
          form.append('files', file);
          const xhr = new XMLHttpRequest();
          xhr.open('POST', API_BASE);
          xhr.setRequestHeader('X-Edit-Token', getStoredToken() ?? '');
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && opts.onProgress && totalBytes > 0) {
              const overall = uploadedBytes + e.loaded;
              opts.onProgress(Math.min(99, Math.round((overall / totalBytes) * 100)));
            }
          };
          xhr.onload = () =>
            resolve({
              ok: xhr.status >= 200 && xhr.status < 300,
              status: xhr.status,
              body: xhr.responseText
            });
          xhr.onerror = () => reject(new Error('network error'));
          xhr.onabort = () => reject(new Error('upload aborted'));
          xhr.send(form);
        });
      const created: Song[] = [];
      for (const file of files) {
        let result = await sendOne(file);
        if (result.status === 401) {
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          await ensureToken();
          result = await sendOne(file);
        }
        if (!result.ok) throw new Error(`POST ${result.status}`);
        created.push(...(JSON.parse(result.body) as Song[]));
        uploadedBytes += file.size;
        opts.onProgress?.(Math.round((uploadedBytes / totalBytes) * 100));
      }
      await refresh();
      return created;
    },
    [refresh]
  );

  const updateSong = useCallback(
    async (id: string, patch: Partial<Pick<Song, 'title' | 'artist'>>): Promise<Song> => {
      await ensureToken();
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(patch)
      });
      if (!res.ok) throw new Error(`PUT ${res.status}`);
      const updated = (await res.json()) as Song;
      await refresh();
      return updated;
    },
    [refresh]
  );

  const deleteSong = useCallback(
    async (id: string): Promise<void> => {
      await ensureToken();
      const res = await fetch(`${API_BASE}/${id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error(`DELETE ${res.status}`);
      await refresh();
    },
    [refresh]
  );

  const deleteAll = useCallback(async (): Promise<number> => {
    // ponytail: no bulk endpoint yet — loop deleteSong. The list is small
    // (love-letter site, max dozens of songs); no need for a separate route.
    const all = songs.slice();
    for (const s of all) await deleteSong(s.id);
    return all.length;
  }, [songs, deleteSong]);

  return { songs, loading, error, refresh, addSongs, updateSong, deleteSong, deleteAll };
}
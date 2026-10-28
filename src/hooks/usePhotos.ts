/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Single hook for photo CRUD. Parametrized by bucket, optional eventId for carousel.
 *
 * ponytail: 1 hook, not 3. Reuses the existing Photo type — no parallel types.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Photo } from '../types';
import { compressImage } from '../utils/compressImage';

export type PhotoBucket = 'public' | 'secret' | 'carousel';

export interface UsePhotosOptions {
  eventId?: string; // required when bucket === 'carousel'
}

interface State {
  photos: Photo[];
  loading: boolean;
  error: string | null;
}

const TOKEN_STORAGE_KEY = 'pareja_edit_token';
const API_BASE = '/api/photos';

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(t: string): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, t);
  } catch {
    /* ignore */
  }
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

// ponytail: compress before upload — the phone must not upload an 8 MB
// original over a metered connection. This lives in addPhotos (not in the
// usePhotoUpload hook) because the secret collage calls addPhotos directly.
// ponytail: SEQUENTIAL, not Promise.all: decoding ten 12 MP photos in
// parallel keeps ten bitmaps alive (~48 MB each, ~500 MB) and the mobile
// tab gets killed before the upload starts.
export async function prepareFiles(files: File[]): Promise<File[]> {
  const out: File[] = [];
  for (const f of files) out.push(await compressImage(f));
  return out;
}

export function usePhotos(bucket: PhotoBucket, opts: UsePhotosOptions = {}) {
  const [state, setState] = useState<State>({ photos: [], loading: true, error: null });
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const refresh = useCallback(async () => {
    const params = new URLSearchParams({ bucket });
    if (optsRef.current.eventId) params.set('eventId', optsRef.current.eventId);
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetch(`${API_BASE}?${params}`);
      if (!res.ok) throw new Error(`GET ${res.status}`);
      const photos = (await res.json()) as Photo[];
      setState({ photos, loading: false, error: null });
    } catch (e) {
      setState({ photos: [], loading: false, error: String(e) });
    }
  }, [bucket]);

  useEffect(() => {
    refresh();
  }, [refresh, opts.eventId]);

  const addPhotos = useCallback(
    async (files: File[], opts: { onProgress?: (pct: number) => void } = {}): Promise<Photo[]> => {
      // ponytail: el bucket `public` es la galería abierta a cualquier
      // visitante — no debe pedir EDIT_TOKEN ni enviar el header. Los
      // buckets protegidos (`secret`, `carousel`) sí lo exigen.
      if (bucket !== 'public') {
        await ensureToken();
      }
      if (files.length === 0) return [];

      // ponytail: compress BEFORE totalBytes so the progress bar measures the
      // bytes that actually travel.
      const prepared = await prepareFiles(files);

      // ponytail: one XHR per file, never a single multi-file POST.
      // Cloudflare's free proxy timeout (524) is per-request, so a 150MB bulk
      // POST blows past it; ten 15MB POSTs are fine. We also keep XHR (not fetch)
      // so onprogress can drive the progress bar across all files.
      const totalBytes = prepared.reduce((s, f) => s + f.size, 0);
      let uploadedBytes = 0;

      const sendOne = (file: File): Promise<{ ok: boolean; status: number; body: string }> =>
        new Promise((resolve, reject) => {
          const form = new FormData();
          form.set('bucket', bucket);
          if (optsRef.current.eventId) form.set('eventId', optsRef.current.eventId);
          form.append('files', file);

          const xhr = new XMLHttpRequest();
          xhr.open('POST', API_BASE);
          // ponytail: solo los buckets protegidos llevan token. Public
          // sube sin auth (ver addPhotos y server/index.ts).
          if (bucket !== 'public') {
            xhr.setRequestHeader('X-Edit-Token', getStoredToken() ?? '');
          }
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && opts.onProgress && totalBytes > 0) {
              const overall = uploadedBytes + e.loaded;
              opts.onProgress(Math.min(99, Math.round((overall / totalBytes) * 100)));
            }
          };
          xhr.onload = () => resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, body: xhr.responseText });
          xhr.onerror = () => reject(new Error('network error'));
          xhr.onabort = () => reject(new Error('upload aborted'));
          xhr.send(form);
        });

      const created: Photo[] = [];
      for (const file of prepared) {
        let result = await sendOne(file);
        if (result.status === 401 && bucket !== 'public') {
          // ponytail: token might have changed server-side; clear and retry once.
          // Skipped for public: that bucket never returns 401, and retrying
          // would call ensureToken() which prompts the user — not what we want
          // for an open upload flow.
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          await ensureToken();
          result = await sendOne(file);
        }
        if (!result.ok) throw new Error(`POST ${result.status}`);
        created.push(...(JSON.parse(result.body) as Photo[]));
        uploadedBytes += file.size;
        // ponytail: clamp to 99 mid-flight; jump to 100 only after all files committed.
        opts.onProgress?.(Math.round((uploadedBytes / totalBytes) * 100));
      }

      await refresh();
      return created;
    },
    [bucket, refresh]
  );

  const updatePhoto = useCallback(
    async (id: string, patch: Partial<Photo>): Promise<Photo> => {
      await ensureToken();
      const body: Record<string, unknown> = {};
      for (const k of ['caption', 'month', 'year', 'dateStr', 'location', 'tags'] as const) {
        if (patch[k] !== undefined) body[k === 'dateStr' ? 'date_str' : k] = patch[k];
      }
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`PUT ${res.status}`);
      const updated = (await res.json()) as Photo;
      await refresh();
      return updated;
    },
    [refresh]
  );

  const deletePhoto = useCallback(
    async (id: string): Promise<void> => {
      await ensureToken();
      const res = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
      });
      if (!res.ok) throw new Error(`DELETE ${res.status}`);
      await refresh();
    },
    [refresh]
  );

  const deleteAll = useCallback(async (): Promise<number> => {
    await ensureToken();
    const res = await fetch(`${API_BASE}?bucket=${bucket}`, {
      method: 'DELETE',
      headers: authHeaders()
    });
    if (!res.ok) throw new Error(`DELETE ${res.status}`);
    const body = (await res.json()) as { deleted: number };
    await refresh();
    return body.deleted;
  }, [bucket, refresh]);

  return { ...state, refresh, addPhotos, updatePhoto, deletePhoto, deleteAll };
}

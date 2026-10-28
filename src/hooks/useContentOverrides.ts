/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Hook for the edit-mode click-to-edit feature.
 * Fetches text overrides from /api/content?scope=<scope> on mount and exposes
 * a `setOverride(key, value)` that PUTs and updates local state optimistically.
 *
 * ponytail: one fetch per scope, shared across all consumers via a tiny
 * module-level store + useSyncExternalStore. N EditableText instances on the
 * page do NOT trigger N requests — they all subscribe to the same snapshot.
 *
 * ponytail: same auth-flow pattern as usePhotos (X-Edit-Token in localStorage,
 * prompt once, retry on 401). One hook for all scopes, parameterized by string.
 */

import { useCallback, useEffect, useSyncExternalStore } from 'react';

const TOKEN_STORAGE_KEY = 'pareja_edit_token';

// ── tiny per-scope store ────────────────────────────────────────────────────
interface ScopeState {
  map: Record<string, string>;
  loaded: boolean;
  loading: boolean;
  error: string | null;
}

const EMPTY: ScopeState = { map: {}, loaded: false, loading: false, error: null };
const stores = new Map<string, ScopeState>();
const listeners = new Map<string, Set<() => void>>();

function getStore(scope: string): ScopeState {
  let s = stores.get(scope);
  if (!s) {
    s = { ...EMPTY };
    stores.set(scope, s);
  }
  return s;
}

function subscribe(scope: string, cb: () => void): () => void {
  let set = listeners.get(scope);
  if (!set) {
    set = new Set();
    listeners.set(scope, set);
  }
  set.add(cb);
  return () => {
    set!.delete(cb);
  };
}

function emit(scope: string): void {
  const set = listeners.get(scope);
  if (!set) return;
  for (const cb of set) cb();
}

function patchStore(scope: string, patch: Partial<ScopeState>): void {
  // ponytail: replace the store with a NEW object — never mutate in place.
  // useSyncExternalStore compares the snapshot via Object.is, so an in-place
  // Object.assign silently swallows the update and the carta stays on the
  // default text after a reload until something else forces a re-render
  // (e.g. toggling global edit mode).
  const s = getStore(scope);
  stores.set(scope, { ...s, ...patch });
  emit(scope);
}

async function loadScope(scope: string): Promise<void> {
  const s = getStore(scope);
  if (s.loading) return; // dedupe in-flight
  patchStore(scope, { loading: true, error: null });
  // ponytail: hydrate from localStorage FIRST so an edit made right before a
  // reload is visible on next mount (F5-before-PUT-completes race fix). The
  // store gets the merged map immediately; the API fetch refines it below.
  const pending = readPending(scope);
  if (Object.keys(pending).length > 0) {
    patchStore(scope, { map: mergeMapsWithLocalPending(s.map, pending) });
  }
  try {
    const res = await fetch(`/api/content?scope=${encodeURIComponent(scope)}`);
    if (!res.ok) throw new Error(`GET ${res.status}`);
    const apiMap = ((await res.json()) as Record<string, string>) ?? {};
    patchStore(scope, {
      map: mergeMapsWithLocalPending(apiMap, readPending(scope)),
      loaded: true,
      loading: false,
      error: null
    });
  } catch (e) {
    patchStore(scope, {
      map: readPending(scope),
      loaded: true,
      loading: false,
      error: String(e)
    });
  }
}

// ── token helpers (same shape as usePhotos) ────────────────────────────────
function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

// ponytail: F5 safety net — write the new value to localStorage SYNCHRONOUSLY
// before the PUT starts. If the page reloads while the PUT is still in flight
// (or the server returns an error), the edit survives because localStorage
// is the first source we hydrate from on every mount. Cleared once the PUT
// (or DELETE) actually confirms the value on the server.
const PENDING_KEY_PREFIX = 'pareja_pending_content_';
function readPending(scope: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(PENDING_KEY_PREFIX + scope);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}
function writePending(scope: string, id: string, value: string): void {
  try {
    const next = { ...readPending(scope), [id]: value };
    localStorage.setItem(PENDING_KEY_PREFIX + scope, JSON.stringify(next));
  } catch {
    /* quota or storage disabled — best effort */
  }
}
function clearPending(scope: string, id: string): void {
  try {
    const cur = readPending(scope);
    if (!(id in cur)) return;
    const next = { ...cur };
    delete next[id];
    localStorage.setItem(PENDING_KEY_PREFIX + scope, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

/**
 * Pure helper: merge pending localStorage values on top of API overrides.
 * Pending wins because it represents the most recent user intent that may
 * not have reached the server yet (F5-before-PUT-completes).
 *
 * ponytail: exported for unit tests; kept trivial so the dependency surface
 * of the hook stays minimal.
 */
export function mergeMapsWithLocalPending(
  api: Record<string, string>,
  pending: Record<string, string>
): Record<string, string> {
  return { ...api, ...pending };
}

/**
 * Read the server's `{ "error": "..." }` field from a non-OK response.
 * Falls back to statusText, then to `HTTP <status>` when the body isn't
 * JSON or has no `error` key. Pure + exported for tests.
 *
 * ponytail: one helper, one shape. Anything beyond `{error: string}` is
 * noise the user doesn't need to see.
 */
export async function readErrorFromResponse(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: unknown };
    if (body && typeof body.error === 'string') return body.error;
  } catch {
    /* body wasn't JSON or fetch threw — fall through */
  }
  return res.statusText || `HTTP ${res.status}`;
}

function setStoredToken(t: string): void {
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, t);
  } catch {
    /* ignore */
  }
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

// ── public hook ────────────────────────────────────────────────────────────
export function useContentOverrides(scope: string) {
  const subscribeToScope = useCallback(
    (cb: () => void) => subscribe(scope, cb),
    [scope]
  );
  const getSnapshot = useCallback(() => getStore(scope), [scope]);
  const state = useSyncExternalStore(subscribeToScope, getSnapshot, getSnapshot);

  // ponytail: trigger the single fetch on first subscriber; no-op thereafter
  // because the store guards on `loading`/`loaded`.
  useEffect(() => {
    loadScope(scope);
  }, [scope]);

  const setOverride = useCallback(
    async (key: string, value: string): Promise<void> => {
      // ponytail: persist to localStorage SYNCHRONOUSLY before the PUT. This is
      // the F5 safety net — even if the page is reloaded mid-fetch, the new
      // value survives because localStorage is read synchronously on mount.
      writePending(scope, key, value);
      // Also push optimistically into the store so the editable closes and the
      // new value renders immediately, no waiting for the server round-trip.
      const s = getStore(scope);
      patchStore(scope, { map: { ...s.map, [key]: value } });

      await ensureToken();
      const url = `/api/content/${encodeURIComponent(scope)}/${encodeURIComponent(key)}`;
      const doPut = () =>
        fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Edit-Token': getStoredToken() ?? ''
          },
          body: JSON.stringify({ value })
        });
      let res = await doPut();
      if (res.status === 401) {
        // ponytail: token may have rotated server-side; clear and retry once.
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        await ensureToken();
        res = await doPut();
      }
      if (!res.ok) {
        // ponytail: leave pending in localStorage so the value survives F5 even
        // on failure. Surface the error to EditableText so it can show the
        // message without dropping the optimistic state.
        throw new Error(`PUT ${res.status}: ${await readErrorFromResponse(res)}`);
      }
      // ponytail: PUT confirmed — clear the pending marker so future loads
      // read straight from the API without a localStorage detour.
      clearPending(scope, key);
    },
    [scope]
  );

  const revertOverride = useCallback(
    async (key: string): Promise<void> => {
      await ensureToken();
      const url = `/api/content/${encodeURIComponent(scope)}/${encodeURIComponent(key)}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { 'X-Edit-Token': getStoredToken() ?? '' }
      });
      if (!res.ok) throw new Error(`DELETE ${res.status}`);
      clearPending(scope, key); // ponytail: also drop the local backup.
      const s = getStore(scope);
      const next = { ...s.map };
      delete next[key];
      patchStore(scope, { map: next });
    },
    [scope]
  );

  const refresh = useCallback(async () => {
    patchStore(scope, { loaded: false });
    await loadScope(scope);
  }, [scope]);

  return {
    overrides: state.map,
    loading: state.loading,
    error: state.error,
    refresh,
    setOverride,
    revertOverride
  };
}

// ponytail: exported only for unit tests. Production code must not import
// these — they are the internal store plumbing, not a public API.
export const __test_patchStore = patchStore;
export const __test_getStore = getStore;

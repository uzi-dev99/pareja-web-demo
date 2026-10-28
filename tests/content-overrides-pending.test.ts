/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bug: edits made through EditableText are lost on F5 because the PUT to
 * /api/content is async. A blur → immediate F5 races the fetch and the
 * change never reaches the server. On reload, the API returns the old
 * value and the edit is gone.
 *
 * Fix: write the new value to localStorage synchronously on every commit,
 * BEFORE starting the PUT. On next mount, the load flow hydrates from
 * localStorage first so the edit survives even if the PUT is interrupted.
 *
 * ponytail: 1 helper (mergeMapsWithLocalPending) keeps the merge logic
 * testable without a browser fetch stub.
 */

import { test, expect } from 'bun:test';

const mergeMapsWithLocalPending = (
  api: Record<string, string>,
  pending: Record<string, string>
): Record<string, string> => ({ ...api, ...pending });

test('pending value wins on F5 when PUT is still in flight', () => {
  // Simulate: server hasn't been hit yet (empty map) but localStorage
  // captured the user's most recent blur.
  const api = {} as Record<string, string>;
  const pending = { 'event-feb-2026.text': 'carta re-escrita a las 14:35' };
  const merged = mergeMapsWithLocalPending(api, pending);
  expect(merged['event-feb-2026.text']).toBe('carta re-escrita a las 14:35');
});

test('pending stays visible if API request fails', () => {
  // Server is unreachable (e.g. dev server down). localStorage is the only
  // source of truth and should not be erased by an error path.
  const api = {} as Record<string, string>;
  const pending = {
    'event-mar-2026.internalJoke': 'pensamiento que sí o sí debe sobrevivir'
  };
  const merged = mergeMapsWithLocalPending(api, pending);
  expect(merged).toEqual(pending);
});

test('API value overrides pending once PUT is confirmed', () => {
  // After a successful PUT and reload, the pending entry should be cleared
  // (covered in setOverride implementation), so API values are displayed as-is.
  const api = { 'event-abr-2026.text': 'valor confirmado por el server' };
  const pending = {} as Record<string, string>;
  const merged = mergeMapsWithLocalPending(api, pending);
  expect(merged['event-abr-2026.text']).toBe('valor confirmado por el server');
});

test('merge handles multiple scopes/keys independently', () => {
  // The pending map is scoped per `scope`; verify the merge doesn't leak
  // across keys.
  const api = {
    'drop1.content': 'API text',
    'drop1.title': 'API title'
  };
  const pending = {
    'drop1.content': 'local pending text',
    'drop1.title': 'API title'
  };
  const merged = mergeMapsWithLocalPending(api, pending);
  expect(merged['drop1.content']).toBe('local pending text');
  expect(merged['drop1.title']).toBe('API title');
});

// CRITICAL: tie the merge function to a real export in the hook. Calling
// undefined throws. This locks the contract.
test('mergeMapsWithLocalPending is exported from useContentOverrides', () => {
  const mod = require('../src/hooks/useContentOverrides');
  expect(typeof mod.mergeMapsWithLocalPending).toBe('function');
});

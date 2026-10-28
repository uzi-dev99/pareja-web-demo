/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Regression: after F5 reload the carta shows the DEFAULT text. Enabling
 * edit mode "reveals" the saved text. The real bug is NOT the modal id —
 * it's in the override store plumbing.
 *
 * Why the bug is invisible until edit mode is toggled:
 *   1. Page mounts. SecretLetter renders the envelope; EditableText is NOT
 *      mounted yet, so no one has called useContentOverrides('letter').
 *   2. User clicks the wax seal. EditableText mounts with an empty store.
 *      value = overrides[id] ?? defaultValue → DEFAULT text rendered.
 *   3. useEffect kicks off loadScope() → fetch /api/content?scope=letter.
 *   4. Fetch resolves. patchStore mutates the store object IN PLACE via
 *      Object.assign. The store REFERENCE does not change, so
 *      useSyncExternalStore's Object.is snapshot check says "nothing
 *      changed" and DOES NOT schedule a re-render.
 *   5. The EditableText keeps showing DEFAULT until some other prop change
 *      forces a re-render (e.g. toggling global edit mode re-renders
 *      SecretLetter, which re-runs useSyncExternalStore, which finally
 *      reads the up-to-date map).
 *
 * Fix contract: patchStore must replace the store with a NEW object so
 * useSyncExternalStore sees the snapshot change and re-renders.
 *
 * ponytail: source-level test against the internal store plumbing. We
 * import the test-only handles (see __test_patchStore / __test_getStore in
 * useContentOverrides.ts) and assert the snapshot identity changes after a
 * patch — which is the exact signal useSyncExternalStore keys on.
 */

import { test, expect } from 'bun:test';
import {
  __test_getStore,
  __test_patchStore
} from '../src/hooks/useContentOverrides';

const SCOPE = `__carta-bug-test-${Math.random()}`;

test('patchStore replaces the store with a new reference (not in-place mutation)', () => {
  // ponytail: prime the store with the initial empty snapshot.
  const initial = __test_getStore(SCOPE);
  const beforeRef = initial;

  __test_patchStore(SCOPE, { loading: true });

  const after = __test_getStore(SCOPE);
  // ponytail: this is the load-bearing assertion. If after === beforeRef,
  // useSyncExternalStore will silently swallow the update and the carta
  // will stay on its default text forever.
  expect(after).not.toBe(beforeRef);
});

test('patchStore preserves previously-set state across replacements', () => {
  // ponytail: the new store must carry over existing fields — only the keys
  // in the patch should change. Otherwise replacing the reference would
  // accidentally reset loading/error/loaded flags mid-fetch.
  __test_patchStore(SCOPE, { loading: true, error: null });
  __test_patchStore(SCOPE, { map: { foo: 'bar' } });

  const final = __test_getStore(SCOPE);
  expect(final.map).toEqual({ foo: 'bar' });
  // ponytail: the first patch set loading=true and cleared error. The second
  // patch doesn't touch them, so they must survive — otherwise resetting
  // loading mid-fetch would break the dedupe guard.
  expect(final.loading).toBe(true);
  expect(final.error).toBeNull();
});
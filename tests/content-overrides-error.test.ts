/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bug: when the server returns 500 with a JSON body `{ "error": "..." }`,
 * the client-side `setOverride` only surfaces "PUT 500" — the actionable
 * server message is lost and the user has no clue what's wrong.
 *
 * This test asserts that the client reads `body.error` from non-OK
 * responses and includes it in the thrown Error.
 *
 * ponytail: extract the read-error helper as a standalone function so it
 * can be tested without React, and so setOverride becomes a one-liner.
 */

import { test, expect } from 'bun:test';

test('readErrorFromResponse surfaces the server JSON error field', async () => {
  const { readErrorFromResponse } = require('../src/hooks/useContentOverrides');
  const r = new Response(
    JSON.stringify({ error: 'server has no EDIT_TOKEN configured' }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
  const msg = await readErrorFromResponse(r);
  expect(msg).toBe('server has no EDIT_TOKEN configured');
});

test('readErrorFromResponse falls back to statusText when body is not JSON', async () => {
  const { readErrorFromResponse } = require('../src/hooks/useContentOverrides');
  const r = new Response('plain text error', { status: 500 });
  const msg = await readErrorFromResponse(r);
  // ponytail: statusText is empty for custom 500, so we should fall back to "HTTP 500"
  expect(msg).toBe('HTTP 500');
});

test('readErrorFromResponse tolerates a JSON body with no error field', async () => {
  const { readErrorFromResponse } = require('../src/hooks/useContentOverrides');
  const r = new Response(JSON.stringify({ message: 'something else' }), {
    status: 502,
    headers: { 'Content-Type': 'application/json' }
  });
  const msg = await readErrorFromResponse(r);
  expect(msg).toBe('HTTP 502');
});

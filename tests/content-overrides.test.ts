/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke test for the click-to-edit feature: spawns the server with a temp DB,
 * exercises GET/PUT/DELETE on /api/content, asserts the values round-trip.
 * Also asserts that PUT without a token is rejected with 401.
 *
 * ponytail: one assert-heavy smoke file, no fixtures. Runs with `bun test`.
 */

import { test, expect, beforeAll, afterAll } from 'bun:test';
import { spawn, type Subprocess } from 'bun';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const EDIT_TOKEN = 'smoke-test-token-1234567890';
const PORT = 3199; // ponytail: avoid colliding with dev server on 3001
const BASE = `http://127.0.0.1:${PORT}`;

let server: Subprocess;
let tmpDir: string;

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), 'pareja-smoke-'));
  server = spawn({
    cmd: ['bun', 'run', 'server/index.ts'],
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(PORT),
      EDIT_TOKEN,
      DB_PATH: join(tmpDir, 'app.db'),
      UPLOAD_DIR: join(tmpDir, 'uploads')
    },
    stdout: 'pipe',
    stderr: 'pipe'
  });

  // ponytail: wait for /api/health to come up instead of a fixed sleep.
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error('server did not start within 15s');
  // ponytail: bun:test cuts hooks at 5000ms by default — the boot of the real
  // server takes ~4.5s on a slow disk (the seed inserts 24 rows one commit
  // each), so the hook needs its own timeout or it dies before the deadline.
}, 15000);

afterAll(() => {
  server?.kill();
  if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
});

test('GET /api/content returns empty object for unknown scope', async () => {
  // ponytail: use a fresh scope name so parallel test runs don't pollute the
  // assertion — bun:test runs tests in the same file concurrently by default.
  const r = await fetch(`${BASE}/api/content?scope=smoke-empty-${Date.now()}`);
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual({});
});

test('GET /api/content rejects missing scope', async () => {
  const r = await fetch(`${BASE}/api/content`);
  expect(r.status).toBe(400);
});

test('PUT /api/content without token is 401', async () => {
  const r = await fetch(`${BASE}/api/content/timeline/feb-2026.text`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: 'should not stick' })
  });
  expect(r.status).toBe(401);
});

test('PUT then GET round-trips the override value', async () => {
  const key = 'feb-2026.text';
  const value = 'Cuatro horas editadas que se sintieron como cinco minutos.';
  const put = await fetch(`${BASE}/api/content/timeline/${key}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Edit-Token': EDIT_TOKEN
    },
    body: JSON.stringify({ value })
  });
  expect(put.status).toBe(200);
  const saved = (await put.json()) as { value: string; updated_at: number };
  expect(saved.value).toBe(value);
  expect(typeof saved.updated_at).toBe('number');

  const get = await fetch(`${BASE}/api/content?scope=timeline`);
  const map = (await get.json()) as Record<string, string>;
  expect(map[key]).toBe(value);
});

test('PUT is upsert (second PUT replaces, not duplicates)', async () => {
  const key = 'feb-2026.text';
  await fetch(`${BASE}/api/content/timeline/${key}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Edit-Token': EDIT_TOKEN
    },
    body: JSON.stringify({ value: 'v2' })
  });
  const map = (await (
    await fetch(`${BASE}/api/content?scope=timeline`)
  ).json()) as Record<string, string>;
  expect(map[key]).toBe('v2');
});

test('DELETE removes the override', async () => {
  const key = 'feb-2026.subtitle';
  await fetch(`${BASE}/api/content/timeline/${key}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Edit-Token': EDIT_TOKEN
    },
    body: JSON.stringify({ value: 'sub' })
  });
  const del = await fetch(`${BASE}/api/content/timeline/${key}`, {
    method: 'DELETE',
    headers: { 'X-Edit-Token': EDIT_TOKEN }
  });
  expect(del.status).toBe(200);
  const map = (await (
    await fetch(`${BASE}/api/content?scope=timeline`)
  ).json()) as Record<string, string>;
  expect(map[key]).toBeUndefined();
});

test('PUT rejects non-string value', async () => {
  const r = await fetch(`${BASE}/api/content/timeline/bad`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Edit-Token': EDIT_TOKEN
    },
    body: JSON.stringify({ value: 123 })
  });
  expect(r.status).toBe(400);
});

test('PUT rejects oversized value (>16 KiB)', async () => {
  const huge = 'x'.repeat(17 * 1024);
  const r = await fetch(`${BASE}/api/content/timeline/big`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Edit-Token': EDIT_TOKEN
    },
    body: JSON.stringify({ value: huge })
  });
  expect(r.status).toBe(400);
});

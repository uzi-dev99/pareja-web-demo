/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke test for /api/songs CRUD: spawns the server with a temp DB,
 * exercises GET/POST/PUT/DELETE, asserts the values round-trip.
 * Also asserts that POST/PUT/DELETE without a token is rejected with 401.
 *
 * ponytail: one assert-heavy smoke file, no fixtures. Runs with `bun test`.
 */

import { test, expect, beforeAll, afterAll } from 'bun:test';
import { spawn, type Subprocess } from 'bun';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const EDIT_TOKEN = 'songs-smoke-token-xyz';
const PORT = 3299;
const BASE = `http://127.0.0.1:${PORT}`;

let server: Subprocess;
let tmpDir: string;

beforeAll(async () => {
  tmpDir = mkdtempSync(join(tmpdir(), 'pareja-songs-'));
  // ponytail: pre-create one fake mp3 file in /tmp so the POST has real bytes
  // to upload without depending on any sample asset in the repo.
  const fakeMp3Path = join(tmpDir, 'sample.mp3');
  writeFileSync(fakeMp3Path, Buffer.from([0xff, 0xfb, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00]));

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

afterAll(async () => {
  server?.kill();
  // ponytail: Windows holds the .db lock until the spawned process actually
  // exits. Give it a beat, then swallow EBUSY if cleanup races exit.
  await new Promise((r) => setTimeout(r, 100));
  if (tmpDir) {
    try { rmSync(tmpDir, { recursive: true, force: true }); }
    catch { /* Windows tmp-leak; let the OS collect it later */ }
  }
});

test('GET /api/songs returns [] when empty', async () => {
  const r = await fetch(`${BASE}/api/songs`);
  expect(r.status).toBe(200);
  expect(await r.json()).toEqual([]);
});

test('POST /api/songs without token is 401', async () => {
  const form = new FormData();
  const blob = new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/mpeg' });
  form.append('files', blob, 'test.mp3');
  const r = await fetch(`${BASE}/api/songs`, { method: 'POST', body: form });
  expect(r.status).toBe(401);
});

test('POST /api/songs with token uploads a song and GET shows it', async () => {
  const form = new FormData();
  const blob = new Blob([new Uint8Array([0xff, 0xfb, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01])], { type: 'audio/mpeg' });
  form.append('files', blob, 'yellow-acoustic.mp3');
  const post = await fetch(`${BASE}/api/songs`, {
    method: 'POST',
    headers: { 'X-Edit-Token': EDIT_TOKEN },
    body: form
  });
  expect(post.status).toBe(200);
  const created = (await post.json()) as Array<{ id: string; title: string; filePath: string }>;
  expect(created.length).toBe(1);
  expect(created[0].title).toBe('yellow-acoustic');
  expect(created[0].filePath.startsWith('/uploads/')).toBe(true);

  const get = await fetch(`${BASE}/api/songs`);
  const list = (await get.json()) as Array<{ id: string }>;
  expect(list.length).toBe(1);
  expect(list[0].id).toBe(created[0].id);
});

test('PUT /api/songs/:id updates title and artist', async () => {
  const list = (await (await fetch(`${BASE}/api/songs`)).json()) as Array<{ id: string }>;
  const id = list[0].id;
  const put = await fetch(`${BASE}/api/songs/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-Edit-Token': EDIT_TOKEN },
    body: JSON.stringify({ title: 'Yellow (Acoustic)', artist: 'Coldplay' })
  });
  expect(put.status).toBe(200);
  const updated = (await put.json()) as { title: string; artist: string };
  expect(updated.title).toBe('Yellow (Acoustic)');
  expect(updated.artist).toBe('Coldplay');
});

test('DELETE /api/songs/:id removes the row', async () => {
  const list = (await (await fetch(`${BASE}/api/songs`)).json()) as Array<{ id: string }>;
  const id = list[0].id;
  const del = await fetch(`${BASE}/api/songs/${id}`, {
    method: 'DELETE',
    headers: { 'X-Edit-Token': EDIT_TOKEN }
  });
  expect(del.status).toBe(200);
  const after = (await (await fetch(`${BASE}/api/songs`)).json()) as unknown[];
  expect(after.length).toBe(0);
});

test('PUT /api/songs/:id without token is 401', async () => {
  const form = new FormData();
  const blob = new Blob([new Uint8Array([0xff, 0xfb, 0x90, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02])], { type: 'audio/mpeg' });
  form.append('files', blob, 'second.mp3');
  const post = await fetch(`${BASE}/api/songs`, {
    method: 'POST',
    headers: { 'X-Edit-Token': EDIT_TOKEN },
    body: form
  });
  const created = (await post.json()) as Array<{ id: string }>;
  const put = await fetch(`${BASE}/api/songs/${created[0].id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'hack' })
  });
  expect(put.status).toBe(401);
  // cleanup so subsequent tests aren't polluted
  await fetch(`${BASE}/api/songs/${created[0].id}`, {
    method: 'DELETE',
    headers: { 'X-Edit-Token': EDIT_TOKEN }
  });
});
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Bun server: 4 endpoints for photo CRUD with token auth.
 *
 * ponytail: 4 endpoints, not 6-7. Bulk upload is just `getAll('files')` on one POST.
 * ponytail: auth is a 1-line header check, not a middleware file.
 * ponytail: one WebP thumbnail per photo (see ./thumbs.ts), written in the
 *           same volume nginx already serves.
 */

import { getDb, rowToPhoto, rowToSong, type PhotoRow, type SongRow } from './db';
import { makeThumbnail, thumbFileName, thumbsRoot } from './thumbs';
import { mkdirSync } from 'node:fs';
import { unlink } from 'node:fs/promises';

const PORT = Number(process.env.PORT ?? 3001);
const EDIT_TOKEN = process.env.EDIT_TOKEN ?? '';
const UPLOAD_DIR = process.env.UPLOAD_DIR ?? './uploads';
const MAX_UPLOAD_BYTES = Number(process.env.MAX_UPLOAD_BYTES ?? 25 * 1024 * 1024); // 25 MB per file

const db = getDb();

mkdirSync(UPLOAD_DIR, { recursive: true });

const THUMBS_DIR = thumbsRoot(UPLOAD_DIR);
mkdirSync(THUMBS_DIR, { recursive: true });

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });

const unauthorized = () => json({ error: 'invalid or missing X-Edit-Token' }, 401);

function requireEditAuth(req: Request): Response | null {
  const token = req.headers.get('x-edit-token');
  if (!EDIT_TOKEN) {
    // ponytail: if no token configured, deny all writes. Forces explicit setup.
    return json({ error: 'server has no EDIT_TOKEN configured' }, 500);
  }
  if (token !== EDIT_TOKEN) return unauthorized();
  return null;
}

function extensionFromFilename(name: string): string {
  const m = name.match(/\.([a-zA-Z0-9]+)$/);
  return m ? m[1].toLowerCase() : 'jpg';
}

function readPhoto(id: string): PhotoRow | null {
  return db.query('SELECT * FROM photos WHERE id = ?').get(id) as PhotoRow | null;
}

function deletePhotoRow(row: PhotoRow): void {
  db.query('DELETE FROM photos WHERE id = ?').run(row.id);
  // ponytail: skip file deletion if it's an external URL (seed photos use https://).
  if (row.file_path.startsWith('/uploads/')) {
    const absPath = UPLOAD_DIR + row.file_path.replace('/uploads', '');
    unlink(absPath).catch(() => { /* file already gone, ignore */ });
    // ponytail: drop the thumbnail too, else deleted photos leave orphans.
    unlink(`${THUMBS_DIR}/${thumbFileName(row.id)}`).catch(() => { /* already gone */ });
  }
}

Bun.serve({
  port: PORT,

  async fetch(req: Request) {
    const url = new URL(req.url);
    const path = url.pathname;

    // ─── GET /api/photos?bucket=…&eventId=… ──────────────────────────────
    if (req.method === 'GET' && path === '/api/photos') {
      const bucket = url.searchParams.get('bucket');
      if (!bucket || !['public', 'secret', 'carousel'].includes(bucket)) {
        return json({ error: 'bucket must be public|secret|carousel' }, 400);
      }
      const eventId = url.searchParams.get('eventId');

      const rows = eventId
        ? (db.query('SELECT * FROM photos WHERE bucket = ? AND carousel_event_id = ? ORDER BY position ASC, created_at ASC').all(bucket, eventId) as PhotoRow[])
        : (db.query('SELECT * FROM photos WHERE bucket = ? ORDER BY created_at ASC').all(bucket) as PhotoRow[]);

      return json(rows.map(rowToPhoto));
    }

    // ─── POST /api/photos (multipart: bucket, eventId?, files[]) ──────────
    if (req.method === 'POST' && path === '/api/photos') {
      const form = await req.formData();
      const bucket = form.get('bucket')?.toString();
      if (!bucket || !['public', 'secret', 'carousel'].includes(bucket)) {
        return json({ error: 'bucket must be public|secret|carousel' }, 400);
      }
      // ponytail: la galería pública acepta uploads de cualquier visitante.
      // Los buckets protegidos (`secret`, `carousel`) siguen exigiendo
      // EDIT_TOKEN — la barrera protege collage del cumple y el album
      // secreto, no la galería abierta.
      if (bucket !== 'public') {
        const authErr = requireEditAuth(req);
        if (authErr) return authErr;
      }
      const eventId = form.get('eventId')?.toString() ?? null;
      const files = form.getAll('files').filter((f): f is File => f instanceof File);
      if (files.length === 0) return json({ error: 'no files in form data' }, 400);

      // Carousel: cap at 5, replace any existing photos for this event.
      if (bucket === 'carousel') {
        if (!eventId) return json({ error: 'carousel requires eventId' }, 400);
        const capped = files.slice(0, 5);
        const existing = db.query('SELECT * FROM photos WHERE bucket = ? AND carousel_event_id = ?').all('carousel', eventId) as PhotoRow[];
        for (const r of existing) deletePhotoRow(r);
        const created: PhotoRow[] = [];
        let pos = 1;
        for (const file of capped) {
          created.push(await saveUpload(file, 'carousel', eventId, pos++));
        }
        return json(created.map(rowToPhoto));
      }

      // Public / secret: append, never replace.
      const created: PhotoRow[] = [];
      for (const file of files) {
        created.push(await saveUpload(file, bucket as 'public' | 'secret', null, null));
      }
      return json(created.map(rowToPhoto));
    }

    // ─── PUT /api/photos/:id ─────────────────────────────────────────────
    const putMatch = path.match(/^\/api\/photos\/([^/]+)$/);
    if (req.method === 'PUT' && putMatch) {
      const authErr = requireEditAuth(req);
      if (authErr) return authErr;
      const id = putMatch[1];
      const row = readPhoto(id);
      if (!row) return json({ error: 'not found' }, 404);

      const rawBody = await req.text().catch(() => '');
      let body: Record<string, unknown> | null = null;
      if (rawBody) {
        try { body = JSON.parse(rawBody); } catch (e) {
          return json({ error: `invalid json: ${(e as Error).message}; got: ${rawBody.slice(0, 80)}` }, 400);
        }
      }
      if (!body) return json({ error: 'empty body' }, 400);

      // Secret bucket: only caption editable.
      const fields = row.bucket === 'secret'
        ? ['caption']
        : ['caption', 'month', 'year', 'date_str', 'location', 'tags'];

      const updates: string[] = [];
      const values: unknown[] = [];
      for (const f of fields) {
        if (body[f] === undefined) continue;
        updates.push(`${f} = ?`);
        values.push(f === 'tags' ? JSON.stringify(body[f]) : body[f]);
      }
      if (updates.length === 0) return json({ error: 'no editable fields in body' }, 400);

      values.push(id);
      db.query(`UPDATE photos SET ${updates.join(', ')} WHERE id = ?`).run(...(values as any[]));
      return json(rowToPhoto(readPhoto(id)!));
    }

    // ─── DELETE /api/photos/:id ──────────────────────────────────────────
    if (req.method === 'DELETE' && putMatch) {
      const authErr = requireEditAuth(req);
      if (authErr) return authErr;
      const row = readPhoto(putMatch[1]);
      if (!row) return json({ error: 'not found' }, 404);
      deletePhotoRow(row);
      return json({ ok: true });
    }

    // ─── DELETE /api/photos?bucket=public (bulk delete) ─────────────────
    if (req.method === 'DELETE' && path === '/api/photos') {
      const authErr = requireEditAuth(req);
      if (authErr) return authErr;
      const bucket = url.searchParams.get('bucket');
      if (!bucket) return json({ error: 'bucket required' }, 400);
      const rows = db.query('SELECT * FROM photos WHERE bucket = ?').all(bucket) as PhotoRow[];
      for (const r of rows) deletePhotoRow(r);
      return json({ ok: true, deleted: rows.length });
    }

    // ─── GET /api/songs ───────────────────────────────────────────────────
    if (req.method === 'GET' && path === '/api/songs') {
      const rows = db
        .query('SELECT * FROM songs ORDER BY created_at ASC')
        .all() as SongRow[];
      return json(rows.map(rowToSong));
    }

    // ─── POST /api/songs (multipart: files[]) ────────────────────────────
    if (req.method === 'POST' && path === '/api/songs') {
      const authErr = requireEditAuth(req);
      if (authErr) return authErr;
      const form = await req.formData();
      const files = form.getAll('files').filter((f): f is File => f instanceof File);
      if (files.length === 0) return json({ error: 'no files in form data' }, 400);
      const created: SongRow[] = [];
      for (const file of files) {
        created.push(await saveSongUpload(file));
      }
      return json(created.map(rowToSong));
    }

    // ─── PUT /api/songs/:id (rename only) ────────────────────────────────
    const songMatch = path.match(/^\/api\/songs\/([^/]+)$/);
    if (req.method === 'PUT' && songMatch) {
      const authErr = requireEditAuth(req);
      if (authErr) return authErr;
      const id = songMatch[1];
      const row = db.query('SELECT * FROM songs WHERE id = ?').get(id) as SongRow | null;
      if (!row) return json({ error: 'not found' }, 404);
      const rawBody = await req.text().catch(() => '');
      let body: Record<string, unknown> | null = null;
      if (rawBody) {
        try { body = JSON.parse(rawBody); } catch (e) {
          return json({ error: `invalid json: ${(e as Error).message}; got: ${rawBody.slice(0, 80)}` }, 400);
        }
      }
      if (!body) return json({ error: 'empty body' }, 400);
      const updates: string[] = [];
      const values: unknown[] = [];
      for (const f of ['title', 'artist'] as const) {
        if (typeof body[f] === 'string') {
          updates.push(`${f} = ?`);
          values.push(body[f]);
        }
      }
      if (updates.length === 0) return json({ error: 'no editable fields in body' }, 400);
      values.push(id);
      db.query(`UPDATE songs SET ${updates.join(', ')} WHERE id = ?`).run(...(values as string[]));
      return json(rowToSong(db.query('SELECT * FROM songs WHERE id = ?').get(id) as SongRow));
    }

    // ─── DELETE /api/songs/:id ───────────────────────────────────────────
    if (req.method === 'DELETE' && songMatch) {
      const authErr = requireEditAuth(req);
      if (authErr) return authErr;
      const row = db.query('SELECT * FROM songs WHERE id = ?').get(songMatch[1]) as SongRow | null;
      if (!row) return json({ error: 'not found' }, 404);
      db.query('DELETE FROM songs WHERE id = ?').run(row.id);
      if (row.file_path.startsWith('/uploads/')) {
        const absPath = UPLOAD_DIR + row.file_path.replace('/uploads', '');
        unlink(absPath).catch(() => { /* file already gone, ignore */ });
      }
      return json({ ok: true });
    }

    // ─── GET /api/content?scope=timeline ─────────────────────────────────
    // ponytail: returns flat {key:value} map for the given scope; empty {} if none.
    // No auth — read-only view of the edit-mode overrides, used at render time.
    if (req.method === 'GET' && path === '/api/content') {
      const scope = url.searchParams.get('scope');
      if (!scope || !/^[a-z0-9_-]{1,32}$/i.test(scope)) {
        return json({ error: 'scope required (1-32 chars, alphanumeric/_/-)' }, 400);
      }
      const rows = db
        .query('SELECT key, value FROM content_overrides WHERE scope = ?')
        .all(scope) as { key: string; value: string }[];
      const map: Record<string, string> = {};
      for (const r of rows) map[r.key] = r.value;
      return json(map);
    }

    // ─── PUT /api/content/:scope/:key ────────────────────────────────────
    // ponytail: URL-encoded key so dots/dashes survive. Body: {"value":"..."}.
    // Upsert; returns the saved {value, updated_at}.
    const contentPut = path.match(/^\/api\/content\/([^/]+)\/([^/]+)$/);
    if (req.method === 'PUT' && contentPut) {
      const authErr = requireEditAuth(req);
      if (authErr) return authErr;
      const scope = decodeURIComponent(contentPut[1]);
      const key = decodeURIComponent(contentPut[2]);
      if (!/^[a-z0-9_.-]{1,128}$/i.test(scope) || !/^[a-z0-9_.-]{1,128}$/i.test(key)) {
        return json({ error: 'scope and key must match [a-z0-9_.-]{1,128}' }, 400);
      }
      let body: { value?: unknown } | null = null;
      try {
        const raw = await req.text();
        body = raw ? JSON.parse(raw) : null;
      } catch (e) {
        return json({ error: `invalid json: ${(e as Error).message}` }, 400);
      }
      const value = body?.value;
      if (typeof value !== 'string') return json({ error: 'value must be a string' }, 400);
      if (value.length > 16 * 1024) return json({ error: 'value exceeds 16 KiB' }, 400);

      db.query(`
        INSERT INTO content_overrides (scope, key, value, updated_at)
        VALUES (?, ?, ?, unixepoch())
        ON CONFLICT(scope, key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
      `).run(scope, key, value);
      const row = db
        .query('SELECT value, updated_at FROM content_overrides WHERE scope = ? AND key = ?')
        .get(scope, key) as { value: string; updated_at: number };
      return json(row);
    }

    // ─── DELETE /api/content/:scope/:key ─────────────────────────────────
    // ponytail: opt-in revert to static seed. Auth required, same as PUT.
    if (req.method === 'DELETE' && contentPut) {
      const authErr = requireEditAuth(req);
      if (authErr) return authErr;
      const scope = decodeURIComponent(contentPut[1]);
      const key = decodeURIComponent(contentPut[2]);
      db.query('DELETE FROM content_overrides WHERE scope = ? AND key = ?').run(scope, key);
      return json({ ok: true });
    }

    // ─── Health ──────────────────────────────────────────────────────────
    if (path === '/api/health') return json({ ok: true, time: Date.now() });

    return json({ error: 'not found' }, 404);
  }
});

async function saveUpload(
  file: File,
  bucket: 'public' | 'secret' | 'carousel',
  eventId: string | null,
  position: number | null
): Promise<PhotoRow> {
  const id = crypto.randomUUID();
  const ext = extensionFromFilename(file.name);
  const filename = `${id}.${ext}`;
  const absPath = `${UPLOAD_DIR}/${filename}`;
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`file ${file.name} exceeds limit`);
  }
  await Bun.write(absPath, file);
  // ponytail: one WebP thumbnail per upload, in the same volume nginx
  // already serves. The original stays — the lightbox shows it.
  try {
    await Bun.write(`${THUMBS_DIR}/${thumbFileName(id)}`, await makeThumbnail(absPath));
  } catch (err) {
    // ponytail: a failed thumbnail must not lose the photo. The upload
    // already succeeded and the grid falls back to the original.
    console.error(`[thumbs] ${id}: ${err instanceof Error ? err.message : String(err)}`);
  }
  db.query(`
    INSERT INTO photos
      (id, bucket, carousel_event_id, position, file_path, original_name, caption, month, year, date_str, location, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    bucket,
    eventId,
    position,
    `/uploads/${filename}`,
    file.name,
    '',
    null,
    null,
    null,
    '',
    '[]'
  );
  return readPhoto(id)!;
}

async function saveSongUpload(file: File): Promise<SongRow> {
  const id = crypto.randomUUID();
  const ext = extensionFromFilename(file.name);
  const filename = `${id}.${ext}`;
  const absPath = `${UPLOAD_DIR}/${filename}`;
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`file ${file.name} exceeds limit`);
  }
  await Bun.write(absPath, file);
  db.query(`
    INSERT INTO songs (id, title, artist, file_path)
    VALUES (?, ?, ?, ?)
  `).run(id, file.name.replace(/\.[^/.]+$/, ''), '', `/uploads/${filename}`);
  return db.query('SELECT * FROM songs WHERE id = ?').get(id) as SongRow;
}

console.log(`[server] listening on http://127.0.0.1:${PORT}`);
console.log(`[server] upload dir: ${UPLOAD_DIR}`);
console.log(`[server] EDIT_TOKEN ${EDIT_TOKEN ? 'configured (' + EDIT_TOKEN.length + ' chars)' : 'NOT SET — writes will fail'}`);

// ponytail: close the DB on shutdown so the file handle is released
// (Windows holds the lock until process exit; SIGTERM otherwise leaks the .db).
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    try {
      (db as { close?: () => void }).close?.();
    } catch {
      /* ignore */
    }
    process.exit(0);
  });
}

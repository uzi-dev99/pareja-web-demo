/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SQLite schema, init and one-time seed from src/data/content.ts.
 *
 * ponytail: one table with a `bucket` column instead of 3 sibling tables.
 * ponytail: no migrations framework — `CREATE TABLE IF NOT EXISTS` + seed is enough
 *           for a single-author VPS app.
 */

import { Database } from 'bun:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { photos as seedPhotos, secretCollagePhotos as seedSecretPhotos } from '../src/data/content';
import { isVideoUrl } from '../src/utils/carousel3d';
import { thumbExists, thumbUrlFor } from './thumbs';

const DB_PATH = process.env.DB_PATH ?? './data/app.db';

mkdirSync(dirname(DB_PATH), { recursive: true });

export interface PhotoRow {
  id: string;
  bucket: 'public' | 'secret' | 'carousel';
  carousel_event_id: string | null;
  position: number | null;
  file_path: string;
  original_name: string | null;
  caption: string;
  month: string | null;
  year: number | null;
  date_str: string | null;
  location: string;
  tags: string; // JSON array
  created_at: number;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS photos (
  id TEXT PRIMARY KEY,
  bucket TEXT NOT NULL,
  carousel_event_id TEXT,
  position INTEGER,
  file_path TEXT NOT NULL,
  original_name TEXT,
  caption TEXT DEFAULT '',
  month TEXT,
  year INTEGER,
  date_str TEXT,
  location TEXT DEFAULT '',
  tags TEXT DEFAULT '[]',
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_photos_bucket
  ON photos(bucket, carousel_event_id, position);

-- ponytail: text overrides for the edit-mode click-to-edit feature.
-- key is opaque to the server (e.g. "feb-2026.text"); scope groups them
-- (e.g. "timeline"). Static seed in src/data/content.ts is the fallback;
-- rows here win at render time.
CREATE TABLE IF NOT EXISTS content_overrides (
  scope TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  updated_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (scope, key)
);

-- ponytail: no seed for songs — the playlist starts empty by design.
-- Alex uploads before Sam ever visits. Order is insertion order (created_at ASC).
CREATE TABLE IF NOT EXISTS songs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT NOT NULL DEFAULT '',
  file_path TEXT NOT NULL,
  duration_sec REAL,
  created_at INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_songs_created
  ON songs(created_at);
`;

let _db: Database | null = null;

export function getDb(): Database {
  if (_db) return _db;
  _db = new Database(DB_PATH, { create: true });
  initDatabase(_db);
  return _db;
}

/**
 * Schema + seed + prune. Exported so a test can run it over a temp DB.
 */
export function initDatabase(db: Database): void {
  db.exec(SCHEMA);
  syncSeeds(db);
}

interface SeedRow {
  id: string;
  bucket: 'public' | 'secret';
  position: number | null;
  filePath: string;
  originalName: string;
  caption: string;
  month: string | null;
  year: number | null;
  dateStr: string | null;
  location: string;
  tags: string;
}

/**
 * ponytail: the seed rows with the id they have in the DB.
 *
 * The id is the identity (`seed-<id>` for the public photos,
 * `seed-secret-<pos>` for the secret collage, which is seeded by
 * position). The URL is NOT the identity: a change of URL in content.ts
 * used to delete the row on every deployed DB (with the owner's edits
 * on it) and re-insert it, so the owner lost their edits on every
 * deploy and a new seed photo never reached an existing DB.
 */
function seedRows(): SeedRow[] {
  const rows: SeedRow[] = seedPhotos.map((p) => ({
    id: `seed-${p.id}`,
    bucket: 'public',
    position: null,
    filePath: p.filePath,
    originalName: p.id,
    caption: p.caption,
    month: p.month,
    year: p.year,
    dateStr: p.dateStr ?? null,
    location: p.location ?? '',
    tags: JSON.stringify(p.tags ?? [])
  }));

  let pos = 1;
  for (const s of seedSecretPhotos) {
    rows.push({
      id: `seed-secret-${pos}`,
      bucket: 'secret',
      position: pos,
      filePath: s.url,
      originalName: `secret-${pos}`,
      caption: s.caption,
      month: null,
      year: null,
      dateStr: null,
      location: '',
      tags: '[]'
    });
    pos += 1;
  }

  return rows;
}

/**
 * ponytail: upsert-if-missing + prune, both keyed by the seed id.
 *
 * - a seed id that is already there is NOT touched (the owner's edits
 *   survive a deploy, even if content.ts changed the URL),
 * - a seed id that is new in content.ts is inserted (the new video
 *   reaches the DBs that were seeded before),
 * - a row whose seed id is gone from content.ts is pruned (the orphan
 *   rows of the removed seed videos),
 * - a row the owner uploaded is never a seed row: it is never touched.
 *
 * VK-547: the seed media moved from the CDN to `public/seed/`. A DB
 * seeded before that keeps the old hot-link in `file_path` (the rows
 * are INSERT OR IGNORE), so the row is repointed at the local path.
 * Only `file_path` moves: caption/month/year/tags/location are the
 * owner's edits and stay untouched.
 */
function syncSeeds(db: Database): void {
  const seeds = seedRows();
  const live = new Set(seeds.map((s) => s.id));

  const insert = db.prepare(`
    INSERT OR IGNORE INTO photos
      (id, bucket, carousel_event_id, position, file_path, original_name,
       caption, month, year, date_str, location, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const del = db.prepare('DELETE FROM photos WHERE id = ?');
  // ponytail: solo el path: el resto de la fila es del owner.
  const repoint = db.prepare('UPDATE photos SET file_path = ? WHERE id = ?');
  const current = db.prepare('SELECT file_path FROM photos WHERE id = ?');
  const rows = db
    .query("SELECT id FROM photos WHERE id LIKE 'seed-%'")
    .all() as { id: string }[];
  const stale = rows.filter((r) => !live.has(r.id)).map((r) => r.id);
  // ponytail: lo que entra nuevo en este arranque (para verlo en el log
  // del deploy: "el seed nuevo llegó a la base").
  const inserted = seeds.filter((s) => !rows.some((r) => r.id === s.id)).length;
  // ponytail: las filas de seed que todavía apuntan al hot-link viejo.
  let migrated = 0;

  // ponytail: una sola transaccion para todo el seed. Con un commit por
  // fila el arranque tardaba mas de 15 s en un disco lento (los tests de
  // smoke se caian por timeout esperando /api/health).
  db.transaction(() => {
    for (const s of seeds) {
      insert.run(
        s.id,
        s.bucket,
        null,
        s.position,
        s.filePath,
        s.originalName,
        s.caption,
        s.month,
        s.year,
        s.dateStr,
        s.location,
        s.tags
      );
      const row = current.get(s.id) as { file_path: string } | null;
      if (row && /^https?:\/\//i.test(row.file_path)) {
        repoint.run(s.filePath, s.id);
        migrated += 1;
      }
    }
    for (const id of stale) del.run(id);
  })();

  if (stale.length > 0) {
    console.log(`[db] Pruned ${stale.length} stale seed rows.`);
  }
  if (inserted > 0) {
    console.log(`[db] Seeded ${inserted} new photos.`);
  }
  if (migrated > 0) {
    console.log(`[db] Migrated ${migrated} seed rows to the local /seed/ path.`);
  }
}

// ponytail: the thumbnail path is a convention derived from the photo id
// (no schema change). We check the file exists so a photo without a
// thumbnail — a seed row with an external URL, a photo whose file was
// deleted, a partial backfill — falls back to the original in every
// consumer (`thumbnailUrl || filePath`). Cost: one existsSync per photo
// per request (~1 ms for 216 photos); upgrade path: cache the thumb id set
// in memory and invalidate it on write.
function thumbnailFor(row: PhotoRow): string {
  // ponytail: una fila de video NO tiene miniatura propia: el poster
  // (content.ts, la DB no tiene columna de thumbnail). Devolver el .mp4
  // como thumbnailUrl dibujaba una tile rota en cada <img src={thumbnailUrl
  // || filePath}> (galeria, collage secreto, editor de fotos).
  if (isVideoUrl(row.file_path)) {
    const seed = seedPhotos.find((p) => p.id === row.original_name);
    return seed?.thumbnailUrl ?? '';
  }
  const uploadDir = process.env.UPLOAD_DIR ?? './uploads';
  if (!row.file_path.startsWith('/uploads/')) return row.file_path;
  return thumbExists(row.id, uploadDir) ? thumbUrlFor(row.id) : row.file_path;
}

export function rowToPhoto(row: PhotoRow): import('../src/types').Photo {
  return {
    id: row.id,
    filePath: row.file_path,
    thumbnailUrl: thumbnailFor(row),
    // ponytail: la fila dice "image" pero el archivo puede ser un .mp4
    // (los dos videos del seed): la extension manda, o el consumidor
    // renderiza un <img> con un video y sale una tile rota.
    mediaType: isVideoUrl(row.file_path) ? 'video' : 'image',
    caption: row.caption,
    month: row.month ?? '',
    year: row.year ?? new Date().getFullYear(),
    dateStr: row.date_str ?? undefined,
    location: row.location || undefined,
    tags: safeParseTags(row.tags),
    createdAt: row.created_at
  };
}

export function secretRowToPhoto(row: PhotoRow): import('../src/types').Photo {
  // ponytail: secret gallery only uses caption + url, but we still return a Photo shape
  // so the existing SecretCollageModal keeps working after we swap the data source.
  return {
    id: row.id,
    filePath: row.file_path,
    thumbnailUrl: thumbnailFor(row),
    mediaType: isVideoUrl(row.file_path) ? 'video' : 'image',
    caption: row.caption,
    month: '',
    year: 0,
    tags: []
  };
}

function safeParseTags(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export interface SongRow {
  id: string;
  title: string;
  artist: string;
  file_path: string;
  duration_sec: number | null;
  created_at: number;
}

export function rowToSong(row: SongRow): import('../src/types').Song {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    filePath: row.file_path,
    durationSec: row.duration_sec ?? undefined,
    createdAt: row.created_at
  };
}

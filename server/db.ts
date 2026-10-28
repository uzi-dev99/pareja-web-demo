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
  _db.exec(SCHEMA);
  seedIfEmpty(_db);
  return _db;
}

function seedIfEmpty(db: Database): void {
  const row = db.query('SELECT COUNT(*) as n FROM photos').get() as { n: number };
  if (row.n > 0) return;

  const insert = db.prepare(`
    INSERT OR IGNORE INTO photos
      (id, bucket, carousel_event_id, position, file_path, original_name,
       caption, month, year, date_str, location, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of seedPhotos) {
    insert.run(
      `seed-${p.id}`,
      'public',
      null,
      null,
      p.filePath,
      p.id,
      p.caption,
      p.month,
      p.year,
      p.dateStr ?? null,
      p.location ?? '',
      JSON.stringify(p.tags ?? [])
    );
  }

  let pos = 1;
  for (const s of seedSecretPhotos) {
    insert.run(
      `seed-secret-${pos}`,
      'secret',
      null,
      pos,
      s.url,
      `secret-${pos}`,
      s.caption,
      null,
      null,
      null,
      '',
      '[]'
    );
    pos += 1;
  }

  console.log(`[db] Seeded ${seedPhotos.length} public + ${seedSecretPhotos.length} secret photos.`);
}

// ponytail: the thumbnail path is a convention derived from the photo id
// (no schema change). We check the file exists so a photo without a
// thumbnail — a seed row with an external URL, a photo whose file was
// deleted, a partial backfill — falls back to the original in every
// consumer (`thumbnailUrl || filePath`). Cost: one existsSync per photo
// per request (~1 ms for 216 photos); upgrade path: cache the thumb id set
// in memory and invalidate it on write.
function thumbnailFor(row: PhotoRow): string {
  const uploadDir = process.env.UPLOAD_DIR ?? './uploads';
  if (!row.file_path.startsWith('/uploads/')) return row.file_path;
  return thumbExists(row.id, uploadDir) ? thumbUrlFor(row.id) : row.file_path;
}

export function rowToPhoto(row: PhotoRow): import('../src/types').Photo {
  return {
    id: row.id,
    filePath: row.file_path,
    thumbnailUrl: thumbnailFor(row),
    mediaType: 'image',
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
    mediaType: 'image',
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

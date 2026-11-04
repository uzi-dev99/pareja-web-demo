/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * VK-547 (AC3) — a DB seeded before the vendoring gets the local path.
 *
 * The seeds are INSERT OR IGNORE, so a DB that was seeded while the
 * media was hot-linked keeps the old `https://...` in `file_path` and
 * the demo would keep asking the CDN for a file that may be gone.
 * `syncSeeds` repoints those rows at the local path — and only the
 * path: the caption, the month, the tags and the location are the
 * owner's edits.
 *
 * ponytail: the DB is in memory: the test never touches a real file.
 * `initDatabase` is the same function the server runs at boot.
 */

import { expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { initDatabase } from '../server/db';
import { photos } from '../src/data/content';

const seed = photos.find((p) => p.id === 'photo-canela-1')!;

const row = (db: Database, id: string) =>
  db.query('SELECT * FROM photos WHERE id = ?').get(id) as
    | { file_path: string; caption: string; month: string | null; location: string; tags: string }
    | null;

test('a seed row with the old hot-link is repointed at the local path', () => {
  const db = new Database(':memory:');
  try {
    initDatabase(db);

    // how an already seeded DB looks: the owner edited the caption and
    // the row still points at the CDN
    db.query(
      `UPDATE photos SET caption = ?, file_path = ?
       WHERE id = 'seed-photo-canela-1'`
    ).run(
      'editada por el owner',
      'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=1200&q=80'
    );

    // the server boots again (that is what happens on every deploy)
    initDatabase(db);

    const after = row(db, 'seed-photo-canela-1')!;
    expect(after.file_path).toBe(seed.filePath);
    expect(after.file_path.startsWith('/seed/')).toBe(true);
    // the owner's edits survive
    expect(after.caption).toBe('editada por el owner');
    expect(after.month).toBe(seed.month);
    expect(after.location).toBe(seed.location);
  } finally {
    db.close();
  }
});

test('a seed row that is already local is not touched', () => {
  const db = new Database(':memory:');
  try {
    initDatabase(db);
    const local = '/seed/photos/photo-1514888286974-6c03e2ca1dba.jpg';
    db.query("UPDATE photos SET file_path = ? WHERE id = 'seed-photo-canela-1'").run(local);

    initDatabase(db);

    expect(row(db, 'seed-photo-canela-1')!.file_path).toBe(local);
  } finally {
    db.close();
  }
});

test('an upload of the owner is not touched', () => {
  const db = new Database(':memory:');
  try {
    initDatabase(db);
    db.query(
      `INSERT INTO photos (id, bucket, file_path, original_name, caption, month, year, tags, created_at)
       VALUES ('foto-del-owner', 'public', '/uploads/nuestra-foto.jpg', 'nuestra-foto.jpg', 'nuestra', 'Marzo', 2026, '[]', 1)`
    ).run();

    initDatabase(db);

    const after = row(db, 'foto-del-owner')!;
    expect(after.file_path).toBe('/uploads/nuestra-foto.jpg');
    expect(after.caption).toBe('nuestra');
  } finally {
    db.close();
  }
});

test('the secret collage rows are repointed too', () => {
  const db = new Database(':memory:');
  try {
    initDatabase(db);
    db.query(
      `UPDATE photos SET file_path = 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=800&q=80'
       WHERE id = 'seed-secret-1'`
    ).run();

    initDatabase(db);

    expect(row(db, 'seed-secret-1')!.file_path.startsWith('/seed/')).toBe(true);
  } finally {
    db.close();
  }
});

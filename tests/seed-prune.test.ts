/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * VK-544 (M2) — el seed borra las filas de seed que ya no existen en
 * content.ts.
 *
 * Los dos videos del seed (mixkit) se sacaron del seed pero sus filas
 * quedaron en las bases ya sembradas: la galería mostraba una tile
 * rota y la base del LAN hubo que borrarla a mano. Ahora el arranque
 * poda las filas de seed cuyo archivo ya no está en content.ts.
 *
 * ponytail: la prueba corre sobre una base temporal (nunca la del
 * repo): `initDatabase` es la misma función que corre el servidor al
 * arrancar.
 */

import { expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import { initDatabase } from '../server/db';
import { photos as seedPhotos } from '../src/data/content';
import type { Photo } from '../src/types';

const insert = (db: Database, id: string, filePath: string, originalName: string) =>
  db
    .query(
      `INSERT INTO photos (id, bucket, file_path, original_name, caption, month, year, tags, created_at)
       VALUES (?, 'public', ?, ?, 'Una foto', 'Septiembre', 2026, '[]', 1)`
    )
    .run(id, filePath, originalName);

const ids = (db: Database): string[] =>
  (db.query('SELECT id FROM photos').all() as { id: string }[]).map((r) => r.id);

test('el seed poda las filas viejas y nunca toca una foto del usuario', () => {
  // ponytail: la base es en memoria: la prueba no toca NINGÚN archivo de
  // base (ni la del repo, ni la de un despliegue).
  const db = new Database(':memory:');
  try {
    // 1. el arranque siembra
    initDatabase(db);
    expect(ids(db).length).toBeGreaterThan(0);
    expect(ids(db)).toContain('seed-photo-canela-1');

    // 2. una fila de seed vieja (un video que ya no está en content.ts)
    //    y una foto que subió el usuario
    insert(
      db,
      'seed-video-viejo',
      'https://assets.mixkit.co/videos/preview/mixkit-cat-looking-around-with-curiosity-33318-large.mp4',
      'video-viejo'
    );
    insert(db, 'foto-del-usuario', '/uploads/nuestra-foto.jpg', 'nuestra-foto.jpg');
    expect(ids(db)).toContain('seed-video-viejo');

    // 3. el servidor arranca otra vez (es lo que pasa en cada deploy)
    initDatabase(db);

    const after = ids(db);
    // la fila vieja ya no está
    expect(after).not.toContain('seed-video-viejo');
    // la foto del usuario sigue ahí
    expect(after).toContain('foto-del-usuario');
    // y las filas de seed que siguen en content.ts también
    expect(after).toContain('seed-photo-canela-1');
  } finally {
    db.close();
  }
});

test('un cambio de URL en content.ts NO borra la fila de seed (ni las ediciones del owner)', () => {
  // ponytail: la base es en memoria: la prueba no toca NINGÚN archivo de
  // base (ni la del repo, ni la de un despliegue).
  const db = new Database(':memory:');
  try {
    initDatabase(db);

    // el owner edita la foto del seed (y en content.ts su URL cambia)
    db.query(
      "UPDATE photos SET caption = 'editada por el owner', file_path = 'https://ejemplo/otra-url.jpg' WHERE id = 'seed-photo-canela-1'"
    ).run();

    // el servidor arranca otra vez (es lo que pasa en cada deploy)
    initDatabase(db);

    const row = db
      .query("SELECT caption, file_path FROM photos WHERE id = 'seed-photo-canela-1'")
      .get() as { caption: string; file_path: string } | null;

    // la fila sigue ahí, con la edición del owner
    expect(row).not.toBeNull();
    expect(row!.caption).toBe('editada por el owner');
    // ponytail: VK-547 — la URL vieja (un hot-link) se repunta al path
    // local del seed; el resto de la fila es del owner y no se toca.
    expect(row!.file_path).toBe(
      seedPhotos.find((p) => p.id === 'photo-canela-1')!.filePath
    );
  } finally {
    db.close();
  }
});

test('un seed nuevo en content.ts entra en una base ya sembrada', () => {
  const db = new Database(':memory:');
  const nuevo: Photo = {
    id: 'foto-nueva-del-seed',
    filePath: 'https://ejemplo/nueva.jpg',
    caption: 'Una foto nueva del seed',
    month: 'Septiembre',
    year: 2026,
    tags: ['Seed']
  };
  try {
    initDatabase(db);
    expect(ids(db)).not.toContain('seed-foto-nueva-del-seed');

    // aparece una foto nueva en content.ts (el seed del video nuevo)
    seedPhotos.push(nuevo);
    try {
      initDatabase(db);

      const row = db
        .query("SELECT file_path FROM photos WHERE id = 'seed-foto-nueva-del-seed'")
        .get() as { file_path: string } | null;
      expect(row).not.toBeNull();
      expect(row!.file_path).toBe('https://ejemplo/nueva.jpg');
    } finally {
      seedPhotos.pop();
    }
  } finally {
    db.close();
  }
});

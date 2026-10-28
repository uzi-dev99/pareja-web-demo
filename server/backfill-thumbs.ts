/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * One-pass backfill: create the missing thumbnails for the photos already
 * sitting in the uploads volume.
 *
 * ponytail: filesystem-driven, not DB-driven. The thumbnail id IS the
 * original file's basename, so scanning the volume finds exactly the
 * uploads that need one — no DB import (avoids an import cycle with
 * server/db.ts) and no writes outside /uploads/thumbs.
 *
 * Run (prod only with the owner's explicit authorization):
 *   docker compose exec backend bun run server/backfill-thumbs.ts
 *   docker compose exec backend bun run server/backfill-thumbs.ts --force
 */

import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { makeThumbnail, thumbFileName, thumbsRoot } from './thumbs';

const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.tif', '.tiff', '.avif']);

export async function main(): Promise<void> {
  const force = process.argv.includes('--force');
  // ponytail: read UPLOAD_DIR here, not at import time, so a test can run
  // the script against two different directories in the same process.
  const uploadDir = process.env.UPLOAD_DIR ?? './uploads';
  const dstDir = thumbsRoot(uploadDir);
  mkdirSync(dstDir, { recursive: true });

  const files = readdirSync(uploadDir).filter((f) => IMAGE_EXT.has(extname(f).toLowerCase()));
  let made = 0;
  let skipped = 0;
  let failed = 0;
  // ponytail: the thumb id is the basename, so x.jpg and x.png collide.
  // The first one wins; the second is reported, never silently skipped.
  const owners = new Map<string, string>();

  for (const file of files) {
    const id = basename(file, extname(file));
    const owner = owners.get(id);
    if (owner) {
      failed++;
      console.error(
        `[backfill] ${file}: basename collision with ${owner} — both map to ${thumbFileName(id)}; skipped`
      );
      continue;
    }
    owners.set(id, file);
    const dest = join(dstDir, thumbFileName(id));
    if (!force && existsSync(dest)) {
      skipped++;
      continue;
    }
    try {
      await Bun.write(dest, await makeThumbnail(join(uploadDir, file)));
      made++;
    } catch (err) {
      failed++;
      console.error(`[backfill] ${file}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`[backfill] ${made} created, ${skipped} skipped, ${failed} failed (of ${files.length} images)`);
}

if (import.meta.main) await main();

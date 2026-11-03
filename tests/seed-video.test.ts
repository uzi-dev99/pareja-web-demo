/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * VK-544 (L2) — el demo tiene un video.
 *
 * Los dos videos del seed (mixkit) se sacaron porque su CDN ya no los
 * servía (403): el demo quedó sin un solo video y la galería sin la
 * insignia "Video". El seed vuelve a tener uno, de una fuente viva
 * (Wikimedia Commons, CC BY-SA 3.0, atribución en docs/stock-photos.md).
 *
 * ponytail: la prueba no sale a internet (la suite tiene que andar sin
 * red): comprueba que el video del seed está completo (url, póster,
 * duración). Que la url responde 200/206 se chequea con curl, no en la
 * suite.
 */

import { expect, test } from 'bun:test';
import { photos } from '../src/data/content';
import { isVideoUrl } from '../src/utils/carousel3d';

test('el seed tiene al menos un video, con póster y duración', () => {
  const videos = photos.filter((p) => p.mediaType === 'video' || isVideoUrl(p.filePath));
  expect(videos.length).toBeGreaterThan(0);
  for (const video of videos) {
    expect(video.filePath.startsWith('https://')).toBe(true);
    // the poster: the gallery draws the tile with it
    expect(video.thumbnailUrl).toBeTruthy();
    // the badge in the gallery shows the length
    expect(video.duration).toBeTruthy();
  }
});

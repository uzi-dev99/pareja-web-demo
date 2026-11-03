/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PWD-499 — the server mapper does not lie about the media type.
 *
 * The two seeded videos are photo rows whose file is a .mp4: the mapper
 * returned `mediaType: 'image'` and the mp4 as the thumbnail, so every
 * consumer that renders `thumbnailUrl || filePath` as an <img> drew a
 * broken tile (the hero marquee crossed them on every lap).
 */

import { expect, test } from 'bun:test';
import { rowToPhoto } from '../server/db';
import type { PhotoRow } from '../server/db';

const row = (filePath: string, originalName: string | null = null): PhotoRow => ({
  id: 'seed-video',
  bucket: 'public',
  carousel_event_id: null,
  position: null,
  file_path: filePath,
  original_name: originalName,
  caption: 'un video',
  month: 'Agosto',
  year: 2026,
  date_str: null,
  location: '',
  tags: '[]',
  created_at: 0
});

test('a photo row with a .mp4 file is a video, not an image', () => {
  const photo = rowToPhoto(row('https://assets.mixkit.co/videos/preview/clip-33318-large.mp4'));
  expect(photo.mediaType).toBe('video');
});

test('a video row never hands the video file as its thumbnail', () => {
  // el .mp4 como thumbnailUrl es lo que dibujaba la tile rota en la
  // galeria, el collage secreto y el editor de fotos
  const seeded = rowToPhoto(
    row('https://assets.mixkit.co/videos/preview/mixkit-cat-looking-around-with-curiosity-33318-large.mp4', 'video-michis-juego')
  );
  expect(seeded.mediaType).toBe('video');
  expect(seeded.thumbnailUrl).not.toContain('.mp4');
  // el seed trae un poster del video: la tile muestra la foto
  expect(seeded.thumbnailUrl).toContain('unsplash');

  // un video sin poster: sin miniatura, pero nunca el archivo de video
  const withoutPoster = rowToPhoto(row('https://example.com/clip.mp4'));
  expect(withoutPoster.thumbnailUrl).toBe('');
});

test('a photo row with an image file stays an image', () => {
  expect(rowToPhoto(row('/uploads/foto.jpg')).mediaType).toBe('image');
  expect(rowToPhoto(row('https://images.unsplash.com/photo-1.jpg')).mediaType).toBe('image');
});

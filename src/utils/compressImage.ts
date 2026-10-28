/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Client-side photo compression. The phone must not upload an 8 MB
 * original over a metered connection.
 *
 * ponytail: canvas + createImageBitmap, no library. We hand the upload
 * hook a smaller File with the same base name and a .jpg extension (the
 * server derives the stored extension from the file name).
 */

export const MAX_UPLOAD_SIDE = 2048;
export const UPLOAD_QUALITY = 0.8;
const COMPRESS_ABOVE_BYTES = 1024 * 1024;

/**
 * Returns a smaller File when the source is a big image, otherwise the
 * original file. Never throws: a format the browser cannot decode (HEIC)
 * or a canvas failure falls back to the untouched original.
 */
export async function compressImage(file: File): Promise<File> {
  try {
    // ponytail: compress by default — an unknown MIME (type === '') must
    // not skip the compression; only a known non-image does.
    if (file.type && !file.type.startsWith('image/')) return file;
    if (file.size <= COMPRESS_ABOVE_BYTES) return file;

    // ponytail: imageOrientation 'from-image' — iPhone photos carry the
    // rotation in EXIF; without it the canvas draw lands them sideways.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, MAX_UPLOAD_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    // ponytail: JPEG has no alpha — a transparent PNG would turn black.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', UPLOAD_QUALITY)
    );
    if (!blob) return file;
    // ponytail: never hand back something bigger than what we received.
    if (blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^./\\]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg', lastModified: file.lastModified });
  } catch {
    // ponytail: a failed compression must not block the upload.
    return file;
  }
}

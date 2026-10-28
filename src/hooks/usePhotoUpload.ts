/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared bulk-upload hook. Before this existed, Gallery and
 * SecretCollageModal each rolled their own (isUploading + progress +
 * try/finally + alert + reset input.value). The secret collage's
 * version had a real bug — it truncated to files[0] so a multi-file
 * selection silently uploaded just the first photo. Centralizing here
 * means a single line of code change fixes the regression across all
 * consumers and there is no third copy waiting to drift again.
 *
 * Usage:
 *   const { isUploading, progress, uploadFiles } = usePhotoUpload({
 *     addPhotos,
 *     onError: (err) => alert(`Error: ${err}`)
 *   });
 *   <input ref={ref} type="file" multiple onChange={(e) => {
 *     uploadFiles(e.target.files);
 *     e.target.value = '';   // ponytail: allow re-picking the same batch.
 *   }} />
 *
 * ponytail: 1 hook, 2 consumers today (Gallery, SecretCollageModal).
 * The Timeline birthday slot uses a different shape (base64 data URLs,
 * not the API) so it is NOT routed through this hook.
 */

import { useCallback, useState } from 'react';
import { Photo } from '../types';

export interface UsePhotoUploadOptions {
  /** ponytail: the addPhotos function from usePhotos — kept injected
   *  so the hook has zero coupling to a specific bucket. */
  addPhotos: (files: File[], opts: { onProgress?: (pct: number) => void }) => Promise<Photo[]>;
  /** Optional: how to surface upload errors. Defaults to `alert`. */
  onError?: (err: unknown) => void;
}

export interface UsePhotoUploadReturn {
  isUploading: boolean;
  progress: number;
  /** Upload every file in the input. No-op for empty FileList/array.
   *  Always resets `isUploading` and `progress` in a finally block,
   *  even on partial failure, so the UI never gets stuck mid-bar. */
  uploadFiles: (files: FileList | File[]) => Promise<Photo[]>;
}

export function usePhotoUpload(opts: UsePhotoUploadOptions): UsePhotoUploadReturn {
  const { addPhotos, onError = (err) => alert(String(err)) } = opts;
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFiles = useCallback(
    async (files: FileList | File[]): Promise<Photo[]> => {
      // ponytail: FileList is iterable but not an Array — normalise so
      // addPhotos (which already accepts File[]) sees the right shape.
      const list = Array.from(files);
      if (list.length === 0) return [];
      setIsUploading(true);
      setProgress(0);
      try {
        return await addPhotos(list, { onProgress: setProgress });
      } catch (err) {
        onError(err);
        return [];
      } finally {
        setIsUploading(false);
        setProgress(0);
      }
    },
    [addPhotos, onError]
  );

  return { isUploading, progress, uploadFiles };
}
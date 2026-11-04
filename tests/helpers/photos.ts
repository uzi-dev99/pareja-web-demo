/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The shared `usePhotos('public')` instance (App owns it in the app).
 *
 * ponytail: the tests that mount ONLY the Gallery need an instance
 * without a React tree above it: this is the same shape the hook
 * returns, with the mutators the test wants to spy on.
 */

import type { PhotosApi } from '../../src/hooks/usePhotos';
import type { Photo } from '../../src/types';

export function fakePhotosApi(over: Partial<PhotosApi> = {}): PhotosApi {
  return {
    photos: [] as Photo[],
    loading: false,
    error: null,
    refresh: async () => {},
    addPhotos: async () => [],
    updatePhoto: async () => {
      throw new Error('updatePhoto no está preparado en este test');
    },
    deletePhoto: async () => {},
    deleteAll: async () => 0,
    ...over
  };
}

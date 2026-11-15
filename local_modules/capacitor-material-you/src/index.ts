/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { registerPlugin } from '@capacitor/core';

import type { MaterialYouPlugin } from './definitions.js';

export const MaterialYou = registerPlugin<MaterialYouPlugin>('MaterialYou', {
  web: () => import('./web.js').then((m) => new m.MaterialYouWeb()),
});

export * from './definitions.js';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { registerPlugin } from '@capacitor/core';
export const MaterialYou = registerPlugin('MaterialYou', {
    web: () => import('./web.js').then((m) => new m.MaterialYouWeb()),
});
export * from './definitions.js';

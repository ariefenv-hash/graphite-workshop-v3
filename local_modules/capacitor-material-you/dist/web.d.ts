/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { WebPlugin } from '@capacitor/core';
import type { MaterialYouAvailability, MaterialYouColorsPayload, MaterialYouPlugin } from './definitions.js';
/**
 * Web fallback: there is no web API for Material You dynamic colors, so the
 * web implementation always reports "unavailable". It still reports the
 * browser's `prefers-color-scheme` so callers can sync dark mode uniformly.
 */
export declare class MaterialYouWeb extends WebPlugin implements MaterialYouPlugin {
    isAvailable(): Promise<MaterialYouAvailability>;
    getSystemColors(): Promise<MaterialYouColorsPayload>;
}

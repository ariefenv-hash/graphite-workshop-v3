/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { WebPlugin } from '@capacitor/core';
/**
 * Web fallback: there is no web API for Material You dynamic colors, so the
 * web implementation always reports "unavailable". It still reports the
 * browser's `prefers-color-scheme` so callers can sync dark mode uniformly.
 */
export class MaterialYouWeb extends WebPlugin {
    async isAvailable() {
        return { available: false, monetAvailable: false, sdkInt: 0 };
    }
    async getSystemColors() {
        const isDark = typeof window !== 'undefined' && typeof window.matchMedia === 'function'
            ? window.matchMedia('(prefers-color-scheme: dark)').matches
            : false;
        return {
            available: false,
            monetAvailable: false,
            source: 'none',
            isDark,
            sdkInt: 0,
            light: null,
            dark: null,
            seedHex: null,
        };
    }
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import type { Plugin } from '@capacitor/core';
/** Where the returned palette came from. */
export type MaterialYouColorSource = 
/** Android 12+ Monet dynamic color — full role set resolved natively. */
'monet'
/** Android 8.1+ WallpaperColors primary color used as a seed. */
 | 'wallpaper'
/** Nothing usable (plain browser, very old device, or wallpaper unreadable). */
 | 'none';
/**
 * Full payload returned by `getSystemColors()`.
 *
 * Color role keys use the standard MD3 camelCase naming and map 1:1 onto a
 * Material 3 scheme (`primary`, `onPrimary`, `primaryContainer`, ...,
 * `surfaceContainerHighest`). Values are opaque hex strings like `#9A5400`.
 */
export interface MaterialYouColorsPayload {
    /** True when usable colors were found (Monet roles or a wallpaper seed). */
    available: boolean;
    /** True when Android 12+ Monet dynamic color is usable on this device. */
    monetAvailable: boolean;
    /** Where the palette came from. */
    source: MaterialYouColorSource;
    /** System dark mode (uiMode) at probe time. */
    isDark: boolean;
    /** Android SDK level of the device (e.g. 31 for Android 12). */
    sdkInt: number;
    /** MD3 role set for the light scheme. `null` unless `source === 'monet'`. */
    light: Record<string, string> | null;
    /** MD3 role set for the dark scheme. `null` unless `source === 'monet'`. */
    dark: Record<string, string> | null;
    /**
     * Wallpaper seed color (`WallpaperColors.primaryColor`, Android 8.1+).
     * Also present when `source === 'monet'`, as a fallback seed for the web side.
     */
    seedHex: string | null;
}
export interface MaterialYouAvailability {
    available: boolean;
    monetAvailable: boolean;
    sdkInt: number;
}
export interface MaterialYouPlugin extends Plugin {
    /**
     * Quick capability check without resolving colors.
     * `available === monetAvailable` today; kept separate for future sources.
     */
    isAvailable(): Promise<MaterialYouAvailability>;
    /**
     * Resolve the current system palette.
     *
     * On Android 12+ this reads the exact Material You (Monet) roles the system
     * UI itself uses — including the wallpaper style picked by the user in
     * "Wallpaper & style". On older devices it falls back to the wallpaper's
     * primary color as a seed. Call it again when the app resumes to pick up
     * wallpaper changes.
     */
    getSystemColors(): Promise<MaterialYouColorsPayload>;
}

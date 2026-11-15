/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { MD3_SCHEMES, Md3ColorScheme, ThemeId } from './md3Tokens';
import { getRippleRenderer, RippleDebugSample } from './RippleShader';

interface Md3ThemeContextValue {
  scheme: Md3ColorScheme;
  themeId: ThemeId;
  darkMode: boolean;
  reducedMotion: boolean;
  noFlashVisuals: boolean;
  webglSupported: boolean;
  setThemeId: (id: ThemeId) => void;
  setDarkMode: (dark: boolean) => void;
  setReducedMotion: (reduced: boolean) => void;
  setNoFlashVisuals: (noFlash: boolean) => void;
  /** 壁纸取色得到的强调色；null = 用内置漆色方案 */
  customAccent: string | null;
  setCustomAccent: (hex: string | null) => void;
  lastUniformsDebug: RippleDebugSample | null;
  reportDebugSample: (sample: RippleDebugSample) => void;
}

/** 十六进制 → RGB（兼容 #RGB / #RRGGBB） */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
}
function mixHex(a: string, b: string, weightB: number): string {
  const x = hexToRgb(a) ?? { r: 0, g: 0, b: 0 };
  const y = hexToRgb(b) ?? { r: 255, g: 255, b: 255 };
  const f = (u: number, v: number) => Math.round(u * (1 - weightB) + v * weightB).toString(16).padStart(2, '0');
  return '#' + f(x.r, y.r) + f(x.g, y.g) + f(x.b, y.b);
}

const Md3ThemeContext = createContext<Md3ThemeContextValue | null>(null);

export const Md3ThemeProvider: React.FC<{
  children: React.ReactNode;
  initialThemeId?: ThemeId;
}> = ({ children, initialThemeId = 'cedar' }) => {
  const [themeId, setThemeId] = useState<ThemeId>(initialThemeId);
  const [darkMode, setDarkMode] = useState(false);
  const [noFlashVisuals, setNoFlashVisuals] = useState(false);
  const [customAccent, setCustomAccent] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
  const [lastUniformsDebug, setLastUniformsDebug] = useState<RippleDebugSample | null>(null);

  const renderer = useMemo(() => getRippleRenderer(), []);
  const scheme = useMemo(() => {
    const base = darkMode ? MD3_SCHEMES[themeId].dark : MD3_SCHEMES[themeId].light;
    if (!customAccent) return base;
    const rgb = hexToRgb(customAccent) ?? { r: 143, g: 78, b: 0 };
    const lum = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
    const on = lum > 150 ? '#1B1410' : '#FFFDF9';
    const soft = mixHex(customAccent, darkMode ? '#151210' : '#FFFFFF', darkMode ? 0.78 : 0.86);
    const onSoft = lum > 150 ? '#1B1410' : mixHex(customAccent, '#FFFFFF', 0.12);
    return {
      ...base,
      primary: customAccent, onPrimary: on,
      primaryContainer: soft, onPrimaryContainer: onSoft,
      tertiary: customAccent, onTertiary: on,
      tertiaryContainer: soft, onTertiaryContainer: onSoft,
    } as Md3ColorScheme;
  }, [themeId, darkMode, customAccent]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', darkMode);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', scheme.surface);
    }
  }, [darkMode, scheme.surface]);

  const value = useMemo<Md3ThemeContextValue>(
    () => ({
      scheme,
      themeId,
      darkMode,
      reducedMotion,
      noFlashVisuals,
      webglSupported: renderer.webglAvailable,
      setThemeId,
      setDarkMode,
      setReducedMotion,
      setNoFlashVisuals,
      customAccent,
      setCustomAccent,
      lastUniformsDebug,
      reportDebugSample: setLastUniformsDebug,
    }),
    [scheme, themeId, darkMode, reducedMotion, noFlashVisuals, customAccent, renderer.webglAvailable, lastUniformsDebug]
  );

  return <Md3ThemeContext.Provider value={value}>{children}</Md3ThemeContext.Provider>;
};

export function useMd3Theme(): Md3ThemeContextValue {
  const ctx = useContext(Md3ThemeContext);
  if (!ctx) {
    throw new Error('useMd3Theme must be used within Md3ThemeProvider');
  }
  return ctx;
}

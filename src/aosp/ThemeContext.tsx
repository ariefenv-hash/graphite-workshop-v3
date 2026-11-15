/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MD3_SCHEMES, Md3ColorScheme, ThemeId } from './md3Tokens';
import { getRippleRenderer, RippleDebugSample } from './RippleShader';
import { monetStore, MonetState } from './systemTheme/monetStore';
import { useMonetTheme } from './systemTheme/useMonetTheme';

/**
 * 深色模式手动覆盖的持久化 key。null = 跟随系统（原生 uiMode 或浏览器
 * prefers-color-scheme）；true/false = 用户在应用内手动覆盖过。
 */
const DARK_OVERRIDE_KEY = 'graphite_dark_override_v1';

function readDarkOverride(): boolean | null {
  try {
    const raw = window.localStorage.getItem(DARK_OVERRIDE_KEY);
    return raw === 'true' ? true : raw === 'false' ? false : null;
  } catch {
    return null;
  }
}

function writeDarkOverride(value: boolean | null): void {
  try {
    if (value === null) {
      window.localStorage.removeItem(DARK_OVERRIDE_KEY);
    } else {
      window.localStorage.setItem(DARK_OVERRIDE_KEY, String(value));
    }
  } catch {
    // ignore storage quota errors
  }
}

interface Md3ThemeContextValue {
  scheme: Md3ColorScheme;
  themeId: ThemeId;
  darkMode: boolean;
  /** true = 深浅色跟随系统（用户未手动覆盖过）。 */
  darkFollowsSystem: boolean;
  /** 手机主题（Material You）探测状态与运行时色板。 */
  monet: MonetState;
  reducedMotion: boolean;
  noFlashVisuals: boolean;
  webglSupported: boolean;
  setThemeId: (id: ThemeId) => void;
  setDarkMode: (dark: boolean) => void;
  /** 清除深浅色手动覆盖，恢复跟随系统。 */
  resetDarkModeOverride: () => void;
  /** 内置降级：从壁纸截图提取种子色并应用（canvas + material-color-utilities）。 */
  applyScreenshotSeed: (blob: Blob) => Promise<void>;
  setReducedMotion: (reduced: boolean) => void;
  setNoFlashVisuals: (noFlash: boolean) => void;
  lastUniformsDebug: RippleDebugSample | null;
  reportDebugSample: (sample: RippleDebugSample) => void;
}

const Md3ThemeContext = createContext<Md3ThemeContextValue | null>(null);

export const Md3ThemeProvider: React.FC<{
  children: React.ReactNode;
  initialThemeId?: ThemeId;
}> = ({ children, initialThemeId = 'cedar' }) => {
  const monet = useMonetTheme();
  const [themeId, setThemeId] = useState<ThemeId>(initialThemeId);
  const [darkOverride, setDarkOverride] = useState<boolean | null>(readDarkOverride);
  const [noFlashVisuals, setNoFlashVisuals] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
  const [lastUniformsDebug, setLastUniformsDebug] = useState<RippleDebugSample | null>(null);

  const renderer = useMemo(() => getRippleRenderer(), []);

  // 深浅色：手动覆盖优先，否则跟随系统（monet.isDark 同时覆盖原生
  // uiMode 上报与浏览器 prefers-color-scheme 两条来源）。
  const darkMode = darkOverride ?? monet.isDark;

  const scheme = useMemo<Md3ColorScheme>(() => {
    if (themeId === 'monet') {
      const dynamic = darkMode ? monet.darkScheme : monet.lightScheme;
      // 动态色板尚未就绪时使用占位色板（graphite 基线），保证首帧完整。
      return dynamic ?? (darkMode ? MD3_SCHEMES.monet.dark : MD3_SCHEMES.monet.light);
    }
    return darkMode ? MD3_SCHEMES[themeId].dark : MD3_SCHEMES[themeId].light;
  }, [themeId, darkMode, monet.darkScheme, monet.lightScheme]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.classList.toggle('dark', darkMode);
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', scheme.surface);
    }
  }, [darkMode, scheme.surface]);

  const setDarkMode = useCallback((dark: boolean) => {
    setDarkOverride(dark);
    writeDarkOverride(dark);
  }, []);

  const resetDarkModeOverride = useCallback(() => {
    setDarkOverride(null);
    writeDarkOverride(null);
  }, []);

  const applyScreenshotSeed = useCallback(async (blob: Blob) => {
    await monetStore.applyScreenshotSeed(blob);
  }, []);

  const value = useMemo<Md3ThemeContextValue>(
    () => ({
      scheme,
      themeId,
      darkMode,
      darkFollowsSystem: darkOverride === null,
      monet,
      reducedMotion,
      noFlashVisuals,
      webglSupported: renderer.webglAvailable,
      setThemeId,
      setDarkMode,
      resetDarkModeOverride,
      applyScreenshotSeed,
      setReducedMotion,
      setNoFlashVisuals,
      lastUniformsDebug,
      reportDebugSample: setLastUniformsDebug,
    }),
    [
      scheme,
      themeId,
      darkMode,
      darkOverride,
      monet,
      reducedMotion,
      noFlashVisuals,
      renderer.webglAvailable,
      lastUniformsDebug,
      setDarkMode,
      resetDarkModeOverride,
      applyScreenshotSeed,
    ]
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

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
  lastUniformsDebug: RippleDebugSample | null;
  reportDebugSample: (sample: RippleDebugSample) => void;
}

const Md3ThemeContext = createContext<Md3ThemeContextValue | null>(null);

export const Md3ThemeProvider: React.FC<{
  children: React.ReactNode;
  initialThemeId?: ThemeId;
}> = ({ children, initialThemeId = 'cedar' }) => {
  const [themeId, setThemeId] = useState<ThemeId>(initialThemeId);
  const [darkMode, setDarkMode] = useState(false);
  const [noFlashVisuals, setNoFlashVisuals] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
  const [lastUniformsDebug, setLastUniformsDebug] = useState<RippleDebugSample | null>(null);

  const renderer = useMemo(() => getRippleRenderer(), []);
  const scheme = useMemo(
    () => (darkMode ? MD3_SCHEMES[themeId].dark : MD3_SCHEMES[themeId].light),
    [themeId, darkMode]
  );

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
      lastUniformsDebug,
      reportDebugSample: setLastUniformsDebug,
    }),
    [scheme, themeId, darkMode, reducedMotion, noFlashVisuals, renderer.webglAvailable, lastUniformsDebug]
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

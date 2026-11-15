/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ported from AOSP Jetpack Compose Material 3 Tokens:
 * - androidx.compose.material3.tokens.ColorLightTokens / ColorDarkTokens
 * - androidx.compose.material3.tokens.ShapeTokens
 * - androidx.compose.material3.tokens.StateTokens
 * - androidx.compose.material3.tokens.MotionTokens & ExpressiveMotionTokens
 * - androidx.compose.material3.tokens.ElevationTokens
 */

export type ThemeId = 'cedar' | 'graphite' | 'prussian';

export interface Md3ColorScheme {
  id: ThemeId;
  label: string;
  lacquerName: string;
  seedHex: string;

  // Primary role
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;

  // Secondary role
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;

  // Tertiary role
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;

  // Surface hierarchy (AOSP Material 3 tonal surface roles)
  surface: string;
  surfaceDim: string;
  surfaceBright: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
  onSurface: string;
  onSurfaceVariant: string;

  // Inverse roles (Snackbar / Tooltip)
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;

  // Outline & semantic roles
  outline: string;
  outlineVariant: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  success: string;
  onSuccess: string;
  successContainer: string;
  onSuccessContainer: string;

  // Shader channels (Framework Ripple & SystemUI Trade Ripple)
  rippleWaveRgba: [number, number, number, number];
  rippleSparkleRgba: [number, number, number, number];
  lacquerTintRgba: [number, number, number, number];
  tradeWaveRgba: [number, number, number, number];
  tradeGoldSparkleRgba: [number, number, number, number];
}

export const MD3_SCHEMES: Record<ThemeId, { light: Md3ColorScheme; dark: Md3ColorScheme }> = {
  cedar: {
    light: {
      id: 'cedar',
      label: '木杆黄 · Cedar',
      lacquerName: '经典加州雪松黄',
      seedHex: '#B4690E',
      primary: '#9A5400',
      onPrimary: '#FFFFFF',
      primaryContainer: '#FFDCBD',
      onPrimaryContainer: '#331A00',
      secondary: '#755842',
      onSecondary: '#FFFFFF',
      secondaryContainer: '#FDE0C8',
      onSecondaryContainer: '#2A1707',
      tertiary: '#5A6237',
      onTertiary: '#FFFFFF',
      tertiaryContainer: '#DEE8B1',
      onTertiaryContainer: '#171E00',
      surface: '#FCF8F3',
      surfaceDim: '#EFE9E1',
      surfaceBright: '#FCF8F3',
      surfaceContainerLowest: '#FFFFFF',
      surfaceContainerLow: '#F7F2EB',
      surfaceContainer: '#F1ECE4',
      surfaceContainerHigh: '#EAE4DA',
      surfaceContainerHighest: '#E4DDD3',
      onSurface: '#201B16',
      onSurfaceVariant: '#51443A',
      inverseSurface: '#352F2A',
      inverseOnSurface: '#FAEEE4',
      inversePrimary: '#FFB86F',
      outline: '#847468',
      outlineVariant: '#D6C4B6',
      error: '#BA1A1A',
      onError: '#FFFFFF',
      errorContainer: '#FFDAD6',
      onErrorContainer: '#410002',
      success: '#1D6B42',
      onSuccess: '#FFFFFF',
      successContainer: '#D2F2DC',
      onSuccessContainer: '#002111',
      rippleWaveRgba: [0.22, 0.19, 0.17, 0.18],
      rippleSparkleRgba: [0.24, 0.22, 0.21, 0.85],
      lacquerTintRgba: [0.85, 0.56, 0.08, 0.45],
      tradeWaveRgba: [0.6, 0.33, 0.0, 0.42],
      tradeGoldSparkleRgba: [0.96, 0.75, 0.18, 0.95],
    },
    dark: {
      id: 'cedar',
      label: '木杆黄 · Cedar',
      lacquerName: '经典加州雪松黄',
      seedHex: '#B4690E',
      primary: '#FFB86F',
      onPrimary: '#522A00',
      primaryContainer: '#743E00',
      onPrimaryContainer: '#FFDCBD',
      secondary: '#E4BFA3',
      onSecondary: '#422B18',
      secondaryContainer: '#5B402D',
      onSecondaryContainer: '#FDE0C8',
      tertiary: '#C2CB96',
      onTertiary: '#2C340E',
      tertiaryContainer: '#434B22',
      onTertiaryContainer: '#DEE8B1',
      surface: '#17130F',
      surfaceDim: '#120E0B',
      surfaceBright: '#3D3731',
      surfaceContainerLowest: '#100C09',
      surfaceContainerLow: '#1F1A15',
      surfaceContainer: '#241F19',
      surfaceContainerHigh: '#2E2822',
      surfaceContainerHighest: '#39332C',
      onSurface: '#EBE1D8',
      onSurfaceVariant: '#D6C4B6',
      inverseSurface: '#EBE1D8',
      inverseOnSurface: '#352F2A',
      inversePrimary: '#9A5400',
      outline: '#9E8E81',
      outlineVariant: '#51443A',
      error: '#FFB4AB',
      onError: '#690005',
      errorContainer: '#93000A',
      onErrorContainer: '#FFDAD6',
      success: '#7AD9A3',
      onSuccess: '#00391D',
      successContainer: '#0F5230',
      onSuccessContainer: '#97F6BE',
      rippleWaveRgba: [0.95, 0.78, 0.52, 0.2],
      rippleSparkleRgba: [0.76, 0.78, 0.82, 0.88],
      lacquerTintRgba: [0.96, 0.68, 0.16, 0.42],
      tradeWaveRgba: [1.0, 0.72, 0.44, 0.45],
      tradeGoldSparkleRgba: [1.0, 0.85, 0.35, 0.96],
    },
  },
  graphite: {
    light: {
      id: 'graphite',
      label: '石墨黑 · Graphite',
      lacquerName: '2B 哑光石墨灰',
      seedHex: '#43474E',
      primary: '#3B424C',
      onPrimary: '#FFFFFF',
      primaryContainer: '#DCE2EC',
      onPrimaryContainer: '#151B23',
      secondary: '#565F6C',
      onSecondary: '#FFFFFF',
      secondaryContainer: '#E2E6ED',
      onSecondaryContainer: '#191D24',
      tertiary: '#785A2B',
      onTertiary: '#FFFFFF',
      tertiaryContainer: '#FFDEAD',
      onTertiaryContainer: '#291800',
      surface: '#F7F8FA',
      surfaceDim: '#E6E8EC',
      surfaceBright: '#F7F8FA',
      surfaceContainerLowest: '#FFFFFF',
      surfaceContainerLow: '#F1F3F6',
      surfaceContainer: '#ECEEF2',
      surfaceContainerHigh: '#E4E7EC',
      surfaceContainerHighest: '#DCE0E6',
      onSurface: '#191C20',
      onSurfaceVariant: '#44474E',
      inverseSurface: '#2E3136',
      inverseOnSurface: '#EFF1F5',
      inversePrimary: '#BFC7D4',
      outline: '#74777F',
      outlineVariant: '#C4C6CE',
      error: '#BA1A1A',
      onError: '#FFFFFF',
      errorContainer: '#FFDAD6',
      onErrorContainer: '#410002',
      success: '#1B6E47',
      onSuccess: '#FFFFFF',
      successContainer: '#CEEFDC',
      onSuccessContainer: '#002112',
      rippleWaveRgba: [0.16, 0.17, 0.2, 0.2],
      rippleSparkleRgba: [0.18, 0.19, 0.22, 0.92],
      lacquerTintRgba: [0.35, 0.38, 0.42, 0.35],
      tradeWaveRgba: [0.23, 0.26, 0.3, 0.42],
      tradeGoldSparkleRgba: [0.94, 0.72, 0.22, 0.95],
    },
    dark: {
      id: 'graphite',
      label: '石墨黑 · Graphite',
      lacquerName: '2B 哑光石墨灰',
      seedHex: '#43474E',
      primary: '#BFC7D4',
      onPrimary: '#242A33',
      primaryContainer: '#3B424C',
      onPrimaryContainer: '#DCE2EC',
      secondary: '#BEC6D2',
      onSecondary: '#28303B',
      secondaryContainer: '#3E4550',
      onSecondaryContainer: '#DAE2EE',
      tertiary: '#E8C089',
      onTertiary: '#442C05',
      tertiaryContainer: '#5E4215',
      onTertiaryContainer: '#FFDEAD',
      surface: '#111316',
      surfaceDim: '#0D0F12',
      surfaceBright: '#363940',
      surfaceContainerLowest: '#0B0D0F',
      surfaceContainerLow: '#191C20',
      surfaceContainer: '#1E2126',
      surfaceContainerHigh: '#282C32',
      surfaceContainerHighest: '#32373E',
      onSurface: '#E2E4E9',
      onSurfaceVariant: '#C4C6CE',
      inverseSurface: '#E2E4E9',
      inverseOnSurface: '#2E3136',
      inversePrimary: '#3B424C',
      outline: '#8E9199',
      outlineVariant: '#44474E',
      error: '#FFB4AB',
      onError: '#690005',
      errorContainer: '#93000A',
      onErrorContainer: '#FFDAD6',
      success: '#7AD9A3',
      onSuccess: '#00391E',
      successContainer: '#0F5230',
      onSuccessContainer: '#97F6BE',
      rippleWaveRgba: [0.76, 0.79, 0.84, 0.22],
      rippleSparkleRgba: [0.85, 0.87, 0.91, 0.9],
      lacquerTintRgba: [0.58, 0.62, 0.68, 0.38],
      tradeWaveRgba: [0.75, 0.78, 0.83, 0.45],
      tradeGoldSparkleRgba: [1.0, 0.84, 0.34, 0.95],
    },
  },
  prussian: {
    light: {
      id: 'prussian',
      label: '普鲁士蓝 · Prussian',
      lacquerName: '制图师普鲁士漆',
      seedHex: '#1D4E89',
      primary: '#1D4E89',
      onPrimary: '#FFFFFF',
      primaryContainer: '#D5E3FF',
      onPrimaryContainer: '#001B3C',
      secondary: '#545F71',
      onSecondary: '#FFFFFF',
      secondaryContainer: '#D7E3F7',
      onSecondaryContainer: '#111C2B',
      tertiary: '#7C580E',
      onTertiary: '#FFFFFF',
      tertiaryContainer: '#FFDF9F',
      onTertiaryContainer: '#271900',
      surface: '#F8F9FD',
      surfaceDim: '#E7EBF3',
      surfaceBright: '#F8F9FD',
      surfaceContainerLowest: '#FFFFFF',
      surfaceContainerLow: '#F2F4F9',
      surfaceContainer: '#ECEFF5',
      surfaceContainerHigh: '#E5E9F0',
      surfaceContainerHighest: '#DFE3EB',
      onSurface: '#181C22',
      onSurfaceVariant: '#43474E',
      inverseSurface: '#2D3138',
      inverseOnSurface: '#EFF1F8',
      inversePrimary: '#A6C8FF',
      outline: '#73777F',
      outlineVariant: '#C3C7CF',
      error: '#BA1A1A',
      onError: '#FFFFFF',
      errorContainer: '#FFDAD6',
      onErrorContainer: '#410002',
      success: '#186B46',
      onSuccess: '#FFFFFF',
      successContainer: '#CCEEDB',
      onSuccessContainer: '#002112',
      rippleWaveRgba: [0.11, 0.31, 0.54, 0.18],
      rippleSparkleRgba: [0.22, 0.25, 0.3, 0.88],
      lacquerTintRgba: [0.11, 0.31, 0.54, 0.45],
      tradeWaveRgba: [0.11, 0.31, 0.54, 0.45],
      tradeGoldSparkleRgba: [0.96, 0.75, 0.22, 0.95],
    },
    dark: {
      id: 'prussian',
      label: '普鲁士蓝 · Prussian',
      lacquerName: '制图师普鲁士漆',
      seedHex: '#1D4E89',
      primary: '#A6C8FF',
      onPrimary: '#003062',
      primaryContainer: '#00468C',
      onPrimaryContainer: '#D5E3FF',
      secondary: '#BBC7DB',
      onSecondary: '#263141',
      secondaryContainer: '#3C4758',
      onSecondaryContainer: '#D7E3F7',
      tertiary: '#F0C07A',
      onTertiary: '#432C00',
      tertiaryContainer: '#694303',
      onTertiaryContainer: '#FFDF9F',
      surface: '#101318',
      surfaceDim: '#0C0E13',
      surfaceBright: '#353941',
      surfaceContainerLowest: '#0A0C10',
      surfaceContainerLow: '#181C22',
      surfaceContainer: '#1C2027',
      surfaceContainerHigh: '#262B33',
      surfaceContainerHighest: '#313640',
      onSurface: '#E2E4EB',
      onSurfaceVariant: '#C3C7CF',
      inverseSurface: '#E2E4EB',
      inverseOnSurface: '#2D3138',
      inversePrimary: '#1D4E89',
      outline: '#8D9199',
      outlineVariant: '#43474E',
      error: '#FFB4AB',
      onError: '#690005',
      errorContainer: '#93000A',
      onErrorContainer: '#FFDAD6',
      success: '#7AD9A3',
      onSuccess: '#00391E',
      successContainer: '#0F5230',
      onSuccessContainer: '#97F6BE',
      rippleWaveRgba: [0.65, 0.78, 1.0, 0.2],
      rippleSparkleRgba: [0.8, 0.85, 0.95, 0.88],
      lacquerTintRgba: [0.35, 0.62, 0.95, 0.42],
      tradeWaveRgba: [0.65, 0.78, 1.0, 0.48],
      tradeGoldSparkleRgba: [1.0, 0.84, 0.34, 0.95],
    },
  },
};

/**
 * AOSP androidx.compose.material3.tokens.StateTokens
 */
export const StateTokens = {
  HOVER_STATE_LAYER_OPACITY: 0.08,
  FOCUS_STATE_LAYER_OPACITY: 0.1,
  PRESSED_STATE_LAYER_OPACITY: 0.1,
  DRAGGED_STATE_LAYER_OPACITY: 0.16,
  DISABLED_CONTAINER_OPACITY: 0.12,
  DISABLED_CONTENT_OPACITY: 0.38,
} as const;

/**
 * AOSP androidx.compose.material3.tokens.ShapeTokens
 */
export const ShapeTokens = {
  CORNER_NONE_PX: 0,
  CORNER_EXTRA_SMALL_PX: 4,
  CORNER_SMALL_PX: 8,
  CORNER_MEDIUM_PX: 12,
  CORNER_LARGE_PX: 16,
  CORNER_EXTRA_LARGE_PX: 28,
} as const;

/**
 * AOSP androidx.compose.material3.tokens.ExpressiveMotionTokens & MotionTokens
 * Spatial springs allow controlled overshoot; Effects springs are critically damped (dampingRatio = 1.0).
 */
export const ExpressiveMotionTokens = {
  FAST_SPATIAL: { dampingRatio: 0.6, stiffness: 800 },
  DEFAULT_SPATIAL: { dampingRatio: 0.8, stiffness: 380 },
  SLOW_SPATIAL: { dampingRatio: 0.8, stiffness: 200 },
  FAST_EFFECTS: { dampingRatio: 1.0, stiffness: 3800 },
  DEFAULT_EFFECTS: { dampingRatio: 1.0, stiffness: 1600 },
  SLOW_EFFECTS: { dampingRatio: 1.0, stiffness: 800 },
  EMPHASIZED_DECELERATE_CSS: 'cubic-bezier(0.05, 0.7, 0.1, 1.0)',
  EMPHASIZED_ACCELERATE_CSS: 'cubic-bezier(0.3, 0.0, 0.8, 0.15)',
  STANDARD_CSS: 'cubic-bezier(0.2, 0.0, 0.0, 1.0)',
} as const;

export const ElevationTokens = {
  LEVEL_0: 'none',
  LEVEL_1: '0 1px 2px rgba(0, 0, 0, 0.06), 0 1px 3px 1px rgba(0, 0, 0, 0.04)',
  LEVEL_2: '0 1px 2px rgba(0, 0, 0, 0.08), 0 2px 6px 2px rgba(0, 0, 0, 0.05)',
  LEVEL_3: '0 4px 8px 3px rgba(0, 0, 0, 0.07), 0 1px 3px rgba(0, 0, 0, 0.09)',
} as const;

/**
 * Utility to compute translucent state-layer tint from an RGB/Hex color.
 */
export function hexWithAlpha(hex: string, alpha: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 把「系统手机主题色」翻译成石墨工坊的 Md3ColorScheme。
 *
 * 三级来源（优先级从高到低）：
 *  1. source='monet'      — Android 12+ 原生桥回传的完整 31 角色色板
 *                            （与系统 UI 同源，含用户选择的调色风格）
 *  2. source='wallpaper'  — Android 8.1+ 壁纸种子色，用
 *                            @material/material-color-utilities（与系统同一算法
 *                            家族）生成完整色板
 *  3. source='screenshot' — canvas 截图取色得到的种子色，同上生成
 *
 * 任何来源缺角色（例如宿主 material 版本过旧导致个别 attr 未解析）时，
 * 自动用种子色生成的色板补齐；无种子色时回退到 graphite 种子。
 */

import {
  argbFromHex,
  hexFromArgb,
  Hct,
  MaterialDynamicColors,
  SchemeTonalSpot,
} from '@material/material-color-utilities';
import type { DynamicColor, DynamicScheme } from '@material/material-color-utilities';
import { MD3_SCHEMES, Md3ColorScheme, ThemeId } from '../md3Tokens';
import { rgbaFloats } from './colorMath';
import type { MonetSource, PartialSystemColorRoles, SystemColorRoles } from './materialYouTypes';

export const MONET_THEME_ID: ThemeId = 'monet';

/** 没有任何种子色可用时的兜底种子（graphite 种子，保证 UI 永远有完整色板）。 */
export const MONET_FALLBACK_SEED = '#43474E';

/** 主题循环里展示给用户的标签。 */
export const MONET_LABEL = '手机主题 · Material You';

export const MONET_LACQUER_NAMES: Record<MonetSource, string> = {
  monet: '跟随手机壁纸 · Material You',
  wallpaper: '壁纸取色 · Material You',
  screenshot: '截图取色 · Material You',
  none: '等待系统取色 · Material You',
};

/** 标准 MD3 色彩角色 key（与 Md3ColorScheme 中的同名标准字段完全一致）。 */
const ROLE_KEYS = [
  'primary',
  'onPrimary',
  'primaryContainer',
  'onPrimaryContainer',
  'secondary',
  'onSecondary',
  'secondaryContainer',
  'onSecondaryContainer',
  'tertiary',
  'onTertiary',
  'tertiaryContainer',
  'onTertiaryContainer',
  'surface',
  'surfaceDim',
  'surfaceBright',
  'surfaceContainerLowest',
  'surfaceContainerLow',
  'surfaceContainer',
  'surfaceContainerHigh',
  'surfaceContainerHighest',
  'onSurface',
  'onSurfaceVariant',
  'inverseSurface',
  'inverseOnSurface',
  'inversePrimary',
  'outline',
  'outlineVariant',
  'error',
  'onError',
  'errorContainer',
  'onErrorContainer',
] as const;

type RoleKey = (typeof ROLE_KEYS)[number];

/** 角色 key -> material-color-utilities 0.4.x 的 DynamicColor 求解器。 */
const ROLE_RESOLVERS: Record<RoleKey, DynamicColor> = {
  primary: MaterialDynamicColors.primary,
  onPrimary: MaterialDynamicColors.onPrimary,
  primaryContainer: MaterialDynamicColors.primaryContainer,
  onPrimaryContainer: MaterialDynamicColors.onPrimaryContainer,
  secondary: MaterialDynamicColors.secondary,
  onSecondary: MaterialDynamicColors.onSecondary,
  secondaryContainer: MaterialDynamicColors.secondaryContainer,
  onSecondaryContainer: MaterialDynamicColors.onSecondaryContainer,
  tertiary: MaterialDynamicColors.tertiary,
  onTertiary: MaterialDynamicColors.onTertiary,
  tertiaryContainer: MaterialDynamicColors.tertiaryContainer,
  onTertiaryContainer: MaterialDynamicColors.onTertiaryContainer,
  surface: MaterialDynamicColors.surface,
  surfaceDim: MaterialDynamicColors.surfaceDim,
  surfaceBright: MaterialDynamicColors.surfaceBright,
  surfaceContainerLowest: MaterialDynamicColors.surfaceContainerLowest,
  surfaceContainerLow: MaterialDynamicColors.surfaceContainerLow,
  surfaceContainer: MaterialDynamicColors.surfaceContainer,
  surfaceContainerHigh: MaterialDynamicColors.surfaceContainerHigh,
  surfaceContainerHighest: MaterialDynamicColors.surfaceContainerHighest,
  onSurface: MaterialDynamicColors.onSurface,
  onSurfaceVariant: MaterialDynamicColors.onSurfaceVariant,
  inverseSurface: MaterialDynamicColors.inverseSurface,
  inverseOnSurface: MaterialDynamicColors.inverseOnSurface,
  inversePrimary: MaterialDynamicColors.inversePrimary,
  outline: MaterialDynamicColors.outline,
  outlineVariant: MaterialDynamicColors.outlineVariant,
  error: MaterialDynamicColors.error,
  onError: MaterialDynamicColors.onError,
  errorContainer: MaterialDynamicColors.errorContainer,
  onErrorContainer: MaterialDynamicColors.onErrorContainer,
};

const HEX_ROLE_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/** 用种子色（与系统 Monet 同源的 TonalSpot 规格）生成完整角色集合。 */
function rolesFromSeed(seedHex: string, isDark: boolean): SystemColorRoles {
  const scheme: DynamicScheme = new SchemeTonalSpot(Hct.fromInt(argbFromHex(seedHex)), isDark, 0.0);
  const out = {} as SystemColorRoles;
  for (const key of ROLE_KEYS) {
    out[key] = hexFromArgb(ROLE_RESOLVERS[key].getArgb(scheme));
  }
  return out;
}

function isHexRole(value: unknown): value is string {
  return typeof value === 'string' && HEX_ROLE_PATTERN.test(value);
}

/**
 * 种子色色板打底，原生桥回传的角色（存在且合法）逐个覆盖。
 * 这样即使宿主 material 版本较旧缺个别 attr，色板也永远完整。
 */
function mergedRoles(
  seedHex: string | null,
  isDark: boolean,
  overrides: PartialSystemColorRoles | null
): { roles: SystemColorRoles; seedUsed: string } {
  const seedUsed = seedHex ?? MONET_FALLBACK_SEED;
  const roles = rolesFromSeed(seedUsed, isDark);
  if (overrides) {
    for (const key of ROLE_KEYS) {
      const value = overrides[key];
      if (isHexRole(value)) {
        roles[key] = value;
      }
    }
  }
  return { roles, seedUsed };
}

export interface BuildMonetSchemeInput {
  source: MonetSource;
  isDark: boolean;
  seedHex: string | null;
  /** 原生桥回传的角色覆盖（source='monet' 时传入）。 */
  roles?: PartialSystemColorRoles | null;
}

/** 组装石墨工坊的 Md3ColorScheme（含自定义着色器通道的确定性推导）。 */
export function buildMonetScheme(input: BuildMonetSchemeInput): Md3ColorScheme {
  const { roles, seedUsed } = mergedRoles(input.seedHex, input.isDark, input.roles ?? null);
  // MD3 官方没有 success 语义色，沿用 graphite 基线的 success 组合（三套内置
  // 主题的 success 本就几乎一致，属于固定语义色）。
  const semantic = input.isDark ? MD3_SCHEMES.graphite.dark : MD3_SCHEMES.graphite.light;

  return {
    id: 'monet',
    label: MONET_LABEL,
    lacquerName: MONET_LACQUER_NAMES[input.source],
    seedHex: seedUsed,
    ...roles,
    success: semantic.success,
    onSuccess: semantic.onSuccess,
    successContainer: semantic.successContainer,
    onSuccessContainer: semantic.onSuccessContainer,
    // 着色器通道按内置主题的规律从动态色板推导：
    // - 涟漪波纹：浅色用 onSurface 低透明度，深色用 primary 低透明度
    // - 涟漪闪光：两种模式都用 onSurface 中高透明度（深色模式天然是浅色）
    // - 漆面着色 / 贸易波纹：primary 中透明度；金色闪光保持全局常量
    rippleWaveRgba: rgbaFloats(roles.onSurface, input.isDark ? 0.2 : 0.18),
    rippleSparkleRgba: rgbaFloats(roles.onSurface, input.isDark ? 0.88 : 0.86),
    lacquerTintRgba: rgbaFloats(roles.primary, input.isDark ? 0.42 : 0.45),
    tradeWaveRgba: rgbaFloats(roles.primary, 0.45),
    tradeGoldSparkleRgba: [0.97, 0.79, 0.26, 0.95],
  };
}

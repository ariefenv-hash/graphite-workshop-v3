/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * capacitor-material-you 桥接的数据结构镜像（与 npm 包 src/definitions.ts 保持
 * 结构一致，但独立声明，避免系统主题模块反向依赖插件包类型）。
 */

/** 动态色的来源（比插件包多一个 'screenshot'：canvas 截图取色的内置降级）。 */
export type MonetSource = 'monet' | 'wallpaper' | 'screenshot' | 'none';

export type MaterialYouColorSource = Exclude<MonetSource, 'screenshot'>;

/**
 * 完整 MD3 色彩角色集合。key 与插件原生侧回传的 JSON key 一一对应，
 * 也与 `Md3ColorScheme` 中的同名标准角色字段对应。
 */
export interface SystemColorRoles {
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
  // Surface hierarchy
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
  // Inverse roles
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
  // Outline & error roles
  outline: string;
  outlineVariant: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
}

export type PartialSystemColorRoles = Partial<SystemColorRoles>;

/** 原生桥接 / Web stub 统一返回的载荷。 */
export interface MaterialYouColorsPayload {
  available: boolean;
  monetAvailable: boolean;
  source: MaterialYouColorSource;
  isDark: boolean;
  sdkInt: number;
  light: PartialSystemColorRoles | null;
  dark: PartialSystemColorRoles | null;
  seedHex: string | null;
}

/** 本项目只用到这两个方法，声明成最小接口即可（结构兼容插件包实例）。 */
export interface MaterialYouPlugin {
  isAvailable(): Promise<{ available: boolean; monetAvailable: boolean; sdkInt: number }>;
  getSystemColors(): Promise<MaterialYouColorsPayload>;
}

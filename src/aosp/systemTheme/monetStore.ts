/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 手机主题（Material You）的全局外部 store。
 *
 * 降级是硬约束：Android 12 以下、插件未注册、原生调用抛错或超时，
 * 一律用内置种子色生成完整浅/深两套色板，绝不留下 null 色板，
 * 也绝不把异常冒泡成 unhandledrejection。
 *
 *  - probe()   页面加载时探测一次
 *  - refresh() 回前台 / 聚焦 / 手动重新探测
 *  - applyScreenshotSeed() 内置降级：canvas 截图取色
 */

import { Md3ColorScheme } from '../md3Tokens';
import { MONET_MIN_SDK, probeSystemColors } from './capacitorClient';
import type { ProbeReason } from './capacitorClient';
import type { MonetSource, MaterialYouColorsPayload } from './materialYouTypes';
import { buildMonetScheme } from './monetScheme';
import { extractSeedFromImage } from './screenshotSeed';

export interface MonetState {
  /** idle=未探测 checking=探测中 ready=探测完成（无论是否可用） */
  status: 'idle' | 'checking' | 'ready';
  source: MonetSource;
  /** 系统深浅色（原生 uiMode 或浏览器 prefers-color-scheme）。 */
  isDark: boolean;
  seedHex: string | null;
  lightScheme: Md3ColorScheme | null;
  darkScheme: Md3ColorScheme | null;
  /** 设备 API 等级；0 = 纯网页或探测失败。 */
  sdkInt: number;
  /** 兼容模式说明，空串表示原生动态色正常。设置页直接展示。 */
  note: string;
}

function prefersDarkNow(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

let state: MonetState = {
  status: 'idle',
  source: 'none',
  isDark: prefersDarkNow(),
  seedHex: null,
  lightScheme: null,
  darkScheme: null,
  sdkInt: 0,
  note: '',
};

const listeners = new Set<() => void>();
let probeStarted = false;

function set(patch: Partial<MonetState>): void {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

/** 无论走哪条降级路径，都生成完整浅/深色板，UI 永远有颜色。 */
function rebuildFromSeed(source: MonetSource, seedHex: string | null): void {
  set({
    status: 'ready',
    source,
    seedHex,
    lightScheme: buildMonetScheme({ source, isDark: false, seedHex }),
    darkScheme: buildMonetScheme({ source, isDark: true, seedHex }),
  });
}

function noteFor(reason: ProbeReason, sdkInt: number): string {
  switch (reason) {
    case 'web':
      return '网页模式 · 使用内置色板，可上传壁纸截图取色';
    case 'no-bridge':
      return '当前非原生环境 · 已回退到内置色板';
    case 'plugin-missing':
      return '本机无系统动态色接口 · 已回退到内置色板';
    case 'probe-failed':
      return '系统主题接口不可用 · 已回退到内置色板';
    case 'sdk-too-low':
      return sdkInt > 0
        ? `兼容模式 · Android API ${sdkInt}（低于 12 / API ${MONET_MIN_SDK}）不支持动态取色，已回退到内置完整色板`
        : '兼容模式 · 系统版本低于 Android 12，已回退到内置完整色板';
    case 'unavailable':
      return '系统未提供可用取色 · 已回退到内置色板';
    case 'ok':
      return '';
    default:
      return '已回退到内置完整色板';
  }
}

/** 纯 JS 兜底：保留用户手动取色种子，否则用内置 graphite 种子。 */
function fallbackToLocal(reason: ProbeReason, sdkInt: number): void {
  const keepScreenshot = state.source === 'screenshot' && state.seedHex;
  rebuildFromSeed(keepScreenshot ? 'screenshot' : 'none', state.seedHex ?? null);
  set({
    sdkInt,
    note: noteFor(reason, sdkInt),
    isDark: prefersDarkNow(),
  });
}

function applySystemPayload(payload: MaterialYouColorsPayload, sdkInt: number): void {
  set({ isDark: payload.isDark, sdkInt, note: '' });

  // Android 12+：原生完整色板（缺角色用种子色兜底补齐）。
  if (payload.source === 'monet' && payload.light && payload.dark) {
    const seedHex = payload.seedHex;
    set({
      status: 'ready',
      source: 'monet',
      seedHex,
      lightScheme: buildMonetScheme({ source: 'monet', isDark: false, seedHex, roles: payload.light }),
      darkScheme: buildMonetScheme({ source: 'monet', isDark: true, seedHex, roles: payload.dark }),
    });
    return;
  }

  // Android 8.1–11：壁纸种子色。
  if (payload.source === 'wallpaper' && payload.seedHex) {
    rebuildFromSeed('wallpaper', payload.seedHex);
    set({ note: `兼容模式 · Android API ${sdkInt}（低于 12），已用壁纸种子色生成完整色板` });
    return;
  }

  // 桥接在但没有可用色板：仍然生成内置色板，不留 null。
  const keepScreenshot = state.source === 'screenshot' && state.seedHex;
  rebuildFromSeed(keepScreenshot ? 'screenshot' : 'none', state.seedHex ?? null);
  set({ note: noteFor('unavailable', sdkInt) });
}

async function probeNative(): Promise<void> {
  const result = await probeSystemColors();
  if (result.reason === 'ok' && result.payload) {
    applySystemPayload(result.payload, result.sdkInt);
  } else {
    fallbackToLocal(result.reason, result.sdkInt);
  }
}

/** 所有外部 void 调用统一过这里，保证零 unhandledrejection。 */
function safe(run: () => Promise<void>): void {
  try {
    const p = run();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        fallbackToLocal('probe-failed', state.sdkInt);
      });
    }
  } catch {
    fallbackToLocal('probe-failed', state.sdkInt);
  }
}

export const monetStore = {
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  getSnapshot(): MonetState {
    return state;
  },

  /** 页面加载时探测一次（幂等，永不抛）。 */
  async probe(): Promise<void> {
    if (probeStarted) return;
    probeStarted = true;
    set({ status: 'checking' });
    const result = await probeSystemColors();
    if (result.reason === 'ok' && result.payload) {
      applySystemPayload(result.payload, result.sdkInt);
    } else {
      fallbackToLocal(result.reason, result.sdkInt);
    }
  },

  /** 回前台 / 聚焦 / 手动重探。用户手动截图种子优先保留。 */
  async refresh(): Promise<void> {
    if (!probeStarted || state.status !== 'ready') return;
    const result = await probeSystemColors();
    if (state.source === 'screenshot') {
      // 用户手动取色优先：只同步系统深浅色，不覆盖色板。
      if (result.reason === 'ok' && result.payload) set({ isDark: result.payload.isDark });
      return;
    }
    if (result.reason === 'ok' && result.payload) {
      applySystemPayload(result.payload, result.sdkInt);
    } else {
      fallbackToLocal(result.reason, result.sdkInt);
    }
  },

  /** 内置降级：canvas 截图取色 → 生成完整色板。 */
  async applyScreenshotSeed(blob: Blob): Promise<void> {
    const seedHex = await extractSeedFromImage(blob);
    rebuildFromSeed('screenshot', seedHex);
    set({ note: '', sdkInt: state.sdkInt });
  },

  /** 给事件回调 / UI 用的安全包装，替代裸 `void monetStore.xxx()`。 */
  safeProbe(): void {
    safe(() => monetStore.probe());
  },
  safeRefresh(): void {
    safe(() => monetStore.refresh());
  },
};

// ---- 环境监听（模块加载时挂一次） --------------------------------------

if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const sync = () => set({ isDark: media.matches });
  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', sync);
  } else if (typeof media.addListener === 'function') {
    // 旧版 WebView 的 legacy API
    media.addListener(sync);
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) monetStore.safeRefresh();
  });
}
if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => monetStore.safeRefresh());
}

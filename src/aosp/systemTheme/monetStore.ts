/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 手机主题（Material You）的全局外部 store。
 *
 * ThemeContext 通过 useSyncExternalStore 订阅这里的状态，把 monet 色板注入
 * scheme 选择逻辑。探测/刷新全部幂等：
 *  - probe()   页面加载时调用一次：原生桥可用则拿完整色板，否则进入
 *              "纯浏览器" 状态（等用户走截图降级）。
 *  - refresh() 回前台 / 窗口聚焦时调用：用户改了壁纸后拿新色板。
 *  - applyScreenshotSeed() 内置降级：canvas 截图取色 → 生成色板。
 */

import { Md3ColorScheme } from '../md3Tokens';
import { loadMaterialYouPlugin } from './capacitorClient';
import type { MonetSource, MaterialYouColorsPayload } from './materialYouTypes';
import { buildMonetScheme } from './monetScheme';
import { extractSeedFromImage } from './screenshotSeed';

export interface MonetState {
  /** idle=未探测 checking=探测中 ready=探测完成（无论是否可用） */
  status: 'idle' | 'checking' | 'ready';
  source: MonetSource;
  /** 系统深浅色（原生 uiMode 或浏览器 prefers-color-scheme），深浅色跟随的默认值。 */
  isDark: boolean;
  seedHex: string | null;
  lightScheme: Md3ColorScheme | null;
  darkScheme: Md3ColorScheme | null;
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
};

const listeners = new Set<() => void>();
let probeStarted = false;

function set(patch: Partial<MonetState>): void {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

function rebuildFromSeed(source: MonetSource, seedHex: string | null): void {
  set({
    status: 'ready',
    source,
    seedHex,
    lightScheme: buildMonetScheme({ source, isDark: false, seedHex }),
    darkScheme: buildMonetScheme({ source, isDark: true, seedHex }),
  });
}

function applySystemPayload(payload: MaterialYouColorsPayload): void {
  set({ isDark: payload.isDark });

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

  // Android 8.1-11：壁纸种子色。
  if (payload.source === 'wallpaper' && payload.seedHex) {
    rebuildFromSeed('wallpaper', payload.seedHex);
    return;
  }

  // 桥接在但没有可用色板：保留用户已选的截图种子，否则标记 none。
  if (state.source === 'screenshot') return;
  set({ status: 'ready', source: 'none' });
}

async function probeNative(): Promise<boolean> {
  const plugin = await loadMaterialYouPlugin();
  if (!plugin) return false;
  applySystemPayload(await plugin.getSystemColors());
  return true;
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

  /** 页面加载时探测一次（幂等）。 */
  async probe(): Promise<void> {
    if (probeStarted) return;
    probeStarted = true;
    set({ status: 'checking' });
    try {
      const touched = await probeNative();
      if (!touched && state.status !== 'ready') {
        set({ status: 'ready', source: 'none' });
      }
    } catch {
      set({ status: 'ready', source: 'none' });
    }
  },

  /** 回前台 / 聚焦时重探（壁纸可能在后台被更换）。用户提供的截图种子优先保留。 */
  async refresh(): Promise<void> {
    if (!probeStarted || state.status !== 'ready') return;
    if (state.source === 'screenshot' || state.source === 'none') {
      // 浏览器环境或用户种子模式：只同步系统深浅色。
      try {
        const plugin = await loadMaterialYouPlugin();
        if (plugin) {
          const payload = await plugin.getSystemColors();
          set({ isDark: payload.isDark });
        }
      } catch {
        // ignore
      }
      return;
    }
    try {
      await probeNative();
    } catch {
      // ignore：保持上一次的色板
    }
  },

  /** 内置降级：canvas 截图取色 → 生成完整色板。 */
  async applyScreenshotSeed(blob: Blob): Promise<void> {
    const seedHex = await extractSeedFromImage(blob);
    rebuildFromSeed('screenshot', seedHex);
  },
};

// ---- 环境监听（模块加载时挂一次） --------------------------------------

// 浏览器环境：跟随系统深浅色。
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

// 回前台自动刷新（改壁纸后回到应用即可生效）。
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void monetStore.refresh();
  });
}
if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => void monetStore.refresh());
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * capacitor-material-you 原生桥的能力探测。
 *
 * ⚠️ 关键约束：registerPlugin() 返回的是一个 Proxy（thenable）。
 * 绝不能把它作为 async 函数的返回值 —— V8 会对 async 返回值做
 * PromiseResolve，读到 .then 时 Proxy 会把它当成原生方法名去调用，
 * 直接抛 `MaterialYou.then() is not implemented on android`。
 * 因此本模块只把 Proxy 存在局部变量，对外只返回**纯数据对象**。
 *
 * 降级分级（任何一级失败都绝不向上抛，统一落到纯 JS 色板）：
 *   web            纯浏览器 / 非 Android 平台
 *   no-bridge      无 Capacitor bridge
 *   plugin-missing 插件包或原生实现不可用（含部分 Android 11 机型）
 *   probe-failed   原生调用抛错或超时
 *   sdk-too-low    Android < 12（API < 31）且壁纸种子也取不到
 *   unavailable    原生返回 source=none
 *   ok             拿到 monet 完整色板或 wallpaper 种子色
 */

import type { MaterialYouColorsPayload, MaterialYouPlugin } from './materialYouTypes';

type PluginModule = { MaterialYou: MaterialYouPlugin };

/** 动态取色最低要求：Android 12 / API 31。 */
export const MONET_MIN_SDK = 31;
/** 单次原生调用超时；老 WebView 上桥接可能永不回调。 */
const PROBE_TIMEOUT_MS = 2500;

export type ProbeReason =
  | 'web'
  | 'no-bridge'
  | 'plugin-missing'
  | 'probe-failed'
  | 'sdk-too-low'
  | 'unavailable'
  | 'ok';

export interface NativeThemeProbe {
  reason: ProbeReason;
  sdkInt: number;
  /** 仅 reason='ok' 时非空，且一定是纯数据对象。 */
  payload: MaterialYouColorsPayload | null;
}

let cachedModule: PluginModule | null | undefined;

function fail(reason: ProbeReason, sdkInt = 0): NativeThemeProbe {
  return { reason, sdkInt, payload: null };
}

/** 安全读取 Capacitor 全局对象；非原生 Android 一律按纯网页处理。 */
function getCapacitorBridge(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  try {
    const cap = (window as unknown as { Capacitor?: Record<string, unknown> }).Capacitor;
    if (!cap || typeof cap !== 'object') return null;
    const isNative = cap.isNativePlatform;
    if (typeof isNative === 'function' && (isNative as () => boolean).call(cap) !== true) return null;
    const getPlatform = cap.getPlatform;
    if (typeof getPlatform === 'function' && (getPlatform as () => string).call(cap) !== 'android') {
      return null;
    }
    return cap;
  } catch {
    return null;
  }
}

/** 原生 promise 兜底：超时后 reject，避免 WebView 卡住整个探测链。 */
function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(`${label} 超时`));
    }, PROBE_TIMEOUT_MS);
    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * 探测系统动态色。永远 resolve，永不 reject。
 * 返回的 payload 是纯 JSON 数据，不是 Capacitor Proxy。
 */
export async function probeSystemColors(): Promise<NativeThemeProbe> {
  if (typeof window === 'undefined') return fail('web');
  if (!getCapacitorBridge()) return fail('no-bridge');

  let mod: PluginModule | null;
  try {
    if (cachedModule === undefined) {
      cachedModule = (await import('capacitor-material-you')) as unknown as PluginModule;
    }
    mod = cachedModule;
  } catch {
    cachedModule = null;
    return fail('plugin-missing');
  }
  if (!mod || !mod.MaterialYou) {
    cachedModule = null;
    return fail('plugin-missing');
  }

  // Proxy 只活在局部作用域，绝不 return / Promise.resolve(proxy)。
  const plugin: MaterialYouPlugin = mod.MaterialYou;

  let sdkInt = 0;
  try {
    const availability = await withTimeout(plugin.isAvailable(), 'isAvailable');
    sdkInt = Number(availability?.sdkInt) || 0;
  } catch {
    // 常见：插件未注册进 capacitor.plugins.json → "not implemented on android"。
    // 此时不再尝试任何其它原生方法，直接走纯 JS 回退。
    cachedModule = null;
    return fail('probe-failed');
  }

  // Android 12 以下不进入 Monet 路径：先试壁纸种子（8.1+ 官方能力），
  // 拿不到就交给上层用内置种子生成完整色板。
  if (sdkInt < MONET_MIN_SDK) {
    try {
      const payload = await withTimeout(plugin.getSystemColors(), 'getSystemColors');
      if (payload && typeof payload.seedHex === 'string' && /^#[0-9A-Fa-f]{6}$/.test(payload.seedHex)) {
        return {
          reason: 'ok',
          sdkInt,
          payload: { ...payload, source: 'wallpaper', monetAvailable: false },
        };
      }
    } catch {
      // 落回退
    }
    return fail('sdk-too-low', sdkInt);
  }

  try {
    const payload = await withTimeout(plugin.getSystemColors(), 'getSystemColors');
    if (!payload || payload.source === 'none') return fail('unavailable', sdkInt);
    return { reason: 'ok', sdkInt, payload };
  } catch {
    return fail('probe-failed', sdkInt);
  }
}

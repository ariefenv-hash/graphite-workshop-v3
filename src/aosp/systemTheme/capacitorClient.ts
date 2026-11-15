/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * capacitor-material-you 原生桥的加载器。
 *
 * - 在 Capacitor WebView 里：window.Capacitor 存在，动态 import 插件包并注册。
 * - 在纯浏览器里（npm run dev / 部署站点）：直接返回 null，主题管线落到
 *   canvas 截图取色的降级路径，不会引入任何 Capacitor 运行时开销。
 */

import type { MaterialYouPlugin } from './materialYouTypes';

type PluginModule = { MaterialYou: MaterialYouPlugin };

let cachedModule: PluginModule | null | undefined;

function hasCapacitorBridge(): boolean {
  return typeof window !== 'undefined' && 'Capacitor' in window;
}

/** 惰性加载原生桥；环境不具备时永远返回 null（结果会被缓存）。 */
export async function loadMaterialYouPlugin(): Promise<MaterialYouPlugin | null> {
  if (!hasCapacitorBridge()) return null;
  if (cachedModule !== undefined) {
    return cachedModule === null ? null : cachedModule.MaterialYou;
  }
  try {
    const mod = (await import('capacitor-material-you')) as unknown as PluginModule;
    cachedModule = mod;
    return mod.MaterialYou;
  } catch {
    // 插件包缺失或注册失败：按"无原生壳"处理，不阻塞主题系统。
    cachedModule = null;
    return null;
  }
}

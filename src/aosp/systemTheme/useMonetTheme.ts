/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useSyncExternalStore } from 'react';

import { monetStore } from './monetStore';
import type { MonetState } from './monetStore';

/**
 * 订阅手机主题状态，并在挂载时触发一次幂等探测。
 * 本项目只在 Md3ThemeProvider 中调用一次。
 */
export function useMonetTheme(): MonetState {
  useSyncExternalStore(monetStore.subscribe, monetStore.getSnapshot, monetStore.getSnapshot);

  useEffect(() => {
    monetStore.safeProbe();
  }, []);

  return monetStore.getSnapshot();
}

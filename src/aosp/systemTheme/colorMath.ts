/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/** 把 #RRGGBB 解析成 0..1 的 [r, g, b] 浮点三元组（无效输入返回黑色）。 */
export function hexToRgbFloats(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [0, 0, 0];
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return [0, 0, 0];
  return [r / 255, g / 255, b / 255];
}

/** 把 #RRGGBB 加上 alpha 转成 [r, g, b, a] 浮点四元组（着色器通道格式）。 */
export function rgbaFloats(hex: string, alpha: number): [number, number, number, number] {
  const [r, g, b] = hexToRgbFloats(hex);
  return [r, g, b, alpha];
}

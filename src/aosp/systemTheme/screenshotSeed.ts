/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * 内置降级：从壁纸截图提取 MD3 种子色（canvas 路径）。
 *
 * 流程：缩放绘制到 128x128 离屏 canvas → 收集不透明像素（ARGB）→
 * QuantizerCelebi 量化 + Score 打分（与系统 Material You 相同的取色管线，
 * 来自 @material/material-color-utilities）→ 返回排名最高的种子色 hex。
 */

import { QuantizerCelebi, Score, argbFromRgb, hexFromArgb } from '@material/material-color-utilities';

const SAMPLE_SIZE = 128;
const QUANTIZE_COLORS = 64;

async function loadImage(src: Blob | string): Promise<HTMLImageElement> {
  const objectUrl = typeof src === 'string' ? null : URL.createObjectURL(src);
  const url: string = objectUrl ?? (src as string);
  try {
    const img = new Image();
    img.decoding = 'async';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('图片解码失败'));
      img.src = url;
    });
    return img;
  } finally {
    if (objectUrl) {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 5000);
    }
  }
}

export async function extractSeedFromImage(source: Blob | string): Promise<string> {
  const img = await loadImage(source);

  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('canvas 2d 上下文不可用');
  }

  ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
  const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);

  const pixels: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 255) continue; // 跳过半透明像素，避免污染量化结果
    pixels.push(argbFromRgb(data[i], data[i + 1], data[i + 2]));
  }
  if (pixels.length === 0) {
    throw new Error('截图中没有可用像素');
  }

  const quantized = QuantizerCelebi.quantize(pixels, QUANTIZE_COLORS);
  const ranked = Score.score(quantized);
  const seed = ranked[0] ?? [...quantized.keys()][0];
  return hexFromArgb(seed);
}

/**
 * 个性化设置数据层。
 * 配置走 localStorage（小 JSON），壁纸 / 自定义字体走 IndexedDB（Blob），
 * 与游戏存档 graphite_cedar_save_v1 完全隔离，不影响存档校验和。
 *
 * 深浅色由 ThemeContext 单一真源管理（darkFollowsSystem / resetDarkModeOverride /
 * setDarkMode），本文件不再另存一份开关，避免两套状态打架。
 * 系统动态色（Material You）由 src/aosp/systemTheme 的插件桥接提供。
 */
import { workshopAudio } from './audio';
import { setRippleSparkleDensity } from '../aosp/RippleShader';

export interface GwSettings {
  volume: number;            // 0..1 交互音量
  haptics: boolean;          // 触感震动
  reducedMotion: boolean;    // 减弱动效
  wallpaperOn: boolean;
  wallpaperBlur: number;     // 0..40 px
  wallpaperDim: number;      // 0..95 % 内容遮罩不透明度
  autoAccent: boolean;       // 上传壁纸后自动提取主题色并生成完整 MD3 色板
  accentHex: string;         // 最近一次提取/手动指定的种子色（展示与壁纸 tint 用）
  customFontOn: boolean;
  fontScale: number;         // 0.9..1.3
  sparkleDensity: number;    // 涟漪金粉飘散密度 0.35..2.0（细腻粒子场唯一路径，无省电块状档）
}

const KEY = 'graphite_cedar_settings_v1';
const DB_NAME = 'gw_assets';
const STORE = 'blobs';

export const DEFAULT_SETTINGS: GwSettings = {
  volume: 0.7,
  haptics: true,
  reducedMotion: false,
  wallpaperOn: false,
  wallpaperBlur: 14,
  wallpaperDim: 74,
  autoAccent: true,
  accentHex: '#8F4E00',
  customFontOn: false,
  fontScale: 1,
  sparkleDensity: 1.05,
};

export function loadSettings(): GwSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GwSettings> & {
      followSystemDark?: boolean; rippleFine?: boolean;
    };
    // 旧版 followSystemDark 字段直接丢弃：深浅色已改由 ThemeContext 单一真源管理。
    delete parsed.followSystemDark;
    const merged: GwSettings = { ...DEFAULT_SETTINGS, ...parsed };
    // 旧布尔档映射为密度：false 也只是更稀疏，绝不回退到块状量化采样。
    if (parsed.sparkleDensity === undefined && typeof parsed.rippleFine === 'boolean') {
      merged.sparkleDensity = parsed.rippleFine ? 1.05 : 0.55;
    }
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(s: GwSettings): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore quota */ }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putAsset(key: string, blob: Blob): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getAsset(key: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const r = tx.objectStore(STORE).get(key);
    r.onsuccess = () => { db.close(); resolve(r.result instanceof Blob ? r.result : null); };
    r.onerror = () => { db.close(); reject(r.error); };
  });
}

export async function clearAssets(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

let wallpaperUrl: string | null = null;
let fontUrl: string | null = null;
let fontFace: FontFace | null = null;
let initStarted = false;

function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace(/^#/, '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 从图片 Blob 提取主色：缩到 24×24，跳过透明/极亮/极暗像素后再调饱和与明度。 */
export async function extractAccent(blob: Blob): Promise<string> {
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('图片解码失败'));
      img.src = url;
    });
    const c = document.createElement('canvas');
    c.width = 24; c.height = 24;
    const ctx = c.getContext('2d');
    if (!ctx) return DEFAULT_SETTINGS.accentHex;
    ctx.drawImage(img, 0, 0, 24, 24);
    const d = ctx.getImageData(0, 0, 24, 24).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const R = d[i], G = d[i + 1], B = d[i + 2], A = d[i + 3];
      if (A < 128) continue;
      const lum = 0.2126 * R + 0.7152 * G + 0.0722 * B;
      if (lum > 242 || lum < 16) continue;
      r += R; g += G; b += B; n++;
    }
    if (!n) return DEFAULT_SETTINGS.accentHex;
    r /= n; g /= n; b /= n;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const l = (mx + mn) / 2 / 255;
    const delta = mx - mn;
    let sat = delta === 0 ? 0 : delta / (255 - Math.abs(mx + mn - 255));
    sat = Math.min(0.82, Math.max(0.38, sat * 1.25 + 0.08));
    const targetL = Math.min(0.62, Math.max(0.34, l));
    const toHex = (hslToRgb: [number, number, number]) =>
      '#' + hslToRgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
    const c2 = (1 - Math.abs(2 * targetL - 1)) * sat;
    const hp = ((Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b) / (2 * Math.PI)) + 1) % 1 * 6;
    const x = c2 * (1 - Math.abs((hp % 2) - 1));
    const m = targetL - c2 / 2;
    let rgb: [number, number, number];
    if (hp < 1) rgb = [c2, x, 0];
    else if (hp < 2) rgb = [x, c2, 0];
    else if (hp < 3) rgb = [0, c2, x];
    else if (hp < 4) rgb = [0, x, c2];
    else if (hp < 5) rgb = [x, 0, c2];
    else rgb = [c2, 0, x];
    return toHex([(rgb[0] + m) * 255, (rgb[1] + m) * 255, (rgb[2] + m) * 255]);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function ensureWallpaperDom(): void {
  if (!document.getElementById('gw-wallpaper')) {
    const el = document.createElement('div');
    el.id = 'gw-wallpaper';
    document.body.appendChild(el);
  }
  if (!document.getElementById('gw-wallpaper-tint')) {
    const el = document.createElement('div');
    el.id = 'gw-wallpaper-tint';
    document.body.appendChild(el);
  }
}

/** 把设置同步到 DOM / CSS / 音频。纯同步部分，资源加载由 initPersonalization 负责。 */
export function applySettings(s: GwSettings, surfaceHex: string): void {
  const root = document.documentElement;
  workshopAudio.setMasterVolume(s.volume);
  setRippleSparkleDensity(s.sparkleDensity);
  root.style.setProperty('--gw-font-scale', String(s.fontScale));
  root.style.setProperty('--gw-accent', s.accentHex || DEFAULT_SETTINGS.accentHex);
  root.classList.toggle('gw-scaled', s.fontScale !== 1);
  root.classList.toggle('gw-reduced-motion', s.reducedMotion);
  root.classList.toggle('gw-wallpaper', s.wallpaperOn && !!wallpaperUrl);
  root.classList.toggle('gw-custom-font', s.customFontOn && !!fontFace);

  const [r, g, b] = hexToRgb(surfaceHex || '#FAF6EE');
  root.style.setProperty('--gw-overlay', `rgba(${r},${g},${b},${(s.wallpaperDim / 100).toFixed(2)})`);
  root.style.setProperty('--gw-blur', `${s.wallpaperBlur}px`);
  ensureWallpaperDom();
  const wp = document.getElementById('gw-wallpaper') as HTMLElement | null;
  const tint = document.getElementById('gw-wallpaper-tint') as HTMLElement | null;
  if (wp) wp.style.backgroundImage = s.wallpaperOn && wallpaperUrl ? `url("${wallpaperUrl}")` : 'none';
  if (tint) tint.style.backgroundColor = s.wallpaperOn && wallpaperUrl
    ? `rgba(${r},${g},${b},${Math.min(0.5, s.wallpaperDim / 200).toFixed(2)})` : 'transparent';
}

/** 启动时从 IndexedDB 恢复壁纸与自定义字体（幂等，只跑一次）。 */
export async function initPersonalization(s: GwSettings, surfaceHex: string): Promise<void> {
  if (initStarted) { applySettings(s, surfaceHex); return; }
  initStarted = true;
  try {
    const wp = await getAsset('wallpaper');
    if (wp) wallpaperUrl = URL.createObjectURL(wp);
  } catch { /* 无 IDB 权限时跳过 */ }
  try {
    const font = await getAsset('customFont');
    if (font) {
      fontUrl = URL.createObjectURL(file);
      const face = new FontFace('GwCustomFont', `url("${fontUrl}")`);
      await face.load();
      document.fonts.add(face);
      fontFace = face;
    }
  } catch { /* 字体加载失败则回落内置思源宋体 */ }
  applySettings(s, surfaceHex);
}

export async function setWallpaper(file: File): Promise<string | null> {
  await putAsset('wallpaper', file);
  if (wallpaperUrl) URL.revokeObjectURL(wallpaperUrl);
  wallpaperUrl = URL.createObjectURL(file);
  return extractAccent(file).catch(() => null);
}

export async function setCustomFont(file: File): Promise<boolean> {
  try {
    await putAsset('customFont', file);
    if (fontUrl) URL.revokeObjectURL(fontUrl);
    fontUrl = URL.createObjectURL(font);
    const face = new FontFace('GwCustomFont', `url("${fontUrl}")`);
    await face.load();
    if (fontFace) document.fonts.delete(fontFace);
    document.fonts.add(face);
    fontFace = face;
    return true;
  } catch {
    return false;
  }
}

export async function clearPersonalization(): Promise<void> {
  await clearAssets().catch(() => {});
  if (wallpaperUrl) { URL.revokeObjectURL(wallpaperUrl); wallpaperUrl = null; }
  if (fontUrl) { URL.revokeObjectURL(fontUrl); fontUrl = null; }
  if (fontFace) { document.fonts.delete(fontFace); fontFace = null; }
  localStorage.removeItem(KEY);
  // 恢复默认时重新初始化标记，允许下次再次加载（此时库已空）
  initStarted = false;
}

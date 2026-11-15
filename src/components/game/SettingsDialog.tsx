/**
 * 设置 · 常用项与个性化。
 *
 * 全部控件改用项目内已移植的 MD3 组件（Md3Dialog / Md3Switch / Md3Slider /
 * Md3Button / Md3SegmentedButton），不再使用原生 <input type=range> 与自绘
 * 46×26 开关；内容滚动走 Md3StretchContainer(mode=scroll) 的 AOSP EdgeEffect，
 * 与雪松木料仓同一套欠阻尼弹簧，只是强度不同。
 *
 * 系统动态色：通过集成的 capacitor-material-you 插件桥接（Android 12+ 完整
 * 31 角色 / 8.1–11 壁纸种子 / 浏览器截图取色），全部在设置内可操作。
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  ImagePlus, Palette, RotateCcw, Type, Volume2, Smartphone,
  RefreshCw, Sun, Moon, Sparkles, SlidersHorizontal,
} from 'lucide-react';
import { ThemeId } from '../../aosp/md3Tokens';
import { useMd3Theme } from '../../aosp/ThemeContext';
import { monetStore } from '../../aosp/systemTheme/monetStore';
import { workshopAudio, triggerHaptic } from '../../game/audio';
import {
  DEFAULT_SETTINGS, GwSettings, applySettings, clearPersonalization,
  extractAccent, getAsset, loadSettings, saveSettings,
  setCustomFont, setWallpaper,
} from '../../game/settings';
import { Md3Dialog } from '../md3/Md3Dialog';
import { Md3Switch } from '../md3/Md3Switch';
import { Md3Slider } from '../md3/Md3Slider';
import { Md3Button, Md3SegmentedButton } from '../md3/Md3Button';

interface Props {
  open: boolean;
  onClose: () => void;
  onApplyTheme: (id: ThemeId) => void;
}

const THEME_OPTIONS: { value: ThemeId; label: string }[] = [
  { value: 'cedar', label: '雪松黄' },
  { value: 'graphite', label: '石墨' },
  { value: 'prussian', label: '普鲁士蓝' },
  { value: 'monet', label: '手机主题' },
];

const SOURCE_LABEL: Record<string, string> = {
  none: '兼容模式 · 内置完整色板',
  monet: 'Android 12+ · 系统完整 31 角色动态色板',
  wallpaper: 'Android 8.1–11 · 壁纸种子色生成',
  screenshot: '壁纸截图取色 · 与系统同取色管线',
};

/** 把手动选中的 hex 变成一张纯色图，复用系统同款 QuantizerCelebi 取色管线。 */
async function seedBlobFromHex(hex: string): Promise<Blob> {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 8;
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('canvas 不可用');
  ctx.fillStyle = hex;
  ctx.fillRect(0, 0, 8, 8);
  return await new Promise<Blob>((resolve, reject) => {
    c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob 失败'))), 'image/png');
  });
}

export const SettingsDialog: React.FC<Props> = ({ open, onClose, onApplyTheme }) => {
  const {
    scheme, themeId, darkMode, darkFollowsSystem, setDarkMode, resetDarkModeOverride,
    reducedMotion, setReducedMotion, noFlashVisuals, setNoFlashVisuals,
    monet, applyScreenshotSeed,
  } = useMd3Theme();

  const [s, setS] = useState<GwSettings>(() => loadSettings());
  const [hint, setHint] = useState('');
  const [busy, setBusy] = useState(false);
  const wallpaperInput = useRef<HTMLInputElement>(null);
  const fontInput = useRef<HTMLInputElement>(null);
  const screenshotInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const cur = loadSettings();
    setS(cur);
    applySettings(cur, scheme.surface);
    // 资源恢复由 App 启动时统一跑一次（initPersonalization），此处只同步 CSS/音频。
  }, [open, scheme.surface]);

  const flash = (note: string) => {
    setHint(note);
    window.setTimeout(() => setHint(''), 2800);
  };

  const update = (patch: Partial<GwSettings>, note?: string) => {
    const next = { ...s, ...patch };
    setS(next); saveSettings(next);
    applySettings(next, scheme.surface);
    if (note) flash(note);
  };

  const applySeedAndTheme = async (blob: Blob): Promise<void> => {
    await applyScreenshotSeed(blob);
    onApplyTheme('monet');
  };

  const onWallpaper = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      const hex = await setWallpaper(f);
      const patch: Partial<GwSettings> = { wallpaperOn: true };
      if (hex) patch.accentHex = hex;
      if (s.autoAccent) {
        try { await applySeedAndTheme(f); } catch { /* 取色失败仍应用壁纸 */ }
      }
      update(patch, s.autoAccent && hex ? `壁纸已应用 · 主色 ${hex} 已生成完整色板` : '壁纸已应用');
    } finally {
      setBusy(false);
    }
  };

  const onFont = async (f: File | undefined) => {
    if (!f) return;
    const ok = await setCustomFont(f);
    update({ customFontOn: ok }, ok ? `已载入字体 ${f.name}` : '字体解析失败，仍用内置思源宋体');
  };

  const reExtract = async () => {
    const blob = await getAsset('wallpaper');
    if (!blob) { flash('当前没有壁纸'); return; }
    const hex = await extractAccent(blob);
    try { await applySeedAndTheme(blob); } catch { /* 保留手动色 */ }
    update({ accentHex: hex, autoAccent: true }, `已重新提取 ${hex} 并应用`);
  };

  const onManualColor = async (hex: string) => {
    update({ accentHex: hex, autoAccent: false });
    try {
      await applySeedAndTheme(await seedBlobFromHex(hex));
      flash(`已用 ${hex} 生成完整动态色板`);
    } catch {
      flash(`已记录 ${hex}（色板生成失败，可改用壁纸取色）`);
    }
  };

  const onScreenshotPicked = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      await applySeedAndTheme(f);
      flash('已从壁纸截图提取主题色并应用');
    } catch {
      flash('截图取色失败，请换一张壁纸截图重试');
    } finally {
      setBusy(false);
    }
  };

  const resetAll = async () => {
    await clearPersonalization();
    const d = { ...DEFAULT_SETTINGS };
    setS(d); saveSettings(d);
    setReducedMotion(false); setNoFlashVisuals(false);
    applySettings(d, scheme.surface);
    flash('个性化数据已清空，字体回落内置思源宋体');
  };

  const section = (title: string, icon: React.ReactNode) => (
    <div className="flex items-center gap-2 mt-6 mb-3">
      <span style={{ color: scheme.primary }}>{icon}</span>
      <h3 className="text-[11px] font-bold tracking-[1.6px] uppercase"
          style={{ color: scheme.onSurfaceVariant }}>{title}</h3>
      <span className="flex-1 h-px" style={{ backgroundColor: scheme.outlineVariant }} />
    </div>
  );

  const monetStateText = monet.status !== 'ready'
    ? '正在探测系统动态色…'
    : (SOURCE_LABEL[monet.source] ?? monet.source);

  return (
    <Md3Dialog
      open={open}
      onClose={onClose}
      title="设置"
      maxWidthClass="max-w-[560px]"
      actions={
        <>
          <Md3Button size="sm" variant="text" onClick={() => void resetAll()}>
            <RotateCcw className="w-3.5 h-3.5" /> 清空个性化
          </Md3Button>
          <Md3Button size="sm" variant="filled" onClick={onClose}>完成</Md3Button>
        </>
      }
    >
      {hint && (
        <div className="mb-3 px-3 py-2 rounded-xl text-[12px] font-medium"
             style={{ backgroundColor: scheme.primaryContainer, color: scheme.onPrimaryContainer }}>
          {hint}
        </div>
      )}

      {/* ---------------------------------------------- 手机主题 · Material You */}
      {section('手机主题 · Material You', <Smartphone className="w-4 h-4" />)}
      <div className="rounded-2xl px-3.5 py-3 mb-3"
           style={{ backgroundColor: scheme.surfaceContainerLow, border: `1px solid ${scheme.outlineVariant}` }}>
        <div className="text-[13px] font-semibold">{monetStateText}</div>
        {monet.note && (
          <div className="text-[11px] mt-2 px-2.5 py-2 rounded-lg leading-relaxed"
               style={{ backgroundColor: scheme.tertiaryContainer, color: scheme.onTertiaryContainer }}>
            {monet.note}
          </div>
        )}
        <div className="text-[11px] mt-1 leading-relaxed" style={{ color: scheme.onSurfaceVariant }}>
          {monet.seedHex
            ? `当前种子色 ${monet.seedHex} · 浅/深两套色板已生成；回前台自动重探。`
            : 'Android 12+ 直读系统壁纸动态色；低于 12 或接口不可用时自动回退到内置完整色板；纯浏览器可上传壁纸截图取色。无需权限，不改宿主 Activity 主题。'}
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <Md3Button size="sm" variant="tonal" onClick={() => onApplyTheme('monet')}>
            <Palette className="w-3.5 h-3.5" /> 应用手机主题
          </Md3Button>
          <Md3Button size="sm" variant="outlined" disabled={busy}
                     onClick={() => screenshotInput.current?.click()}>
            <ImagePlus className="w-3.5 h-3.5" /> 从壁纸截图取色
          </Md3Button>
          <Md3Button size="sm" variant="text" onClick={() => monetStore.safeRefresh()}>
            <RefreshCw className="w-3.5 h-3.5" /> 重新探测
          </Md3Button>
        </div>
        <input ref={screenshotInput} type="file" accept="image/*" className="hidden" aria-hidden="true"
               onChange={(e) => { void onScreenshotPicked(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      <div className="mb-3">
        <Md3SegmentedButton<ThemeId>
          ariaLabel="漆色主题"
          options={THEME_OPTIONS}
          value={themeId}
          onChange={(id) => onApplyTheme(id)}
        />
      </div>
      <Md3Switch
        label="跟随系统深浅色"
        description="由原生 uiMode / prefers-color-scheme 决定；关闭后由下方开关手动覆盖"
        checked={darkFollowsSystem}
        onChange={(v) => (v ? resetDarkModeOverride() : setDarkMode(darkMode))}
      />
      <Md3Switch
        label="深色模式"
        description={darkFollowsSystem ? '当前跟随系统；开启此项即变为手动覆盖' : '手动覆盖值会持久化'}
        checked={darkMode}
        onChange={(v) => setDarkMode(v)}
        showUncheckedIcon={false}
      />

      {/* ------------------------------------------------------ 个性化 · 壁纸 */}
      {section('个性化 · 壁纸', <ImagePlus className="w-4 h-4" />)}
      <Md3Switch
        label="自定义壁纸"
        description="作为整个界面背景，图片存在本机，完全离线可用"
        checked={s.wallpaperOn}
        onChange={(v) => update({ wallpaperOn: v }, v ? '已开启壁纸' : '已关闭壁纸')}
      />
      <div className="flex flex-wrap gap-2 py-2">
        <Md3Button size="sm" variant="tonal" disabled={busy}
                   onClick={() => wallpaperInput.current?.click()}>
          <ImagePlus className="w-3.5 h-3.5" /> 上传壁纸
        </Md3Button>
        <Md3Button size="sm" variant="outlined" onClick={() => void reExtract()}>
          <Sparkles className="w-3.5 h-3.5" /> 重新提取主色
        </Md3Button>
        <input ref={wallpaperInput} type="file" accept="image/*" className="hidden" aria-hidden="true"
               onChange={(e) => { void onWallpaper(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      <Md3Slider label="模糊半径" value={s.wallpaperBlur} min={0} max={40} unit="px"
                 sublabel="背景高斯模糊，越高越柔" onChange={(n) => update({ wallpaperBlur: n })} />
      <Md3Slider label="背景压暗" value={s.wallpaperDim} min={0} max={95} unit="%"
                 sublabel="内容遮罩不透明度，越高越保证文字可读"
                 onChange={(n) => update({ wallpaperDim: n })} />
      <Md3Switch
        label="上传后自动分析主题色"
        description="用与系统同款的 QuantizerCelebi 取色管线生成完整浅/深 MD3 色板"
        checked={s.autoAccent}
        onChange={(v) => update({ autoAccent: v })}
      />
      <div className="flex items-center gap-3 py-3">
        <span className="w-7 h-7 rounded-full border shrink-0"
              style={{ backgroundColor: s.accentHex, borderColor: scheme.outline }} />
        <span className="text-[11px] font-mono-tabular" style={{ color: scheme.onSurfaceVariant }}>
          {s.accentHex}
        </span>
        <label className="relative ml-auto text-[11px] font-semibold cursor-pointer px-3 py-2 rounded-full overflow-hidden"
               style={{ backgroundColor: scheme.secondaryContainer, color: scheme.onSecondaryContainer }}>
          手动指定种子色
          <input type="color" value={s.accentHex} aria-label="手动选择种子色"
                 onChange={(e) => void onManualColor(e.target.value)}
                 className="absolute opacity-0 w-0 h-0" />
        </label>
      </div>

      {/* ---------------------------------------------------------------- 字体 */}
      {section('字体', <Type className="w-4 h-4" />)}
      <div className="text-[12px] leading-relaxed py-1" style={{ color: scheme.onSurfaceVariant }}>
        中文默认 <b style={{ color: scheme.onSurface }}>思源宋体（Noto Serif SC）</b>，字体文件已打进包内，
        无网络也能显示；标题拉丁字形用 Bricolage Grotesque。
      </div>
      <Md3Switch label="使用上传字体" description="支持 TTF / OTF / WOFF / WOFF2"
                 checked={s.customFontOn} onChange={(v) => update({ customFontOn: v })} />
      <div className="flex flex-wrap gap-2 py-2">
        <Md3Button size="sm" variant="tonal" onClick={() => fontInput.current?.click()}>
          <Type className="w-3.5 h-3.5" /> 上传字体
        </Md3Button>
        <Md3Button size="sm" variant="outlined"
                   onClick={() => update({ customFontOn: false }, '已恢复内置思源宋体')}>
          恢复思源宋体
        </Md3Button>
        <input ref={fontInput} type="file" accept=".ttf,.otf,.woff,.woff2,font/*"
               className="hidden" aria-hidden="true"
               onChange={(e) => { void onFont(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      <Md3Slider label="界面字号" value={Math.round(s.fontScale * 100)} min={90} max={130} unit="%"
                 sublabel="整体 rem 缩放，设置与游戏内一致"
                 onChange={(n) => update({ fontScale: n / 100 })} />

      {/* ---------------------------------------------------------- 声音与触感 */}
      {section('声音与触感', <Volume2 className="w-4 h-4" />)}
      <Md3Slider label="交互音量" value={Math.round(s.volume * 100)} min={0} max={100} unit="%"
                 sublabel="作用于所有音效的主增益节点；顶栏音量键仍控制总开关"
                 onChange={(n) => update({ volume: n / 100 })} />
      <div className="flex flex-wrap gap-2 py-2">
        <Md3Button size="sm" variant="tonal" onClick={() => workshopAudio.playLatheBeat(true)}>
          试听一下
        </Md3Button>
        <Md3Button size="sm" variant="outlined" onClick={() => triggerHaptic(true, 12)}>
          震动反馈
        </Md3Button>
      </div>
      <Md3Switch label="触感震动" description="节拍 / 精修 / 提醒的短震"
                 checked={s.haptics} onChange={(v) => update({ haptics: v })} />

      {/* ---------------------------------------------------------- 显示与交互 */}
      {section('显示与交互', <SlidersHorizontal className="w-4 h-4" />)}
      <Md3Switch label="减弱动效" description="压缩过渡与弹簧动画时长"
                 checked={reducedMotion}
                 onChange={(v) => { setReducedMotion(v); update({ reducedMotion: v }); }} />
      <Md3Switch label="抑制强闪光" description="降低涟漪金粉与高亮闪动"
                 checked={noFlashVisuals} onChange={(v) => setNoFlashVisuals(v)} />
      <Md3Slider
        label="金粉飘散密度"
        sublabel="细腻亚像素粒子场，逐格漂移 + 呼吸；不再提供会变成方块颗粒的省电档"
        value={Math.round(s.sparkleDensity * 100)}
        min={35} max={200} step={5} unit="%"
        onChange={(n) => update({ sparkleDensity: n / 100 })}
      />
      <div className="mt-2 flex items-center gap-2 text-[11px]"
           style={{ color: scheme.onSurfaceVariant }}>
        {darkMode ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
        当前：{darkMode ? '深色' : '浅色'} · 涟漪与所有开关/滑块均为 AOSP 移植组件
      </div>

      {/* ---------------------------------------------------------- 数据与关于 */}
      {section('数据与关于', <RotateCcw className="w-4 h-4" />)}
      <div className="text-[11px] leading-relaxed py-1" style={{ color: scheme.onSurfaceVariant }}>
        v3 · Graphite &amp; Cedar · 本地校验存档。个性化配置与游戏进度分开保存，清空不会影响银元与产量。
        内置 AOSP RippleShader / StretchEdgeEffect / Expressive 弹簧物理，并通过
        capacitor-material-you 插件读取手机 Material You 动态色。
      </div>
    </Md3Dialog>
  );
};

/**
 * 设置 · 常用项与个性化。
 *
 * 全部交互控件复用项目内移植的 MD3 组件：开关 = Md3Switch、滑块 = Md3Slider
 * （含 AOSP 涟漪与越界拉伸）、按钮 = Md3Button / Md3RippleSurface、容器 =
 * Md3Dialog。因此涟漪、Expressive 弹簧、状态层、形状形变在主界面和设置页
 * 完全一致，不再是另一套原生控件。
 *
 * 图标全部走 lucide 的 JSX <svg>（React 自动绑定 http://www.w3.org/2000/svg
 * 命名空间），避免老 WebView 上 createElement('svg') 不显示。
 */
import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Palette, RotateCcw, Smartphone, Type, Volume2 } from 'lucide-react';
import { ThemeId } from '../../aosp/md3Tokens';
import { useMd3Theme } from '../../aosp/ThemeContext';
import { monetStore } from '../../aosp/systemTheme/monetStore';
import { workshopAudio, triggerHaptic } from '../../game/audio';
import {
  DEFAULT_SETTINGS, GwSettings, applySettings, clearPersonalization,
  extractAccent, getAsset, initPersonalization, loadSettings, saveSettings,
  setCustomFont, setWallpaper,
} from '../../game/settings';
import { Md3Button } from '../md3/Md3Button';
import { Md3Dialog } from '../md3/Md3Dialog';
import { Md3Slider } from '../md3/Md3Slider';
import { Md3Switch } from '../md3/Md3Switch';

interface Props {
  open: boolean;
  onClose: () => void;
  onApplyTheme: (id: ThemeId) => void;
}

const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'cedar', label: '经典加州雪松黄' },
  { id: 'graphite', label: '石墨深色' },
  { id: 'prussian', label: '普鲁士蓝' },
  { id: 'monet', label: '手机主题 · Material You' },
];

const MONET_SOURCE_LABEL: Record<string, string> = {
  monet: 'Android 12+ 原生动态色（与系统 UI 同源）',
  wallpaper: '壁纸种子色（Android 8.1–11 降级）',
  screenshot: '截图取色（浏览器 / 老设备降级）',
  none: '未检测到可用动态色',
};

export const SettingsDialog: React.FC<Props> = ({ open, onClose, onApplyTheme }) => {
  const {
    scheme, themeId, darkMode, setDarkMode, darkFollowsSystem, resetDarkModeOverride,
    monet, applyScreenshotSeed, reducedMotion, setReducedMotion,
    noFlashVisuals, setNoFlashVisuals, setCustomAccent, customAccent,
  } = useMd3Theme();

  const [s, setS] = useState<GwSettings>(() => loadSettings());
  const [hint, setHint] = useState('');
  const wallpaperInput = useRef<HTMLInputElement>(null);
  const fontInput = useRef<HTMLInputElement>(null);
  const screenshotInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const cur = loadSettings();
    setS(cur);
    void initPersonalization(cur, scheme.surface);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const flash = (msg: string) => {
    setHint(msg);
    window.setTimeout(() => setHint(''), 2600);
  };

  const update = (patch: Partial<GwSettings>, note?: string) => {
    const next = { ...s, ...patch };
    setS(next); saveSettings(next);
    applySettings(next, scheme.surface);
    if (patch.accentHex !== undefined && s.autoAccent) setCustomAccent(patch.accentHex || null);
    if (patch.autoAccent !== undefined) setCustomAccent(patch.autoAccent ? (s.accentHex || null) : null);
    if (note) flash(note);
  };

  const onWallpaper = async (f: File | undefined) => {
    if (!f) return;
    const hex = await setWallpaper(f);
    const patch: Partial<GwSettings> = { wallpaperOn: true };
    if (s.autoAccent && hex) patch.accentHex = hex;
    update(patch, hex && s.autoAccent ? `已提取主色 ${hex}` : '壁纸已应用');
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
    update({ accentHex: hex, autoAccent: true }, `已重新提取 ${hex}`);
  };

  const refreshMonet = async () => {
    await monetStore.refresh();
    flash('已重新读取系统动态色');
  };

  const onScreenshot = async (f: File | undefined) => {
    if (!f) return;
    try {
      await applyScreenshotSeed(f);
      onApplyTheme('monet');
      flash('已从截图提取壁纸主题色并应用');
    } catch {
      flash('截图取色失败，请换一张壁纸截图重试');
    }
  };

  const resetAll = async () => {
    await clearPersonalization();
    const d = { ...DEFAULT_SETTINGS };
    setS(d); saveSettings(d); setCustomAccent(null);
    setReducedMotion(false); setNoFlashVisuals(false); resetDarkModeOverride();
    applySettings(d, scheme.surface);
    flash('个性化数据已清空，字体回落内置思源宋体');
  };

  const sec = (title: string, icon: React.ReactNode) => (
    <div className="flex items-center gap-2 mt-5 mb-1.5">
      <span style={{ color: scheme.primary }}>{icon}</span>
      <h3 className="text-[11px] font-bold tracking-[1.6px] uppercase"
          style={{ color: scheme.onSurfaceVariant }}>{title}</h3>
    </div>
  );

  const divider = { borderTop: `1px solid ${scheme.outlineVariant}` } as React.CSSProperties;

  return (
    <Md3Dialog open={open} onClose={onClose} title="设置 · 常用项与个性化" maxWidthClass="max-w-[560px]">
      {hint && (
        <div className="px-3 py-2 rounded-xl text-[12px] font-medium"
             style={{ backgroundColor: scheme.primaryContainer, color: scheme.onPrimaryContainer }}>
          {hint}
        </div>
      )}

      {/* ---- 系统主题色：原生插件桥接 ---- */}
      {sec('系统主题色 · Material You', <Smartphone className="w-4 h-4" />)}
      <div className="rounded-xl px-3 py-2.5" style={{ backgroundColor: scheme.surfaceContainerHigh, ...divider }}>
        <div className="text-[12px] font-semibold" style={{ color: scheme.onSurface }}>
          {monet.status === 'checking' ? '正在读取手机动态色…' : MONET_SOURCE_LABEL[monet.source] ?? '未知来源'}
        </div>
        <div className="flex items-center gap-2 mt-1 text-[11px]" style={{ color: scheme.onSurfaceVariant }}>
          <span className="w-3.5 h-3.5 rounded-full border shrink-0"
                style={{ backgroundColor: monet.seedHex ?? scheme.primary, borderColor: scheme.outline }} />
          <span className="font-mono-tabular">种子色 {monet.seedHex ?? '—'}</span>
          <span>· 系统深浅：{monet.isDark ? '深色' : '浅色'}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 py-2">
        <Md3Button size="sm" variant={themeId === 'monet' ? 'filled' : 'tonal'}
                   onClick={() => onApplyTheme('monet')}>应用手机主题</Md3Button>
        <Md3Button size="sm" variant="outlined" onClick={() => { void refreshMonet(); }}>重新探测</Md3Button>
        <Md3Button size="sm" variant="outlined" onClick={() => screenshotInput.current?.click()}>截图取色</Md3Button>
        <input ref={screenshotInput} type="file" accept="image/*" className="hidden"
               onChange={(e) => { void onScreenshot(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      <Md3Switch
        checked={darkFollowsSystem}
        onChange={(v) => {
          if (v) resetDarkModeOverride(); else setDarkMode(darkMode);
          update({ followSystemDark: v }, v ? '已跟随系统深浅色' : '已固定为手动深浅色');
        }}
        label="跟随系统深浅色"
        description="原生 uiMode / prefers-color-scheme，关闭后由本页手动覆盖并持久化"
      />
      <p className="text-[11px] leading-relaxed mt-1 px-3 py-2 rounded-lg"
         style={{ color: scheme.onSurfaceVariant, backgroundColor: scheme.surfaceContainerHighest }}>
        网页本身没有读取壁纸动态色的 Web API，能力来自随包集成的 capacitor-material-you 原生插件：
        Android 12+ 读系统 Monet 完整色板，8.1–11 退到壁纸种子色，纯浏览器/老设备退到截图取色。
        读取壁纸颜色无需权限，也不改宿主 Activity 主题。
      </p>
      <Md3Switch checked={darkMode} onChange={setDarkMode} label="深色模式"
                  description={darkMode ? '当前：深色' : '当前：浅色'} />

      {/* ---- 漆色主题 ---- */}
      {sec('铅笔漆色', <Palette className="w-4 h-4" />)}
      <div className="flex flex-wrap gap-2 py-1.5">
        {THEMES.map((t) => (
          <Md3Button key={t.id} size="sm" variant={themeId === t.id ? 'filled' : 'outlined'}
                     onClick={() => onApplyTheme(t.id)}>{t.label}</Md3Button>
        ))}
      </div>

      {/* ---- 壁纸与取色 ---- */}
      {sec('个性化 · 壁纸', <ImagePlus className="w-4 h-4" />)}
      <Md3Switch checked={s.wallpaperOn} onChange={(v) => update({ wallpaperOn: v })}
                 label="自定义壁纸" description="作为整个界面背景，图片存在本机，完全离线可用" />
      <div className="flex flex-wrap gap-2 py-2">
        <Md3Button size="sm" variant="tonal" onClick={() => wallpaperInput.current?.click()}>上传壁纸</Md3Button>
        <Md3Button size="sm" variant="outlined" onClick={() => { void reExtract(); }}>重新提取主色</Md3Button>
        <Md3Button size="sm" variant="outlined" onClick={() => update({ wallpaperOn: false }, '已关闭壁纸')}>清除壁纸</Md3Button>
        <input ref={wallpaperInput} type="file" accept="image/*" className="hidden"
               onChange={(e) => { void onWallpaper(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      <Md3Slider label="模糊半径" sublabel="壁纸背景的高斯模糊，越高越柔和"
                 value={s.wallpaperBlur} min={0} max={40} step={1}
                 formatValue={(v) => `${v} px`}
                 onChange={(n) => update({ wallpaperBlur: n })} />
      <Md3Slider label="背景压暗" sublabel="越高越保证文字可读"
                 value={s.wallpaperDim} min={0} max={95} step={1}
                 formatValue={(v) => `${v}%`}
                 onChange={(n) => update({ wallpaperDim: n })} />

      {/* ---- 强调色 ---- */}
      {sec('强调色', <Palette className="w-4 h-4" />)}
      <Md3Switch checked={s.autoAccent} onChange={(v) => update({ autoAccent: v })}
                 label="从壁纸自动取色" description="上传后分析主色并应用到全界面强调色" />
      <div className="flex items-center gap-3 py-2.5" style={divider}>
        <span className="text-[13px] font-semibold">当前强调色</span>
        <span className="w-6 h-6 rounded-full border shrink-0"
              style={{ backgroundColor: s.accentHex, borderColor: scheme.outline }} />
        <span className="text-[11px] font-mono-tabular" style={{ color: scheme.onSurfaceVariant }}>{s.accentHex}</span>
        <input type="color" value={s.accentHex} aria-label="手动选择强调色"
               onChange={(e) => update({ accentHex: e.target.value, autoAccent: false })}
               className="ml-auto w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0" />
      </div>
      {customAccent && (
        <div className="text-[11px] mt-1" style={{ color: scheme.onSurfaceVariant }}>
          自定义强调色生效中 · 切换漆色或手机主题仍保留
        </div>
      )}

      {/* ---- 字体 ---- */}
      {sec('字体', <Type className="w-4 h-4" />)}
      <div className="text-[12px] leading-relaxed py-1" style={{ color: scheme.onSurfaceVariant }}>
        中文默认 <b style={{ color: scheme.onSurface }}>思源宋体（Noto Serif SC）</b>，字体文件已打进包内，
        无网络也能显示；标题拉丁字形用 Bricolage Grotesque。
      </div>
      <Md3Switch checked={s.customFontOn} onChange={(v) => update({ customFontOn: v })}
                 label="使用上传字体" description="支持 TTF / OTF / WOFF / WOFF2" />
      <div className="flex flex-wrap gap-2 py-2">
        <Md3Button size="sm" variant="tonal" onClick={() => fontInput.current?.click()}>上传字体</Md3Button>
        <Md3Button size="sm" variant="outlined" onClick={() => update({ customFontOn: false }, '已恢复内置思源宋体')}>
          恢复思源宋体
        </Md3Button>
        <input ref={fontInput} type="file" accept=".ttf,.otf,.woff,.woff2,font/*" className="hidden"
               onChange={(e) => { void onFont(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      <Md3Slider label="界面字号" sublabel="整体缩放，不影响游戏数值面板的等宽排版"
                 value={Math.round(s.fontScale * 100)} min={90} max={130} step={5}
                 formatValue={(v) => `${v}%`}
                 onChange={(n) => update({ fontScale: n / 100 })} />

      {/* ---- 声音与触感 ---- */}
      {sec('声音与触感', <Volume2 className="w-4 h-4" />)}
      <Md3Slider label="交互音量" sublabel="作用于所有音效的主增益节点，顶栏音量键仍控制总开关"
                 value={Math.round(s.volume * 100)} min={0} max={100} step={1}
                 formatValue={(v) => `${v}%`}
                 onChange={(n) => update({ volume: n / 100 })} />
      <div className="flex flex-wrap gap-2 py-2">
        <Md3Button size="sm" variant="tonal" onClick={() => workshopAudio.playLatheBeat(true)}>试听一下</Md3Button>
        <Md3Button size="sm" variant="outlined" onClick={() => triggerHaptic(true, 12)}>试一下震动</Md3Button>
      </div>
      <Md3Switch checked={s.haptics} onChange={(v) => update({ haptics: v })}
                 label="触感震动" description="节拍 / 精修 / 提醒的短震" />

      {/* ---- 显示与交互 ---- */}
      {sec('显示与交互', <Palette className="w-4 h-4" />)}
      <Md3Switch checked={reducedMotion}
                 onChange={(v) => { setReducedMotion(v); update({ reducedMotion: v }); }}
                 label="减弱动效" description="压缩过渡与弹簧动画时长" />
      <Md3Switch checked={noFlashVisuals} onChange={setNoFlashVisuals}
                 label="抑制强闪光" description="降低涟漪金粉亮度与高亮闪动" />
      <Md3Slider label="金粉飘散密度" sublabel="细腻亚像素粒子场；不再提供会变成方块颗粒的省电档"
                 value={Math.round(s.sparkleDensity * 100)} min={35} max={200} step={5}
                 formatValue={(v) => `${v}%`}
                 onChange={(n) => update({ sparkleDensity: n / 100 })} />

      {/* ---- 数据 ---- */}
      {sec('数据与关于', <RotateCcw className="w-4 h-4" />)}
      <div className="text-[11px] leading-relaxed py-1" style={{ color: scheme.onSurfaceVariant }}>
        v3 · Graphite &amp; Cedar · 本地校验存档。个性化配置与游戏进度分开保存，清空不会影响银元与产量。
        内置 AOSP RippleShader / StretchEdge / Expressive 弹簧物理，设置页与主界面共用同一套组件。
      </div>
      <div className="flex flex-wrap gap-2 pt-1 pb-2">
        <Md3Button size="sm" variant="outlined" onClick={() => { void resetAll(); }}>清空个性化数据</Md3Button>
      </div>
    </Md3Dialog>
  );
};

/**
 * 设置 · 常用项与个性化。
 * 自包含 UI（原生控件 + inline MD3 配色），不依赖业务组件 props，便于在 APK / 网页双端一致运行。
 * 图标沿用 lucide 的 JSX <svg>，React 自动绑定 http://www.w3.org/2000/svg 命名空间。
 */
import React, { useEffect, useRef, useState } from 'react';
import { Check, ImagePlus, Palette, RotateCcw, Type, Volume2, X } from 'lucide-react';
import { ThemeId, MD3_SCHEMES } from '../../aosp/md3Tokens';
import { useMd3Theme } from '../../aosp/ThemeContext';
import { workshopAudio, triggerHaptic } from '../../game/audio';
import {
  DEFAULT_SETTINGS, GwSettings, applySettings, clearPersonalization,
  extractAccent, initPersonalization, loadSettings, saveSettings,
  setCustomFont, setWallpaper,
} from '../../game/settings';

interface Props {
  open: boolean;
  onClose: () => void;
  onApplyTheme: (id: ThemeId) => void;
}

const THEMES: { id: ThemeId; label: string }[] = [
  { id: 'cedar', label: '经典加州雪松黄' },
  { id: 'graphite', label: '石墨深色' },
  { id: 'prussian', label: '普鲁士蓝' },
];

export const SettingsDialog: React.FC<Props> = ({ open, onClose, onApplyTheme }) => {
  const { scheme, darkMode, setDarkMode, reducedMotion, setReducedMotion,
          noFlashVisuals, setNoFlashVisuals, themeId, setCustomAccent, customAccent } = useMd3Theme();
  const [s, setS] = useState<GwSettings>(() => loadSettings());
  const [hint, setHint] = useState('');
  const wallpaperInput = useRef<HTMLInputElement>(null);
  const fontInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const cur = loadSettings();
    setS(cur);
    initPersonalization(cur, scheme.surface);
  }, [open]);

  const update = (patch: Partial<GwSettings>, note?: string) => {
    const next = { ...s, ...patch };
    setS(next); saveSettings(next);
    applySettings(next, scheme.surface);
    if (patch.accentHex !== undefined && s.autoAccent) setCustomAccent(patch.accentHex || null);
    if (patch.autoAccent !== undefined) setCustomAccent(patch.autoAccent ? (s.accentHex || null) : null);
    if (note) { setHint(note); window.setTimeout(() => setHint(''), 2600); }
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
    // 从已保存的壁纸重新取色（不重新上传）
    const blob = await import('../../game/settings').then((m) => m.getAsset('wallpaper'));
    if (!blob) { setHint('当前没有壁纸'); return; }
    const hex = await extractAccent(blob);
    update({ accentHex: hex, autoAccent: true }, `已重新提取 ${hex}`);
  };

  const resetAll = async () => {
    await clearPersonalization();
    const d = { ...DEFAULT_SETTINGS };
    setS(d); saveSettings(d); setCustomAccent(null);
    setReducedMotion(false); setNoFlashVisuals(false);
    applySettings(d, scheme.surface);
    setHint('个性化数据已清空，字体回落内置思源宋体');
    window.setTimeout(() => setHint(''), 3000);
  };

  if (!open) return null;

  const card: React.CSSProperties = { backgroundColor: scheme.surfaceContainerLow, color: scheme.onSurface };
  const sub: React.CSSProperties = { color: scheme.onSurfaceVariant };
  const sec = (title: string, icon: React.ReactNode) => (
    <div className="flex items-center gap-2 mt-5 mb-2">
      <span style={{ color: scheme.primary }}>{icon}</span>
      <h3 className="text-[11px] font-bold tracking-[1.6px] uppercase" style={sub}>{title}</h3>
    </div>
  );
  const row = (label: string, desc: string, control: React.ReactNode) => (
    <div className="flex items-center justify-between gap-3 py-2.5" style={{ borderBottom: `1px solid ${scheme.outlineVariant}` }}>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-semibold">{label}</div>
        <div className="text-[11px] leading-snug mt-0.5" style={sub}>{desc}</div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
  const slider = (v: number, min: number, max: number, onChange: (n: number) => void) => (
    <input type="range" min={min} max={max} value={v}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-[128px] accent-current cursor-pointer" style={{ accentColor: scheme.primary }} />
  );
  const toggle = (v: boolean, onChange: (b: boolean) => void) => (
    <button type="button" role="switch" aria-checked={v} onClick={() => onChange(!v)}
      className="w-[46px] h-[26px] rounded-full relative transition-colors cursor-pointer shrink-0"
      style={{ backgroundColor: v ? scheme.primary : scheme.surfaceContainerHighest }}>
      <span className="absolute top-[3px] w-5 h-5 rounded-full bg-white shadow transition-all"
        style={{ left: v ? 23 : 3 }} />
    </button>
  );
  const chip = (label: string, onClick: () => void, active = false) => (
    <button type="button" onClick={onClick}
      className="px-3 py-1.5 rounded-full text-[11px] font-semibold cursor-pointer border"
      style={{ backgroundColor: active ? scheme.primaryContainer : scheme.surface,
               color: active ? scheme.onPrimaryContainer : scheme.onSurface,
               borderColor: scheme.outlineVariant }}>
      {active && <Check className="w-3 h-3 inline mr-1" />}{label}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
         style={{ backgroundColor: 'rgba(20,16,13,.58)' }} onClick={onClose}>
      <div className="w-full sm:max-w-[540px] max-h-[88vh] overflow-y-auto rounded-t-[28px] sm:rounded-[28px] shadow-2xl pb-safe"
           style={card} onClick={(e) => e.stopPropagation()}>
        {/* 标题栏 */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-4"
             style={{ backgroundColor: scheme.surfaceContainerLow, borderBottom: `1px solid ${scheme.outlineVariant}` }}>
          <div>
            <h2 className="text-lg font-bold font-display">设置</h2>
            <p className="text-[11px]" style={sub}>常用项 · 个性化 · 声音与显示</p>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭设置"
            className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer"
            style={{ backgroundColor: scheme.surfaceContainerHighest, color: scheme.onSurface }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 pb-6">
          {hint && <div className="mt-3 px-3 py-2 rounded-xl text-[12px] font-medium"
                        style={{ backgroundColor: scheme.primaryContainer, color: scheme.onPrimaryContainer }}>{hint}</div>}

          {/* 个性化 · 壁纸 */}
          {sec('个性化 · 壁纸', <ImagePlus className="w-4 h-4" />)}
          {row('自定义壁纸', '作为整个界面背景，图片存在本机，完全离线可用',
            toggle(s.wallpaperOn, (v) => update({ wallpaperOn: v })))}
          <div className="flex flex-wrap gap-2 py-2">
            {chip('上传壁纸', () => wallpaperInput.current?.click())}
            {chip('重新提取主色', reExtract)}
            {chip('清除壁纸', () => update({ wallpaperOn: false }, '已关闭壁纸'))}
            <input ref={wallpaperInput} type="file" accept="image/*" className="hidden"
                   onChange={(e) => { void onWallpaper(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
          {row('模糊半径', `${s.wallpaperBlur} px`, slider(s.wallpaperBlur, 0, 40, (n) => update({ wallpaperBlur: n })))}
          {row('背景压暗', `${s.wallpaperDim}%（越高越保证文字可读）`,
            slider(s.wallpaperDim, 0, 95, (n) => update({ wallpaperDim: n })))}

          {/* 主题色 */}
          {sec('主题色', <Palette className="w-4 h-4" />)}
          {row('从壁纸自动取色', '上传后分析主色并应用到全界面强调色',
            toggle(s.autoAccent, (v) => update({ autoAccent: v })))}
          <div className="flex items-center gap-3 py-2.5" style={{ borderBottom: `1px solid ${scheme.outlineVariant}` }}>
            <span className="text-[13px] font-semibold">当前强调色</span>
            <span className="w-6 h-6 rounded-full border" style={{ backgroundColor: s.accentHex, borderColor: scheme.outline }} />
            <span className="text-[11px] font-mono-tabular" style={sub}>{s.accentHex}</span>
            <input type="color" value={s.accentHex} aria-label="手动选择强调色"
              onChange={(e) => update({ accentHex: e.target.value, autoAccent: false })}
              className="ml-auto w-9 h-9 rounded-lg cursor-pointer bg-transparent border-0 p-0" />
          </div>
          <div className="flex flex-wrap gap-2 py-2">
            {THEMES.map((t) => chip(t.label, () => onApplyTheme(t.id), themeId === t.id))}
          </div>
          <p className="text-[11px] leading-relaxed mt-1 px-1 py-2 rounded-lg"
             style={{ ...sub, backgroundColor: scheme.surfaceContainerHighest }}>
            系统动态主题色（Android Monet / wallpaperColors）没有 Web 标准接口，WebView 内无法读取，按约定跳过；
            上方「跟随系统深浅色」覆盖可用的系统级联动。
          </p>
          {customAccent && <div className="text-[11px] mt-1" style={sub}>自定义强调色生效中 · 切换漆色主题仍保留</div>}

          {/* 字体 */}
          {sec('字体', <Type className="w-4 h-4" />)}
          <div className="text-[12px] leading-relaxed py-2" style={sub}>
            中文默认 <b style={{ color: scheme.onSurface }}>思源宋体（Noto Serif SC）</b>，字体文件已打进包内，
            无网络也能显示；标题拉丁字形用 Bricolage Grotesque。
          </div>
          {row('使用上传字体', '支持 TTF / OTF / WOFF / WOFF2',
            toggle(s.customFontOn, (v) => update({ customFontOn: v })))}
          <div className="flex flex-wrap gap-2 py-2">
            {chip('上传字体', () => fontInput.current?.click())}
            {chip('恢复思源宋体', () => update({ customFontOn: false }, '已恢复内置思源宋体'))}
            <input ref={fontInput} type="file" accept=".ttf,.otf,.woff,.woff2,font/*" className="hidden"
                   onChange={(e) => { void onFont(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
          {row('界面字号', `${Math.round(s.fontScale * 100)}%`,
            slider(Math.round(s.fontScale * 100), 90, 130, (n) => update({ fontScale: n / 100 })))}

          {/* 声音与触感 */}
          {sec('声音与触感', <Volume2 className="w-4 h-4" />)}
          {row('交互音量', `${Math.round(s.volume * 100)}%（顶栏音量键仍控制总开关）`,
            slider(Math.round(s.volume * 100), 0, 100, (n) => update({ volume: n / 100 })))}
          <div className="flex flex-wrap gap-2 py-2">
            {chip('试听一下', () => workshopAudio.playLatheBeat(true))}
            {chip('震动反馈', () => triggerHaptic(true, 12))}
          </div>
          {row('触感震动', '节拍 / 精修 / 提醒的短震',
            toggle(s.haptics, (v) => update({ haptics: v })))}

          {/* 显示与交互 */}
          {sec('显示与交互', <Palette className="w-4 h-4" />)}
          {row('深色模式', '当前：' + (darkMode ? '深色' : '浅色'),
            toggle(darkMode, (v) => setDarkMode(v)))}
          {row('跟随系统深浅色', '读取 prefers-color-scheme（重启后生效）',
            toggle(s.followSystemDark, (v) => update({ followSystemDark: v })))}
          {row('减弱动效', '压缩过渡与弹簧动画时长',
            toggle(s.reducedMotion, (v) => { setReducedMotion(v); update({ reducedMotion: v }); }))}
          {row('抑制强闪光', '降低涟漪金粉与高亮闪动',
            toggle(noFlashVisuals, (v) => setNoFlashVisuals(v)))}

          {/* 数据 */}
          {sec('数据与关于', <RotateCcw className="w-4 h-4" />)}
          <div className="text-[11px] leading-relaxed py-2" style={sub}>
            v3 · Graphite &amp; Cedar · 本地校验存档。个性化配置与游戏进度分开保存，清空不会影响银元与产量。
            内置 AOSP RippleShader / StretchEdge / Expressive 弹簧物理。
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {chip('清空个性化数据', () => { void resetAll(); })}
          </div>
        </div>
      </div>
    </div>
  );
};

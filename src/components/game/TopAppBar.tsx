/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Info, Moon, Palette, Settings2, Sun, Volume2, VolumeX } from 'lucide-react';
import { useMd3Theme } from '../../aosp/ThemeContext';
import { Md3RippleSurface } from '../md3/Md3RippleSurface';

interface TopAppBarProps {
  credits: number;
  craftTokens: number;
  soundEnabled: boolean;
  onCycleTheme: () => void;
  onToggleDark: () => void;
  onToggleSound: () => void;
  onOpenBaseline: () => void;
  onOpenSettings: () => void;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  credits,
  craftTokens,
  soundEnabled,
  onCycleTheme,
  onToggleDark,
  onToggleSound,
  onOpenBaseline,
  onOpenSettings,
}) => {
  const { scheme, darkMode } = useMd3Theme();

  return (
    <header
      className="sticky top-0 z-30 min-h-14 lg:h-16 px-2 sm:px-4 lg:px-6 py-1.5 sm:py-0 flex flex-wrap sm:flex-nowrap items-center justify-between gap-x-2 gap-y-1 sm:gap-4 backdrop-blur-md transition-colors duration-200"
      style={{
        backgroundColor: `${scheme.surface}E6`,
        borderBottom: `1px solid ${scheme.outlineVariant}`,
      }}
    >
      {/* Zone 1: Brand Wordmark —— 窄屏与按钮组共占第一行，可收缩截断 */}
      <div className="flex items-center min-w-0 flex-1 order-1">
        <span
          className="text-sm sm:text-base lg:text-lg font-bold font-display tracking-tight whitespace-nowrap truncate"
          style={{ color: scheme.onSurface }}
        >
          石墨工坊 · Graphite &amp; Cedar
        </span>
      </div>

      {/* Zone 2: Live Economy Telemetry —— 窄屏整行单独落第二行，不与按钮抢宽度 */}
      <div className="flex items-center gap-3 text-[11px] sm:text-sm font-mono-tabular shrink-0 w-full sm:w-auto order-3 sm:order-2">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span style={{ color: scheme.onSurfaceVariant }}>银元</span>
          <span className="font-bold" style={{ color: scheme.primary }}>
            {credits}
          </span>
        </div>
        <span aria-hidden="true" style={{ color: scheme.outlineVariant }}>
          ·
        </span>
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span style={{ color: scheme.onSurfaceVariant }}>印章</span>
          <span className="font-bold" style={{ color: scheme.tertiary }}>
            {craftTokens}
          </span>
        </div>
      </div>

      {/* Zone 3: Controls —— 5 个按钮保持 40×40 触控目标，窄屏只收紧间隙不缩按钮 */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 order-2 sm:order-3">
        <Md3RippleSurface
          onClick={onCycleTheme}
          cornerRadius={20}
          aria-label="切换铅笔漆色主题"
          title={`当前漆色：${scheme.lacquerName}`}
          className="min-h-[40px] min-w-[40px] sm:px-3 rounded-full text-xs font-medium cursor-pointer whitespace-nowrap"
          style={{
            backgroundColor: scheme.secondaryContainer,
            color: scheme.onSecondaryContainer,
          }}
        >
          <Palette className="w-4 h-4 shrink-0" />
          <span className="hidden md:inline whitespace-nowrap">{scheme.lacquerName}</span>
        </Md3RippleSurface>

        <Md3RippleSurface
          onClick={onToggleDark}
          cornerRadius={20}
          aria-label={darkMode ? '切换浅色模式' : '切换深色模式'}
          className="min-h-[40px] min-w-[40px] rounded-full cursor-pointer"
          style={{ color: scheme.onSurfaceVariant }}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Md3RippleSurface>

        <Md3RippleSurface
          onClick={onToggleSound}
          cornerRadius={20}
          aria-label={soundEnabled ? '关闭音效' : '开启音效'}
          /* Match the other icon-only buttons exactly. `hidden sm:block`
             dropped this control on <640px screens, leaving a gap in the
             group that read as a misaligned icon. Keep it always visible. */
          className="min-h-[40px] min-w-[40px] rounded-full cursor-pointer"
          style={{ color: scheme.onSurfaceVariant }}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </Md3RippleSurface>

        <Md3RippleSurface
          onClick={onOpenSettings}
          cornerRadius={20}
          aria-label="打开设置"
          title="设置 · 个性化与常用选项"
          className="min-h-[40px] min-w-[40px] rounded-full cursor-pointer"
          style={{ color: scheme.onSurfaceVariant }}
        >
          <Settings2 className="w-4 h-4" />
        </Md3RippleSurface>

        <Md3RippleSurface
          onClick={onOpenBaseline}
          cornerRadius={20}
          aria-label="查看 AOSP 源码基线说明"
          className="min-h-[40px] min-w-[40px] sm:px-3 rounded-full text-xs font-medium cursor-pointer whitespace-nowrap"
          style={{
            border: `1px solid ${scheme.outlineVariant}`,
            color: scheme.onSurface,
          }}
        >
          <Info className="w-4 h-4 shrink-0" />
          <span className="hidden lg:inline whitespace-nowrap">AOSP 基线</span>
        </Md3RippleSurface>
      </div>
    </header>
  );
};

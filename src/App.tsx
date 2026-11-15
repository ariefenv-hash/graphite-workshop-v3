/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Compass, Factory, FlaskConical } from 'lucide-react';
import { MD3_SCHEMES, ThemeId } from './aosp/md3Tokens';
import { RippleMaskShape } from './aosp/RippleShader';
import { Md3ThemeProvider, useMd3Theme } from './aosp/ThemeContext';
import { AospBaselineDialog } from './components/game/AospBaselineDialog';
import { FactoryWorkspace } from './components/game/FactoryWorkspace';
import { OfflineReportDialog } from './components/game/OfflineReportDialog';
import { ResearchWorkspace } from './components/game/ResearchWorkspace';
import { SettingsDialog } from './components/game/SettingsDialog';
import { TopAppBar } from './components/game/TopAppBar';
import { TradeWorkspace } from './components/game/TradeWorkspace';
import { Md3RippleSurface } from './components/md3/Md3RippleSurface';
import { Md3Snackbar } from './components/md3/Md3Snackbar';
import { Md3StretchScroll } from './components/md3/Md3StretchScroll';
import { initPersonalization, loadSettings } from './game/settings';
import { useWorkshopStore } from './game/useWorkshopStore';

const THEME_CYCLE: ThemeId[] = ['cedar', 'graphite', 'prussian', 'monet'];

type NavTab = 'factory' | 'trade' | 'research';

const WorkshopShell: React.FC = () => {
  const {
    scheme, themeId, darkMode, setThemeId, setDarkMode,
    darkFollowsSystem, monet, applyScreenshotSeed,
  } = useMd3Theme();
  const store = useWorkshopStore();
  const { state } = store;

  const [activeTab, setActiveTab] = useState<NavTab>('factory');
  const [baselineOpen, setBaselineOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  /** 用户手动选过主题后，当前会话内不再自动覆盖为手机主题。 */
  const manualThemeRef = useRef(false);

  // 个性化设置（字体 / 壁纸 / 音量 / 涟漪密度）启动时恢复一次。
  useEffect(() => {
    const s = loadSettings();
    void initPersonalization(s, scheme.surface);
    if (!s.followSystemDark && darkFollowsSystem) setDarkMode(darkMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (state.themeId && state.themeId !== themeId) {
      setThemeId(state.themeId);
    }
  }, [state.themeId, themeId, setThemeId]);

  // 手机主题自动覆盖：原生桥 / 壁纸种子就绪且用户未手动选过主题时，
  // 自动切到 monet。store 内回调均稳定，只需响应探测状态与当前主题。
  useEffect(() => {
    if (
      monet.status === 'ready' &&
      (monet.source === 'monet' || monet.source === 'wallpaper') &&
      !manualThemeRef.current &&
      themeId !== 'monet'
    ) {
      setThemeId('monet');
      store.setThemeSelection('monet');
      store.pushSnackbar(`已自动应用手机主题：${monet.lightScheme?.lacquerName ?? 'Material You 动态色'}`);
    }
  }, [monet.status, monet.source, monet.lightScheme, themeId, setThemeId]);

  const handleCycleTheme = () => {
    const idx = THEME_CYCLE.indexOf(themeId);
    const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];

    // 浏览器环境走到「手机主题」且还没有任何种子色：打开壁纸截图选择器
    // （Capacitor 环境下原生/壁纸路径已就绪，不会走到这里）。
    if (next === 'monet' && monet.source === 'none' && monet.seedHex === null) {
      screenshotInputRef.current?.click();
      return;
    }

    manualThemeRef.current = true;
    store.setThemeSelection(next);
    setThemeId(next);
    const nextLabel =
      next === 'monet'
        ? (monet.lightScheme?.lacquerName ?? MD3_SCHEMES.monet.light.lacquerName)
        : MD3_SCHEMES[next].light.lacquerName;
    store.pushSnackbar(`已切换动态配色：${nextLabel}`);
  };

  const handleScreenshotPicked = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      await applyScreenshotSeed(file);
      manualThemeRef.current = true;
      store.setThemeSelection('monet');
      setThemeId('monet');
      store.pushSnackbar('已从截图提取壁纸主题色并应用');
    } catch {
      store.pushSnackbar('截图取色失败，请换一张壁纸截图重试');
    }
  };

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'factory',
      label: '制造车间',
      icon: <Factory className="w-5 h-5" />,
      badge: state.inventory.burr > 0 ? state.inventory.burr : undefined,
    },
    {
      id: 'trade',
      label: '全球贸易',
      icon: <Compass className="w-5 h-5" />,
      badge: state.shipments.length > 0 ? state.shipments.length : undefined,
    },
    {
      id: 'research',
      label: '工艺图鉴',
      icon: <FlaskConical className="w-5 h-5" />,
    },
  ];

  return (
    <div
      className="min-h-screen flex flex-col transition-colors duration-200"
      style={{ backgroundColor: scheme.surface, color: scheme.onSurface }}
    >
      <TopAppBar
        credits={state.credits}
        craftTokens={state.craftTokens}
        soundEnabled={state.accessibility.soundEnabled}
        onCycleTheme={handleCycleTheme}
        onToggleDark={() => setDarkMode(!darkMode)}
        onToggleSound={() =>
          store.updateAccessibility('soundEnabled', !state.accessibility.soundEnabled)
        }
        onOpenBaseline={() => setBaselineOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <div className="flex-1 flex w-full max-w-[1440px] mx-auto">
        {/* Desktop AOSP Navigation Rail */}
        <aside
          aria-label="主导航栏"
          className="hidden lg:flex flex-col items-center gap-3 py-6 px-3 w-24 shrink-0"
          style={{ borderRight: `1px solid ${scheme.outlineVariant}` }}
        >
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <Md3RippleSurface
                key={item.id}
                cornerRadius={16}
                maskShape={RippleMaskShape.ROUNDED_RECT}
                onClick={() => setActiveTab(item.id)}
                className="w-full py-2 cursor-pointer rounded-xl"
              >
                <div className="flex flex-col items-center gap-1.5 w-full">
                <div
                  className="relative w-14 h-8 rounded-full flex items-center justify-center transition-colors duration-150"
                  style={{
                    backgroundColor: active ? scheme.secondaryContainer : 'transparent',
                    color: active ? scheme.onSecondaryContainer : scheme.onSurfaceVariant,
                  }}
                >
                  {item.icon}
                  {item.badge !== undefined && (
                    <span
                      className="absolute top-0 right-0 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-mono-tabular font-bold flex items-center justify-center"
                      style={{ backgroundColor: scheme.error, color: scheme.onError }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                <span
                  className="text-xs font-medium whitespace-nowrap"
                  style={{ color: active ? scheme.onSurface : scheme.onSurfaceVariant }}
                >
                  {item.label}
                </span>
                </div>
              </Md3RippleSurface>
            );
          })}
        </aside>

        {/* Main Workspace Viewport：页面级前级滑动也走 AOSP 拉伸弹簧 */}
        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-8 min-w-0">
          <Md3StretchScroll className="min-w-0">
            {activeTab === 'factory' && (
              <FactoryWorkspace
                state={state}
                qtePhaseRef={store.qtePhaseRef}
                lastJudgment={store.lastJudgment}
                onTriggerQte={store.triggerRhythmQte}
                onRepairBurr={store.repairBurrPencil}
                onSellBurrs={store.sellBurrDiscount}
                onClearJam={store.clearStageJam}
                onUpgradeStage={store.upgradeStage}
                onExtractTimber={store.extractEmergencyTimber}
                onBuyMaterial={store.buyMaterialPack}
                onUpdateParam={store.updateParam}
                onSetShape={store.setBarrelShape}
                onToggleAutoServo={(v) => store.updateAccessibility('autoTrimServo', v)}
                onSellDirect={store.sellDirectBatch}
                onGoToTrade={() => setActiveTab('trade')}
                onResolveEvent={store.resolveEvent}
              />
            )}

            {activeTab === 'trade' && (
              <TradeWorkspace
                state={state}
                recentArrival={store.recentShipArrival}
                onClearArrival={store.clearRecentShipArrival}
                onShipOrder={store.shipOrder}
                onRefreshOrders={store.refreshOrders}
              />
            )}

            {activeTab === 'research' && (
              <ResearchWorkspace
                state={state}
                onUnlockTech={store.unlockTech}
                onUpdateAccessibility={store.updateAccessibility}
                onResetSave={store.resetProgress}
              />
            )}
          </Md3StretchScroll>
        </main>
      </div>

      {/* Mobile AOSP Navigation Bar */}
      <nav
        aria-label="移动端底部导航"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-16 pb-safe px-2 grid grid-cols-3 items-center backdrop-blur-md"
        style={{
          backgroundColor: `${scheme.surfaceContainerLow}F2`,
          borderTop: `1px solid ${scheme.outlineVariant}`,
        }}
      >
        {navItems.map((item) => {
          const active = activeTab === item.id;
          return (
            <Md3RippleSurface
              key={item.id}
              cornerRadius={16}
              maskShape={RippleMaskShape.ROUNDED_RECT}
              onClick={() => setActiveTab(item.id)}
              className="min-h-[48px] flex-col gap-0.5 rounded-xl cursor-pointer"
            >
              <div className="flex flex-col items-center justify-center gap-0.5">
                <div
                  className="relative px-4 py-1 rounded-full flex items-center justify-center transition-colors"
                  style={{
                    backgroundColor: active ? scheme.secondaryContainer : 'transparent',
                    color: active ? scheme.onSecondaryContainer : scheme.onSurfaceVariant,
                  }}
                >
                  {item.icon}
                  {item.badge !== undefined && (
                    <span
                      className="absolute -top-0.5 right-1 min-w-[16px] h-[16px] px-1 rounded-full text-[10px] font-mono-tabular font-bold flex items-center justify-center"
                      style={{ backgroundColor: scheme.error, color: scheme.onError }}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
                <span
                  className="text-[11px] font-medium whitespace-nowrap"
                  style={{ color: active ? scheme.onSurface : scheme.onSurfaceVariant }}
                >
                  {item.label}
                </span>
              </div>
            </Md3RippleSurface>
          );
        })}
      </nav>

      <OfflineReportDialog report={store.offlineReport} onDismiss={store.dismissOfflineReport} />

      {/* 手机主题降级入口：壁纸截图选择器（隐藏触发） */}
      <input
        ref={screenshotInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={handleScreenshotPicked}
      />

      <AospBaselineDialog open={baselineOpen} onClose={() => setBaselineOpen(false)} />

      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onApplyTheme={(id: ThemeId) => {
          manualThemeRef.current = true;
          store.setThemeSelection(id);
          setThemeId(id);
        }}
      />

      <Md3Snackbar messages={store.snackbars} />
    </div>
  );
};

export default function App() {
  return (
    <Md3ThemeProvider initialThemeId="cedar">
      <WorkshopShell />
    </Md3ThemeProvider>
  );
}

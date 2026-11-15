/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Compass, Factory, FlaskConical } from 'lucide-react';
import { MD3_SCHEMES, ThemeId } from './aosp/md3Tokens';
import { RippleMaskShape } from './aosp/RippleShader';
import { Md3ThemeProvider, useMd3Theme } from './aosp/ThemeContext';
import { AospBaselineDialog } from './components/game/AospBaselineDialog';
import { FactoryWorkspace } from './components/game/FactoryWorkspace';
import { OfflineReportDialog } from './components/game/OfflineReportDialog';
import { ResearchWorkspace } from './components/game/ResearchWorkspace';
import { TopAppBar } from './components/game/TopAppBar';
import { TradeWorkspace } from './components/game/TradeWorkspace';
import { Md3RippleSurface } from './components/md3/Md3RippleSurface';
import { Md3Snackbar } from './components/md3/Md3Snackbar';
import { useWorkshopStore } from './game/useWorkshopStore';

const THEME_CYCLE: ThemeId[] = ['cedar', 'graphite', 'prussian'];

type NavTab = 'factory' | 'trade' | 'research';

const WorkshopShell: React.FC = () => {
  const { scheme, themeId, darkMode, setThemeId, setDarkMode } = useMd3Theme();
  const store = useWorkshopStore();
  const { state } = store;

  const [activeTab, setActiveTab] = useState<NavTab>('factory');
  const [baselineOpen, setBaselineOpen] = useState(false);

  useEffect(() => {
    if (state.themeId && state.themeId !== themeId) {
      setThemeId(state.themeId);
    }
  }, [state.themeId, themeId, setThemeId]);

  const handleCycleTheme = () => {
    const idx = THEME_CYCLE.indexOf(themeId);
    const next = THEME_CYCLE[(idx + 1) % THEME_CYCLE.length];
    store.setThemeSelection(next);
    setThemeId(next);
    store.pushSnackbar(`已切换动态配色：${MD3_SCHEMES[next].light.lacquerName}`);
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
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className="flex flex-col items-center gap-1.5 w-full py-2 cursor-pointer group focus-visible:outline-2 rounded-xl"
                style={{ outlineColor: scheme.primary }}
              >
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
                      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-mono-tabular font-bold flex items-center justify-center"
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
              </button>
            );
          })}
        </aside>

        {/* Main Workspace Viewport */}
        <main className="flex-1 p-4 sm:p-6 pb-24 lg:pb-8 min-w-0">
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

      <OfflineReportDialog
        report={store.offlineReport}
        onDismiss={store.dismissOfflineReport}
      />

      <AospBaselineDialog open={baselineOpen} onClose={() => setBaselineOpen(false)} />

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

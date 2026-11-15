/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowRight,
  Box,
  CheckCircle2,
  Flame,
  Hammer,
  Layers,
  Paintbrush,
  Sparkles,
  Target,
  Trees,
  Wrench,
  Zap,
} from 'lucide-react';
import { EdgeEffectState } from '../../aosp/EdgeEffect';
import { RippleMaskShape } from '../../aosp/RippleShader';
import { useMd3Theme } from '../../aosp/ThemeContext';
import {
  ACHIEVEMENTS,
  COMBO_HEAT_MAX,
  getCycleDurationMs,
  getGradeFromRatio,
  getNextMilestone,
  getQteWindowMs,
  getStageUpgradeCost,
  MATERIAL_PACKS,
} from '../../game/constants';
import {
  BarrelShape,
  MaterialType,
  QteJudgment,
  QualityTier,
  WorkshopParams,
  WorkshopState,
} from '../../game/types';
import { Md3Button, Md3SegmentedButton } from '../md3/Md3Button';
import { Md3Card } from '../md3/Md3Card';
import { Md3Progress } from '../md3/Md3Progress';
import { Md3RippleSurface } from '../md3/Md3RippleSurface';
import { Md3Slider } from '../md3/Md3Slider';
import { Md3StretchContainer } from '../md3/Md3StretchContainer';
import { Md3Switch } from '../md3/Md3Switch';
import { PencilCraftSvg } from './PencilCraftSvg';

const SHAPE_TO_MASK: Record<BarrelShape, RippleMaskShape> = {
  hex: RippleMaskShape.HEX_BARREL,
  round: RippleMaskShape.ROUND_BARREL,
  cone: RippleMaskShape.SHARPENED_CONE,
};

interface FactoryWorkspaceProps {
  state: WorkshopState;
  qtePhaseRef: React.MutableRefObject<number>;
  lastJudgment: QteJudgment | null;
  onTriggerQte: () => string;
  onRepairBurr: () => void;
  onSellBurrs: () => void;
  onClearJam: (stageId: string) => void;
  onUpgradeStage: (stageId: string) => void;
  onExtractTimber: (peakDistance: number) => void;
  onBuyMaterial: (type: MaterialType) => void;
  onUpdateParam: <K extends keyof WorkshopParams>(key: K, val: number) => void;
  onSetShape: (shape: BarrelShape) => void;
  onToggleAutoServo: (enabled: boolean) => void;
  onSellDirect: (tier: QualityTier) => void;
  onGoToTrade: () => void;
  onResolveEvent: () => void;
}

export const FactoryWorkspace: React.FC<FactoryWorkspaceProps> = ({
  state,
  qtePhaseRef,
  lastJudgment,
  onTriggerQte,
  onRepairBurr,
  onSellBurrs,
  onClearJam,
  onUpgradeStage,
  onExtractTimber,
  onBuyMaterial,
  onUpdateParam,
  onSetShape,
  onToggleAutoServo,
  onSellDirect,
  onGoToTrade,
  onResolveEvent,
}) => {
  const { scheme } = useMd3Theme();
  const [pullDist, setPullDist] = useState(0);
  const [pullState, setPullState] = useState<EdgeEffectState>(EdgeEffectState.IDLE);

  const needleRef = useRef<HTMLDivElement | null>(null);
  const swingStatusRef = useRef<HTMLSpanElement | null>(null);
  const prevPhaseRef = useRef(0);
  const lastReportedDistRef = useRef(0);
  const qteTriggerRef = useRef(onTriggerQte);
  qteTriggerRef.current = onTriggerQte;

  const handlePullProgress = useCallback((distance: number, edgeState: EdgeEffectState) => {
    if (
      Math.abs(distance - lastReportedDistRef.current) >= 0.02 ||
      (distance === 0 && lastReportedDistRef.current !== 0)
    ) {
      lastReportedDistRef.current = distance;
      setPullDist(distance);
    }
    setPullState((prev) => (prev === edgeState ? prev : edgeState));
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'j' || e.key === 'J') &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.getAttribute('role') !== 'slider'
      ) {
        e.preventDefault();
        qteTriggerRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Position, travel direction and live percentage are written straight to the
  // DOM. No React state is touched at 60fps.
  useEffect(() => {
    let rafId = 0;
    const syncNeedle = () => {
      const phase = qtePhaseRef.current;
      if (needleRef.current) {
        needleRef.current.style.left = `${phase * 100}%`;
      }
      if (swingStatusRef.current) {
        const dir = phase >= prevPhaseRef.current ? '→' : '←';
        swingStatusRef.current.textContent = `卡尺 ${dir} ${Math.round(phase * 100)}%`;
      }
      prevPhaseRef.current = phase;
      rafId = requestAnimationFrame(syncNeedle);
    };
    rafId = requestAnimationFrame(syncNeedle);
    return () => cancelAnimationFrame(rafId);
  }, [qtePhaseRef]);

  const cycleMs = getCycleDurationMs(state);
  const { perfectMs, goodMs } = getQteWindowMs(state);
  const grade = getGradeFromRatio(state.params.graphiteRatio);
  const maskShape = SHAPE_TO_MASK[state.barrelShape];
  const autoServoUnlocked = state.techs.find((t) => t.id === 'auto_servo')?.unlocked ?? false;
  const nextMilestone = getNextMilestone(state);
  const activeEvent = state.activeEvent;
  const heatPct = Math.min(1, state.comboHeat / COMBO_HEAT_MAX);

  const perfectWidthPct = Math.min(28, (perfectMs * 2 * 100) / cycleMs);
  const goodWidthPct = Math.min(48, (goodMs * 2 * 100) / cycleMs);

  const hasMaterials =
    state.materials.cedarLogs >= 1 &&
    state.materials.graphitePowder >= 1 &&
    state.materials.lacquerLiters >= 0.4;
  const firstJammedIndex = state.stages.findIndex((st) => st.hasJam);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
      {/* Left Column: QTE Bench, Handwheels, 8-Stage Pipeline */}
      <div className="xl:col-span-7 flex flex-col gap-5">
        {/* Always-visible next goal: turns an open-ended +1 loop into a ladder */}
        <Md3Card className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <h3
              className="text-sm font-bold font-display flex items-center gap-2"
              style={{ color: scheme.onSurface }}
            >
              <Target className="w-4 h-4" style={{ color: scheme.primary }} />
              <span>下一里程碑</span>
            </h3>
            <span
              className="font-mono-tabular text-xs shrink-0"
              style={{ color: scheme.onSurfaceVariant }}
            >
              {state.achievements.length}/{ACHIEVEMENTS.length} 已达成
            </span>
          </div>
          {nextMilestone ? (
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold truncate" style={{ color: scheme.onSurface }}>
                    {nextMilestone.def.title}
                  </span>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: scheme.secondaryContainer,
                      color: scheme.onSecondaryContainer,
                    }}
                  >
                    {nextMilestone.def.tier}
                  </span>
                </div>
                <span
                  className="font-mono-tabular text-xs font-bold shrink-0"
                  style={{ color: scheme.primary }}
                >
                  {nextMilestone.cur}/{nextMilestone.max}
                </span>
              </div>
              <Md3Progress value={nextMilestone.pct} label="里程碑进度" height={6} tone="primary" />
              <p className="text-xs" style={{ color: scheme.onSurfaceVariant }}>
                {nextMilestone.def.desc} · 奖励 +{nextMilestone.def.rewardCredits} 银元
                {nextMilestone.def.rewardTokens > 0
                  ? ` +${nextMilestone.def.rewardTokens} 印章`
                  : ''}
              </p>
            </>
          ) : (
            <p className="text-xs" style={{ color: scheme.onSurfaceVariant }}>
              全部里程碑已达成，工坊进入自由经营阶段。
            </p>
          )}
        </Md3Card>

        {/* Timed surprise: claim good news or repair a breakdown */}
        {activeEvent && (
          <Md3Card elevated className="flex flex-col gap-3 event-card">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5 min-w-0">
                <Zap
                  className="w-5 h-5 shrink-0 mt-0.5"
                  style={{ color: activeEvent.tone === 'bad' ? scheme.error : scheme.primary }}
                />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-bold" style={{ color: scheme.onSurface }}>
                      {activeEvent.title}
                    </h3>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor:
                          activeEvent.tone === 'bad'
                            ? scheme.errorContainer
                            : scheme.secondaryContainer,
                        color:
                          activeEvent.tone === 'bad'
                            ? scheme.onErrorContainer
                            : scheme.onSecondaryContainer,
                      }}
                    >
                      {activeEvent.tone === 'bad' ? '突发故障' : '限时机会'}
                    </span>
                  </div>
                  <p
                    className="text-xs mt-1 leading-relaxed"
                    style={{ color: scheme.onSurfaceVariant }}
                  >
                    {activeEvent.desc}
                  </p>
                </div>
              </div>
              <span
                className="font-mono-tabular text-sm font-bold shrink-0"
                style={{ color: activeEvent.tone === 'bad' ? scheme.error : scheme.primary }}
              >
                {Math.ceil(activeEvent.remainingSec)}s
              </span>
            </div>
            <Md3Progress
              value={activeEvent.remainingSec / activeEvent.totalSec}
              label="事件剩余时间"
              height={4}
              tone={activeEvent.tone === 'bad' ? 'error' : 'primary'}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs" style={{ color: scheme.onSurfaceVariant }}>
                {activeEvent.kind === 'fx'
                  ? '窗口期内发货 ×1.45 · 可先多发几单再锁定'
                  : `应对奖励：+${activeEvent.rewardCredits ?? 0} 银元${
                      activeEvent.rewardTokens ? ` +${activeEvent.rewardTokens} 印章` : ''
                    }`}
              </span>
              <Md3Button
                size="sm"
                variant="filled"
                onClick={onResolveEvent}
                style={
                  activeEvent.tone === 'bad'
                    ? { backgroundColor: scheme.error, color: scheme.onError }
                    : undefined
                }
              >
                {activeEvent.actionLabel}
              </Md3Button>
            </div>
          </Md3Card>
        )}

        <Md3Card elevated className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold font-display" style={{ color: scheme.onSurface }}>
                精修切削与蘸漆工作台
              </h2>
              <p className="text-xs mt-0.5 font-mono-tabular" style={{ color: scheme.onSurfaceVariant }}>
                摆动单程 {cycleMs}ms · 中央完美窗 ±{perfectMs}ms · 规格 {grade}
              </p>
            </div>
            <Md3SegmentedButton
              ariaLabel="选择笔杆截面与 SDF 遮罩"
              value={state.barrelShape}
              onChange={onSetShape}
              options={[
                { value: 'hex', label: '六角杆' },
                { value: 'round', label: '圆杆' },
                { value: 'cone', label: '削尖锥' },
              ]}
            />
          </div>

          <div
            className="rounded-2xl p-4 flex flex-col gap-4"
            style={{
              backgroundColor: scheme.surfaceContainerLowest,
              border: `1px solid ${scheme.outlineVariant}`,
            }}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <PencilCraftSvg
                grade={grade}
                barrelShape={state.barrelShape}
                lacquerThickness={state.params.lacquerThickness}
              />

              <div className="flex items-center gap-5 shrink-0">
                <div className="text-right">
                  <div className="text-xs" style={{ color: scheme.onSurfaceVariant }}>
                    连续节奏
                  </div>
                  <div
                    className="font-mono-tabular text-xl font-bold"
                    style={{ color: scheme.primary }}
                  >
                    {state.comboCount}x
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs" style={{ color: scheme.onSurfaceVariant }}>
                    最高连击
                  </div>
                  <div
                    className="font-mono-tabular text-xl font-bold"
                    style={{ color: scheme.onSurface }}
                  >
                    {state.bestCombo}x
                  </div>
                </div>
              </div>
            </div>

            {/* Swing QTE: caliper bounces between two endpoints, judged at centre */}
            <div className="flex flex-col gap-2">
              <div
                className={`relative h-9 rounded-full overflow-hidden ${
                  lastJudgment?.heatBurst ? 'heat-flash' : ''
                }`}
                style={{ backgroundColor: scheme.surfaceContainerHigh }}
              >
                {/* Turnaround endpoints */}
                <div
                  className="absolute top-0 bottom-0 left-0 w-1.5"
                  style={{ backgroundColor: scheme.tertiary }}
                />
                <div
                  className="absolute top-0 bottom-0 right-0 w-1.5"
                  style={{ backgroundColor: scheme.tertiary }}
                />
                {/* Good + perfect zones centred on 50% */}
                <div
                  className="absolute top-0 bottom-0 -translate-x-1/2"
                  style={{
                    left: '50%',
                    width: `${goodWidthPct}%`,
                    backgroundColor: scheme.secondaryContainer,
                  }}
                />
                <div
                  className="absolute top-0 bottom-0 -translate-x-1/2"
                  style={{
                    left: '50%',
                    width: `${perfectWidthPct}%`,
                    backgroundColor: scheme.primaryContainer,
                    borderLeft: `2px solid ${scheme.primary}`,
                    borderRight: `2px solid ${scheme.primary}`,
                  }}
                />
                <div
                  className="absolute top-0 bottom-0 w-0.5 -translate-x-1/2"
                  style={{ left: '50%', backgroundColor: scheme.primary }}
                />
                {/* Travelling caliper */}
                <div
                  ref={needleRef}
                  className="absolute top-1 bottom-1 w-2.5 rounded-full -translate-x-1/2 qte-needle"
                  style={{
                    left: '0%',
                    backgroundColor: scheme.onSurface,
                    willChange: 'left',
                  }}
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
                <span
                  ref={swingStatusRef}
                  className="font-mono-tabular font-semibold"
                  style={{ color: scheme.primary }}
                >
                  卡尺 → 0%
                </span>
                <span
                  className="flex items-center gap-1"
                  style={{ color: scheme.onSurfaceVariant }}
                >
                  <ArrowLeftRight className="w-3.5 h-3.5" />
                  两端折返 · 中央高光判定（快捷键 J）
                </span>
                {lastJudgment && (
                  <span
                    key={lastJudgment.id}
                    className={`font-mono-tabular font-semibold qte-pop ${
                      lastJudgment.milestone ? 'qte-milestone' : ''
                    }`}
                    style={{
                      color:
                        lastJudgment.tier === 'perfect'
                          ? scheme.primary
                          : lastJudgment.tier === 'good'
                            ? scheme.success
                            : scheme.error,
                    }}
                  >
                    {lastJudgment.milestone ? '★ ' : ''}
                    {lastJudgment.label}
                  </span>
                )}
              </div>

              {/* Combo heat fills with each hit, then bursts into a bonus Masterwork */}
              <div className="flex items-center gap-2">
                <Flame className="w-3.5 h-3.5 shrink-0" style={{ color: scheme.tertiary }} />
                <div
                  className="flex-1 h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: scheme.surfaceContainerHigh }}
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-200"
                    style={{ width: `${heatPct * 100}%`, backgroundColor: scheme.tertiary }}
                  />
                </div>
                <span
                  className="font-mono-tabular text-[11px] shrink-0"
                  style={{ color: scheme.onSurfaceVariant }}
                >
                  粉尘热度 {state.comboHeat}/{COMBO_HEAT_MAX}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Md3RippleSurface
                onClick={onTriggerQte}
                maskShape={maskShape}
                cornerRadius={20}
                shaderOptions={{
                  woodDir: [1, 0.15],
                  bloomRadius: 1.25,
                  trailDecay: 0.35,
                  sparkleDensity: 1.35,
                }}
                rippleColor={scheme.rippleWaveRgba}
                sparkleColor={scheme.rippleSparkleRgba}
                className="min-h-[52px] rounded-2xl font-semibold text-sm px-5 shadow-sm cursor-pointer active:scale-[0.985] transition-transform duration-150"
                style={{
                  backgroundColor: scheme.primary,
                  color: scheme.onPrimary,
                }}
              >
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>卡尺居中时精修削尖（石墨晕染）</span>
              </Md3RippleSurface>

              <div
                className="rounded-2xl px-4 py-2 flex items-center justify-between gap-3"
                style={{
                  backgroundColor: scheme.surfaceContainerLow,
                  border: `1px solid ${scheme.outlineVariant}`,
                }}
              >
                <Md3Switch
                  checked={state.accessibility.autoTrimServo}
                  onChange={onToggleAutoServo}
                  label="低操作自动伺服"
                  description={
                    autoServoUnlocked
                      ? '已强化：92% 精良 · 8% 典藏'
                      : '基础模式：72% 精良（无需抢拍）'
                  }
                />
              </div>
            </div>
          </div>
        </Md3Card>

        {/* Machine Handwheels (AOSP Expressive Sliders) */}
        <Md3Card className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold font-display" style={{ color: scheme.onSurface }}>
                机床手轮与工艺配方
              </h3>
              <p className="text-xs" style={{ color: scheme.onSurfaceVariant }}>
                拖拽 44dp 竖直手柄实时调整节拍、漆层与石墨硬度
              </p>
            </div>
            <span
              className="font-mono-tabular text-xs font-semibold whitespace-nowrap"
              style={{ color: scheme.primary }}
            >
              当前笔芯：{grade}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            <Md3Slider
              label="刀头进给量"
              sublabel="提速但收窄 QTE 判定窗，>82 mm/s 有卡料风险"
              value={state.params.feedRate}
              min={10}
              max={100}
              step={2}
              unit=" mm/s"
              trackSize="medium"
              onChange={(v) => onUpdateParam('feedRate', v)}
            />
            <Md3Slider
              label="石墨粘土配比"
              sublabel="低值偏软黑 (4B)，高值偏硬细 (4H)"
              value={state.params.graphiteRatio}
              min={0}
              max={100}
              step={4}
              formatValue={(v) => `${getGradeFromRatio(v)} (${v}%)`}
              trackSize="medium"
              onChange={(v) => onUpdateParam('graphiteRatio', v)}
            />
            <Md3Slider
              label="漆层蘸涂厚度"
              sublabel="影响漆面饱和度与单支漆料消耗"
              value={state.params.lacquerThickness}
              min={20}
              max={120}
              step={5}
              unit=" μm"
              trackSize="small"
              onChange={(v) => onUpdateParam('lacquerThickness', v)}
            />
            <Md3Slider
              label="压芯挤出压力"
              sublabel="过高压力 (>78 MPa) 会增大毛刺概率"
              value={state.params.pressPressure}
              min={15}
              max={90}
              step={5}
              unit=" MPa"
              trackSize="small"
              onChange={(v) => onUpdateParam('pressPressure', v)}
            />
          </div>
        </Md3Card>

        {/* 8-Stage Automatic Pipeline */}
        <Md3Card className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold font-display" style={{ color: scheme.onSurface }}>
                8 工序自动流水线
              </h3>
              <p className="text-xs" style={{ color: scheme.onSurfaceVariant }}>
                {!hasMaterials
                  ? '原料不足：请补充雪松木 / 石墨粉 / 油漆以恢复自动生产'
                  : firstJammedIndex >= 0
                    ? `第 0${firstJammedIndex + 1} 工序卡料，下游工序已同步暂停`
                    : '全线顺畅运转中'}
              </p>
            </div>
            <span
              className="text-xs font-mono-tabular whitespace-nowrap"
              style={{ color: scheme.onSurfaceVariant }}
            >
              总产量 {state.totalPencilsCrafted} 支
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {state.stages.map((stage, idx) => {
              const upgradeCost = getStageUpgradeCost(stage.machineLevel);
              const blockedUpstream =
                !stage.hasJam && firstJammedIndex >= 0 && idx > firstJammedIndex;
              const canUpgrade = state.credits >= upgradeCost;

              return (
                <div
                  key={stage.id}
                  className="rounded-xl p-3 flex flex-col gap-2 transition-colors duration-150"
                  style={{
                    backgroundColor: stage.hasJam
                      ? scheme.errorContainer
                      : blockedUpstream
                        ? scheme.surfaceContainer
                        : scheme.surfaceContainerLow,
                    border: `1px solid ${
                      stage.hasJam ? scheme.error : scheme.outlineVariant
                    }`,
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="font-mono-tabular text-xs font-bold shrink-0"
                        style={{ color: stage.hasJam ? scheme.error : scheme.primary }}
                      >
                        0{stage.order}
                      </span>
                      <span
                        className="text-sm font-semibold truncate"
                        style={{
                          color: stage.hasJam ? scheme.onErrorContainer : scheme.onSurface,
                        }}
                      >
                        {stage.name}
                      </span>
                      {blockedUpstream && (
                        <span
                          className="text-[11px] font-medium shrink-0"
                          style={{ color: scheme.error }}
                        >
                          · 等待上游疏通
                        </span>
                      )}
                    </div>
                    <span
                      className="font-mono-tabular text-xs shrink-0"
                      style={{ color: scheme.onSurfaceVariant }}
                    >
                      Lv.{stage.machineLevel}
                    </span>
                  </div>

                  <Md3Progress
                    value={stage.progress}
                    label={`${stage.name}进度`}
                    height={5}
                    tone={stage.hasJam ? 'error' : 'primary'}
                  />

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span
                      className="text-[11px] truncate"
                      style={{
                        color: stage.hasJam ? scheme.onErrorContainer : scheme.onSurfaceVariant,
                      }}
                    >
                      {stage.description}
                    </span>

                    {stage.hasJam ? (
                      <Md3Button
                        size="sm"
                        variant="filled"
                        onClick={() => onClearJam(stage.id)}
                        style={{
                          backgroundColor: scheme.error,
                          color: scheme.onError,
                        }}
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>疏通</span>
                      </Md3Button>
                    ) : (
                      <Md3Button
                        size="sm"
                        variant="tonal"
                        disabled={!canUpgrade}
                        onClick={() => onUpgradeStage(stage.id)}
                      >
                        <Hammer className="w-3.5 h-3.5" />
                        <span>升级 {upgradeCost}</span>
                      </Md3Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Md3Card>
      </div>

      {/* Right Column: Inventory Vault, StretchEdge Bin, Maritime Summary */}
      <div className="xl:col-span-5 flex flex-col gap-5">
        {/* Inventory & QA Salvage */}
        <Md3Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold font-display" style={{ color: scheme.onSurface }}>
              成品仓与质检补救台
            </h3>
            <span className="text-xs" style={{ color: scheme.onSurfaceVariant }}>
              点击瑕疵笔可盖章精修
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div
              className="rounded-xl p-3 flex flex-col gap-1"
              style={{ backgroundColor: scheme.surfaceContainerLow }}
            >
              <span className="text-xs" style={{ color: scheme.onSurfaceVariant }}>
                标准合格品 (Standard)
              </span>
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className="font-mono-tabular text-2xl font-bold"
                  style={{ color: scheme.onSurface }}
                >
                  {state.inventory.standard}
                </span>
                <Md3Button
                  size="sm"
                  variant="text"
                  disabled={state.inventory.standard <= 0}
                  onClick={() => onSellDirect('standard')}
                >
                  直销
                </Md3Button>
              </div>
            </div>

            <div
              className="rounded-xl p-3 flex flex-col gap-1"
              style={{ backgroundColor: scheme.surfaceContainerLow }}
            >
              <span className="text-xs" style={{ color: scheme.onSurfaceVariant }}>
                精修上品 (Artisan)
              </span>
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className="font-mono-tabular text-2xl font-bold"
                  style={{ color: scheme.primary }}
                >
                  {state.inventory.artisan}
                </span>
                <Md3Button
                  size="sm"
                  variant="text"
                  disabled={state.inventory.artisan <= 0}
                  onClick={() => onSellDirect('artisan')}
                >
                  直销
                </Md3Button>
              </div>
            </div>

            <div
              className="rounded-xl p-3 flex flex-col gap-1"
              style={{ backgroundColor: scheme.primaryContainer }}
            >
              <span className="text-xs" style={{ color: scheme.onPrimaryContainer }}>
                大师典藏 (Masterwork)
              </span>
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className="font-mono-tabular text-2xl font-bold"
                  style={{ color: scheme.onPrimaryContainer }}
                >
                  {state.inventory.masterwork}
                </span>
                <Md3Button
                  size="sm"
                  variant="text"
                  disabled={state.inventory.masterwork <= 0}
                  onClick={() => onSellDirect('masterwork')}
                  style={{ color: scheme.onPrimaryContainer }}
                >
                  直销
                </Md3Button>
              </div>
            </div>

            <div
              className="rounded-xl p-3 flex flex-col gap-1"
              style={{
                backgroundColor:
                  state.inventory.burr > 0 ? scheme.errorContainer : scheme.surfaceContainerLow,
              }}
            >
              <span
                className="text-xs"
                style={{
                  color:
                    state.inventory.burr > 0 ? scheme.onErrorContainer : scheme.onSurfaceVariant,
                }}
              >
                毛刺流漆待检 (Burr)
              </span>
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className="font-mono-tabular text-2xl font-bold"
                  style={{
                    color: state.inventory.burr > 0 ? scheme.onErrorContainer : scheme.onSurface,
                  }}
                >
                  {state.inventory.burr}
                </span>
                <Md3Button
                  size="sm"
                  variant="text"
                  disabled={state.inventory.burr <= 0}
                  onClick={onSellBurrs}
                  style={
                    state.inventory.burr > 0 ? { color: scheme.onErrorContainer } : undefined
                  }
                >
                  折价清仓
                </Md3Button>
              </div>
            </div>
          </div>

          <Md3RippleSurface
            disabled={state.inventory.burr <= 0}
            onClick={onRepairBurr}
            cornerRadius={16}
            shaderOptions={{ bloomRadius: 1.1, sparkleDensity: 1.2 }}
            className="min-h-[46px] rounded-xl font-medium text-sm px-4 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: scheme.secondaryContainer,
              color: scheme.onSecondaryContainer,
            }}
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>
              {state.inventory.burr > 0
                ? `点击手工精修 1 支毛刺笔（剩余 ${state.inventory.burr} 支）`
                : '当前无待修毛刺瑕疵笔'}
            </span>
          </Md3RippleSurface>
        </Md3Card>

        {/* Cedar Timber Bin (StretchEdgeEffect) */}
        <Md3Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold font-display" style={{ color: scheme.onSurface }}>
                雪松木料仓 · StretchEdge 物理拽料
              </h3>
              <p className="text-xs" style={{ color: scheme.onSurfaceVariant }}>
                按住料仓向下或向上拖拽，触发 AOSP 边缘拉伸并拽出原木
              </p>
            </div>
            <span
              className="font-mono-tabular text-xs font-semibold shrink-0"
              style={{ color: scheme.primary }}
            >
              {(pullDist * 100).toFixed(0)}%
            </span>
          </div>

          <Md3StretchContainer
            onPullProgress={handlePullProgress}
            onPullCommit={onExtractTimber}
            className="rounded-2xl"
          >
            <div
              className="rounded-2xl p-4 flex flex-col gap-3 cursor-grab active:cursor-grabbing transition-colors duration-150"
              style={{
                backgroundColor:
                  pullDist > 0.78 ? scheme.errorContainer : scheme.surfaceContainerHigh,
                border: `1px dashed ${pullDist > 0.78 ? scheme.error : scheme.outline}`,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Trees className="w-5 h-5 shrink-0" style={{ color: scheme.primary }} />
                  <div className="min-w-0">
                    <div
                      className="text-sm font-semibold truncate"
                      style={{ color: scheme.onSurface }}
                    >
                      向上/向下持续拽出雪松木段
                    </div>
                    <div className="text-xs" style={{ color: scheme.onSurfaceVariant }}>
                      {pullDist > 0.78 ? (
                        <span
                          className="inline-flex items-center gap-1 font-medium"
                          style={{ color: scheme.error }}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>接近极限拉伸！松手将高产但可能震落石墨粉</span>
                        </span>
                      ) : pullState === EdgeEffectState.RECEDE ? (
                        'EdgeEffect 欠阻尼弹簧回弹中 (ω₀=24.657, ζ=0.98)'
                      ) : (
                        '拉得越深超产越多 (1~5 根)'
                      )}
                    </div>
                  </div>
                </div>
                <ArrowDownToLine
                  className="w-4 h-4 shrink-0"
                  style={{ color: scheme.onSurfaceVariant }}
                />
              </div>

              <Md3Progress
                value={pullDist}
                label="料仓拉伸度"
                height={6}
                tone={pullDist > 0.78 ? 'error' : 'primary'}
              />
            </div>
          </Md3StretchContainer>

          <div className="grid grid-cols-3 gap-2.5 pt-1">
            {(
              [
                {
                  type: 'cedar' as MaterialType,
                  icon: <Trees className="w-3.5 h-3.5" />,
                  val: state.materials.cedarLogs,
                },
                {
                  type: 'graphite' as MaterialType,
                  icon: <Layers className="w-3.5 h-3.5" />,
                  val: state.materials.graphitePowder,
                },
                {
                  type: 'lacquer' as MaterialType,
                  icon: <Paintbrush className="w-3.5 h-3.5" />,
                  val: state.materials.lacquerLiters,
                },
              ] as const
            ).map((item) => {
              const pack = MATERIAL_PACKS[item.type];
              const affordable = state.credits >= pack.costCredits;
              return (
                <div
                  key={item.type}
                  className="rounded-xl p-2.5 flex flex-col gap-2"
                  style={{ backgroundColor: scheme.surfaceContainerLow }}
                >
                  <div
                    className="flex items-center gap-1.5 text-xs"
                    style={{ color: scheme.onSurfaceVariant }}
                  >
                    {item.icon}
                    <span>{pack.label}</span>
                  </div>
                  <div
                    className="font-mono-tabular text-lg font-bold"
                    style={{ color: item.val < 2 ? scheme.error : scheme.onSurface }}
                  >
                    {item.val.toFixed(1)}
                  </div>
                  <Md3Button
                    size="sm"
                    variant="tonal"
                    disabled={!affordable}
                    onClick={() => onBuyMaterial(item.type)}
                  >
                    +{pack.amount} ({pack.costCredits}元)
                  </Md3Button>
                </div>
              );
            })}
          </div>
        </Md3Card>

        {/* Maritime Summary Card with quick navigation */}
        <Md3Card className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Box className="w-5 h-5 shrink-0" style={{ color: scheme.primary }} />
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: scheme.onSurface }}>
                正在海运交付：{state.shipments.length} 批
              </div>
              <div className="text-xs truncate" style={{ color: scheme.onSurfaceVariant }}>
                待接国际订单：{state.orders.length} 份 · 商誉 {state.reputation} · 已交{' '}
                {state.totalOrdersShipped} 单
              </div>
            </div>
          </div>
          <Md3Button size="sm" variant="outlined" onClick={onGoToTrade}>
            <span>前往贸易</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Md3Button>
        </Md3Card>
      </div>
    </div>
  );
};

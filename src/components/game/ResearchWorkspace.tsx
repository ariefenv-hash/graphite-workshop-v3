/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  FlaskConical,
  RotateCcw,
  ShieldCheck,
  SlidersVertical,
} from 'lucide-react';
import { useMd3Theme } from '../../aosp/ThemeContext';
import { ACHIEVEMENTS, BARREL_SPECIMENS } from '../../game/constants';
import { AccessibilityPrefs, WorkshopState } from '../../game/types';
import { Md3Button } from '../md3/Md3Button';
import { Md3Card } from '../md3/Md3Card';
import { Md3Dialog } from '../md3/Md3Dialog';
import { Md3Progress } from '../md3/Md3Progress';
import { Md3RippleSurface } from '../md3/Md3RippleSurface';
import { Md3Switch } from '../md3/Md3Switch';

interface ResearchWorkspaceProps {
  state: WorkshopState;
  onUnlockTech: (techId: string) => void;
  onUpdateAccessibility: <K extends keyof AccessibilityPrefs>(
    key: K,
    val: AccessibilityPrefs[K]
  ) => void;
  onResetSave: () => void;
}

export const ResearchWorkspace: React.FC<ResearchWorkspaceProps> = ({
  state,
  onUnlockTech,
  onUpdateAccessibility,
  onResetSave,
}) => {
  const { scheme } = useMd3Theme();
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      {/* Tech Tree */}
      <Md3Card elevated className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2
              className="text-lg font-bold font-display flex items-center gap-2"
              style={{ color: scheme.onSurface }}
            >
              <FlaskConical className="w-5 h-5" style={{ color: scheme.primary }} />
              <span>工艺研发树</span>
            </h2>
            <p className="text-xs" style={{ color: scheme.onSurfaceVariant }}>
              消耗工坊银元与金箔印章，升级结构工艺、环保漆面与自动伺服
            </p>
          </div>
          <div className="font-mono-tabular text-xs font-semibold" style={{ color: scheme.primary }}>
            银元 {state.credits} · 金箔印章 {state.craftTokens}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {state.techs.map((tech) => {
            const affordable =
              state.credits >= tech.costCredits && state.craftTokens >= tech.costTokens;
            return (
              <div
                key={tech.id}
                className="rounded-2xl p-4 flex flex-col justify-between gap-3 transition-colors duration-150"
                style={{
                  backgroundColor: tech.unlocked
                    ? scheme.primaryContainer
                    : scheme.surfaceContainerLowest,
                  border: `1px solid ${tech.unlocked ? scheme.primary : scheme.outlineVariant}`,
                }}
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3
                      className="text-sm font-bold"
                      style={{
                        color: tech.unlocked ? scheme.onPrimaryContainer : scheme.onSurface,
                      }}
                    >
                      {tech.name}
                    </h3>
                    {tech.unlocked && (
                      <CheckCircle2
                        className="w-4 h-4 shrink-0"
                        style={{ color: scheme.primary }}
                      />
                    )}
                  </div>
                  <p
                    className="text-xs leading-relaxed"
                    style={{
                      color: tech.unlocked ? scheme.onPrimaryContainer : scheme.onSurfaceVariant,
                    }}
                  >
                    {tech.description}
                  </p>
                  <div className="text-xs font-medium pt-1" style={{ color: scheme.primary }}>
                    {tech.effectLabel}
                  </div>
                </div>

                {tech.unlocked ? (
                  <span
                    className="text-xs font-mono-tabular font-semibold"
                    style={{ color: scheme.onPrimaryContainer }}
                  >
                    已掌握工艺
                  </span>
                ) : (
                  <Md3Button
                    size="sm"
                    variant="filled"
                    disabled={!affordable}
                    onClick={() => onUnlockTech(tech.id)}
                  >
                    <span>
                      研发 ({tech.costCredits}元
                      {tech.costTokens > 0 ? ` + ${tech.costTokens}印章` : ''})
                    </span>
                  </Md3Button>
                )}
              </div>
            );
          })}
        </div>
      </Md3Card>

      {/* Shared Offscreen WebGL2 SDF Specimen Table */}
      <Md3Card className="flex flex-col gap-3">
        <div>
          <h3 className="text-base font-bold font-display" style={{ color: scheme.onSurface }}>
            笔型图鉴 · 共享离屏 WebGL2 SDF 试触台
          </h3>
          <p className="text-xs" style={{ color: scheme.onSurfaceVariant }}>
            点击下方各笔型样本卡片，直接体验六角杆 / 圆杆 / 削尖锥 SDF 遮罩粒子涟漪（共享同一离屏管线）
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {BARREL_SPECIMENS.map((spec) => (
            <Md3RippleSurface
              key={spec.id}
              maskShape={spec.maskShape}
              cornerRadius={18}
              shaderOptions={{
                woodDir: spec.woodDir,
                bloomRadius: 1.15,
                sparkleDensity: 1.4,
              }}
              className="rounded-2xl p-4 text-left min-h-[128px] cursor-pointer"
              style={{
                backgroundColor: scheme.surfaceContainerLow,
                border: `1px solid ${scheme.outlineVariant}`,
              }}
            >
              <div className="flex flex-col items-start justify-between gap-2 w-full h-full">
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-bold" style={{ color: scheme.onSurface }}>
                    {spec.title}
                  </span>
                  <span
                    className="font-mono-tabular text-xs font-semibold"
                    style={{ color: scheme.primary }}
                  >
                    {spec.grade}
                  </span>
                </div>
                <p
                  className="text-xs text-left leading-relaxed"
                  style={{ color: scheme.onSurfaceVariant }}
                >
                  {spec.desc}
                </p>
                <span className="text-[11px] font-mono-tabular" style={{ color: scheme.primary }}>
                  点击试触 SDF 石墨涟漪
                </span>
              </div>
            </Md3RippleSurface>
          ))}
        </div>
      </Md3Card>

      {/* Achievements & Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Md3Card className="flex flex-col gap-3">
          <h3
            className="text-base font-bold font-display flex items-center gap-2"
            style={{ color: scheme.onSurface }}
          >
            <Award className="w-5 h-5" style={{ color: scheme.primary }} />
            <span>
              工坊成就 ({state.achievements.length}/{ACHIEVEMENTS.length})
            </span>
          </h3>

          <Md3Progress
            value={state.achievements.length / ACHIEVEMENTS.length}
            label="成就总进度"
            height={5}
            tone="tertiary"
          />

          <div className="flex flex-col gap-4">
            {(['入门', '进阶', '大师'] as const).map((tier) => (
              <div key={tier} className="flex flex-col gap-2">
                <div
                  className="text-[11px] font-bold tracking-wide"
                  style={{ color: scheme.primary }}
                >
                  {tier} · {ACHIEVEMENTS.filter((a) => a.tier === tier).length} 项
                </div>
                {ACHIEVEMENTS.filter((a) => a.tier === tier).map((ach) => {
                  const done = state.achievements.includes(ach.id);
                  const p = ach.progress?.(state);
                  const pct = p ? Math.max(0, Math.min(1, p.cur / p.max)) : done ? 1 : 0;
                  return (
                    <div
                      key={ach.id}
                      className="rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3"
                      style={{
                        backgroundColor: done
                          ? scheme.secondaryContainer
                          : scheme.surfaceContainerLow,
                        opacity: done ? 1 : 0.78,
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold" style={{ color: scheme.onSurface }}>
                          {ach.title}
                        </div>
                        <div className="text-xs" style={{ color: scheme.onSurfaceVariant }}>
                          {ach.desc}
                        </div>
                        {!done && p && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <div
                              className="flex-1 h-1 rounded-full overflow-hidden"
                              style={{ backgroundColor: scheme.surfaceContainerHigh }}
                            >
                              <div
                                className="h-full rounded-full transition-[width] duration-200"
                                style={{ width: `${pct * 100}%`, backgroundColor: scheme.primary }}
                              />
                            </div>
                            <span
                              className="font-mono-tabular text-[10px] shrink-0"
                              style={{ color: scheme.onSurfaceVariant }}
                            >
                              {Math.min(p.cur, p.max)}/{p.max}
                            </span>
                          </div>
                        )}
                        <div className="text-[10px] mt-1" style={{ color: scheme.primary }}>
                          奖励 +{ach.rewardCredits} 银元
                          {ach.rewardTokens > 0 ? ` +${ach.rewardTokens} 印章` : ''}
                        </div>
                      </div>
                      <span
                        className="text-xs font-mono-tabular font-semibold shrink-0"
                        style={{ color: done ? scheme.primary : scheme.onSurfaceVariant }}
                      >
                        {done ? '已达成' : '未达成'}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </Md3Card>

        <Md3Card className="flex flex-col gap-3">
          <h3
            className="text-base font-bold font-display flex items-center gap-2"
            style={{ color: scheme.onSurface }}
          >
            <SlidersVertical className="w-5 h-5" style={{ color: scheme.primary }} />
            <span>无障碍操作与工坊设置</span>
          </h3>

          <div className="flex flex-col gap-2">
            <Md3Switch
              checked={state.accessibility.autoTrimServo}
              onChange={(v) => onUpdateAccessibility('autoTrimServo', v)}
              label="自动精修伺服（低操作备选）"
              description="按产线节拍自动产出 Artisan 精良铅笔"
            />
            <Md3Switch
              checked={state.accessibility.extendedQteWindow}
              onChange={(v) => onUpdateAccessibility('extendedQteWindow', v)}
              label="延长 QTE 判定窗口 (+50%)"
              description="适合单手触屏或温和节奏操作"
            />
            <Md3Switch
              checked={state.accessibility.noFlashVisuals}
              onChange={(v) => onUpdateAccessibility('noFlashVisuals', v)}
              label="关闭高频闪烁反馈"
              description="降低着色器粒子高光对比，保留柔和涟漪过渡"
            />
            <Md3Switch
              checked={state.accessibility.soundEnabled}
              onChange={(v) => onUpdateAccessibility('soundEnabled', v)}
              label="合成工艺音效 (Web Audio)"
              description="机床节拍、切削清音与海运汽笛"
            />
            <Md3Switch
              checked={state.accessibility.hapticsEnabled}
              onChange={(v) => onUpdateAccessibility('hapticsEnabled', v)}
              label="触觉微震反馈 (Vibration API)"
              description="支持 Android Chrome 等设备短震反馈"
            />
          </div>

          <div
            className="mt-2 pt-3 flex items-center justify-between gap-3"
            style={{ borderTop: `1px solid ${scheme.outlineVariant}` }}
          >
            <div
              className="flex items-center gap-2 text-xs"
              style={{ color: scheme.onSurfaceVariant }}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>本地 FNV-1a 校验存档 · 离线封顶 8 小时</span>
            </div>
            <Md3Button size="sm" variant="outlined" onClick={() => setConfirmResetOpen(true)}>
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重置存档</span>
            </Md3Button>
          </div>
        </Md3Card>
      </div>

      {/* Confirmation Dialog before wiping local save */}
      <Md3Dialog
        open={confirmResetOpen}
        onClose={() => setConfirmResetOpen(false)}
        title="确认重置工坊存档？"
        maxWidthClass="max-w-md"
        actions={
          <>
            <Md3Button variant="text" onClick={() => setConfirmResetOpen(false)}>
              取消
            </Md3Button>
            <Md3Button
              variant="filled"
              style={{ backgroundColor: scheme.error, color: scheme.onError }}
              onClick={() => {
                setConfirmResetOpen(false);
                onResetSave();
              }}
            >
              确认重置
            </Md3Button>
          </>
        }
      >
        <p style={{ color: scheme.onSurfaceVariant }}>
          重置后将清空当前银元、金箔印章、流水线等级、工艺研发树与成就进度，恢复至工坊初始状态。此操作不可撤销。
        </p>
      </Md3Dialog>
    </div>
  );
};

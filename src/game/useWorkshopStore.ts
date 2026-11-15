/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Authoritative workshop state.
 *
 * Revision notes:
 * - The QTE lathe is now a PING-PONG swing: the caliper travels 0→1→0
 *   between two endpoints and the judgement zone sits dead centre (0.5).
 *   A triangular wave keeps the phase continuous so changing feed-rate never
 *   makes the needle jump. Phase lives in a ref and is written straight to the
 *   DOM, so the whole tree does not re-render at 60fps.
 * - Timed random events ("工坊快讯"), a milestone achievement ladder with
 *   one-off rewards, combo-heat dust bursts and audio/haptic staging.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ThemeId } from '../aosp/md3Tokens';
import { useMd3Theme } from '../aosp/ThemeContext';
import { SnackbarItem } from '../components/md3/Md3Snackbar';
import { triggerHaptic, workshopAudio } from './audio';
import {
  ACHIEVEMENTS,
  COMBO_HEAT_MAX,
  computeOrderPayout,
  createRandomEvent,
  createTradeOrder,
  getCycleDurationMs,
  getGradeFromRatio,
  getQteWindowMs,
  getStageUpgradeCost,
  HOME_PORT,
  isComboMilestone,
  MATERIAL_PACKS,
  TRADE_DESTINATIONS,
} from './constants';
import { clearWorkshopSave, loadWorkshopState, saveWorkshopState } from './storage';
import {
  AccessibilityPrefs,
  BarrelShape,
  MaterialType,
  OfflineReport,
  QteJudgment,
  QualityTier,
  RecentShipArrival,
  TradeOrder,
  WorkshopParams,
  WorkshopState,
} from './types';

export function useWorkshopStore() {
  const [initialLoad] = useState(loadWorkshopState);
  const [state, setState] = useState<WorkshopState>(initialLoad.state);
  const [offlineReport, setOfflineReport] = useState<OfflineReport | null>(
    initialLoad.offlineReport
  );
  const [lastJudgment, setLastJudgment] = useState<QteJudgment | null>(null);
  const [snackbars, setSnackbars] = useState<SnackbarItem[]>([]);
  const [recentShipArrival, setRecentShipArrival] = useState<RecentShipArrival | null>(null);

  const { setNoFlashVisuals } = useMd3Theme();

  // Mirror of the latest state for long-lived loops and stable callbacks.
  const stateRef = useRef(state);
  stateRef.current = state;

  const qtePhaseRef = useRef(0);
  const qteCyclesRef = useRef(0);
  const swingDirRef = useRef<1 | -1>(1);
  const lastBeatCycleRef = useRef(-1);
  const lastTickMsRef = useRef(performance.now());
  const eventCountdownRef = useRef(18); // first surprise arrives quickly
  const nextSnackIdRef = useRef(1);
  const nextJudgeIdRef = useRef(1);

  // Sync noFlashVisuals into MD3 theme context
  useEffect(() => {
    setNoFlashVisuals(state.accessibility.noFlashVisuals);
  }, [state.accessibility.noFlashVisuals, setNoFlashVisuals]);

  const pushSnackbar = useCallback(
    (text: string, tone: 'normal' | 'success' | 'error' = 'normal') => {
      const id = nextSnackIdRef.current++;
      setSnackbars((prev) => [...prev.slice(-2), { id, text, tone }]);
      setTimeout(() => {
        setSnackbars((prev) => prev.filter((item) => item.id !== id));
      }, 2800);
    },
    []
  );

  // Periodic autosave + pagehide save (mounted once, reads the ref)
  useEffect(() => {
    const interval = setInterval(() => saveWorkshopState(stateRef.current), 4000);
    const onHide = () => saveWorkshopState(stateRef.current);
    window.addEventListener('pagehide', onHide);
    return () => {
      clearInterval(interval);
      window.removeEventListener('pagehide', onHide);
    };
  }, []);

  // Milestone ladder: grant one-off rewards whenever a condition becomes true.
  // Cheap enough to run on every state change (16 predicates, 200ms cadence).
  useEffect(() => {
    const unlocked = ACHIEVEMENTS.filter(
      (a) => !state.achievements.includes(a.id) && a.test(state)
    );
    if (unlocked.length === 0) return;
    setState((prev) => {
      const fresh = unlocked.filter((a) => !prev.achievements.includes(a.id));
      if (fresh.length === 0) return prev;
      return {
        ...prev,
        achievements: [...prev.achievements, ...fresh.map((a) => a.id)],
        credits: prev.credits + fresh.reduce((sum, a) => sum + a.rewardCredits, 0),
        craftTokens: prev.craftTokens + fresh.reduce((sum, a) => sum + a.rewardTokens, 0),
      };
    });
    unlocked.forEach((a) => {
      pushSnackbar(
        `里程碑达成 · ${a.title}（+${a.rewardCredits} 银元${
          a.rewardTokens > 0 ? ` +${a.rewardTokens} 印章` : ''
        }）`,
        'success'
      );
    });
    workshopAudio.playAchievement(state.accessibility.soundEnabled);
  }, [state, pushSnackbar]);

  // 60fps PING-PONG lathe phase loop.
  // qteCycles counts single traversals; a triangular wave maps it to a
  // position that bounces between the two endpoints. The beat sounds on each
  // turnaround, which is what gives the swing its rhythm.
  useEffect(() => {
    let rafId = 0;
    let prevNow = performance.now();

    const step = (now: number) => {
      const dt = Math.max(0, Math.min(100, now - prevNow));
      prevNow = now;
      const cur = stateRef.current;
      const cycleMs = getCycleDurationMs(cur);
      qteCyclesRef.current += dt / cycleMs;
      const t = qteCyclesRef.current % 2;
      const phase = t <= 1 ? t : 2 - t;
      qtePhaseRef.current = phase;
      swingDirRef.current = t <= 1 ? 1 : -1;

      const cycleIndex = Math.floor(qteCyclesRef.current);
      if (cycleIndex !== lastBeatCycleRef.current) {
        lastBeatCycleRef.current = cycleIndex;
        workshopAudio.playLatheBeat(
          cur.accessibility.soundEnabled,
          0.9 + (cur.params.feedRate / 100) * 0.4
        );
      }
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // 200ms production, shipping, event & order ticker
  useEffect(() => {
    const timer = setInterval(() => {
      const now = performance.now();
      const dtSec = Math.min(1, (now - lastTickMsRef.current) / 1000);
      lastTickMsRef.current = now;

      setState((prev) => {
        const cycleSec = getCycleDurationMs(prev) / 1000;
        const hasMaterials =
          prev.materials.cedarLogs >= 1 &&
          prev.materials.graphitePowder >= 1 &&
          prev.materials.lacquerLiters >= 0.4;

        let nextMaterials = { ...prev.materials };
        const nextInventory = { ...prev.inventory };
        const nextStats = { ...prev.stats };
        let craftedTotal = prev.totalPencilsCrafted;
        let nextCredits = prev.credits;
        let nextRep = prev.reputation;
        let shippedTotal = prev.totalOrdersShipped;
        let nextTokens = prev.craftTokens;

        const hasEcoLacquer = prev.techs.find((t) => t.id === 'eco_lacquer')?.unlocked ?? false;
        const hasAutoServoTech = prev.techs.find((t) => t.id === 'auto_servo')?.unlocked ?? false;
        const hasErasableCore = prev.techs.find((t) => t.id === 'erasable_core')?.unlocked ?? false;

        // Upstream jam propagation: if stage i hasJam, stages >= i are blocked
        let upstreamJammed = false;
        let nextStages = prev.stages.map((st) => {
          if (st.hasJam) {
            upstreamJammed = true;
            return st;
          }
          if (!hasMaterials || upstreamJammed) {
            return st;
          }
          const rate = (dtSec / cycleSec) * (1 + (st.machineLevel - 1) * 0.18) * 1.15;
          let nextProg = st.progress + rate;
          let jammedNow = false;
          if (nextProg >= 1 && prev.params.feedRate > 82 && Math.random() < 0.032) {
            jammedNow = true;
            nextProg = 0.96;
            upstreamJammed = true;
          }
          return {
            ...st,
            progress: jammedNow ? nextProg : nextProg % 1,
            hasJam: jammedNow,
          };
        });

        const prevQa = prev.stages[7];
        const nextQa = nextStages[7];
        if (!prevQa.hasJam && !upstreamJammed && hasMaterials && nextQa.progress < prevQa.progress) {
          const lacquerCost = (prev.params.lacquerThickness / 100) * (hasEcoLacquer ? 0.35 : 0.52);
          nextMaterials = {
            cedarLogs: Math.max(0, Number((nextMaterials.cedarLogs - 1).toFixed(2))),
            graphitePowder: Math.max(0, Number((nextMaterials.graphitePowder - 0.8).toFixed(2))),
            lacquerLiters: Math.max(
              0,
              Number((nextMaterials.lacquerLiters - lacquerCost).toFixed(2))
            ),
          };

          const pressureRisk = prev.params.pressPressure > 78 ? 0.18 : 0.04;
          const lacquerRisk = prev.params.lacquerThickness > 98 ? 0.14 : 0.03;
          const burrProb = Math.max(0.02, pressureRisk + lacquerRisk - (hasEcoLacquer ? 0.07 : 0));

          if (Math.random() < burrProb) {
            nextInventory.burr += 1;
          } else if (prev.accessibility.autoTrimServo) {
            const artisanRate = hasAutoServoTech ? 0.92 : 0.72;
            if (hasAutoServoTech && Math.random() < 0.08) {
              nextInventory.masterwork += 1;
            } else if (Math.random() < artisanRate) {
              nextInventory.artisan += 1;
            } else {
              nextInventory.standard += 1;
            }
          } else {
            nextInventory.standard += 1;
          }
          craftedTotal += 1;
        }

        let remainingShipments = [];
        for (const ship of prev.shipments) {
          const rem = ship.remainingSec - dtSec;
          if (rem <= 0) {
            nextCredits += ship.payoutCredits;
            nextRep = Math.min(1000, nextRep + ship.order.reputationReward);
            shippedTotal += 1;
            if (ship.isGold) {
              nextTokens += 1;
              nextStats.goldOrdersShipped += 1;
            }
            if (ship.order.id.startsWith('RUSH-')) {
              nextStats.rushOrdersShipped += 1;
            }
            nextStats.maxSinglePayout = Math.max(nextStats.maxSinglePayout, ship.payoutCredits);
            setRecentShipArrival({
              id: ship.id,
              x: ship.toX,
              y: ship.toY,
              isGold: ship.isGold,
            });
          } else {
            remainingShipments.push({ ...ship, remainingSec: rem });
          }
        }

        const nextOrders = prev.orders
          .map((ord) => ({ ...ord, remainingSec: ord.remainingSec - dtSec }))
          .filter((ord) => ord.remainingSec > 0);
        while (nextOrders.length < 3) {
          nextOrders.push(createTradeOrder(nextRep, hasErasableCore));
        }

        // ── Timed surprise events ────────────────────────────────
        let nextEvent = prev.activeEvent;
        if (nextEvent) {
          const rem = nextEvent.remainingSec - dtSec;
          if (rem <= 0) {
            if ((nextEvent.penaltyCredits ?? 0) > 0) {
              nextCredits = Math.max(0, nextCredits - (nextEvent.penaltyCredits ?? 0));
            }
            pushSnackbar(
              `工坊快讯超时：${nextEvent.title} 未处理${
                nextEvent.tone === 'bad' ? '，损失已计入' : '，机会已错过'
              }`,
              nextEvent.tone === 'bad' ? 'error' : 'normal'
            );
            nextEvent = null;
            eventCountdownRef.current = 38 + Math.random() * 34;
          } else {
            nextEvent = { ...nextEvent, remainingSec: rem };
          }
        } else {
          eventCountdownRef.current -= dtSec;
          if (eventCountdownRef.current <= 0) {
            const spawned = createRandomEvent(prev.stages, remainingShipments.length > 0);
            nextEvent = spawned;
            if (spawned.kind === 'breakdown' && spawned.payload) {
              nextStages = nextStages.map((st) =>
                st.id === spawned.payload ? { ...st, hasJam: true } : st
              );
            } else if (spawned.kind === 'shortage') {
              remainingShipments = remainingShipments.map((sh) => ({
                ...sh,
                remainingSec: sh.remainingSec + 10,
              }));
            }
            workshopAudio.playEventAlert(prev.accessibility.soundEnabled, spawned.tone);
            pushSnackbar(`工坊快讯：${spawned.title} — ${spawned.actionLabel}`,
              spawned.tone === 'bad' ? 'error' : 'normal');
            triggerHaptic(prev.accessibility.hapticsEnabled, spawned.tone === 'bad' ? [18, 30, 18] : 16);
            eventCountdownRef.current = 38 + Math.random() * 34;
          }
        }

        return {
          ...prev,
          credits: nextCredits,
          craftTokens: nextTokens,
          reputation: nextRep,
          totalPencilsCrafted: craftedTotal,
          totalOrdersShipped: shippedTotal,
          materials: nextMaterials,
          inventory: nextInventory,
          stats: nextStats,
          stages: nextStages,
          shipments: remainingShipments,
          orders: nextOrders,
          activeEvent: nextEvent,
          // achievements are granted by the dedicated effect above
        };
      });
    }, 200);

    return () => clearInterval(timer);
  }, [pushSnackbar]);

  /**
   * Swing QTE: strike when the caliper crosses the CENTRE highlight zone.
   * All feedback is computed from a single snapshot so the audio, haptics,
   * judgement banner and state mutation never disagree.
   */
  const triggerRhythmQte = useCallback(() => {
    const cur = stateRef.current;
    const cycleMs = getCycleDurationMs(cur);
    const { perfectMs, goodMs } = getQteWindowMs(cur);
    const phase = qtePhaseRef.current;
    const deltaMs = Math.round(Math.abs(phase - 0.5) * cycleMs);

    let tier: 'perfect' | 'good' | 'miss' = 'miss';
    if (deltaMs <= perfectMs) tier = 'perfect';
    else if (deltaMs <= goodMs) tier = 'good';

    const approach: 'left' | 'right' = swingDirRef.current >= 0 ? 'right' : 'left';
    const nextCombo = tier === 'miss' ? 0 : cur.comboCount + 1;
    const milestone = tier !== 'miss' && isComboMilestone(nextCombo);
    const heatGain = tier === 'perfect' ? 14 : tier === 'good' ? 6 : 0;
    const projectedHeat = tier === 'miss' ? 0 : cur.comboHeat + heatGain;
    const heatBurst = tier !== 'miss' && projectedHeat >= COMBO_HEAT_MAX;
    const tenStreak = nextCombo > 0 && nextCombo % 10 === 0;

    const label =
      tier === 'perfect'
        ? `完美切削 ±${deltaMs}ms`
        : tier === 'good'
          ? `精良切削 ±${deltaMs}ms`
          : `失误毛刺 ±${deltaMs}ms`;

    workshopAudio.playSharpenHit(cur.accessibility.soundEnabled, tier);
    triggerHaptic(cur.accessibility.hapticsEnabled, tier === 'perfect' ? [12, 24, 14] : 12);

    setLastJudgment({
      id: nextJudgeIdRef.current++,
      tier,
      label,
      deltaMs,
      approach,
      milestone,
      heatBurst,
    });

    if (milestone) {
      workshopAudio.playComboMilestone(cur.accessibility.soundEnabled, nextCombo);
      pushSnackbar(`${nextCombo} 连击！卡尺摆动已进入稳定节奏`, 'success');
    }
    if (tenStreak) {
      pushSnackbar('10 连击奖励：获得 +1 金箔印章！', 'success');
    }
    if (heatBurst) {
      workshopAudio.playDustBurst(cur.accessibility.soundEnabled);
      pushSnackbar('石墨粉尘爆开！额外凝出 1 支典藏铅笔', 'success');
      triggerHaptic(cur.accessibility.hapticsEnabled, [20, 30, 20, 30, 24]);
    }

    if (
      cur.materials.cedarLogs < 0.5 ||
      cur.materials.graphitePowder < 0.5 ||
      cur.materials.lacquerLiters < 0.2
    ) {
      pushSnackbar('原料不足，请先从木料仓拽料或采购原料包', 'error');
      return tier;
    }

    setState((prev) => {
      if (
        prev.materials.cedarLogs < 0.5 ||
        prev.materials.graphitePowder < 0.5 ||
        prev.materials.lacquerLiters < 0.2
      ) {
        return prev;
      }

      const nextInv = { ...prev.inventory };
      if (tier === 'perfect') {
        if (nextCombo >= 3 && nextCombo % 3 === 0) {
          nextInv.masterwork += 1;
        } else {
          nextInv.artisan += 1;
        }
      } else if (tier === 'good') {
        nextInv.artisan += 1;
      } else {
        nextInv.burr += 1;
      }
      if (heatBurst) {
        nextInv.masterwork += 1;
      }

      return {
        ...prev,
        comboCount: nextCombo,
        bestCombo: Math.max(prev.bestCombo, nextCombo),
        comboHeat: heatBurst ? 0 : projectedHeat,
        craftTokens: prev.craftTokens + (tenStreak ? 1 : 0),
        totalPencilsCrafted: prev.totalPencilsCrafted + 1,
        materials: {
          cedarLogs: Math.max(0, Number((prev.materials.cedarLogs - 0.5).toFixed(2))),
          graphitePowder: Math.max(0, Number((prev.materials.graphitePowder - 0.4).toFixed(2))),
          lacquerLiters: Math.max(0, Number((prev.materials.lacquerLiters - 0.25).toFixed(2))),
        },
        inventory: nextInv,
        stats: {
          ...prev.stats,
          totalQteHits: prev.stats.totalQteHits + 1,
          perfectHits: prev.stats.perfectHits + (tier === 'perfect' ? 1 : 0),
          maxComboHeat: Math.max(prev.stats.maxComboHeat, heatBurst ? COMBO_HEAT_MAX : projectedHeat),
        },
      };
    });

    return tier;
  }, [pushSnackbar]);

  /** Resolve the active surprise: claim a good one, repair a bad one. */
  const resolveEvent = useCallback(() => {
    const cur = stateRef.current;
    const ev = cur.activeEvent;
    if (!ev) return;

    if (ev.kind === 'inspection' && cur.inventory.masterwork < 1) {
      pushSnackbar('库里还没有典藏铅笔，先攒满连击热度再来送检', 'error');
      return;
    }

    let note = '';
    switch (ev.kind) {
      case 'rush': note = '急单已接入订单簿，90 秒内启运可拿额外印章'; break;
      case 'fx': note = '汇率已锁定，金箔印章入账'; break;
      case 'breakdown': note = '紧急抢修完成，流水线恢复节拍'; break;
      case 'inspection': note = '典藏铅笔通过抽检，商会追加赏金'; break;
      case 'windfall': note = '清仓木料整车入库：+12 木 / +14 石墨 / +10 L 漆'; break;
      case 'shortage': note = '改道成功，在途时效已追回'; break;
    }

    setState((prev) => {
      const e = prev.activeEvent;
      if (!e) return prev;
      let next: WorkshopState = {
        ...prev,
        activeEvent: null,
        credits: prev.credits + (e.rewardCredits ?? 0),
        craftTokens: prev.craftTokens + (e.rewardTokens ?? 0),
        stats: { ...prev.stats, eventsHandled: prev.stats.eventsHandled + 1 },
      };

      switch (e.kind) {
        case 'rush': {
          const rush = createTradeOrder(prev.reputation, true, 'RUSH');
          rush.deadlineSec = 90;
          rush.remainingSec = 90;
          rush.transitSeconds = 8;
          rush.isRareGold = true;
          rush.minQuality = 'artisan';
          rush.baseUnitPrice = 30;
          rush.reputationReward = 24;
          next = { ...next, orders: [rush, ...prev.orders].slice(0, 4) };
          break;
        }
        case 'breakdown':
          next = {
            ...next,
            stages: prev.stages.map((st) =>
              st.id === e.payload ? { ...st, hasJam: false, progress: 0.2 } : st
            ),
          };
          break;
        case 'inspection':
          next = {
            ...next,
            inventory: {
              ...prev.inventory,
              masterwork: Math.max(0, prev.inventory.masterwork - 1),
            },
          };
          break;
        case 'windfall':
          next = {
            ...next,
            materials: {
              cedarLogs: prev.materials.cedarLogs + 12,
              graphitePowder: prev.materials.graphitePowder + 14,
              lacquerLiters: prev.materials.lacquerLiters + 10,
            },
          };
          break;
        case 'shortage':
          next = {
            ...next,
            shipments: prev.shipments.map((sh) => ({
              ...sh,
              remainingSec: Math.max(1, sh.remainingSec - 10),
            })),
          };
          break;
        case 'fx':
        default:
          break;
      }
      return next;
    });

    eventCountdownRef.current = 38 + Math.random() * 34;
    workshopAudio.playQaStamp(cur.accessibility.soundEnabled);
    triggerHaptic(cur.accessibility.hapticsEnabled, 18);
    pushSnackbar(note, 'success');
  }, [pushSnackbar]);

  const repairBurrPencil = useCallback(() => {
    setState((prev) => {
      if (prev.inventory.burr <= 0) return prev;
      workshopAudio.playQaStamp(prev.accessibility.soundEnabled);
      triggerHaptic(prev.accessibility.hapticsEnabled, 14);
      return {
        ...prev,
        inventory: {
          ...prev.inventory,
          burr: prev.inventory.burr - 1,
          standard: prev.inventory.standard + 1,
        },
      };
    });
  }, []);

  const sellBurrDiscount = useCallback(() => {
    setState((prev) => {
      if (prev.inventory.burr <= 0) return prev;
      const revenue = prev.inventory.burr * 6;
      workshopAudio.playQaStamp(prev.accessibility.soundEnabled);
      pushSnackbar(`折价清仓 ${prev.inventory.burr} 支瑕疵笔，回收 ${revenue} 银元`);
      const next = {
        ...prev,
        credits: prev.credits + revenue,
        inventory: { ...prev.inventory, burr: 0 },
      };
      saveWorkshopState(next);
      return next;
    });
  }, [pushSnackbar]);

  const sellDirectBatch = useCallback(
    (tier: QualityTier) => {
      setState((prev) => {
        const count = prev.inventory[tier];
        if (count <= 0) return prev;
        const unitPrice = tier === 'masterwork' ? 28 : tier === 'artisan' ? 18 : 11;
        const revenue = count * unitPrice;
        workshopAudio.playQaStamp(prev.accessibility.soundEnabled);
        pushSnackbar(`本地文具店直销 ${count} 支，入账 ${revenue} 银元`);
        const next = {
          ...prev,
          credits: prev.credits + revenue,
          inventory: { ...prev.inventory, [tier]: 0 },
        };
        saveWorkshopState(next);
        return next;
      });
    },
    [pushSnackbar]
  );

  const clearStageJam = useCallback(
    (stageId: string) => {
      setState((prev) => ({
        ...prev,
        stages: prev.stages.map((st) =>
          st.id === stageId ? { ...st, hasJam: false, progress: 0.2 } : st
        ),
      }));
      workshopAudio.playQaStamp(stateRef.current.accessibility.soundEnabled);
      pushSnackbar('已手动清理卡料并恢复流水线节拍', 'success');
    },
    [pushSnackbar]
  );

  const extractEmergencyTimber = useCallback(
    (peakDistance: number) => {
      const gained = Math.max(1, Math.min(5, Math.round(peakDistance * 5.2)));
      const spilledGraphite = peakDistance > 0.78;
      setState((prev) => ({
        ...prev,
        materials: {
          ...prev.materials,
          cedarLogs: Number((prev.materials.cedarLogs + gained).toFixed(1)),
          graphitePowder: spilledGraphite
            ? Math.max(0, Number((prev.materials.graphitePowder - 1).toFixed(1)))
            : prev.materials.graphitePowder,
        },
        stats: { ...prev.stats, timberPulls: prev.stats.timberPulls + 1 },
      }));
      triggerHaptic(
        stateRef.current.accessibility.hapticsEnabled,
        spilledGraphite ? [20, 30, 20] : 16
      );
      if (spilledGraphite) {
        pushSnackbar(`强力拽出 +${gained} 根雪松木，但震落了 1 份石墨粉！`, 'error');
      } else {
        pushSnackbar(`从木料仓顺势拽出 +${gained} 根雪松原木`, 'success');
      }
    },
    [pushSnackbar]
  );

  const buyMaterialPack = useCallback(
    (type: MaterialType) => {
      const pack = MATERIAL_PACKS[type];
      setState((prev) => {
        if (prev.credits < pack.costCredits) {
          pushSnackbar('银元不足，请先交付海运订单或折价清理瑕疵笔', 'error');
          return prev;
        }
        const next = {
          ...prev,
          credits: prev.credits - pack.costCredits,
          materials: {
            cedarLogs: prev.materials.cedarLogs + (type === 'cedar' ? pack.amount : 0),
            graphitePowder: prev.materials.graphitePowder + (type === 'graphite' ? pack.amount : 0),
            lacquerLiters: prev.materials.lacquerLiters + (type === 'lacquer' ? pack.amount : 0),
          },
        };
        saveWorkshopState(next);
        return next;
      });
    },
    [pushSnackbar]
  );

  const upgradeStage = useCallback(
    (stageId: string) => {
      setState((prev) => {
        const target = prev.stages.find((st) => st.id === stageId);
        if (!target) return prev;
        const cost = getStageUpgradeCost(target.machineLevel);
        if (prev.credits < cost) {
          pushSnackbar(`升级 ${target.name} 需要 ${cost} 银元`, 'error');
          return prev;
        }
        workshopAudio.playQaStamp(prev.accessibility.soundEnabled);
        const next = {
          ...prev,
          credits: prev.credits - cost,
          stages: prev.stages.map((st) =>
            st.id === stageId ? { ...st, machineLevel: st.machineLevel + 1 } : st
          ),
        };
        saveWorkshopState(next);
        return next;
      });
    },
    [pushSnackbar]
  );

  const updateParam = useCallback(<K extends keyof WorkshopParams>(key: K, val: number) => {
    setState((prev) => ({
      ...prev,
      params: { ...prev.params, [key]: val },
    }));
  }, []);

  const setBarrelShape = useCallback((shape: BarrelShape) => {
    setState((prev) => {
      const next = { ...prev, barrelShape: shape };
      saveWorkshopState(next);
      return next;
    });
  }, []);

  const setThemeSelection = useCallback((themeId: ThemeId) => {
    setState((prev) => {
      const next = { ...prev, themeId };
      saveWorkshopState(next);
      return next;
    });
  }, []);

  const updateAccessibility = useCallback(
    <K extends keyof AccessibilityPrefs>(key: K, val: AccessibilityPrefs[K]) => {
      setState((prev) => {
        const next = {
          ...prev,
          accessibility: { ...prev.accessibility, [key]: val },
        };
        saveWorkshopState(next);
        return next;
      });
    },
    []
  );

  const unlockTech = useCallback(
    (techId: string) => {
      setState((prev) => {
        const tech = prev.techs.find((t) => t.id === techId);
        if (!tech || tech.unlocked) return prev;
        if (prev.credits < tech.costCredits || prev.craftTokens < tech.costTokens) {
          pushSnackbar('银元或金箔印章不足，无法研发该工艺', 'error');
          return prev;
        }
        workshopAudio.playTradeDispatch(prev.accessibility.soundEnabled, true);
        pushSnackbar(`研发完成：${tech.name}`, 'success');
        const next = {
          ...prev,
          credits: prev.credits - tech.costCredits,
          craftTokens: prev.craftTokens - tech.costTokens,
          techs: prev.techs.map((t) => (t.id === techId ? { ...t, unlocked: true } : t)),
        };
        saveWorkshopState(next);
        return next;
      });
    },
    [pushSnackbar]
  );

  const shipOrder = useCallback(
    (order: TradeOrder): { dispatched: boolean; isGold: boolean; toX: number; toY: number } => {
      const cur = stateRef.current;
      const grade = getGradeFromRatio(cur.params.graphiteRatio);
      const highTierCount = cur.inventory.artisan + cur.inventory.masterwork;
      const eligibleCount =
        order.minQuality === 'artisan' ? highTierCount : highTierCount + cur.inventory.standard;

      if (eligibleCount < order.quantity) {
        pushSnackbar(
          `库存不足：该订单需要 ${order.quantity} 支${
            order.minQuality === 'artisan' ? '精良以上' : '合格'
          }铅笔`,
          'error'
        );
        return { dispatched: false, isGold: false, toX: 50, toY: 50 };
      }

      let remaining = order.quantity;
      const usedMw = Math.min(remaining, cur.inventory.masterwork);
      remaining -= usedMw;
      const usedArtisan = Math.min(remaining, cur.inventory.artisan);
      remaining -= usedArtisan;
      const usedStandard = Math.min(remaining, cur.inventory.standard);

      const hasPrecisionHb = cur.techs.find((t) => t.id === 'precision_hb')?.unlocked ?? false;
      const hasCedarAroma = cur.techs.find((t) => t.id === 'cedar_aroma')?.unlocked ?? false;

      const gradeMult = grade === order.requiredGrade ? 1.18 : 1.0;
      const shapeMult = cur.barrelShape === order.requiredShape ? 1.12 : 1.0;
      const fxMult = cur.activeEvent?.kind === 'fx' ? (cur.activeEvent.multiplier ?? 1) : 1;

      const basePayout = computeOrderPayout(
        order,
        { standard: usedStandard, artisan: usedArtisan, masterwork: usedMw },
        hasPrecisionHb,
        hasCedarAroma
      );
      const finalPayout = Math.round(basePayout * gradeMult * shapeMult * fxMult);
      const dest =
        TRADE_DESTINATIONS.find((d) => d.countryCode === order.countryCode) ??
        TRADE_DESTINATIONS[0];
      const isGold = order.isRareGold || usedMw > 0;

      workshopAudio.playTradeDispatch(cur.accessibility.soundEnabled, isGold);
      triggerHaptic(cur.accessibility.hapticsEnabled, isGold ? [15, 25, 20] : 16);

      setState((prev) => {
        const hasErasable = prev.techs.find((t) => t.id === 'erasable_core')?.unlocked ?? false;
        const remainingOrders = prev.orders.filter((o) => o.id !== order.id);
        remainingOrders.push(createTradeOrder(prev.reputation, hasErasable));

        const next: WorkshopState = {
          ...prev,
          inventory: {
            ...prev.inventory,
            masterwork: prev.inventory.masterwork - usedMw,
            artisan: prev.inventory.artisan - usedArtisan,
            standard: prev.inventory.standard - usedStandard,
          },
          orders: remainingOrders,
          shipments: [
            ...prev.shipments,
            {
              id: `SHP-${order.id}`,
              order,
              totalSec: order.transitSeconds,
              remainingSec: order.transitSeconds,
              payoutCredits: finalPayout,
              isGold,
              fromX: HOME_PORT.x,
              fromY: HOME_PORT.y,
              toX: dest.mapX,
              toY: dest.mapY,
            },
          ],
        };
        saveWorkshopState(next);
        return next;
      });

      pushSnackbar(
        `已启运至 ${order.countryName} · 预计 ${order.transitSeconds}s 到港结算 ${finalPayout} 银元${
          fxMult > 1 ? '（汇率顺风 ×1.45）' : ''
        }`,
        isGold ? 'success' : 'normal'
      );
      return { dispatched: true, isGold, toX: dest.mapX, toY: dest.mapY };
    },
    [pushSnackbar]
  );

  const refreshOrders = useCallback(() => {
    setState((prev) => {
      if (prev.credits < 15) {
        pushSnackbar('刷新贸易电报需要 15 银元', 'error');
        return prev;
      }
      const hasErasable = prev.techs.find((t) => t.id === 'erasable_core')?.unlocked ?? false;
      const next = {
        ...prev,
        credits: prev.credits - 15,
        orders: [
          createTradeOrder(prev.reputation, hasErasable),
          createTradeOrder(prev.reputation, hasErasable),
          createTradeOrder(prev.reputation, hasErasable),
        ],
      };
      saveWorkshopState(next);
      return next;
    });
  }, [pushSnackbar]);

  const resetProgress = useCallback(() => {
    const fresh = clearWorkshopSave();
    eventCountdownRef.current = 18;
    setState(fresh);
    pushSnackbar('已重置工坊存档');
  }, [pushSnackbar]);

  return {
    state,
    qtePhaseRef,
    lastJudgment,
    snackbars,
    offlineReport,
    recentShipArrival,
    dismissOfflineReport: () => setOfflineReport(null),
    clearRecentShipArrival: () => setRecentShipArrival(null),
    triggerRhythmQte,
    resolveEvent,
    repairBurrPencil,
    sellBurrDiscount,
    sellDirectBatch,
    clearStageJam,
    extractEmergencyTimber,
    buyMaterialPack,
    upgradeStage,
    updateParam,
    setBarrelShape,
    setThemeSelection,
    updateAccessibility,
    unlockTech,
    shipOrder,
    refreshOrders,
    resetProgress,
    pushSnackbar,
  };
}

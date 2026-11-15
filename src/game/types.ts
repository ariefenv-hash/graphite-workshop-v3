/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ThemeId } from '../aosp/md3Tokens';

export type BarrelShape = 'hex' | 'round' | 'cone';
export type GraphiteGrade = '4B' | '2B' | 'HB' | '2H' | '4H';
export type QualityTier = 'standard' | 'artisan' | 'masterwork';
export type MaterialType = 'cedar' | 'graphite' | 'lacquer';

export interface PipelineStage {
  id: string;
  order: number;
  name: string;
  enName: string;
  description: string;
  machineLevel: number;
  workerCount: number;
  progress: number;
  hasJam: boolean;
}

export interface TechNode {
  id: string;
  name: string;
  description: string;
  costCredits: number;
  costTokens: number;
  unlocked: boolean;
  effectLabel: string;
}

export interface TradeDestination {
  countryCode: string;
  countryName: string;
  buyerName: string;
  preferredGrade: GraphiteGrade;
  preferredShape: BarrelShape;
  fxRate: number;
  tariffRate: number;
  transitSeconds: number;
  mapX: number;
  mapY: number;
}

export interface TradeOrder {
  id: string;
  countryCode: string;
  countryName: string;
  buyerName: string;
  requiredGrade: GraphiteGrade;
  requiredShape: BarrelShape;
  quantity: number;
  minQuality: 'standard' | 'artisan';
  baseUnitPrice: number;
  fxRateSnapshot: number;
  tariffRate: number;
  transitSeconds: number;
  deadlineSec: number;
  remainingSec: number;
  isRareGold: boolean;
  reputationReward: number;
}

export interface ActiveShipment {
  id: string;
  order: TradeOrder;
  totalSec: number;
  remainingSec: number;
  payoutCredits: number;
  isGold: boolean;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export interface WorkshopParams {
  feedRate: number;
  lacquerThickness: number;
  pressPressure: number;
  graphiteRatio: number;
}

export interface AccessibilityPrefs {
  autoTrimServo: boolean;
  extendedQteWindow: boolean;
  noFlashVisuals: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
}

export interface WorkshopInventory {
  standard: number;
  artisan: number;
  masterwork: number;
  burr: number;
}

export interface WorkshopMaterials {
  cedarLogs: number;
  graphitePowder: number;
  lacquerLiters: number;
}

/** Long-running counters used by milestones & random events. */
export interface WorkshopStats {
  perfectHits: number;
  totalQteHits: number;
  eventsHandled: number;
  timberPulls: number;
  rushOrdersShipped: number;
  goldOrdersShipped: number;
  maxSinglePayout: number;
  maxComboHeat: number;
}

export type WorkshopEventKind =
  | 'rush'
  | 'fx'
  | 'breakdown'
  | 'inspection'
  | 'windfall'
  | 'shortage';

/** A timed, resolvable surprise. Good events are claimed, bad events are fixed. */
export interface WorkshopEvent {
  id: string;
  kind: WorkshopEventKind;
  title: string;
  desc: string;
  actionLabel: string;
  tone: 'good' | 'bad' | 'neutral';
  remainingSec: number;
  totalSec: number;
  /** Applied to trade payouts while a favourable FX window is open. */
  multiplier?: number;
  rewardCredits?: number;
  rewardTokens?: number;
  penaltyCredits?: number;
  /** Stage id affected by a breakdown, shipment ids affected by a strike. */
  payload?: string;
}

export interface WorkshopState {
  schemaVersion: number;
  lastSavedAt: number;
  credits: number;
  craftTokens: number;
  reputation: number;
  totalPencilsCrafted: number;
  totalOrdersShipped: number;
  comboCount: number;
  bestCombo: number;
  /** Builds with each QTE hit; at 100 it bursts into a bonus Masterwork. */
  comboHeat: number;
  stats: WorkshopStats;
  activeEvent: WorkshopEvent | null;
  barrelShape: BarrelShape;
  themeId: ThemeId;
  materials: WorkshopMaterials;
  inventory: WorkshopInventory;
  params: WorkshopParams;
  stages: PipelineStage[];
  orders: TradeOrder[];
  shipments: ActiveShipment[];
  techs: TechNode[];
  achievements: string[];
  accessibility: AccessibilityPrefs;
}

export interface OfflineReport {
  elapsedSeconds: number;
  earnedCredits: number;
  craftedPencils: number;
}

export interface QteJudgment {
  id: number;
  tier: 'perfect' | 'good' | 'miss';
  label: string;
  deltaMs: number;
  /** Which way the swing was travelling when the player struck. */
  approach: 'left' | 'right';
  /** True when this hit crossed a combo milestone (3/5/10/20...). */
  milestone: boolean;
  /** True when this hit triggered a graphite dust burst. */
  heatBurst: boolean;
}

export interface RecentShipArrival {
  id: string;
  x: number;
  y: number;
  isGold: boolean;
}

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RippleMaskShape } from '../aosp/RippleShader';
import {
  BarrelShape,
  GraphiteGrade,
  MaterialType,
  PipelineStage,
  TechNode,
  TradeDestination,
  TradeOrder,
  WorkshopEvent,
  WorkshopState,
} from './types';

export const SCHEMA_VERSION = 2;
export const MAX_OFFLINE_SECONDS = 8 * 3600;

export const MATERIAL_PACKS: Record<
  MaterialType,
  { label: string; amount: number; costCredits: number; unit: string }
> = {
  cedar: { label: '雪松木', amount: 18, costCredits: 28, unit: '根' },
  graphite: { label: '石墨粉', amount: 20, costCredits: 24, unit: '份' },
  lacquer: { label: '油漆桶', amount: 16, costCredits: 22, unit: 'L' },
};

export const INITIAL_STAGES: PipelineStage[] = [
  {
    id: 'mill',
    order: 1,
    name: '开料',
    enName: 'Timber Milling',
    description: '将雪松原木锯成 7mm 笔板槽条',
    machineLevel: 1,
    workerCount: 1,
    progress: 0,
    hasJam: false,
  },
  {
    id: 'graphite',
    order: 2,
    name: '石墨芯',
    enName: 'Graphite Mixing',
    description: '研磨天然鳞片石墨并按配比混入高岭土',
    machineLevel: 1,
    workerCount: 1,
    progress: 0,
    hasJam: false,
  },
  {
    id: 'extrude',
    order: 3,
    name: '压芯',
    enName: 'Core Extrusion',
    description: '高压挤出笔芯并经高温窑烧浸蜡',
    machineLevel: 1,
    workerCount: 1,
    progress: 0,
    hasJam: false,
  },
  {
    id: 'assemble',
    order: 4,
    name: '卷木杆',
    enName: 'Slat Sandwich',
    description: '合板胶合后铣削出六角/圆杆/锥形杆体',
    machineLevel: 1,
    workerCount: 1,
    progress: 0,
    hasJam: false,
  },
  {
    id: 'lacquer',
    order: 5,
    name: '上漆',
    enName: 'Lacquer Dipping',
    description: '多道蘸漆拉膜形成温润漆面',
    machineLevel: 1,
    workerCount: 1,
    progress: 0,
    hasJam: false,
  },
  {
    id: 'stamp',
    order: 6,
    name: '印标',
    enName: 'Foil Stamping',
    description: '热压烫印品牌铭文与硬度标号',
    machineLevel: 1,
    workerCount: 1,
    progress: 0,
    hasJam: false,
  },
  {
    id: 'sharpen',
    order: 7,
    name: '削尖',
    enName: 'Tip Lathe QTE',
    description: '随机床节拍切削木锥与露芯',
    machineLevel: 1,
    workerCount: 1,
    progress: 0,
    hasJam: false,
  },
  {
    id: 'qa',
    order: 8,
    name: '质检',
    enName: 'QA & Salvage',
    description: '剔除或手工精修毛刺流漆，加盖出厂印',
    machineLevel: 1,
    workerCount: 1,
    progress: 0,
    hasJam: false,
  },
];

export const INITIAL_TECHS: TechNode[] = [
  {
    id: 'hex_barrel',
    name: '六角防滚杆体',
    description: '解锁经典六角铣刀，桌面防滚且符合制图订单要求（SDF Mask 切换为 Hex）。',
    costCredits: 120,
    costTokens: 0,
    unlocked: true,
    effectLabel: '解锁六角杆与制图订单',
  },
  {
    id: 'precision_hb',
    name: '精密 HB 标定',
    description: '校准石墨-粘土窑烧曲线，所有成品基础售价 +20%。',
    costCredits: 320,
    costTokens: 1,
    unlocked: false,
    effectLabel: '成品基础单价 +20%',
  },
  {
    id: 'eco_lacquer',
    name: '环保水性漆工艺',
    description: '蘸漆拉膜能耗降低，漆料单支消耗 -30% 且减少流漆毛刺概率。',
    costCredits: 640,
    costTokens: 2,
    unlocked: false,
    effectLabel: '漆耗 -30% · 良品率 +12%',
  },
  {
    id: 'erasable_core',
    name: '可擦聚合物芯',
    description: '拓展高端校园与考试订单，稀有金粉合约出现率提升。',
    costCredits: 1250,
    costTokens: 4,
    unlocked: false,
    effectLabel: '金粉订单概率翻倍',
  },
  {
    id: 'cedar_aroma',
    name: '雪松精油封香',
    description: '削尖切削时释放自然木香，精修品级 Masterwork 溢价再 +35%。',
    costCredits: 2200,
    costTokens: 6,
    unlocked: false,
    effectLabel: 'Masterwork 溢价 +35%',
  },
  {
    id: 'auto_servo',
    name: '自动精修伺服',
    description: '强化低操作自动精修模式：Artisan 产出比例提升至 92% 并偶出 Masterwork。',
    costCredits: 900,
    costTokens: 3,
    unlocked: false,
    effectLabel: '伺服精良率 72% → 92%',
  },
];

export const TRADE_DESTINATIONS: TradeDestination[] = [
  {
    countryCode: 'JP',
    countryName: '东京制图协会',
    buyerName: '丸善文具贸易社',
    preferredGrade: '2H',
    preferredShape: 'hex',
    fxRate: 1.12,
    tariffRate: 0.05,
    transitSeconds: 14,
    mapX: 86.6,
    mapY: 32.5,
  },
  {
    countryCode: 'DE',
    countryName: '柏林建筑事务所',
    buyerName: '包豪斯绘图工坊',
    preferredGrade: '2B',
    preferredShape: 'hex',
    fxRate: 1.24,
    tariffRate: 0.08,
    transitSeconds: 20,
    mapX: 52.9,
    mapY: 21.3,
  },
  {
    countryCode: 'GB',
    countryName: '伦敦皇家美院',
    buyerName: '泰晤士美术用品行',
    preferredGrade: '4B',
    preferredShape: 'round',
    fxRate: 1.32,
    tariffRate: 0.07,
    transitSeconds: 22,
    mapX: 49.3,
    mapY: 21.9,
  },
  {
    countryCode: 'US',
    countryName: '纽约学区采购署',
    buyerName: '哈德逊文具总仓',
    preferredGrade: 'HB',
    preferredShape: 'hex',
    fxRate: 1.05,
    tariffRate: 0.12,
    transitSeconds: 24,
    mapX: 29.6,
    mapY: 29.2,
  },
  {
    countryCode: 'CH',
    countryName: '苏黎世精密实验室',
    buyerName: '阿尔卑斯测绘部',
    preferredGrade: '4H',
    preferredShape: 'cone',
    fxRate: 1.42,
    tariffRate: 0.06,
    transitSeconds: 18,
    mapX: 51.6,
    mapY: 24.6,
  },
];

export const HOME_PORT = { x: 81.7, y: 35.4 } as const;

export const BARREL_SPECIMENS = [
  {
    id: 'hex',
    title: '六角加州雪松制图笔',
    grade: 'HB / 2H',
    desc: '经典六棱防滚截面。点击表面观察 HEX_BARREL SDF 遮罩约束下的石墨粒子晕染。',
    maskShape: RippleMaskShape.HEX_BARREL,
    woodDir: [1, 0] as [number, number],
  },
  {
    id: 'round',
    title: '圆杆素描炭精软芯笔',
    grade: '4B / 2B',
    desc: '高石墨粉尘配方，温润圆杆手感。点击触发 ROUND_BARREL 遮罩粒子涟漪。',
    maskShape: RippleMaskShape.ROUND_BARREL,
    woodDir: [0.85, 0.45] as [number, number],
  },
  {
    id: 'cone',
    title: '精密测绘削尖锥型笔',
    grade: '4H',
    desc: '18° 长锥切削露芯，适合测绘与档案批注。点击体验 SHARPENED_CONE SDF 遮罩。',
    maskShape: RippleMaskShape.SHARPENED_CONE,
    woodDir: [1, -0.2] as [number, number],
  },
] as const;

export interface AchievementDef {
  id: string;
  title: string;
  desc: string;
  tier: '入门' | '进阶' | '大师';
  rewardCredits: number;
  rewardTokens: number;
  test: (s: WorkshopState) => boolean;
  progress?: (s: WorkshopState) => { cur: number; max: number };
}

/**
 * Milestone ladder. Every entry is checked once per state change and grants a
 * one-off reward, so there is always a visible "next goal" on the factory
 * floor instead of an unbounded +1 loop. Values are 示例／待调优.
 */
export const ACHIEVEMENTS: AchievementDef[] = [
  // ── 入门 ──────────────────────────────────────────────
  {
    id: 'first_dozen', title: '初具规模', desc: '累计制造 10 支铅笔', tier: '入门',
    rewardCredits: 40, rewardTokens: 0,
    test: (s) => s.totalPencilsCrafted >= 10,
    progress: (s) => ({ cur: s.totalPencilsCrafted, max: 10 }),
  },
  {
    id: 'rhythm_lathe', title: '机床节拍师', desc: '摆动卡尺达成 5 连击', tier: '入门',
    rewardCredits: 60, rewardTokens: 0,
    test: (s) => s.bestCombo >= 5,
    progress: (s) => ({ cur: s.bestCombo, max: 5 }),
  },
  {
    id: 'timber_puller', title: '雪松拽木工', desc: '用边界拉伸从木料仓拽出原木', tier: '入门',
    rewardCredits: 50, rewardTokens: 0,
    test: (s) => s.stats.timberPulls >= 1,
    progress: (s) => ({ cur: s.stats.timberPulls, max: 1 }),
  },
  {
    id: 'global_exporter', title: '远洋首航', desc: '完成第 1 笔国际海运订单', tier: '入门',
    rewardCredits: 80, rewardTokens: 0,
    test: (s) => s.totalOrdersShipped >= 1,
    progress: (s) => ({ cur: s.totalOrdersShipped, max: 1 }),
  },
  // ── 进阶 ──────────────────────────────────────────────
  {
    id: 'perfect_10', title: '十发十中', desc: '累计 10 次完美切削', tier: '进阶',
    rewardCredits: 120, rewardTokens: 0,
    test: (s) => s.stats.perfectHits >= 10,
    progress: (s) => ({ cur: s.stats.perfectHits, max: 10 }),
  },
  {
    id: 'combo_12', title: '十二连音', desc: '摆动卡尺达成 12 连击', tier: '进阶',
    rewardCredits: 140, rewardTokens: 1,
    test: (s) => s.bestCombo >= 12,
    progress: (s) => ({ cur: s.bestCombo, max: 12 }),
  },
  {
    id: 'event_handler', title: '应急主管', desc: '妥善处理 3 次工坊快讯', tier: '进阶',
    rewardCredits: 160, rewardTokens: 0,
    test: (s) => s.stats.eventsHandled >= 3,
    progress: (s) => ({ cur: s.stats.eventsHandled, max: 3 }),
  },
  {
    id: 'rush_master', title: '急单飞鸿', desc: '成功交付 1 张限时急单', tier: '进阶',
    rewardCredits: 130, rewardTokens: 0,
    test: (s) => s.stats.rushOrdersShipped >= 1,
    progress: (s) => ({ cur: s.stats.rushOrdersShipped, max: 1 }),
  },
  {
    id: 'gold_fleet', title: '金粉航线', desc: '交付 3 张金粉稀有订单', tier: '进阶',
    rewardCredits: 180, rewardTokens: 1,
    test: (s) => s.stats.goldOrdersShipped >= 3,
    progress: (s) => ({ cur: s.stats.goldOrdersShipped, max: 3 }),
  },
  {
    id: 'workshop_50', title: '半百匠人', desc: '累计制造 50 支铅笔', tier: '进阶',
    rewardCredits: 200, rewardTokens: 1,
    test: (s) => s.totalPencilsCrafted >= 50,
    progress: (s) => ({ cur: s.totalPencilsCrafted, max: 50 }),
  },
  {
    id: 'tech_3', title: '三艺在身', desc: '掌握 4 项结构工艺', tier: '进阶',
    rewardCredits: 220, rewardTokens: 1,
    test: (s) => s.techs.filter((t) => t.unlocked).length >= 4,
    progress: (s) => ({ cur: s.techs.filter((t) => t.unlocked).length, max: 4 }),
  },
  // ── 大师 ──────────────────────────────────────────────
  {
    id: 'master_craft', title: '大师典藏坊', desc: '库存同时拥有 3 支典藏铅笔', tier: '大师',
    rewardCredits: 300, rewardTokens: 1,
    test: (s) => s.inventory.masterwork >= 3,
    progress: (s) => ({ cur: s.inventory.masterwork, max: 3 }),
  },
  {
    id: 'dust_burst', title: '石墨爆粉', desc: '连击热度攒满，触发一次粉尘爆发', tier: '大师',
    rewardCredits: 320, rewardTokens: 1,
    test: (s) => s.stats.maxComboHeat >= 100,
    progress: (s) => ({ cur: s.stats.maxComboHeat, max: 100 }),
  },
  {
    id: 'full_tech', title: '工艺大成', desc: '解锁研发树全部工艺', tier: '大师',
    rewardCredits: 500, rewardTokens: 2,
    test: (s) => s.techs.every((t) => t.unlocked),
    progress: (s) => ({ cur: s.techs.filter((t) => t.unlocked).length, max: s.techs.length }),
  },
  {
    id: 'tycoon', title: '文具巨贾', desc: '单笔海运结算 ≥500 银元', tier: '大师',
    rewardCredits: 400, rewardTokens: 1,
    test: (s) => s.stats.maxSinglePayout >= 500,
    progress: (s) => ({ cur: s.stats.maxSinglePayout, max: 500 }),
  },
  {
    id: 'century', title: '百支匠人', desc: '累计制造 100 支铅笔', tier: '大师',
    rewardCredits: 450, rewardTokens: 2,
    test: (s) => s.totalPencilsCrafted >= 100,
    progress: (s) => ({ cur: s.totalPencilsCrafted, max: 100 }),
  },
];

export const COMBO_MILESTONES = [3, 5, 10, 20, 30, 50] as const;
export const COMBO_HEAT_MAX = 100;

export function isComboMilestone(combo: number): boolean {
  return (COMBO_MILESTONES as readonly number[]).includes(combo);
}

/** The next locked milestone, used by the "current goal" strip on the floor. */
export function getNextMilestone(s: WorkshopState): {
  def: AchievementDef;
  cur: number;
  max: number;
  pct: number;
} | null {
  const def = ACHIEVEMENTS.find((a) => !s.achievements.includes(a.id));
  if (!def) return null;
  const p = def.progress?.(s) ?? { cur: def.test(s) ? 1 : 0, max: 1 };
  return {
    def,
    cur: Math.min(p.cur, p.max),
    max: p.max,
    pct: Math.max(0, Math.min(1, p.cur / p.max)),
  };
}

const EVENT_KINDS = ['rush', 'fx', 'breakdown', 'inspection', 'windfall', 'shortage'] as const;

/** Timed surprises. Good ones are claimed, bad ones are repaired. 示例／待调优. */
export function createRandomEvent(stages: PipelineStage[], hasShipments: boolean): WorkshopEvent {
  let kind = EVENT_KINDS[Math.floor(Math.random() * EVENT_KINDS.length)];
  if (kind === 'shortage' && !hasShipments) kind = 'windfall';
  const dur = 24 + Math.floor(Math.random() * 10);
  const id = `EVT-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  const base = { id, remainingSec: dur, totalSec: dur };

  switch (kind) {
    case 'rush':
      return {
        ...base, kind, tone: 'good',
        title: '越洋急电 · 加价征集',
        desc: '买手临时追加一张限时金粉急单，接入后 90 秒内启运可拿额外印章。',
        actionLabel: '接入急单', rewardTokens: 1,
      };
    case 'fx':
      return {
        ...base, kind, tone: 'good',
        title: '汇率顺风窗口',
        desc: '窗口期内所有海运结算 ×1.45。可先连发几单，再锁定汇率领印章。',
        actionLabel: '锁定汇率', multiplier: 1.45, rewardTokens: 1,
      };
    case 'breakdown': {
      const stage = stages[Math.floor(Math.random() * stages.length)];
      return {
        ...base, kind, tone: 'bad',
        title: '机床过热告警',
        desc: `第 0${stage.order} 工序「${stage.name}」已卡料，下游同步停摆。抢修可撤销并领补偿。`,
        actionLabel: '紧急抢修', rewardCredits: 90, penaltyCredits: 40,
        payload: stage.id,
      };
    }
    case 'inspection':
      return {
        ...base, kind, tone: 'good',
        title: '商会年度抽检',
        desc: '送检 1 支典藏铅笔可换取大额银元与口碑；库里没有典藏就先攒连击。',
        actionLabel: '送检典藏', rewardCredits: 220,
      };
    case 'windfall':
      return {
        ...base, kind, tone: 'good',
        title: '木料商清仓',
        desc: '隔壁锯木厂整车清仓，一键拉回雪松木、石墨粉与油漆。',
        actionLabel: '整车拉回', rewardCredits: 0,
      };
    case 'shortage':
      return {
        ...base, kind, tone: 'bad',
        title: '港口临时罢工',
        desc: '所有在途海运 +10 秒。改道转运可追回时效并领补偿。',
        actionLabel: '改道转运', rewardCredits: 70, penaltyCredits: 30,
      };
  }
}


export function getGradeFromRatio(ratio: number): GraphiteGrade {
  if (ratio < 20) return '4B';
  if (ratio < 40) return '2B';
  if (ratio < 65) return 'HB';
  if (ratio < 85) return '2H';
  return '4H';
}

export function getStageUpgradeCost(level: number): number {
  return Math.round(65 * Math.pow(1.48, level - 1));
}

export function getCycleDurationMs(state: WorkshopState): number {
  const avgLevel =
    state.stages.reduce((sum, st) => sum + st.machineLevel, 0) / state.stages.length;
  const feedFactor = 1 - ((state.params.feedRate - 10) / 90) * 0.56;
  const levelFactor = 1 / (1 + (avgLevel - 1) * 0.12);
  return Math.max(680, Math.round(2600 * feedFactor * levelFactor));
}

export function getQteWindowMs(state: WorkshopState): { perfectMs: number; goodMs: number } {
  const cycleMs = getCycleDurationMs(state);
  const accessScale = state.accessibility.extendedQteWindow ? 1.5 : 1;
  const feedScale = 1 - ((state.params.feedRate - 10) / 90) * 0.35;
  const perfectMs = Math.round(cycleMs * 0.11 * feedScale * accessScale);
  const goodMs = Math.round(cycleMs * 0.24 * feedScale * accessScale);
  return {
    perfectMs: Math.max(75, perfectMs),
    goodMs: Math.max(155, goodMs),
  };
}

export function computeOrderPayout(
  order: TradeOrder,
  allocated: { standard: number; artisan: number; masterwork: number },
  hasPrecisionHb: boolean,
  hasCedarAroma: boolean
): number {
  if (allocated.standard + allocated.artisan + allocated.masterwork <= 0) return 0;
  const hbMult = hasPrecisionHb ? 1.2 : 1.0;
  const mwMult = hasCedarAroma ? 2.8 : 2.1;
  const weightedUnits =
    allocated.standard * 1.0 + allocated.artisan * 1.45 + allocated.masterwork * mwMult;
  const goldMult = order.isRareGold ? 1.45 : 1.0;
  const total =
    weightedUnits *
    order.baseUnitPrice *
    hbMult *
    goldMult *
    order.fxRateSnapshot *
    (1 - order.tariffRate);
  return Math.max(1, Math.round(total));
}

export function createTradeOrder(
  reputation: number,
  doubleGoldChance: boolean,
  prefix = 'ORD'
): TradeOrder {
  const dest = TRADE_DESTINATIONS[Math.floor(Math.random() * TRADE_DESTINATIONS.length)];
  const repScale = 1 + Math.min(3, reputation / 220);
  const quantity = Math.round((6 + Math.floor(Math.random() * 7)) * repScale);
  const goldProb = doubleGoldChance ? 0.34 : 0.17;
  const isRareGold = Math.random() < goldProb;
  const fx = Number((dest.fxRate * (0.94 + Math.random() * 0.14)).toFixed(2));
  const shapes: BarrelShape[] = ['hex', 'round', 'cone'];
  const requiredShape =
    Math.random() < 0.7 ? dest.preferredShape : shapes[Math.floor(Math.random() * shapes.length)];

  return {
    id: `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    countryCode: dest.countryCode,
    countryName: dest.countryName,
    buyerName: dest.buyerName,
    requiredGrade: dest.preferredGrade,
    requiredShape,
    quantity,
    minQuality: isRareGold ? 'artisan' : 'standard',
    baseUnitPrice: isRareGold ? 24 : 15,
    fxRateSnapshot: fx,
    tariffRate: dest.tariffRate,
    transitSeconds: dest.transitSeconds,
    deadlineSec: 180,
    remainingSec: 180,
    isRareGold,
    reputationReward: isRareGold ? 18 : 9,
  };
}

export function createInitialWorkshopState(): WorkshopState {
  const initialOrders: TradeOrder[] = [
    {
      id: 'ORD-INIT1',
      countryCode: 'US',
      countryName: '纽约学区采购署',
      buyerName: '哈德逊文具总仓',
      requiredGrade: 'HB',
      requiredShape: 'hex',
      quantity: 6,
      minQuality: 'standard',
      baseUnitPrice: 16,
      fxRateSnapshot: 1.08,
      tariffRate: 0.1,
      transitSeconds: 10,
      deadlineSec: 240,
      remainingSec: 240,
      isRareGold: false,
      reputationReward: 10,
    },
    {
      id: 'ORD-INIT2',
      countryCode: 'JP',
      countryName: '东京制图协会',
      buyerName: '丸善文具贸易社',
      requiredGrade: '2H',
      requiredShape: 'hex',
      quantity: 8,
      minQuality: 'standard',
      baseUnitPrice: 18,
      fxRateSnapshot: 1.15,
      tariffRate: 0.05,
      transitSeconds: 12,
      deadlineSec: 240,
      remainingSec: 240,
      isRareGold: false,
      reputationReward: 12,
    },
    {
      id: 'ORD-INIT3',
      countryCode: 'CH',
      countryName: '苏黎世精密实验室',
      buyerName: '阿尔卑斯测绘部',
      requiredGrade: 'HB',
      requiredShape: 'cone',
      quantity: 8,
      minQuality: 'artisan',
      baseUnitPrice: 25,
      fxRateSnapshot: 1.42,
      tariffRate: 0.06,
      transitSeconds: 14,
      deadlineSec: 300,
      remainingSec: 300,
      isRareGold: true,
      reputationReward: 20,
    },
  ];

  return {
    schemaVersion: SCHEMA_VERSION,
    lastSavedAt: Date.now(),
    credits: 240,
    craftTokens: 2,
    reputation: 20,
    totalPencilsCrafted: 4,
    totalOrdersShipped: 0,
    comboCount: 0,
    bestCombo: 0,
    comboHeat: 0,
    stats: {
      perfectHits: 0,
      totalQteHits: 0,
      eventsHandled: 0,
      timberPulls: 0,
      rushOrdersShipped: 0,
      goldOrdersShipped: 0,
      maxSinglePayout: 0,
      maxComboHeat: 0,
    },
    activeEvent: null,
    barrelShape: 'hex',
    themeId: 'cedar',
    materials: {
      cedarLogs: 28,
      graphitePowder: 36,
      lacquerLiters: 30,
    },
    inventory: {
      standard: 4,
      artisan: 2,
      masterwork: 0,
      burr: 1,
    },
    params: {
      feedRate: 42,
      lacquerThickness: 65,
      pressPressure: 55,
      graphiteRatio: 52,
    },
    stages: INITIAL_STAGES.map((st) => ({
      ...st,
      progress: ((st.order - 1) / INITIAL_STAGES.length) * 0.75,
    })),
    orders: initialOrders,
    shipments: [],
    techs: INITIAL_TECHS.map((t) => ({ ...t })),
    achievements: [],
    accessibility: {
      autoTrimServo: false,
      extendedQteWindow: false,
      noFlashVisuals: false,
      soundEnabled: true,
      hapticsEnabled: true,
    },
  };
}

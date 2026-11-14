/**
 * @file src/physics/chainReaction.ts
 * 铀核链式反应（anim-nuclear-reaction 链式模式）的计数与能量估算。
 *
 * 单一真源：右屏看板的"本代裂变铀核数 / 累计裂变铀核数 / 累计释放能"此前是
 * 在 `data/quantities/nuclearReaction.ts` 里用 `Math.pow(3, …)` 现算的。
 * 把它挪到物理层，中屏若要显示同一组数字，直接 import 即可，不必再推导一遍。
 *
 * 模型约定（高中教科书口径）：每次裂变放出 3 个中子，且每个中子都能引发一次新裂变
 * （理想增殖系数 k = 3，忽略中子逃逸与吸收）。
 */

import { finalizeCriticalPoints, type RawCriticalPoint } from '@/utils/criticalTime'
import type { CriticalTimePoint } from '@/data/types'

/** 单次铀-235 裂变释放的能量 (MeV) —— 高中物理通用取值 200 MeV */
export const URANIUM_FISSION_ENERGY_MEV = 200

/** 理想增殖系数：每次裂变产生 3 个可继续引发裂变的中子 */
export const CHAIN_REACTION_FACTOR = 3

/**
 * 第 n 代同时发生裂变的铀核数：N(n) = k^(n-1)，n 从 1 起算。
 *
 * @param generation 裂变代数（≥1）
 * @param k 增殖系数，默认 {@link CHAIN_REACTION_FACTOR}
 */
export function chainFissionCount(
  generation: number,
  k: number = CHAIN_REACTION_FACTOR,
): number {
  if (generation < 1) return 0
  return Math.pow(k, generation - 1)
}

/**
 * 前 n 代累计裂变的铀核总数：Σ_{i=1..n} k^(i-1) = (k^n − 1) / (k − 1)。
 *
 * @param generation 裂变代数（≥1）
 * @param k 增殖系数，默认 {@link CHAIN_REACTION_FACTOR}
 */
export function chainCumulativeFissionCount(
  generation: number,
  k: number = CHAIN_REACTION_FACTOR,
): number {
  if (generation < 1) return 0
  if (k === 1) return generation
  return (Math.pow(k, generation) - 1) / (k - 1)
}

/**
 * 前 n 代累计释放的核能 (MeV) = 累计裂变数 × 单次裂变能量。
 *
 * @param generation 裂变代数（≥1）
 * @param energyPerFission 单次裂变能量 (MeV)，默认 200 MeV
 * @param k 增殖系数
 */
export function chainCumulativeEnergyMeV(
  generation: number,
  energyPerFission: number = URANIUM_FISSION_ENERGY_MEV,
  k: number = CHAIN_REACTION_FACTOR,
): number {
  return chainCumulativeFissionCount(generation, k) * energyPerFission
}

// ─── 核反应与结合能质量亏损时序常量（SSOT） ────────────────────────────────

export const BINDING_ENERGY_TIMING = {
  combineStart: 3.5,
  combineEnd: 4.5,
  flashStart: 4.3,
  flashEnd: 4.8,
  photonStart: 4.4,
  photonEnd: 5.8,
  balanceTiltDuration: 0.7,
  balanceReturnDuration: 0.8,
} as const

export const FUSION_TIMING = {
  impact: 3.0,
  separate: 3.5,
} as const

export const FISSION_TIMING = {
  impact: 2.5,
  separate: 3.8,
} as const

export const CHAIN_REACTION_TIMING = {
  gen1Hit: 1.0,
  gen1Fission: 1.5,
  gen2Hit: 2.8,
  gen2Fission: 3.3,
  gen3Hit: 4.6,
  gen3Fission: 5.1,
} as const

export interface NuclearReactionCriticalParams {
  mode?: number
  showMassDefectWeight?: number
  reactionType?: number
}

/**
 * 计算核反应、结合能与质量亏损动画临界时刻（SSOT）
 */
export function getNuclearReactionCriticalTimes(
  params: NuclearReactionCriticalParams = {},
  maxTime = 30,
): CriticalTimePoint[] {
  const mode = params.mode ?? 0
  const raw: RawCriticalPoint[] = []

  if (mode === 0) {
    raw.push(
      {
        rawTime: BINDING_ENERGY_TIMING.combineStart,
        align: 'after',
        label: '核子飞向右侧结合',
        variant: 'info',
      },
      {
        rawTime: BINDING_ENERGY_TIMING.combineEnd,
        align: 'after',
        label: '核子结合完成·产生质量亏损 Δm',
        variant: 'critical',
        autoPause: true,
      },
    )
    if ((params.showMassDefectWeight ?? 0) === 1) {
      raw.push({
        rawTime: BINDING_ENERGY_TIMING.combineEnd + BINDING_ENERGY_TIMING.balanceTiltDuration + BINDING_ENERGY_TIMING.balanceReturnDuration,
        align: 'nearest',
        label: '放入 Δm 砝码后天平平衡',
        variant: 'warning',
      })
    }
  } else {
    const reactionType = params.reactionType ?? 0
    if (reactionType === 0) {
      raw.push(
        { rawTime: FUSION_TIMING.impact, align: 'after', label: '氘核与氚核克服库仑斥力聚合', variant: 'warning' },
        { rawTime: FUSION_TIMING.separate, align: 'after', label: '聚变生成氦核并放出中子', variant: 'critical', autoPause: true },
      )
    } else if (reactionType === 1) {
      raw.push(
        { rawTime: FISSION_TIMING.impact, align: 'after', label: '慢中子轰击并进入 ²³⁵U 核', variant: 'warning' },
        { rawTime: FISSION_TIMING.separate, align: 'after', label: '铀核裂变为 Ba+Kr 并放出 3 中子', variant: 'critical', autoPause: true },
      )
    } else {
      raw.push(
        { rawTime: CHAIN_REACTION_TIMING.gen1Hit, align: 'after', label: '第 1 代铀核受中子轰击', variant: 'info' },
        { rawTime: CHAIN_REACTION_TIMING.gen2Hit, align: 'after', label: '第 2 代 (3 核) 连锁裂变', variant: 'warning' },
        { rawTime: CHAIN_REACTION_TIMING.gen3Hit, align: 'after', label: '第 3 代 (9 核) 链式雪崩', variant: 'critical', autoPause: true },
      )
    }
  }

  return finalizeCriticalPoints(raw, maxTime)
}

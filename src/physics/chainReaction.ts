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

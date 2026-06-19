/**
 * 热力学第一定律 — 可视化辅助纯函数。
 * 无副作用，不依赖 React/DOM/window。单位采用 SI。
 *
 * 核心公式 ΔU = Q + W 已在 thermodynamics.ts 的 calculateInternalEnergy 中实现。
 * 本文件补充可视化映射函数和绝热过程计算。
 */

/**
 * 内能增量 → 温度变化量。
 * ΔU = nCvΔT → ΔT = ΔU/(nCv)
 *
 * @param deltaU 内能变化量 (J)
 * @param n 物质的量 (mol)，默认 1
 * @param Cv 定容摩尔热容 (J/(mol·K))，默认单原子 12.47
 * @returns deltaT 温度变化量 (K)
 */
export function deltaUtoDeltaT(
  deltaU: number,
  n: number = 1,
  Cv: number = 12.47,
): number {
  if (n <= 0 || Cv <= 0) return 0
  return deltaU / (n * Cv)
}

/**
 * 温度 → 粒子速度缩放因子。
 * 分子平均动能正比于热力学温度：½mv² ∝ T → v ∝ √T
 *
 * @param T 当前温度 (K)
 * @param TRef 参考温度 (K)，默认 300
 * @returns 速度缩放因子
 */
export function temperatureToSpeedScale(
  T: number,
  TRef: number = 300,
): number {
  if (TRef <= 0) return 1
  return Math.sqrt(Math.max(0, T) / TRef)
}

/**
 * 内能增量 → 气缸背景颜色（冷蓝 → 深紫渐变映射）。
 * 用于绝热压缩实验的视觉反馈：ΔU 越大，颜色越紫。
 *
 * @param deltaU 内能变化量 (J)
 * @param maxAbsDU 最大绝对内能变化量 (J)，用于归一化
 * @returns CSS 颜色字符串
 */
export function internalEnergyToColor(
  deltaU: number,
  maxAbsDU: number = 500,
): string {
  const clamped = Math.max(-maxAbsDU, Math.min(maxAbsDU, deltaU))
  const t = (clamped + maxAbsDU) / (2 * maxAbsDU) // 0 (放热) → 1 (吸热/做功)

  // 冷蓝 (59,130,246) → 中性白 (240,240,250) → 深紫 (109,40,217)
  let r: number, g: number, b: number
  if (t < 0.5) {
    const s = t / 0.5
    r = Math.round(59 + s * (240 - 59))
    g = Math.round(130 + s * (240 - 130))
    b = Math.round(246 + s * (250 - 246))
  } else {
    const s = (t - 0.5) / 0.5
    r = Math.round(240 + s * (109 - 240))
    g = Math.round(240 + s * (40 - 240))
    b = Math.round(250 + s * (217 - 250))
  }
  return `rgb(${r},${g},${b})`
}

/**
 * 计算绝热过程功（泊松方程）。
 * PV^γ = const, W = (P1V1 - P2V2)/(γ-1)
 *
 * @param P1 初始压强 (Pa)
 * @param V1 初始体积 (m³)
 * @param V2 末态体积 (m³)
 * @param gamma 绝热指数，默认单原子 5/3 ≈ 1.667
 * @returns { W: 功 (J), T2: 末态温度 (K) }
 */
export function calculateAdiabaticWork(
  P1: number,
  V1: number,
  V2: number,
  gamma: number = 5 / 3,
): { W: number; T2: number } {
  if (V1 <= 0 || V2 <= 0 || P1 <= 0) {
    return { W: 0, T2: 0 }
  }
  // P2 = P1 * (V1/V2)^γ
  const P2 = P1 * Math.pow(V1 / V2, gamma)
  // W = (P1*V1 - P2*V2) / (γ - 1)
  const W = (P1 * V1 - P2 * V2) / (gamma - 1)
  // T2 = P2 * V2 / (nR), nR = P1*V1/T1, T1 = P1*V1/(nR) → T2 = T1 * (V1/V2)^(γ-1)
  const T1 = (P1 * V1) / (1 * 8.314) // n=1
  const T2 = T1 * Math.pow(V1 / V2, gamma - 1)
  return { W, T2 }
}

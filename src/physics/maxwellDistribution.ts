/**
 * 气体分子麦克斯韦-玻尔兹曼速率分布物理计算纯函数库。
 * 纯物理数学逻辑，无 DOM/React 依赖。
 */

const K_B = 1.380649e-23 // 玻尔兹曼常数 (J/K)
const N_A = 6.02214076e23 // 阿伏伽德罗常数 (mol⁻¹)

// 默认采用氧气气体分子质量 (kg) (摩尔质量 32 g/mol)
export const M_O2 = 0.032 / N_A

// 氮气分子质量 (28 g/mol)
export const M_N2 = 0.028 / N_A

/**
 * 麦克斯韦-玻尔兹曼速率分布函数概率密度 f(v)
 * f(v) = 4π (m / 2π k_B T)^(3/2) v² exp(-m v² / 2 k_B T)
 */
export function calcMaxwellSpeedPDF(v: number, T: number, m: number = M_O2): number {
  if (T <= 0 || v < 0) return 0
  const a = m / (2 * Math.PI * K_B * T)
  const factor = 4 * Math.PI * Math.pow(a, 1.5)
  return factor * v * v * Math.exp((-m * v * v) / (2 * K_B * T))
}

/** 最概然速率 v_p = sqrt(2 k_B T / m) */
export function calcMostProbableSpeed(T: number, m: number = M_O2): number {
  return Math.sqrt((2 * K_B * T) / m)
}

/** 平均速率 v_avg = sqrt(8 k_B T / π m) */
export function calcAverageSpeed(T: number, m: number = M_O2): number {
  return Math.sqrt((8 * K_B * T) / (Math.PI * m))
}

/** 方均根速率 v_rms = sqrt(3 k_B T / m) */
export function calcRmsSpeed(T: number, m: number = M_O2): number {
  return Math.sqrt((3 * K_B * T) / m)
}

export interface SpeedDistributionPoint {
  v: number
  f1: number
  f2?: number
}

/**
 * 生成麦克斯韦分布曲线采样点序列
 */
export function generateMaxwellCurves(
  T1: number,
  T2: number,
  vMax: number = 1500,
  steps: number = 80,
  m: number = M_O2,
): SpeedDistributionPoint[] {
  const points: SpeedDistributionPoint[] = []
  const dv = vMax / steps
  for (let i = 0; i <= steps; i++) {
    const v = i * dv
    const f1 = calcMaxwellSpeedPDF(v, T1, m)
    const f2 = calcMaxwellSpeedPDF(v, T2, m)
    points.push({ v, f1, f2 })
  }
  return points
}

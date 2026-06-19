/**
 * 克拉珀龙方程（理想气体状态方程扩展）纯函数库。
 * 无副作用，不依赖 React/DOM/window。单位采用 SI。
 *
 * 理想气体状态方程：pV = nRT
 * 综合气态方程：p₁V₁/T₁ = p₂V₂/T₂（等质量理想气体）
 */

import { GAS_CONSTANT } from './constants'

/**
 * 给定 P, V, T 中任意两个，求第三个。
 *
 * @param fixed1 第一个已知参量
 * @param fixed2 第二个已知参量
 * @param solve  待求参量
 * @param n 物质的量 (mol)，默认 1
 * @returns 解算值，参数无效时返回 0
 */
export function solveClapeyron(
  fixed1: { key: 'P' | 'V' | 'T'; value: number },
  fixed2: { key: 'P' | 'V' | 'T'; value: number },
  solve: 'P' | 'V' | 'T',
  n = 1,
): number {
  const params = { [fixed1.key]: fixed1.value, [fixed2.key]: fixed2.value }

  if (solve === 'P') {
    const V = params.V
    const T = params.T
    if (V == null || V <= 0 || T == null || T <= 0) return 0
    return (n * GAS_CONSTANT * T) / V
  }

  if (solve === 'V') {
    const P = params.P
    const T = params.T
    if (P == null || P <= 0 || T == null || T <= 0) return 0
    return (n * GAS_CONSTANT * T) / P
  }

  // solve === 'T'
  const P = params.P
  const V = params.V
  if (P == null || P <= 0 || V == null || V <= 0) return 0
  return (P * V) / (n * GAS_CONSTANT)
}

/**
 * PV/T 比值守恒检验（等质量理想气体）。
 *
 * @param P 压强 (Pa)
 * @param V 体积 (m³)
 * @param T 温度 (K)
 * @returns PV/T 比值 (J/K)，等于 nR
 */
export function computePVTratio(P: number, V: number, T: number): number {
  if (T <= 0) return 0
  return (P * V) / T
}

/**
 * 全分子总动能（理想气体）。
 *
 * E_k = (3/2)nRT
 *
 * @param T 热力学温度 (K)，T > 0
 * @param n 物质的量 (mol)，默认 1
 * @returns 总动能 (J)
 */
export function computeTotalKineticEnergy(T: number, n = 1): number {
  if (T <= 0) return 0
  return 1.5 * n * GAS_CONSTANT * T
}

/**
 * 生成多条等温线数据族（用于 P-V 图背景）。
 *
 * @param temperatures 温度数组 (K)
 * @param n 物质的量 (mol)
 * @param vMin 体积下限 (m³)
 * @param vMax 体积上限 (m³)
 * @param count 每条等温线采样点数，默认 50
 * @returns 等温线数据族
 */
export function generateIsothermFamily(
  temperatures: number[],
  n: number,
  vMin: number,
  vMax: number,
  count = 50,
): Array<{ T: number; points: { v: number; p: number }[] }> {
  return temperatures.map((T) => {
    const points: { v: number; p: number }[] = []
    for (let i = 0; i <= count; i++) {
      const v = vMin + ((vMax - vMin) * i) / count
      const p = T > 0 && v > 0 ? (n * GAS_CONSTANT * T) / v : 0
      points.push({ v, p })
    }
    return { T, points }
  })
}

/**
 * 气体实验三定律纯函数库。
 * 无副作用，不依赖 React/DOM/window。单位采用 SI。
 *
 * 三大定律（固定一个变量）：
 *   - 玻意耳定律（T 恒定）：PV = nRT → P = nRT/V
 *   - 盖-吕萨克定律（P 恒定）：V/T = nR/P → V = nRT/P
 *   - 查理定律（V 恒定）：P/T = nR/V → P = nRT/V
 */

import { GAS_CONSTANT } from './constants'

/**
 * 等温过程（玻意耳定律）：计算压强。
 *
 * @param V 当前体积 (m³)，V > 0
 * @param T 固定温度 (K)，T > 0
 * @param n 物质的量 (mol)，默认 1
 * @returns 压强 P (Pa)
 */
export function computeBoylePressure(V: number, T: number, n = 1): number {
  if (V <= 0 || T <= 0) return 0
  return (n * GAS_CONSTANT * T) / V
}

/**
 * 等压过程（盖-吕萨克定律）：计算体积。
 *
 * @param T 当前温度 (K)，T > 0
 * @param P 固定压强 (Pa)，P > 0
 * @param n 物质的量 (mol)，默认 1
 * @returns 体积 V (m³)
 */
export function computeGayLussacVolume(T: number, P: number, n = 1): number {
  if (T <= 0 || P <= 0) return 0
  return (n * GAS_CONSTANT * T) / P
}

/**
 * 等容过程（查理定律）：计算压强。
 *
 * @param T 当前温度 (K)，T > 0
 * @param V 固定体积 (m³)，V > 0
 * @param n 物质的量 (mol)，默认 1
 * @returns 压强 P (Pa)
 */
export function computeCharlesPressure(T: number, V: number, n = 1): number {
  if (T <= 0 || V <= 0) return 0
  return (n * GAS_CONSTANT * T) / V
}

/**
 * 生成等温线数据点（P-V 双曲线）。
 *
 * @param T 固定温度 (K)
 * @param n 物质的量 (mol)
 * @param vMin 体积下限 (m³)
 * @param vMax 体积上限 (m³)
 * @param count 采样点数，默认 50
 * @returns 数据点数组 { v, p }
 */
export function generateIsothermPoints(
  T: number,
  n: number,
  vMin: number,
  vMax: number,
  count = 50,
): { v: number; p: number }[] {
  const points: { v: number; p: number }[] = []
  for (let i = 0; i <= count; i++) {
    const v = vMin + ((vMax - vMin) * i) / count
    const p = computeBoylePressure(v, T, n)
    points.push({ v, p })
  }
  return points
}

/**
 * 生成等压线数据点（V-T 过原点直线）。
 *
 * @param P 固定压强 (Pa)
 * @param n 物质的量 (mol)
 * @param tMin 温度下限 (K)
 * @param tMax 温度上限 (K)
 * @param count 采样点数，默认 50
 * @returns 数据点数组 { t, v }
 */
export function generateIsobarPoints(
  P: number,
  n: number,
  tMin: number,
  tMax: number,
  count = 50,
): { t: number; v: number }[] {
  const points: { t: number; v: number }[] = []
  for (let i = 0; i <= count; i++) {
    const t = tMin + ((tMax - tMin) * i) / count
    const v = computeGayLussacVolume(t, P, n)
    points.push({ t, v })
  }
  return points
}

/**
 * 生成等容线数据点（P-T 过原点直线）。
 *
 * @param V 固定体积 (m³)
 * @param n 物质的量 (mol)
 * @param tMin 温度下限 (K)
 * @param tMax 温度上限 (K)
 * @param count 采样点数，默认 50
 * @returns 数据点数组 { t, p }
 */
export function generateIsochorPoints(
  V: number,
  n: number,
  tMin: number,
  tMax: number,
  count = 50,
): { t: number; p: number }[] {
  const points: { t: number; p: number }[] = []
  for (let i = 0; i <= count; i++) {
    const t = tMin + ((tMax - tMin) * i) / count
    const p = computeCharlesPressure(t, V, n)
    points.push({ t, p })
  }
  return points
}

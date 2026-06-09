/**
 * src/physics/impulse.ts
 * 冲量（Impulse）纯物理计算模块
 *
 * 所有函数均为纯函数，无副作用，无 React/DOM/window 依赖。
 * 单位制：SI（N, s, N·s）
 */

// ─── 基础模式（恒力）────────────────────────────────────────────────────────

/**
 * 计算恒力冲量
 * I = F·t
 *
 * @param F 恒力大小 (N)，必须 ≥ 0
 * @param t 作用时间 (s)，必须 ≥ 0
 * @returns I 冲量大小 (N·s)
 */
export function calculateConstantImpulse(F: number, t: number): number {
  return F * t
}

// ─── 进阶模式（变力）────────────────────────────────────────────────────────

/**
 * 力随时间变化的类型
 */
export type ForceTimeType = 'linear' | 'sine'

/**
 * 计算变力在时刻 t 的瞬时值
 *
 * 线性：F(t) = F_max · (1 - t / t_total)（从 F_max 线性衰减到 0）
 * 正弦：F(t) = F_max · sin(π · t / t_total)（半波正弦）
 *
 * @param t 当前时刻 (s)，0 ≤ t ≤ t_total
 * @param FMax 力最大值 (N)
 * @param tTotal 作用总时间 (s)
 * @param type 力随时间变化类型
 * @returns F(t) 瞬时力 (N)
 */
export function calculateInstantaneousForce(
  t: number,
  FMax: number,
  tTotal: number,
  type: ForceTimeType
): number {
  if (t <= 0) return 0
  if (t >= tTotal) return 0
  switch (type) {
    case 'linear':
      return FMax * (1 - t / tTotal)
    case 'sine':
      return FMax * Math.sin((Math.PI * t) / tTotal)
    default:
      return FMax
  }
}

/**
 * 计算变力冲量的解析积分值
 *
 * 线性：I = ∫₀ᵗ F_max(1 - t/T) dt = F_max · t · (1 - t/(2T))
 * 正弦：I = ∫₀ᵗ F_max·sin(πt/T) dt = F_max·T/π · (1 - cos(πt/T))
 *
 * @param t 积分上限时刻 (s)
 * @param FMax 力最大值 (N)
 * @param tTotal 作用总时间 (s)
 * @param type 力随时间变化类型
 * @returns I 冲量积分值 (N·s)
 */
export function calculateAnalyticalImpulse(
  t: number,
  FMax: number,
  tTotal: number,
  type: ForceTimeType
): number {
  const tc = Math.max(0, Math.min(t, tTotal))
  switch (type) {
    case 'linear':
      return FMax * tc * (1 - tc / (2 * tTotal))
    case 'sine':
      return (FMax * tTotal) / Math.PI * (1 - Math.cos((Math.PI * tc) / tTotal))
    default:
      return FMax * tc
  }
}

/**
 * 计算变力全程冲量（解析解）
 *
 * @param FMax 力最大值 (N)
 * @param tTotal 作用总时间 (s)
 * @param type 力随时间变化类型
 * @returns I 全程冲量 (N·s)
 */
export function calculateTotalImpulse(
  FMax: number,
  tTotal: number,
  type: ForceTimeType
): number {
  return calculateAnalyticalImpulse(tTotal, FMax, tTotal, type)
}

/**
 * 计算变力的平均值
 * F_avg = I / t_total
 *
 * @param FMax 力最大值 (N)
 * @param tTotal 作用总时间 (s)
 * @param type 力随时间变化类型
 * @returns F_avg 平均力 (N)
 */
export function calculateAverageForce(
  FMax: number,
  tTotal: number,
  type: ForceTimeType
): number {
  const totalImpulse = calculateTotalImpulse(FMax, tTotal, type)
  return totalImpulse / tTotal
}

/**
 * 微元法计算冲量（数值积分 — 矩形法）
 * 用于进阶模式动画中逐步累加展示
 *
 * @param FMax 力最大值 (N)
 * @param tTotal 作用总时间 (s)
 * @param type 力随时间变化类型
 * @param nSlices 微元切割数
 * @returns 每个微元的 { t_start, t_end, F_avg, dI, cumulativeI }
 */
export function calculateImpulseSlices(
  FMax: number,
  tTotal: number,
  type: ForceTimeType,
  nSlices: number
): Array<{
  tStart: number
  tEnd: number
  FAvg: number
  dI: number
  cumulativeI: number
}> {
  const dt = tTotal / nSlices
  const slices: Array<{
    tStart: number
    tEnd: number
    FAvg: number
    dI: number
    cumulativeI: number
  }> = []
  let cumulative = 0

  for (let i = 0; i < nSlices; i++) {
    const tStart = i * dt
    const tEnd = (i + 1) * dt
    const tMid = (tStart + tEnd) / 2
    const FAvg = calculateInstantaneousForce(tMid, FMax, tTotal, type)
    const dI = FAvg * dt
    cumulative += dI
    slices.push({ tStart, tEnd, FAvg, dI, cumulativeI: cumulative })
  }

  return slices
}

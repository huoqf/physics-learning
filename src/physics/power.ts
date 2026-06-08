/**
 * src/physics/power.ts
 * 汽车起动模型物理计算 — 纯函数，无副作用
 *
 * 两种起动模型：
 * 1. 恒定功率起动：P 恒定，F = P/v（低速限流 F_max = 3f），a 递减至 0
 * 2. 恒定加速度起动（高考经典）：
 *    - 第一阶段（匀加速）：F = ma + f 恒定，P = Fv 递增至 P_rated
 *    - 第二阶段（变加速）：P = P_rated 恒定，F = P_rated/v 递减至 f
 */

/** 汽车起动单步状态快照 */
export interface PowerModelState {
  /** 时间 (s) */
  t: number
  /** 速度 (m/s) */
  v: number
  /** 位移 (m) */
  s: number
  /** 牵引力 (N) */
  F: number
  /** 加速度 (m/s²) */
  a: number
  /** 实际功率 (W) */
  P: number
  /** 当前阶段（仅恒定加速度模式）: 0=匀加速, 1=变加速, 2=匀速 */
  phase: number
}

/**
 * 恒定功率起动 — 预计算完整轨迹
 *
 * 物理模型：
 * - P 恒定，F = P/v
 * - 低速限流：v < P/(3f) 时，F = 3f（最大牵引力）
 * - a = (F - f) / m
 * - 当 F = f 时，a = 0，达到最大速度 v_max = P/f
 *
 * @param P_rated 额定功率 (W)
 * @param m 汽车质量 (kg)
 * @param f 阻力 (N)
 * @param tMax 最大模拟时间 (s)
 * @param dt 时间步长 (s)
 * @returns 轨迹点数组
 */
export function precomputeConstantPowerTrajectory(
  P_rated: number,
  m: number,
  f: number,
  tMax: number,
  dt: number = 0.02
): PowerModelState[] {
  const F_max = 3 * f // 低速限流
  const v_max = P_rated / f
  const points: PowerModelState[] = []

  let t = 0
  let v = 0.001 // 避免 v=0 导致 F 无穷大
  let s = 0

  while (t <= tMax + dt) {
    // 牵引力计算（含低速限流）
    const F_unclamped = P_rated / v
    const F = Math.min(F_unclamped, F_max)
    const a = (F - f) / m
    const P_actual = F * v

    points.push({ t: Math.min(t, tMax), v, s, F, a, P: P_actual, phase: 0 })

    // Euler 积分
    v = v + a * dt
    if (v >= v_max) {
      v = v_max
      // 填充剩余时间点（匀速状态）
      while (t + dt <= tMax) {
        t += dt
        s += v * dt
        points.push({ t, v, s, F: f, a: 0, P: P_rated, phase: 0 })
      }
      break
    }
    s += v * dt
    t += dt
  }

  return points
}

/**
 * 恒定加速度起动 — 预计算完整轨迹（高考经典）
 *
 * 物理模型：
 * - 第一阶段（匀加速）：F = ma + f 恒定，v = at，P = Fv 递增
 *   临界条件：P = P_rated → v_c = P_rated / (ma + f)
 * - 第二阶段（变加速）：P = P_rated 恒定，F = P_rated/v 递减
 *   直到 F = f → v_max = P_rated / f
 * - 第三阶段（匀速）：F = f，a = 0，v = v_max
 *
 * @param P_rated 额定功率 (W)
 * @param m 汽车质量 (kg)
 * @param f 阻力 (N)
 * @param a_target 目标加速度 (m/s²)
 * @param tMax 最大模拟时间 (s)
 * @param dt 时间步长 (s)
 * @returns 轨迹点数组和临界速度
 */
export function precomputeConstantAccelTrajectory(
  P_rated: number,
  m: number,
  f: number,
  a_target: number,
  tMax: number,
  dt: number = 0.02
): { points: PowerModelState[]; v_c: number; t_c: number } {
  const F_const = m * a_target + f // 匀加速阶段恒定牵引力
  const v_c = P_rated / F_const     // 匀加速阶段末速度（临界速度）
  const t_c = v_c / a_target        // 匀加速阶段持续时间
  const v_max = P_rated / f         // 最终最大速度

  const points: PowerModelState[] = []
  let t = 0
  let v = 0
  let s = 0

  while (t <= tMax + dt) {
    let F: number, a: number, P_actual: number, phase: number

    if (v < v_c - 0.001) {
      // 第一阶段：匀加速
      F = F_const
      a = a_target
      P_actual = F * v
      phase = 0
    } else if (v < v_max - 0.001) {
      // 第二阶段：变加速（恒功率）
      F = P_rated / v
      a = (F - f) / m
      P_actual = P_rated
      phase = 1
    } else {
      // 第三阶段：匀速
      F = f
      a = 0
      P_actual = P_rated
      phase = 2
    }

    points.push({ t: Math.min(t, tMax), v, s, F, a, P: P_actual, phase })

    // Euler 积分
    v = v + a * dt
    if (v >= v_max) v = v_max
    s += v * dt
    t += dt
  }

  return { points, v_c, t_c }
}

/**
 * 从预计算轨迹中获取指定时刻的状态（线性插值）
 *
 * @param points 预计算轨迹
 * @param t 目标时刻 (s)
 * @returns 插值状态
 */
export function getPowerStateAtTime(
  points: PowerModelState[],
  t: number
): PowerModelState {
  if (points.length === 0) {
    return { t: 0, v: 0, s: 0, F: 0, a: 0, P: 0, phase: 0 }
  }
  if (t <= points[0].t) return { ...points[0] }
  if (t >= points[points.length - 1].t) return { ...points[points.length - 1] }

  // 二分查找
  let lo = 0
  let hi = points.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (points[mid].t <= t) lo = mid
    else hi = mid
  }

  const p0 = points[lo]
  const p1 = points[hi]
  const ratio = (t - p0.t) / (p1.t - p0.t)

  return {
    t,
    v: p0.v + (p1.v - p0.v) * ratio,
    s: p0.s + (p1.s - p0.s) * ratio,
    F: p0.F + (p1.F - p0.F) * ratio,
    a: p0.a + (p1.a - p0.a) * ratio,
    P: p0.P + (p1.P - p0.P) * ratio,
    phase: p1.phase,
  }
}

/**
 * 计算恒定功率起动的关键参数
 *
 * @param P_rated 额定功率 (W)
 * @param m 汽车质量 (kg)
 * @param f 阻力 (N)
 * @returns 关键参数
 */
export function calculateConstantPowerParams(
  P_rated: number,
  _m: number,
  f: number
): {
  /** 最大速度 (m/s) */
  v_max: number
  /** 最大牵引力 (N) */
  F_max: number
  /** 低速限流临界速度 (m/s) */
  v_limit: number
} {
  const F_max = 3 * f
  return {
    v_max: P_rated / f,
    F_max,
    v_limit: P_rated / F_max,
  }
}

/**
 * 计算恒定加速度起动的关键参数
 *
 * @param P_rated 额定功率 (W)
 * @param m 汽车质量 (kg)
 * @param f 阻力 (N)
 * @param a_target 目标加速度 (m/s²)
 * @returns 关键参数
 */
export function calculateConstantAccelParams(
  P_rated: number,
  m: number,
  f: number,
  a_target: number
): {
  /** 匀加速阶段恒定牵引力 (N) */
  F_const: number
  /** 临界速度 v_c (m/s) */
  v_c: number
  /** 匀加速阶段持续时间 (s) */
  t_c: number
  /** 最终最大速度 (m/s) */
  v_max: number
} {
  const F_const = m * a_target + f
  const v_c = P_rated / F_const
  const t_c = v_c / a_target
  const v_max = P_rated / f
  return { F_const, v_c, t_c, v_max }
}

/**
 * src/physics/verticalSpring.ts
 * 竖直弹簧复合模型物理计算模块 — 基于高精度解析分段解，无漂移
 */

export interface VSModelState {
  /** 时间 (s) */
  t: number
  /** 位移 (m)，以原长位置 A 为 0 点，向下为正 */
  x: number
  /** 瞬时速度 (m/s)，向下为正 */
  v: number
  /** 瞬时加速度 (m/s²)，向下为正 */
  a: number
  /** 重力势能 (J)，以最低点 C 为零势能面 */
  Ep: number
  /** 弹性势能 (J) */
  Epe: number
  /** 动能 (J) */
  Ek: number
  /** 总能量 (J) */
  Etot: number
  /** 合外力 (N)，向下为正 */
  F_net: number
  /** 弹簧弹力 (N)，向上为正 */
  F_spring: number
}

/**
 * 预计算竖直弹簧下落模型的周期物理量轨迹（解析分段解）。
 *
 * @param m - 小球质量 (kg)
 * @param k - 弹簧劲度系数 (N/m)
 * @param h - 初始释放高度 (m)，弹簧原长上方
 * @param g - 重力加速度 (m/s²)
 * @param tMax - 最大模拟时间 (s)，默认 15
 * @param dt - 时间步长 (s)，默认 0.02
 * @returns 轨迹点数组，按时间升序排列
 */
export function precomputeVerticalSpringTrajectory(
  m: number,
  k: number,
  h: number,
  g: number,
  tMax: number = 15,
  dt: number = 0.02
): VSModelState[] {
  const points: VSModelState[] = []

  // 1. 物理关键节点计算
  const t0 = Math.sqrt((2 * h) / g) // 自由下落到触网时间 (s)
  const v0 = g * t0 // 触网速度 (m/s)

  const xB = (m * g) / k // 平衡位置 (m)
  const omega = Math.sqrt(k / m) // 简谐运动圆频率
  // 简谐振幅 A = sqrt(xB^2 + (v0/omega)^2)
  const A = Math.sqrt(xB * xB + (v0 * v0) / (omega * omega))
  
  // 初位相 phi，因为 x(0)=0 => xB + A cos(phi) = 0 => cos(phi) = -xB / A
  // 且 v(0) = v0 > 0 => -A omega sin(phi) > 0 => sin(phi) < 0
  // 所以 phi 处于第三象限 (pi, 1.5*pi)
  const phi = Math.PI + Math.atan(v0 / (omega * xB))
  
  // 弹簧中运动半周期时间 (s)
  const tSpring = (2 * (2 * Math.PI - phi)) / omega

  // 单周期总时间
  const T = 2 * t0 + tSpring

  // 最低位置 C 点的物理坐标 (m)
  const xC = xB + A

  // 释放点的总能量 (以最低点为重力势能零点)
  // 释放点高度相对于最低点为 h + xC
  const E0 = m * g * (h + xC)

  let t = 0
  while (t <= tMax + dt * 0.5) {
    const curT = Math.min(t, tMax)
    const tMod = curT % T

    let x = 0
    let v = 0
    let a = 0
    let F_spring = 0

    if (tMod < t0) {
      // 自由落体
      x = 0.5 * g * tMod * tMod - h
      v = g * tMod
      a = g
      F_spring = 0
    } else if (tMod < t0 + tSpring) {
      // 弹簧简谐运动
      const tPrime = tMod - t0
      x = xB + A * Math.cos(omega * tPrime + phi)
      v = -A * omega * Math.sin(omega * tPrime + phi)
      a = -A * omega * omega * Math.cos(omega * tPrime + phi)
      F_spring = k * x
    } else {
      // 触网反弹上抛阶段
      const tDoublePrime = tMod - t0 - tSpring
      x = -v0 * tDoublePrime + 0.5 * g * tDoublePrime * tDoublePrime
      v = -v0 + g * tDoublePrime
      a = g
      F_spring = 0
    }

    // 能量计算
    const Ep = m * g * (xC - x) // 重力势能 (C点为零)
    const Epe = x >= 0 ? 0.5 * k * x * x : 0 // 弹性势能
    const Ek = 0.5 * m * v * v // 动能
    const F_net = m * g - (x >= 0 ? k * x : 0)

    points.push({
      t: curT,
      x,
      v,
      a,
      Ep,
      Epe,
      Ek,
      Etot: E0, // 强制机械能绝对守恒
      F_net,
      F_spring,
    })

    t += dt
  }

  return points
}

/**
 * 线性插值器取得指定时刻的状态。
 *
 * @param points - 预计算的轨迹点数组（按时间升序）
 * @param t - 目标时间 (s)
 * @returns 该时刻的插值状态，包含位置、速度、加速度、各能量分量
 */
export function getVSStateAtTime(
  points: VSModelState[],
  t: number
): VSModelState {
  if (points.length === 0) {
    return { t: 0, x: 0, v: 0, a: 0, Ep: 0, Epe: 0, Ek: 0, Etot: 0, F_net: 0, F_spring: 0 }
  }
  if (t <= points[0].t) return { ...points[0] }
  if (t >= points[points.length - 1].t) return { ...points[points.length - 1] }

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
    x: p0.x + (p1.x - p0.x) * ratio,
    v: p0.v + (p1.v - p0.v) * ratio,
    a: p0.a + (p1.a - p0.a) * ratio,
    Ep: p0.Ep + (p1.Ep - p0.Ep) * ratio,
    Epe: p0.Epe + (p1.Epe - p0.Epe) * ratio,
    Ek: p0.Ek + (p1.Ek - p0.Ek) * ratio,
    Etot: p0.Etot + (p1.Etot - p0.Etot) * ratio,
    F_net: p0.F_net + (p1.F_net - p0.F_net) * ratio,
    F_spring: p0.F_spring + (p1.F_spring - p0.F_spring) * ratio,
  }
}

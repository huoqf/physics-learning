/**
 * src/physics/potentialEnergy.ts
 * 重力势能与弹性势能物理计算模块 — 纯函数，无副作用
 */

export interface PEModelState {
  /** 时间 (s) */
  t: number
  /** 模式: 0=重力势能, 1=弹性势能 */
  mode: number
  /** 实时位置: 模式0为物理高度 y (m)，模式1为形变位移 x (m) */
  pos: number
  /** 实时速度 v (m/s) */
  v: number
  /** 实时加速度 a (m/s²) */
  a: number
  /** 实时力 F (N)，模式0为重力 -mg，模式1为弹力 -kx */
  F: number
  /** 实时势能 (J)，模式0为重力势能 Ep = mg(y - y_ref)，模式1为弹性势能 Epe = 0.5*k*x^2 */
  Ep: number
  /** 实时动能 Ek (J) */
  Ek: number
  /** 自初态以来，系统力所做的功 (J)，模式0为重力功 W_G，模式1为弹力功 W_s */
  W: number
  /** 自初态以来的势能变化量 ΔEp (J) */
  deltaEp: number
}

/**
 * 预计算重力势能轨迹（自由落体加地面反弹）
 * 
 * @param m 质量 (kg)
 * @param g 重力加速度 (m/s²)
 * @param y0 初始释放高度 (m)
 * @param y_ref 零势能面高度 (m)
 * @param e 恢复系数 (0 = 粘在地上, 1 = 完全弹性反弹, 默认 0.7)
 * @param tMax 最大模拟时间 (s)
 * @param dt 时间步长 (s)
 */
export function precomputeGravityTrajectory(
  m: number,
  g: number,
  y0: number,
  y_ref: number,
  e: number = 0.7,
  tMax: number = 15,
  dt: number = 0.02
): PEModelState[] {
  const points: PEModelState[] = []
  
  let y = y0
  let v = 0
  let t = 0
  
  const initialEp = m * g * (y0 - y_ref)

  while (t <= tMax + dt) {
    const curT = Math.min(t, tMax)
    
    // 实时动能
    const Ek = 0.5 * m * v * v
    // 实时重力势能 (相对于 y_ref)
    const Ep = m * g * (y - y_ref)
    // 累计重力做功：W_G = mg * (y0 - y)
    const W = m * g * (y0 - y)
    // 势能变化量：ΔEp = Ep - Ep(0)
    const deltaEp = Ep - initialEp
    const a = -g

    points.push({
      t: curT,
      mode: 0,
      pos: y,
      v,
      a,
      F: -m * g,
      Ep,
      Ek,
      W,
      deltaEp
    })

    // 数值积分更新下一帧（采用半隐式欧拉法）
    const nextV = v + a * dt
    let nextY = y + nextV * dt

    if (nextY <= 0) {
      nextY = 0
      // 速度反向并乘以恢复系数
      let reflectedV = -nextV * e
      if (Math.abs(reflectedV) < 0.15) {
        reflectedV = 0 // 低于门限值时静止
      }
      v = reflectedV
    } else {
      v = nextV
    }
    
    y = nextY
    t += dt
  }

  return points
}

/**
 * 预计算弹性势能轨迹（简谐振动解析解）
 * 
 * @param m 质量 (kg)
 * @param k 弹性劲度系数 (N/m)
 * @param x0 初始释放形变量 (m)
 * @param tMax 最大模拟时间 (s)
 * @param dt 时间步长 (s)
 */
export function precomputeSpringTrajectory(
  m: number,
  k: number,
  x0: number,
  tMax: number = 15,
  dt: number = 0.02
): PEModelState[] {
  const points: PEModelState[] = []
  
  const omega = Math.sqrt(k / m) // 简谐振动角频率
  const initialEp = 0.5 * k * x0 * x0

  let t = 0
  while (t <= tMax + dt) {
    const curT = Math.min(t, tMax)
    
    // 解析式求实时位移与速度
    const x = x0 * Math.cos(omega * curT)
    const v = -x0 * omega * Math.sin(omega * curT)
    const a = -(k / m) * x
    const F = -k * x
    
    const Ep = 0.5 * k * x * x
    const Ek = 0.5 * m * v * v
    const W = initialEp - Ep // 弹力做功等于弹性势能的减少量
    const deltaEp = Ep - initialEp

    points.push({
      t: curT,
      mode: 1,
      pos: x,
      v,
      a,
      F,
      Ep,
      Ek,
      W,
      deltaEp
    })

    t += dt
  }

  return points
}

/**
 * 线性插值器
 */
export function getPEStateAtTime(
  points: PEModelState[],
  t: number
): PEModelState {
  if (points.length === 0) {
    return { t: 0, mode: 0, pos: 0, v: 0, a: 0, F: 0, Ep: 0, Ek: 0, W: 0, deltaEp: 0 }
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
    mode: p0.mode,
    pos: p0.pos + (p1.pos - p0.pos) * ratio,
    v: p0.v + (p1.v - p0.v) * ratio,
    a: p0.a + (p1.a - p0.a) * ratio,
    F: p0.F + (p1.F - p0.F) * ratio,
    Ep: p0.Ep + (p1.Ep - p0.Ep) * ratio,
    Ek: p0.Ek + (p1.Ek - p0.Ek) * ratio,
    W: p0.W + (p1.W - p0.W) * ratio,
    deltaEp: p0.deltaEp + (p1.deltaEp - p0.deltaEp) * ratio,
  }
}

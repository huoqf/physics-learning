import { COULOMB_CONSTANT } from './constants'
import { alignCriticalTime } from '@/utils/criticalTime'
import type { CriticalTimePoint } from '@/data/types'

/** 带电粒子在匀强电场中偏转默认物理几何与粒子质量常数 (SI, SSOT) */
export const CHARGE_EFIELD_GEOMETRY = {
  plateLength: 0.4,
  plateGap: 0.2,
  particleMass: 10 * 1e-6,
  driftLength: 0.28,
} as const

/**
 * 静电场纯函数库。
 * 无副作用，不依赖 React/DOM/window。单位采用 SI。
 *
 * ⚠️ 库仑力 calculateCoulombForce 已在 src/physics/dynamics.ts 实现，
 *    此处不重复定义，使用方直接从 '@/physics' 引入即可。
 */

/**
 * 双丝线悬挂小球库仑平衡计算。
 *
 * 物理模型：两个相同质量 m 的小球，各用长 L 的丝线悬挂于同一点，
 * 带同号电量 q₁、q₂ 后因库仑力排斥而张开角度 θ。异号电荷在同悬点模型下无对称分离平衡。
 *
 * 平衡条件（隔离法）：
 *   水平：F_库 = T·sinθ
 *   竖直：mg = T·cosθ
 *   联立：tanθ = F_库 / (mg)
 *
 * 两球间距 r = 2L·sinθ
 * 库仑力 F = k·|q₁·q₂| / r²
 *
 * @param k     静电力常量 (N·m²/C²)，通常取 9×10⁹
 * @param q1    电荷1电量 (C)，含符号
 * @param q2    电荷2电量 (C)，含符号
 * @param m     小球质量 (kg)
 * @param L     丝线长度 (m)
 * @param g     重力加速度 (m/s²)
 * @returns theta 平衡角度 (rad), r 两球间距 (m), F 库仑力大小 (N), T 绳中拉力 (N),
 *          attractive 是否吸引, x1 球1水平偏移 (m), x2 球2水平偏移 (m)
 */
export function calculateCoulombPendulum(
  k: number,
  q1: number,
  q2: number,
  m: number,
  L: number,
  g: number
): {
  theta: number
  r: number
  F: number
  T: number
  attractive: boolean
  x1: number
  x2: number
  hasSeparatedEquilibrium: boolean
} {
  const attractive = q1 * q2 < 0

  if (attractive) {
    // 同一点悬挂的异号电荷会相互靠近/接触，不存在“向外张开”的对称分离平衡解。
    return { theta: 0, r: 0, F: 0, T: m * g, attractive, x1: 0, x2: 0, hasSeparatedEquilibrium: false }
  }

  // 迭代求解平衡角 θ
  // tanθ = k|q₁q₂| / (4L²sin²θ · mg)
  // 令 A = k|q₁q₂| / (4L²·mg)，则 f(θ) = sin²θ·tanθ - A = 0
  const q1Abs = Math.abs(q1)
  const q2Abs = Math.abs(q2)
  const A = (k * q1Abs * q2Abs) / (4 * L * L * m * g)

  // 二分法求 θ（保证收敛，牛顿迭代在大 A 时会过冲）
  // f(θ) = sin²θ·tanθ - A，f(0)=−A<0，f(π/2−ε)→+∞
  const f = (t: number) => {
    const s = Math.sin(t)
    const c = Math.cos(t)
    return c > 1e-12 ? s * s * (s / c) - A : 1e12
  }
  let lo = 0.001
  let hi = Math.PI / 2 - 0.01
  let theta = lo
  if (f(lo) >= 0) {
    // A 极小，角度几乎为 0
    theta = lo
  } else {
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2
      if (f(mid) < 0) lo = mid; else hi = mid
      if (hi - lo < 1e-10) break
    }
    theta = (lo + hi) / 2
  }

  const r = 2 * L * Math.sin(theta)
  const F = r > 0 ? (k * q1Abs * q2Abs) / (r * r) : 0
  const T = m * g / Math.cos(theta)

  // 异号电荷时两球靠近，x 方向为负
  const sign = attractive ? -1 : 1
  const x1 = sign * L * Math.sin(theta)
  const x2 = -sign * L * Math.sin(theta)

  return { theta, r, F, T, attractive, x1, x2, hasSeparatedEquilibrium: true }
}

/**
 * 计算三点电荷各自的合力。
 *
 * 物理模型：三个点电荷在二维平面上，每对电荷之间存在库仑力。
 * 对每个电荷，合力 = 其余两个电荷对它的库仑力矢量和。
 *
 * 库仑力公式：F = k·|q₁·q₂| / r²
 * 方向：同号电荷排斥，异号电荷吸引（沿连线方向）。
 *
 * @param k      静电力常量 (N·m²/C²)，通常取 9×10⁹
 * @param charges 三个电荷的位置和电量 [{x, y, q}]，x/y 单位 m，q 单位 C
 * @returns 每个电荷的合力 {fx, fy, magnitude}，单位 N
 *
 * @category M4
 */
export function calculateThreeChargeForces(
  k: number,
  charges: Array<{ x: number; y: number; q: number }>
): Array<{ fx: number; fy: number; magnitude: number }> {
  const n = charges.length
  const results: Array<{ fx: number; fy: number; magnitude: number }> = []

  for (let i = 0; i < n; i++) {
    let fx = 0
    let fy = 0
    for (let j = 0; j < n; j++) {
      if (i === j) continue
      const dx = charges[j].x - charges[i].x
      const dy = charges[j].y - charges[i].y
      const rSq = dx * dx + dy * dy
      if (rSq < 1e-18) continue // 避免除零
      const r = Math.sqrt(rSq)
      const Fmag = (k * Math.abs(charges[i].q * charges[j].q)) / rSq
      // 同号排斥（力方向远离 j），异号吸引（力方向指向 j）
      const sign = charges[i].q * charges[j].q > 0 ? -1 : 1
      fx += sign * Fmag * (dx / r)
      fy += sign * Fmag * (dy / r)
    }
    const magnitude = Math.sqrt(fx * fx + fy * fy)
    results.push({ fx, fy, magnitude })
  }

  return results
}

/** 点电荷电场强度 E = kq/r²（N/C） */
export function calculateElectricField(k: number, q: number, r: number): { E: number; valid: boolean; singular: boolean } {
  if (r === 0) return { E: q === 0 ? NaN : Math.sign(q) * Infinity, valid: false, singular: true }
  if (r < 0) return { E: NaN, valid: false, singular: false }
  return { E: (k * q) / (r * r), valid: true, singular: false }
}

/**
 * 两点电荷实验的物理间距 (m)：6 cm。
 *
 * 这是模型约定，不是画布尺寸——中屏按 `20cm 画布宽 / 6cm 间距` 摆放电荷，
 * 看板按它算合场强。两边必须引用同一个值。
 * 历史问题：中屏 6cm、看板写死 5.25cm，合场强在中点差 3 倍、远端差近 4 倍。
 */
export const TWO_CHARGE_SEPARATION_M = 0.06

/** 电场线与等势面演示中计算电势的最小截断距离 (m) */
export const FIELD_LINES_MIN_POTENTIAL_DIST_M = 0.05

export interface TwoChargeField2DOptions {
  /** 电荷 1 电量 (C) */
  q1C: number
  /** 电荷 2 电量 (C) */
  q2C: number
  /** 两源电荷间距 (m)，默认 TWO_CHARGE_SEPARATION_M */
  separationM?: number
  /** 场点相对两电荷连线中点的水平坐标 x (m)，向右为正 */
  xM: number
  /** 场点相对两电荷连线中点的竖直坐标 y (m)，向上为正 */
  yM: number
  /** 试探电荷电量 (C) */
  qTestC: number
  /** 防奇点最小距离截断 (m)，默认 0.005 */
  minDistM?: number
}

export interface TwoChargeField2DResult {
  E1x: number
  E1y: number
  E2x: number
  E2y: number
  Ex: number
  Ey: number
  E: number
  Fx: number
  Fy: number
  F: number
}

/**
 * 计算平面内关于原点对称放置的两点电荷的二维合场强与试探电荷受力（标准物理坐标系：x→, y↑）。
 * 供「电场强度」进阶叠加场景与右屏看板共同作为单一可信源（SSOT）。
 */
export function calculateTwoChargeField2D(options: TwoChargeField2DOptions): TwoChargeField2DResult {
  const {
    q1C,
    q2C,
    separationM = TWO_CHARGE_SEPARATION_M,
    xM,
    yM,
    qTestC,
    minDistM = 0.005,
  } = options

  const dHalf = separationM / 2
  const dx1 = xM - (-dHalf)
  const dy1 = yM
  const r1 = Math.max(minDistM, Math.hypot(dx1, dy1))
  const e1Mag = calculateElectricField(COULOMB_CONSTANT, Math.abs(q1C), r1).E
  const dir1 = q1C >= 0 ? 1 : -1
  const r1Raw = Math.hypot(dx1, dy1)
  const ux1 = r1Raw > 1e-12 ? dx1 / r1Raw : 1
  const uy1 = r1Raw > 1e-12 ? dy1 / r1Raw : 0
  const E1x = e1Mag * dir1 * ux1
  const E1y = e1Mag * dir1 * uy1

  const dx2 = xM - dHalf
  const dy2 = yM
  const r2 = Math.max(minDistM, Math.hypot(dx2, dy2))
  const e2Mag = calculateElectricField(COULOMB_CONSTANT, Math.abs(q2C), r2).E
  const dir2 = q2C >= 0 ? 1 : -1
  const r2Raw = Math.hypot(dx2, dy2)
  const ux2 = r2Raw > 1e-12 ? dx2 / r2Raw : 1
  const uy2 = r2Raw > 1e-12 ? dy2 / r2Raw : 0
  const E2x = e2Mag * dir2 * ux2
  const E2y = e2Mag * dir2 * uy2

  const Ex = E1x + E2x
  const Ey = E1y + E2y
  const E = Math.hypot(Ex, Ey)
  const Fx = qTestC * Ex
  const Fy = qTestC * Ey
  const F = Math.hypot(Fx, Fy)

  return { E1x, E1y, E2x, E2y, Ex, Ey, E, Fx, Fy, F }
}

/**
 * 计算孤立点电荷周围「等差等势面」的半径数组（从 rMin 到 rMax 升序）。
 * 物理规律：φ ∝ 1/r，故相邻等势面电势差相等时 1/r 等距分布，呈现「内密外疏」。
 *
 * @param rMin  最内圈半径（px 或 m，> 0）
 * @param rMax  最外圈半径（> rMin）
 * @param count 等势面圈数（>= 2）
 */
export function computePointChargeEquipotentialRadii(
  rMin: number,
  rMax: number,
  count: number,
): number[] {
  if (count <= 0 || rMin <= 0 || rMax <= rMin) return []
  if (count === 1) return [rMin]
  const invMax = 1 / rMin
  const invMin = 1 / rMax
  const radii: number[] = []
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1)
    // inv 从 invMin（最外圈）线性增至 invMax（最内圈），反转后得升序半径
    const invR = invMin + (1 - t) * (invMax - invMin)
    radii.push(1 / invR)
  }
  return radii.sort((a, b) => a - b)
}


/** 点电荷电势 V = kq/r（V） */
export function calculateElectricPotential(k: number, q: number, r: number): { V: number; valid: boolean; singular: boolean } {
  if (r === 0) return { V: q === 0 ? NaN : Math.sign(q) * Infinity, valid: false, singular: true }
  if (r < 0) return { V: NaN, valid: false, singular: false }
  return { V: (k * q) / r, valid: true, singular: false }
}

/** 平行板电容 C = εS/d（F） */
export function calculateCapacitor(epsilon: number, S: number, d: number): { C: number; valid: boolean } {
  if (epsilon < 0 || S < 0 || d <= 0) return { C: NaN, valid: false }
  return { C: (epsilon * S) / d, valid: true }
}

export interface EFieldSimulationPoint {
  t: number
  x: number  // 物理坐标 x (m)
  y: number  // 物理坐标 y (m)
  vx: number // 速度 x (m/s)
  vy: number // 速度 y (m/s)
  ax: number // 加速度 x (m/s²)
  ay: number // 加速度 y (m/s²)
}

/**
 * 带电粒子在匀强电场及重力复合场中的运动轨迹模拟（数值积分）。
 *
 * @param U           极板间电压 (V)
 * @param d           极板间距 (m)
 * @param L           极板长度 (m)
 * @param q           电荷量 (C)
 * @param m           粒子质量 (kg)
 * @param v0          初速度 (m/s)
 * @param g           重力加速度 (m/s²)，0表示忽略重力
 * @param isAC        是否为周期交变方形波
 * @param freq        交变方形波的频率 (Hz)
 * @param maxTime     最大模拟时间 (s)，默认 1.0s
 * @param dt          积分步长 (s)，默认 0.0001s
 */
export function calculateChargeInEFieldTrajectory(options: {
  U: number
  d: number
  L: number
  q: number
  m: number
  v0: number
  g: number
  isAC: boolean
  freq: number
  phi0?: number
  maxTime?: number
  dt?: number
  includeDriftScreen?: boolean
  driftLength?: number
}): {
  points: EFieldSimulationPoint[]
  tEnd: number
  plateExitTime: number
  screenY: number | null
  hitType: 'none' | 'top' | 'bottom'
  hitsPlate: boolean
  xEnd: number
  yEnd: number
} {
  const {
    U,
    d,
    L,
    q,
    m,
    v0,
    g,
    isAC,
    freq,
    phi0 = 0,
    maxTime = 1.0,
    dt = 0.0001,
    includeDriftScreen = false,
    driftLength = CHARGE_EFIELD_GEOMETRY.driftLength,
  } = options

  const points: EFieldSimulationPoint[] = []
  
  let t = 0
  let x = 0
  let y = 0
  let vx = v0
  let vy = 0
  
  const halfGap = d / 2
  let hitType: 'none' | 'top' | 'bottom' = 'none'
  let hitsPlate = false

  // 初始点
  points.push({ t: 0, x: 0, y: 0, vx, vy, ax: 0, ay: 0 })

  const maxSteps = Math.min(10000, Math.ceil(maxTime / dt))
  for (let step = 0; step < maxSteps; step++) {
    // 判断电场极性系数
    let fieldSign = 1
    if (isAC && freq > 0) {
      const T = 1 / freq
      const tStart = phi0 * T
      const phase = ((t + tStart) % T) / T
      fieldSign = phase < 0.5 ? 1 : -1
    }

    // 电场强度 (V/m)
    const E = U / d
    // 电场力 (N)
    const FE = q * E * fieldSign
    // 竖直加速度 (m/s²). y 轴向下为正方向
    const ay = (m > 0) ? (FE / m + g) : 0
    const ax = 0

    // 更新最后一点的加速度
    if (points.length > 0) {
      points[points.length - 1].ax = ax
      points[points.length - 1].ay = ay
    }

    // 辛欧拉积分
    t += dt
    vx += ax * dt
    vy += vy === undefined ? 0 : ay * dt
    x += vx * dt
    y += vy * dt

    points.push({ t, x, y, vx, vy, ax: 0, ay: 0 })

    // 边界碰撞检测（注意：y 轴向上偏是负值，向下偏是正值）
    // 上极板坐标为 -halfGap，下极板为 +halfGap
    if (y <= -halfGap) {
      hitType = 'top'
      hitsPlate = true
      points[points.length - 1].y = -halfGap
      break
    }
    if (y >= halfGap) {
      hitType = 'bottom'
      hitsPlate = true
      points[points.length - 1].y = halfGap
      break
    }
    // 飞出边界检测
    if (x >= L) {
      break
    }
  }

  // 确保极板末点有正确的加速度
  if (points.length > 0) {
    const lastPt = points[points.length - 1]
    let fieldSign = 1
    if (isAC && freq > 0) {
      const T = 1 / freq
      const tStart = phi0 * T
      const phase = ((lastPt.t + tStart) % T) / T
      fieldSign = phase < 0.5 ? 1 : -1
    }
    const E = U / d
    const FE = q * E * fieldSign
    lastPt.ax = 0
    lastPt.ay = (m > 0) ? (FE / m + g) : 0
  }

  const plateExitTime = points[points.length - 1].t
  let screenY: number | null = null

  // 直流且未撞极板时，若开启无场漂移与荧光屏，则继续沿匀速直线（若开重力则含重力）飞至荧光屏
  if (includeDriftScreen && !isAC && !hitsPlate && points[points.length - 1].x >= L && driftLength > 0) {
    const xTarget = L + driftLength
    const driftMaxSteps = 6000
    for (let step = 0; step < driftMaxSteps && x < xTarget; step++) {
      const remainTime = vx > 1e-6 ? (xTarget - x) / vx : dt
      const stepDt = Math.min(dt, remainTime)
      if (stepDt <= 1e-12) break
      const ay = g
      points[points.length - 1].ax = 0
      points[points.length - 1].ay = ay
      t += stepDt
      vy += ay * stepDt
      x += vx * stepDt
      y += vy * stepDt
      points.push({ t, x, y, vx, vy, ax: 0, ay })
    }
    screenY = points[points.length - 1].y
  }

  const lastPoint = points[points.length - 1]

  return {
    points,
    tEnd: lastPoint.t,
    plateExitTime,
    screenY,
    hitType,
    hitsPlate,
    xEnd: lastPoint.x,
    yEnd: lastPoint.y
  }
}

export const CHARGE_EFIELD_PLAY_TIME = {
  dc: 2.5,
  ac: 8.0,
} as const

/**
 * 根据极板电场模式获取目标播放时间。
 *
 * @param isAC 是否交变方形波
 */
export function getChargeInEFieldTargetPlayTime(isAC: boolean): number {
  return isAC ? CHARGE_EFIELD_PLAY_TIME.ac : CHARGE_EFIELD_PLAY_TIME.dc
}

/**
 * 计算动态时间慢放系数 TIME_SCALE，实现"物理参数不变、动画时间动态映射"。
 *
 * @param tEnd 仿真实际终止时间 (s)
 * @param isAC 是否交变方形波
 */
export function getChargeInEFieldTimeScale(tEnd: number, isAC: boolean): number {
  const targetPlayTime = getChargeInEFieldTargetPlayTime(isAC)
  const rawScale = tEnd > 0 ? tEnd / targetPlayTime : 0.001
  return Math.max(1e-6, rawScale)
}

/**
 * 计算非匀强电场（由水平匀强背景电场与一个点电荷叠加而成）中的电势与场强。
 *
 * 注意：这是用于教学可视化的“正则化点电荷模型”。为避免 r→0 时数值发散，
 * 点电荷距离会被限制在最小半径 0.1 m 内；因此近场结果不是严格库仑场。
 * 
 * 物理模型：
 * 空间存在一水平向右的匀强电场 E_base，以及一个固定位置 (xq, yq) 的点电荷 Q。
 * 任意点 (x, y) 的电势为两者之和。
 * 
 * @param x            当前点物理 x 坐标 (m)
 * @param y            当前点物理 y 坐标 (m)
 * @param E_base       匀强电场强度 (V/m)，水平向右
 * @param xq           点电荷物理 x 坐标 (m)
 * @param yq           点电荷物理 y 坐标 (m)
 * @param Q            点电荷电量 (C)
 * @param zeroRef      零势点参考：'infinity' | 'ground'
 * @param x_ref        匀强电场参考 x 坐标 (m)，在此处匀强电场电势为 0
 * @param x_ground     大地参考 x 坐标 (m)
 * @param y_ground     大地参考 y 坐标 (m)
 * @returns phi 电势 (V), Ex/Ey 场强分量 (V/m), E 场强大小 (V/m)，以及正则化标记
 */
export function calculateNonUniformEField(
  x: number,
  y: number,
  E_base: number,
  xq: number,
  yq: number,
  Q: number,
  zeroRef: 'infinity' | 'ground',
  x_ref: number,
  x_ground: number,
  y_ground: number
): { phi: number; Ex: number; Ey: number; E: number; isRegularized: boolean; rEffective: number } {
  const k = COULOMB_CONSTANT
  const MIN_R = 0.1 // 可视化正则化半径：10 cm
  const dx = x - xq
  const dy = y - yq
  const r = Math.sqrt(dx * dx + dy * dy)
  const rClamped = Math.max(MIN_R, r)
  const isRegularized = r < MIN_R

  // 1. 点电荷产生的电势与场强
  const phiPoint = (k * Q) / rClamped
  const EPointX = (k * Q * dx) / (rClamped * rClamped * rClamped)
  const EPointY = (k * Q * dy) / (rClamped * rClamped * rClamped)

  // 2. 匀强电场产生的电势（以 x_ref 为参考点）
  const phiBase = -E_base * (x - x_ref)
  const EBaseX = E_base
  const EBaseY = 0

  // 3. 计算未校正的总电势
  const phiRaw = phiBase + phiPoint

  // 4. 计算合场强（场强为电势梯度的负值，是矢量叠加，不受零势点选择影响）
  const Ex = EBaseX + EPointX
  const Ey = EBaseY + EPointY
  const E = Math.sqrt(Ex * Ex + Ey * Ey)

  // 5. 零势点校正
  let phi = phiRaw
  if (zeroRef === 'ground') {
    const dxGround = x_ground - xq
    const dyGround = y_ground - yq
    const rGround = Math.max(MIN_R, Math.sqrt(dxGround * dxGround + dyGround * dyGround))
    const phiPointGround = (k * Q) / rGround
    const phiBaseGround = -E_base * (x_ground - x_ref)
    const phiGroundRef = phiBaseGround + phiPointGround
    phi = phiRaw - phiGroundRef
  }

  return { phi, Ex, Ey, E, isRegularized, rEffective: rClamped }
}

/**
 * 两个相同金属小球接触带电后的电荷量分配。
 * 高考考点：同种电荷平分，异种电荷先中和再平分。
 * 
 * 公式：q₁' = q₂' = (q₁ + q₂) / 2
 *
 * @param q1 电荷量1 (C)
 * @param q2 电荷量2 (C)
 * @returns 接触分配后的电量 { q1New: number, q2New: number }，单位 C
 */
export function calculateContactCharges(q1: number, q2: number): { q1New: number; q2New: number } {
  const qNew = (q1 + q2) / 2
  return { q1New: qNew, q2New: qNew }
}

/**
 * 求解三个共线自由电荷仅在库仑力作用下同时处于平衡的配置。
 * 高考考点：
 *   1. 两同夹一异：外侧两电荷极性相同，中间电荷极性相反。
 *   2. 两大夹一小：外侧电荷量绝对值大于中间电荷量绝对值。
 *   3. 近小远大：中间电荷靠近绝对值较小的电荷。
 * 
 * 物理公式：
 *   对自由电荷 1、2（距离为 r），若要使引入的电荷 3 在 X 轴上平衡，且使得 1 和 2 也平衡：
 *   - 若 q1 与 q2 同号：
 *     - q3 必在 1、2 之间，距离 q1 的比例为：r13 / r23 = sqrt(|q1| / |q2|)
 *     - q3 电量：q3 = - (q1 * q2) / (sqrt(|q1|) + sqrt(|q2|))^2
 *   - 若 q1 与 q2 异号（且绝对值不相等）：
 *     - q3 必在绝对值较小的一侧外侧。
 *     - 若 |q1| < |q2|，q3 在 q1 外侧。r13 / r23 = sqrt(|q1| / |q2|)，r13 = r * sqrt(|q1|) / (sqrt(|q2|) - sqrt(|q1|))
 *     - q3 电量：q3 = - (q1 * q2) / (sqrt(|q2|) - sqrt(|q1|))^2
 *   - 若 q1 与 q2 异号且绝对值相等：
 *     - 无法实现三体平衡（无解）。
 *
 * @param q1 电荷1电量 (C)
 * @param q2 电荷2电量 (C)
 * @param r  电荷1与电荷2的间距 (m)
 * @returns equilibriumConfig 平衡配置，包括：
 *          q3 达到平衡所需的电量 (C),
 *          r13 电荷3到电荷1的距离 (m)（电荷3在电荷1右侧为正，左侧为负）,
 *          r23 电荷3到电荷2的距离 (m),
 *          valid 是否存在平衡解
 */
export function calculateFreeThreeChargeEquilibrium(
  q1: number,
  q2: number,
  r: number
): {
  q3: number
  r13: number
  r23: number
  valid: boolean
} {
  if (q1 === 0 || q2 === 0) {
    return { q3: 0, r13: r / 2, r23: r / 2, valid: false }
  }

  const absQ1 = Math.abs(q1)
  const absQ2 = Math.abs(q2)
  const sameSign = q1 * q2 > 0

  if (sameSign) {
    // 同号：q3 夹在中间，电性与 q1/q2 相反
    const ratio = Math.sqrt(absQ1) / (Math.sqrt(absQ1) + Math.sqrt(absQ2))
    const r13 = r * ratio
    const r23 = r - r13
    const q3 = -(Math.sign(q1) * Math.abs(q1 * q2)) / Math.pow(Math.sqrt(absQ1) + Math.sqrt(absQ2), 2)
    return { q3, r13, r23, valid: true }
  } else {
    // 异号：q3 在绝对值小的一端的外侧，电性与绝对值较大者相同
    if (Math.abs(absQ1 - absQ2) < 1e-12) {
      // 绝对值相等，无解
      return { q3: 0, r13: 0, r23: 0, valid: false }
    }

    if (absQ1 < absQ2) {
      // q3 在 q1 外侧（即偏离 q2 一侧）
      // 设 q1 在左(0)，q2 在右(r)。q3 在 q1 左侧 (-d13)，电性与 q2 同号
      const ratio = Math.sqrt(absQ1) / (Math.sqrt(absQ2) - Math.sqrt(absQ1))
      const d13 = r * ratio // 实际距离
      const r13 = -d13 // x 坐标偏移
      const r23 = r + d13
      const q3 = (Math.sign(q2) * Math.abs(q1 * q2)) / Math.pow(Math.sqrt(absQ2) - Math.sqrt(absQ1), 2)
      return { q3, r13, r23, valid: true }
    } else {
      // q3 在 q2 外侧
      // 设 q1 在左(0)，q2 在右(r)。q3 在 q2 右侧 (r + d23)，电性与 q1 同号
      const ratio = Math.sqrt(absQ2) / (Math.sqrt(absQ1) - Math.sqrt(absQ2))
      const d23 = r * ratio
      const r13 = r + d23
      const r23 = d23
      const q3 = (Math.sign(q1) * Math.abs(q1 * q2)) / Math.pow(Math.sqrt(absQ1) - Math.sqrt(absQ2), 2)
      return { q3, r13, r23, valid: true }
    }
  }
}

/**
 * 计算单个电荷在固定两电荷库仑力作用下的平衡位置。
 *
 * 物理模型：两个固定电荷 q1、q2 分别位于 x1、x2（x 轴上），
 * 求第三个电荷 q3 的平衡位置 x3，使得 q3 所受合力为零。
 *
 * 使用解析解直接求零场点（避免跨奇点二分法收敛到电荷奇点 x1/x2）。
 *
 * @param q1  电荷1电量 (μC)，含符号
 * @param x1  电荷1位置 (m)
 * @param q2  电荷2电量 (μC)，含符号
 * @param x2  电荷2位置 (m)
 * @param q3  待平衡电荷电量 (μC)，含符号
 * @param minX 搜索区间左边界 (m)
 * @param maxX 搜索区间右边界 (m)
 * @returns x 平衡位置 (m), possible 是否存在平衡解
 *
 * @category M4
 */
export function findEquilibriumX3(
  q1: number, x1: number,
  q2: number, x2: number,
  q3: number,
  minX: number, maxX: number
): { x: number; possible: boolean } {
  const midFallback = (x1 + x2) / 2
  const span = Math.abs(x2 - x1)
  if (q1 === 0 || q2 === 0 || q3 === 0 || span < 1e-12) {
    return { x: midFallback, possible: false }
  }

  const leftIs1 = x1 <= x2
  const qa = leftIs1 ? q1 : q2
  const xa = leftIs1 ? x1 : x2
  const qb = leftIs1 ? q2 : q1
  const xb = leftIs1 ? x2 : x1
  const L = xb - xa
  const sa = Math.sqrt(Math.abs(qa))
  const sb = Math.sqrt(Math.abs(qb))

  let xEq: number
  if (qa * qb > 0) {
    xEq = xa + (L * sa) / (sa + sb)
  } else if (Math.abs(sa - sb) < 1e-12) {
    return { x: midFallback, possible: false }
  } else if (sa < sb) {
    xEq = xa - (L * sa) / (sb - sa)
  } else {
    xEq = xb + (L * sb) / (sa - sb)
  }

  if (xEq < minX || xEq > maxX || !Number.isFinite(xEq)) {
    return { x: midFallback, possible: false }
  }
  return { x: xEq, possible: true }
}

export interface ChargeInEFieldCriticalParams {
  U?: number
  v0?: number
  q?: number
  freq?: number
  isAC?: number
  useGravity?: number
  phi0?: number
  showScreen?: number
}

/**
 * 计算带电粒子在匀强电场（含交变电场）中偏转的关键动画时刻（SSOT）
 * 注意：返回时刻为动画播放轴时间（已按 getChargeInEFieldTimeScale 缩放）
 */
export function getChargeInEFieldCriticalTimes(
  params: ChargeInEFieldCriticalParams = {},
  maxTime = 30,
): CriticalTimePoint[] {
  const U = params.U ?? 150
  const v0 = params.v0 ?? 15
  const q = params.q ?? 2
  const freq = params.freq ?? 30
  const isAC = (params.isAC ?? 0) === 1
  const useGravity = params.useGravity ?? 0
  const phi0 = params.phi0 ?? 0
  const showScreen = (params.showScreen ?? 0) === 1

  const sim = calculateChargeInEFieldTrajectory({
    U,
    d: CHARGE_EFIELD_GEOMETRY.plateGap,
    L: CHARGE_EFIELD_GEOMETRY.plateLength,
    q: q * 1e-6,
    m: CHARGE_EFIELD_GEOMETRY.particleMass,
    v0,
    g: useGravity === 1 ? 9.8 : 0,
    isAC,
    freq,
    phi0,
    includeDriftScreen: showScreen && !isAC,
    driftLength: CHARGE_EFIELD_GEOMETRY.driftLength,
  })

  if (!(sim.tEnd > 0)) return []
  const timeScale = getChargeInEFieldTimeScale(sim.tEnd, isAC)
  const events: CriticalTimePoint[] = []

  if (isAC && freq > 0) {
    const halfT = 1 / (2 * freq)
    const fracInHalf = (phi0 % 0.5) / 0.5
    const tFirstSwitchSim = halfT * (1 - fracInHalf)
    if (tFirstSwitchSim > 0 && tFirstSwitchSim < sim.tEnd * 0.9) {
      const tSwitchPlay = alignCriticalTime(tFirstSwitchSim / timeScale, 'after')
      if (tSwitchPlay > 0.02 && tSwitchPlay <= maxTime) {
        events.push({
          time: tSwitchPlay,
          label: '电场初次反向',
          variant: 'warning',
          autoPause: false,
        })
      }
    }
  }

  if (showScreen && !isAC && !sim.hitsPlate && sim.plateExitTime < sim.tEnd) {
    const tExitPlay = alignCriticalTime(sim.plateExitTime / timeScale, 'nearest')
    if (tExitPlay > 0.02 && tExitPlay < maxTime) {
      events.push({
        time: tExitPlay,
        label: '飞出偏转极板',
        variant: 'info',
        autoPause: false,
      })
    }
  }

  const tEndPlay = alignCriticalTime(sim.tEnd / timeScale, 'before')
  if (tEndPlay > 0 && tEndPlay <= maxTime) {
    const label =
      sim.hitType === 'top'
        ? '撞击上极板'
        : sim.hitType === 'bottom'
          ? '撞击下极板'
          : showScreen && !isAC
            ? '击中荧光屏'
            : '飞出平行板电场'
    events.push({
      time: tEndPlay,
      label,
      variant: 'critical',
      autoPause: true,
    })
  }

  return events.sort((a, b) => a.time - b.time)
}


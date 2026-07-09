/**
 * 霍曼变轨（Hohmann transfer）纯函数库。
 *
 * 单位约定（全文件一致）：
 *  - 长度：米 (m)
 *  - 质量：千克 (kg)
 *  - 时间：秒 (s)
 *  - 速度：米/秒 (m/s)
 *
 * 模型：共面圆₁ → 椭圆₂（近地点 r₁、远地点 r₃）→ 圆₃，双脉冲切向加速。
 *
 * 本文件为纯函数模块，禁止依赖 DOM / React / window（铁律 2）。
 */

import {
  EARTH_MASS,
  EARTH_RADIUS,
  GRAVITATIONAL_CONSTANT,
} from './constants'
import { solveKeplerEquation } from './celestial'

/** 变轨阶段：0 低圆轨，1 转移椭圆，2 高圆轨 */
export type OrbitTransferPhase = 0 | 1 | 2

export interface HohmannParams {
  /** 低轨半径 r₁，单位 m；须 > 0 且 < r3 */
  r1: number
  /** 高轨半径 r₃，单位 m；须 > r1 */
  r3: number
  /** 中心天体质量，单位 kg；默认地球质量 */
  M?: number
  /** 万有引力常量，单位 N·m²/kg² */
  G?: number
}

export interface HohmannElements {
  /** 半长轴 a = (r1+r3)/2，m */
  a: number
  /** 偏心率 e = (r3-r1)/(r3+r1) */
  e: number
  /** 低圆轨速度 v1，m/s */
  v1: number
  /** 高圆轨速度 v3，m/s */
  v3: number
  /** 椭圆近地点速度 vp，m/s */
  vp: number
  /** 椭圆远地点速度 va，m/s */
  va: number
  /** 第一次脉冲 Δv1 = vp − v1，m/s */
  dV1: number
  /** 第二次脉冲 Δv2 = v3 − va，m/s */
  dV2: number
  /** 低圆周期 T1，s */
  T1: number
  /** 转移椭圆周期 T2，s */
  T2: number
  /** 高圆周期 T3，s */
  T3: number
  /** 半转移时间 T2/2，s */
  halfTransferTime: number
}

export interface TransferState {
  /** 位置 x（地心，近地点在 +x），m */
  x: number
  /** 位置 y，m */
  y: number
  /** 地心距 r，m */
  r: number
  /** 速度分量 vx，m/s */
  vx: number
  /** 速度分量 vy，m/s */
  vy: number
  /** 速率 v，m/s */
  v: number
  /** 真近点角，rad（圆轨为极角） */
  trueAnomaly: number
  /** 离心判据 η = v²r/(GM)；圆轨 = 1 */
  eta: number
  phase: OrbitTransferPhase
}

function muOf(p: HohmannParams): number {
  const G = p.G ?? GRAVITATIONAL_CONSTANT
  const M = p.M ?? EARTH_MASS
  return G * M
}

function circularSpeed(mu: number, r: number): number {
  if (r <= 0 || mu <= 0) return 0
  return Math.sqrt(mu / r)
}

function circularPeriod(mu: number, r: number): number {
  if (r <= 0 || mu <= 0) return 0
  return 2 * Math.PI * Math.sqrt((r * r * r) / mu)
}

/**
 * 霍曼轨道要素与双脉冲 Δv。
 * 非法输入（r1≤0 或 r3≤r1）返回全 0。
 */
export function computeHohmannElements(p: HohmannParams): HohmannElements {
  const zero: HohmannElements = {
    a: 0,
    e: 0,
    v1: 0,
    v3: 0,
    vp: 0,
    va: 0,
    dV1: 0,
    dV2: 0,
    T1: 0,
    T2: 0,
    T3: 0,
    halfTransferTime: 0,
  }
  const { r1, r3 } = p
  if (!(r1 > 0) || !(r3 > r1)) return zero

  const mu = muOf(p)
  const a = (r1 + r3) / 2
  const e = (r3 - r1) / (r3 + r1)
  const v1 = circularSpeed(mu, r1)
  const v3 = circularSpeed(mu, r3)
  const vp = Math.sqrt(mu * (2 / r1 - 1 / a))
  const va = Math.sqrt(mu * (2 / r3 - 1 / a))
  const T1 = circularPeriod(mu, r1)
  const T2 = 2 * Math.PI * Math.sqrt((a * a * a) / mu)
  const T3 = circularPeriod(mu, r3)

  return {
    a,
    e,
    v1,
    v3,
    vp,
    va,
    dV1: vp - v1,
    dV2: v3 - va,
    T1,
    T2,
    T3,
    halfTransferTime: T2 / 2,
  }
}

/**
 * 由偏近点角 E 得椭圆（焦点在原点、近地点 +x）的状态。
 * r = a(1 − e cos E)；真近点角 tan(ν/2) 关系用于 ν。
 */
function ellipseStateFromE(
  a: number,
  e: number,
  E: number,
  n: number,
  mu: number,
): Omit<TransferState, 'phase'> {
  const cosE = Math.cos(E)
  const sinE = Math.sin(E)
  const r = a * (1 - e * cosE)
  // 焦点在原点：x = a(cosE − e), y = a√(1−e²) sinE
  const bFactor = Math.sqrt(Math.max(0, 1 - e * e))
  const x = a * (cosE - e)
  const y = a * bFactor * sinE
  // dE/dt = n / (1 − e cos E)
  const dEdt = n / (1 - e * cosE)
  const vx = -a * sinE * dEdt
  const vy = a * bFactor * cosE * dEdt
  const v = Math.sqrt(vx * vx + vy * vy)
  // 真近点角
  const cosNu = (cosE - e) / (1 - e * cosE)
  const sinNu = (bFactor * sinE) / (1 - e * cosE)
  const trueAnomaly = Math.atan2(sinNu, cosNu)
  const eta = mu > 0 && r > 0 ? (v * v * r) / mu : 1
  return { x, y, r, vx, vy, v, trueAnomaly, eta }
}

/**
 * 计算变轨过程中任意教学时刻的飞船状态。
 *
 * @param p 霍曼参数
 * @param phase 当前阶段 0|1|2
 * @param t 全局动画时间 s（store.time）
 * @param tBurn1 第一次点火时刻 s；phase≥1 时有效
 * @param tBurn2 第二次点火时刻 s；phase===2 时有效
 */
export function computeTransferState(
  p: HohmannParams,
  phase: OrbitTransferPhase,
  t: number,
  tBurn1: number,
  tBurn2: number | null,
): TransferState {
  const mu = muOf(p)
  const el = computeHohmannElements(p)
  const empty: TransferState = {
    x: p.r1 || EARTH_RADIUS,
    y: 0,
    r: p.r1 || EARTH_RADIUS,
    vx: 0,
    vy: 0,
    v: 0,
    trueAnomaly: 0,
    eta: 1,
    phase,
  }
  if (el.a <= 0) return empty

  if (phase === 0) {
    // 低圆：从 +x 起算，角速度 ω=v1/r1
    const r = p.r1
    const omega = el.v1 / r
    const theta = omega * Math.max(0, t)
    const x = r * Math.cos(theta)
    const y = r * Math.sin(theta)
    const vx = -el.v1 * Math.sin(theta)
    const vy = el.v1 * Math.cos(theta)
    return {
      x,
      y,
      r,
      vx,
      vy,
      v: el.v1,
      trueAnomaly: theta,
      eta: 1,
      phase: 0,
    }
  }

  if (phase === 1) {
    const tau = Math.max(0, t - tBurn1)
    // 平近点角：近地点点火 E=0
    const n = (2 * Math.PI) / el.T2
    const Mmean = n * tau
    const E = solveKeplerEquation(Mmean, el.e)
    const st = ellipseStateFromE(el.a, el.e, E, n, mu)
    return { ...st, phase: 1 }
  }

  // phase === 2 高圆
  const r = p.r3
  const omega = el.v3 / r
  // 远地点在 −x（真近点角 π），点火后沿圆继续
  const t0 = tBurn2 ?? t
  const tau = Math.max(0, t - t0)
  const theta = Math.PI + omega * tau
  const x = r * Math.cos(theta)
  const y = r * Math.sin(theta)
  const vx = -el.v3 * Math.sin(theta)
  const vy = el.v3 * Math.cos(theta)
  return {
    x,
    y,
    r,
    vx,
    vy,
    v: el.v3,
    trueAnomaly: theta,
    eta: 1,
    phase: 2,
  }
}

/** 是否接近远地点（真近点角 ≈ π） */
export function isNearApoapsis(trueAnomaly: number, tolRad = 0.12): boolean {
  const twoPi = 2 * Math.PI
  let a = trueAnomaly % twoPi
  if (a < 0) a += twoPi
  let diff = Math.abs(a - Math.PI)
  if (diff > Math.PI) diff = twoPi - diff
  return diff <= tolRad
}

/** 是否接近近地点（真近点角 ≈ 0） */
export function isNearPeriapsis(trueAnomaly: number, tolRad = 0.12): boolean {
  const twoPi = 2 * Math.PI
  let a = trueAnomaly % twoPi
  if (a < 0) a += twoPi
  const diff = Math.min(a, twoPi - a)
  return diff <= tolRad
}

/**
 * 采样 v(t) 曲线点（教学用），单位 v: km/s。
 * 简化：phase0 水平 v1；burn 后瞬时 vp；椭圆段用能量关系；burn2 后 v3。
 */
export function sampleTransferSpeedHistory(
  p: HohmannParams,
  phase: OrbitTransferPhase,
  t: number,
  tBurn1: number,
  tBurn2: number | null,
  steps = 80,
): Array<{ t: number; v: number }> {
  const el = computeHohmannElements(p)
  if (el.a <= 0) return []
  const tMax = Math.max(t, 0.01)
  const pts: Array<{ t: number; v: number }> = []
  for (let i = 0; i <= steps; i++) {
    const ti = (tMax * i) / steps
    let ph: OrbitTransferPhase = 0
    if (phase >= 1 && ti >= tBurn1) ph = 1
    if (phase >= 2 && tBurn2 != null && ti >= tBurn2) ph = 2
    // 若尚未 burn，保持 0
    if (phase === 0) ph = 0
    if (phase === 1 && ti < tBurn1) ph = 0
    if (phase === 2) {
      if (tBurn2 != null && ti >= tBurn2) ph = 2
      else if (ti >= tBurn1) ph = 1
      else ph = 0
    }
    const st = computeTransferState(p, ph, ti, tBurn1, tBurn2)
    pts.push({ t: ti, v: st.v / 1000 })
  }
  return pts
}

/** UI 默认：r 以 10⁶ m 为单位时的换算 */
export function megaMetersToMeters(rMm: number): number {
  return rMm * 1e6
}

export function metersToMegaMeters(r: number): number {
  return r / 1e6
}

export { EARTH_MASS, EARTH_RADIUS, GRAVITATIONAL_CONSTANT }
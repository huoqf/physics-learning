/**
 * 双星与等边三角形三星系统 — 纯物理计算模块（真实 SI 单位，单一真源）。
 *
 * 物理层级遵循铁律 2：零 React / DOM / window 依赖，纯函数可序列化。
 *
 * @module physics/multiStar
 */
import { GRAVITATIONAL_CONSTANT, SOLAR_MASS, SECONDS_PER_DAY } from './constants'
import { finalizeCriticalPoints } from '@/utils/criticalTime'
import type { CriticalTimePoint } from '@/data/types'

/** 双星/三星滑块间距单位：10¹⁰ m */
export const MULTI_STAR_DISTANCE_UNIT_M = 1e10
/** 演示时间换算倍率：1 动画秒对应 5 天物理轨道时间 */
export const MULTI_STAR_DAYS_PER_ANIM_SEC = 5
/** 演示时间换算倍率 (物理秒 / 动画秒) */
export const MULTI_STAR_TIME_SCALE = MULTI_STAR_DAYS_PER_ANIM_SEC * SECONDS_PER_DAY

/** 双星系统默认总质量 (M☉) */
export const BINARY_STARS_DEFAULT_TOTAL_MASS_SOLAR = 10.0
/** 三星系统默认单星质量 (M☉) */
export const TRIPLE_STARS_DEFAULT_MASS_SOLAR = 5.0

/** 双星系统默认总质量 (kg) */
export const BINARY_STARS_DEFAULT_TOTAL_MASS = BINARY_STARS_DEFAULT_TOTAL_MASS_SOLAR * SOLAR_MASS
/** 三星系统默认单星质量 (kg) */
export const TRIPLE_STARS_DEFAULT_MASS = TRIPLE_STARS_DEFAULT_MASS_SOLAR * SOLAR_MASS

/** 双星/三星默认参数（L 单位 ×10¹⁰ m，与注册表、看板、场景全链路统一） */
export const MULTI_STAR_DEFAULT_PARAMS = {
  L: 8.0,
  massRatio: 1.0,
  mode: 0,
} as const

/** 二维物理矢量（m / m·s⁻¹ / N / 无量纲方向） */
export interface CelestialVec2 {
  x: number
  y: number
}

/**
 * 计算双星系统的质量、轨道半径、线速度、周期与向心力（统一使用真实 SI 单位）。
 *
 * @param L 双星间距 (m)
 * @param massRatio 质量比 m1/m2
 * @param G 万有引力常量 (N·m²/kg²)，默认 `GRAVITATIONAL_CONSTANT`
 * @param totalMass 双星系统总质量 (kg)，默认 10 M☉
 */
export function calculateBinaryStars(
  L: number,
  massRatio: number,
  G: number = GRAVITATIONAL_CONSTANT,
  totalMass: number = BINARY_STARS_DEFAULT_TOTAL_MASS,
): {
  m1: number
  m2: number
  r1: number
  r2: number
  v1: number
  v2: number
  omega: number
  T: number
  F: number
  a1: number
  a2: number
} {
  const m1 = (totalMass * massRatio) / (1 + massRatio)
  const m2 = totalMass / (1 + massRatio)

  // 质心分配半径：r1/r2 = m2/m1 -> r1 + r2 = L
  const r1 = L / (1 + massRatio)
  const r2 = (L * massRatio) / (1 + massRatio)

  // omega^2 = G * (m1 + m2) / L^3
  const omega = Math.sqrt((G * totalMass) / Math.pow(L, 3))
  const T = (2 * Math.PI) / omega

  const v1 = omega * r1
  const v2 = omega * r2

  // 万有引力提供各自向心力（两星向心力大小相等）
  const F = (G * m1 * m2) / (L * L)
  const a1 = m1 > 0 ? F / m1 : 0
  const a2 = m2 > 0 ? F / m2 : 0

  return { m1, m2, r1, r2, v1, v2, omega, T, F, a1, a2 }
}

/**
 * 计算等边三角形三星系统的轨道半径、合向心力、分引力、向心加速度、线速度及周期（统一 SI）。
 *
 * 适用条件：三颗星质量严格相等、初始构成等边三角形且仅受相互万有引力作用、
 * 绕三角形几何中心做稳定的共面匀速圆周运动。
 *
 * @param L 三星之间的距离 (等边三角形边长) (m)
 * @param G 万有引力常量 (N·m²/kg²)，默认 `GRAVITATIONAL_CONSTANT`
 * @param starMass 单个星体质量 (kg)，默认 5 M☉
 */
export function calculateTripleStars(
  L: number,
  G: number = GRAVITATIONAL_CONSTANT,
  starMass: number = TRIPLE_STARS_DEFAULT_MASS,
): {
  r: number
  fNet: number
  fPair: number
  a: number
  v: number
  omega: number
  T: number
} {
  // 轨道半径：r = L / (2 * cos(30°)) = L / √3
  const r = L / Math.sqrt(3)

  // 两颗星之间的分引力大小 F0 = G * m^2 / L^2
  const fPair = (G * starMass * starMass) / (L * L)

  // 每颗星受另外两颗星的引力夹角为 60°，合力 F_net = √3 * G * m^2 / L^2
  const fNet = Math.sqrt(3) * fPair
  const a = starMass > 0 ? fNet / starMass : 0

  // 合引力等于向心力：F_net = m * omega^2 * r -> omega = √(3 * G * m / L^3)
  const omega = Math.sqrt((3 * G * starMass) / Math.pow(L, 3))
  const T = (2 * Math.PI) / omega
  const v = omega * r

  return { r, fNet, fPair, a, v, omega, T }
}

/** 双星系统在物理时刻 t 的完整状态（单一真源，场景、曲线与游标共用） */
export interface BinaryStarsPhysicalState {
  m1: number
  m2: number
  r1: number
  r2: number
  v1: number
  v2: number
  omega: number
  T: number
  F: number
  a1: number
  a2: number
  theta: number
  pos1: CelestialVec2
  pos2: CelestialVec2
  vel1: CelestialVec2
  vel2: CelestialVec2
  forceDir1: CelestialVec2
  forceDir2: CelestialVec2
  forceVec1: CelestialVec2
  forceVec2: CelestialVec2
}

/**
 * 求解双星系统在给定物理时刻 tPhys (s) 的位置、速度与引力状态。
 */
export function evaluateBinaryStarsState(
  L: number,
  massRatio: number,
  tPhys: number,
  G: number = GRAVITATIONAL_CONSTANT,
  totalMass: number = BINARY_STARS_DEFAULT_TOTAL_MASS,
): BinaryStarsPhysicalState {
  const base = calculateBinaryStars(L, massRatio, G, totalMass)
  const theta = base.omega * tPhys
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)

  const pos1 = { x: base.r1 * cos, y: base.r1 * sin }
  const pos2 = { x: -base.r2 * cos, y: -base.r2 * sin }

  const vel1 = { x: -base.v1 * sin, y: base.v1 * cos }
  const vel2 = { x: base.v2 * sin, y: -base.v2 * cos }

  const forceDir1 = { x: -cos, y: -sin }
  const forceDir2 = { x: cos, y: sin }

  const forceVec1 = { x: -base.F * cos, y: -base.F * sin }
  const forceVec2 = { x: base.F * cos, y: base.F * sin }

  return {
    ...base,
    theta,
    pos1,
    pos2,
    vel1,
    vel2,
    forceDir1,
    forceDir2,
    forceVec1,
    forceVec2,
  }
}

/** 三星系统在物理时刻 t 的完整状态（单一真源，场景、曲线与游标共用） */
export interface TripleStarsPhysicalState {
  starMass: number
  r: number
  fNet: number
  fPair: number
  a: number
  v: number
  omega: number
  T: number
  theta: number
  pos1: CelestialVec2
  pos2: CelestialVec2
  pos3: CelestialVec2
  vel1: CelestialVec2
  vel2: CelestialVec2
  vel3: CelestialVec2
  forceNetDir1: CelestialVec2
  forceNetDir2: CelestialVec2
  forceNetDir3: CelestialVec2
  forceNetVec1: CelestialVec2
  forceNetVec2: CelestialVec2
  forceNetVec3: CelestialVec2
  force12Dir: CelestialVec2
  force13Dir: CelestialVec2
  force12Vec: CelestialVec2
  force13Vec: CelestialVec2
}

/**
 * 求解等边三角形三星系统在给定物理时刻 tPhys (s) 的位置、速度与分/合引力状态。
 */
export function evaluateTripleStarsState(
  L: number,
  tPhys: number,
  G: number = GRAVITATIONAL_CONSTANT,
  starMass: number = TRIPLE_STARS_DEFAULT_MASS,
): TripleStarsPhysicalState {
  const base = calculateTripleStars(L, G, starMass)
  const theta = base.omega * tPhys

  const theta1 = theta
  const theta2 = theta + (2 * Math.PI) / 3
  const theta3 = theta + (4 * Math.PI) / 3

  const c1 = Math.cos(theta1)
  const s1 = Math.sin(theta1)
  const c2 = Math.cos(theta2)
  const s2 = Math.sin(theta2)
  const c3 = Math.cos(theta3)
  const s3 = Math.sin(theta3)

  const pos1 = { x: base.r * c1, y: base.r * s1 }
  const pos2 = { x: base.r * c2, y: base.r * s2 }
  const pos3 = { x: base.r * c3, y: base.r * s3 }

  const vel1 = { x: -base.v * s1, y: base.v * c1 }
  const vel2 = { x: -base.v * s2, y: base.v * c2 }
  const vel3 = { x: -base.v * s3, y: base.v * c3 }

  const forceNetDir1 = { x: -c1, y: -s1 }
  const forceNetDir2 = { x: -c2, y: -s2 }
  const forceNetDir3 = { x: -c3, y: -s3 }

  const forceNetVec1 = { x: -base.fNet * c1, y: -base.fNet * s1 }
  const forceNetVec2 = { x: -base.fNet * c2, y: -base.fNet * s2 }
  const forceNetVec3 = { x: -base.fNet * c3, y: -base.fNet * s3 }

  const dx12 = pos2.x - pos1.x
  const dy12 = pos2.y - pos1.y
  const len12 = Math.hypot(dx12, dy12) || 1
  const force12Dir = { x: dx12 / len12, y: dy12 / len12 }

  const dx13 = pos3.x - pos1.x
  const dy13 = pos3.y - pos1.y
  const len13 = Math.hypot(dx13, dy13) || 1
  const force13Dir = { x: dx13 / len13, y: dy13 / len13 }

  const force12Vec = { x: force12Dir.x * base.fPair, y: force12Dir.y * base.fPair }
  const force13Vec = { x: force13Dir.x * base.fPair, y: force13Dir.y * base.fPair }

  return {
    starMass,
    ...base,
    theta,
    pos1,
    pos2,
    pos3,
    vel1,
    vel2,
    vel3,
    forceNetDir1,
    forceNetDir2,
    forceNetDir3,
    forceNetVec1,
    forceNetVec2,
    forceNetVec3,
    force12Dir,
    force13Dir,
    force12Vec,
    force13Vec,
  }
}

/**
 * 派生多星演示单个完整周期对应的动画时长 (s)：
 * 保证每次循环播放恰好走完 1 个完整轨道周期 T。
 */
export function multiStarMaxAnimTime(params: Record<string, number>): number {
  const mode = params.mode ?? MULTI_STAR_DEFAULT_PARAMS.mode
  const L = (params.L ?? MULTI_STAR_DEFAULT_PARAMS.L) * MULTI_STAR_DISTANCE_UNIT_M
  const massRatio = params.massRatio ?? MULTI_STAR_DEFAULT_PARAMS.massRatio
  const T = mode === 1
    ? calculateTripleStars(L).T
    : calculateBinaryStars(L, massRatio).T
  return T / MULTI_STAR_TIME_SCALE
}

/** 多星质心系 x 投影图表采样点（展示单位：d, ×10¹⁰ m, km/s） */
export interface MultiStarChartSample {
  tDays: number
  x1: number
  x2: number
  x3?: number
  vx1: number
  vx2: number
  vx3?: number
}

/**
 * 采样双星系统一个完整周期的质心系 x 轴投影（直接复用 `evaluateBinaryStarsState`）。
 */
export function sampleBinaryStarsCurves(
  L: number,
  massRatio: number,
  sampleCount = 80,
  G: number = GRAVITATIONAL_CONSTANT,
  totalMass: number = BINARY_STARS_DEFAULT_TOTAL_MASS,
): MultiStarChartSample[] {
  const { T } = calculateBinaryStars(L, massRatio, G, totalMass)
  const n = Math.max(1, Math.floor(sampleCount))
  const out: MultiStarChartSample[] = []
  for (let k = 0; k <= n; k++) {
    const tPhys = (T * k) / n
    const s = evaluateBinaryStarsState(L, massRatio, tPhys, G, totalMass)
    out.push({
      tDays: tPhys / SECONDS_PER_DAY,
      x1: s.pos1.x / MULTI_STAR_DISTANCE_UNIT_M,
      x2: s.pos2.x / MULTI_STAR_DISTANCE_UNIT_M,
      vx1: s.vel1.x / 1000,
      vx2: s.vel2.x / 1000,
    })
  }
  return out
}

/**
 * 采样三星系统一个完整周期的质心系 x 轴投影（直接复用 `evaluateTripleStarsState`）。
 */
export function sampleTripleStarsCurves(
  L: number,
  sampleCount = 80,
  G: number = GRAVITATIONAL_CONSTANT,
  starMass: number = TRIPLE_STARS_DEFAULT_MASS,
): MultiStarChartSample[] {
  const { T } = calculateTripleStars(L, G, starMass)
  const n = Math.max(1, Math.floor(sampleCount))
  const out: MultiStarChartSample[] = []
  for (let k = 0; k <= n; k++) {
    const tPhys = (T * k) / n
    const s = evaluateTripleStarsState(L, tPhys, G, starMass)
    out.push({
      tDays: tPhys / SECONDS_PER_DAY,
      x1: s.pos1.x / MULTI_STAR_DISTANCE_UNIT_M,
      x2: s.pos2.x / MULTI_STAR_DISTANCE_UNIT_M,
      x3: s.pos3.x / MULTI_STAR_DISTANCE_UNIT_M,
      vx1: s.vel1.x / 1000,
      vx2: s.vel2.x / 1000,
      vx3: s.vel3.x / 1000,
    })
  }
  return out
}

/**
 * 双星 / 三星系统参数的可调范围（**单一真源**）。
 */
export const CELESTIAL_MULTI_STAR_RANGES = {
  /** 双星总距离 L / 三星等边三角形边长 (×10¹⁰ m) */
  L: { min: 4.0, max: 10.0 },
  /** 双星质量比 m₁:m₂ */
  massRatio: { min: 0.2, max: 5.0 },
} as const

/** 坐标轴余量：曲线峰值与画框之间留出的空白比例 */
const MULTI_STAR_CHART_PAD = 1.25

const roundUpTo = (value: number, step: number) => Math.ceil(value / step) * step

/**
 * 多星系统 x-t / v_x-t 图表的**固定**坐标轴量程（展示单位：d、×10¹⁰ m、km/s）。
 */
export interface MultiStarChartBounds {
  /** 横轴固定时间上限 (d)：参数量程内最长的周期 */
  TMax: number
  /** x-t 图纵轴半量程 (×10¹⁰ m)：参数量程内最大的轨道半径 × 余量 */
  rMax: number
  /** v_x-t 图纵轴半量程 (km/s)：参数量程内最大的线速度 × 余量 */
  vMax: number
}

/**
 * 计算 {@link MultiStarChartBounds}。
 */
export function calculateMultiStarChartBounds(): MultiStarChartBounds {
  const { L, massRatio } = CELESTIAL_MULTI_STAR_RANGES
  let TMaxDays = 0
  let rPeakUnit = 0
  let vPeakKmS = 0

  for (const l of [L.min, L.max]) {
    const lMeters = l * MULTI_STAR_DISTANCE_UNIT_M
    for (const ratio of [massRatio.min, massRatio.max]) {
      const binary = calculateBinaryStars(lMeters, ratio)
      TMaxDays = Math.max(TMaxDays, binary.T / SECONDS_PER_DAY)
      rPeakUnit = Math.max(
        rPeakUnit,
        binary.r1 / MULTI_STAR_DISTANCE_UNIT_M,
        binary.r2 / MULTI_STAR_DISTANCE_UNIT_M,
      )
      vPeakKmS = Math.max(vPeakKmS, binary.v1 / 1000, binary.v2 / 1000)
    }
    const triple = calculateTripleStars(lMeters)
    TMaxDays = Math.max(TMaxDays, triple.T / SECONDS_PER_DAY)
    rPeakUnit = Math.max(rPeakUnit, triple.r / MULTI_STAR_DISTANCE_UNIT_M)
    vPeakKmS = Math.max(vPeakKmS, triple.v / 1000)
  }

  return {
    TMax: roundUpTo(TMaxDays, 4),
    rMax: roundUpTo(rPeakUnit * MULTI_STAR_CHART_PAD, 2),
    vMax: roundUpTo(vPeakKmS * MULTI_STAR_CHART_PAD, 20),
  }
}

/** 图表固定量程（参数域恒定，故在模块加载时算一次即可） */
export const MULTI_STAR_CHART_BOUNDS: Readonly<MultiStarChartBounds> =
  calculateMultiStarChartBounds()

/** 双星/三星系统（anim-binary-stars）半周期参考临界点 */
export function getBinaryStarsCriticalTimes(
  params: Record<string, number>,
): CriticalTimePoint[] {
  const L = (params.L ?? MULTI_STAR_DEFAULT_PARAMS.L) * MULTI_STAR_DISTANCE_UNIT_M
  const mode = params.mode ?? MULTI_STAR_DEFAULT_PARAMS.mode
  const massRatio = params.massRatio ?? MULTI_STAR_DEFAULT_PARAMS.massRatio
  const periodSec =
    mode === 1 ? calculateTripleStars(L).T : calculateBinaryStars(L, massRatio).T
  const maxAnimTime = periodSec / MULTI_STAR_TIME_SCALE
  if (!Number.isFinite(maxAnimTime) || maxAnimTime <= 0) return []
  return finalizeCriticalPoints(
    [
      { rawTime: maxAnimTime / 2, align: 'nearest', label: '半个轨道周期 (T/2 反相)', variant: 'info', autoPause: false },
      { rawTime: maxAnimTime, align: 'nearest', label: '完成 1 个公转周期 T', variant: 'info', autoPause: false },
    ],
    maxAnimTime,
  )
}

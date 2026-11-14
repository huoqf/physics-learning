/**
 * 探究加速度与力、质量的关系（牛顿第二定律实验）—— 纯物理计算模块
 *
 * 单一可信源（SSOT）：
 *   中屏场景（ExperimentNewtonSecondAnimation）与右屏看板（experiment-newton-second）共用本模块，
 *   并与 `@/physics/experimentMechanics` 的长木板运动学及纸带打点公式保持同源。
 *
 * 单位约定：质量 M, m (kg)、力 F, T (N)、加速度 a (m/s²)、位移 x (m)、时间 t (s)。
 */

import { GRAVITY } from './constants'
import { finalizeCriticalPoints } from '@/utils/criticalTime'
import type { CriticalTimePoint } from '@/data/types'
import {
  buildTapeCountingDots,
  calcDiffMethodAcceleration,
  COUNT_INTERVAL,
  countingPeriod,
  DIFF_METHOD_MIN_DOTS,
  solveTrackMotion,
  tickerPeriod,
  timeToReach,
} from './experimentMechanics'

/** 牛二实验长木板有效行程 (m) */
export const NEWTON_TRACK_MAX_M = 1.2

/** 摩擦力未平衡或平衡过度时的等效残留/额外阻力系数（相对于小车重力 Mg） */
export const RESIDUAL_FRICTION_RATIO = 0.04

/** 摩擦力调节状态：0=恰好平衡 | 1=未平衡（轨道水平） | 2=平衡过度（倾角过大） */
export type BalanceFrictionMode = 0 | 1 | 2

/** 探究模式：0=探究 a 与 F 关系（定 M） | 1=探究 a 与 1/M 关系（定 m） */
export type NewtonSecondMode = 0 | 1

export const NEWTON_SECOND_DEFAULTS = {
  mode: 0 as NewtonSecondMode,
  M_cart: 0.4,
  m_hook: 0.05,
  balanceMode: 0 as BalanceFrictionMode,
  freq: 50,
} as const

export interface NewtonSecondInput {
  mode?: number
  M_cart?: number
  m_hook?: number
  balanceMode?: number
  freq?: number
}

export interface NewtonSecondResult {
  mode: NewtonSecondMode
  M_cart: number
  m_hook: number
  balanceMode: BalanceFrictionMode
  freq: number
  /** 槽码质量与小车质量之比 m / M */
  massRatio: number
  /** 以槽码重力近似代替小车合力 F_approx = m * g (N) */
  F_approx: number
  /** 理想无系统误差理论加速度 a_ideal = F_approx / M (m/s²) */
  a_ideal: number
  /** 考虑连接体与摩擦平衡偏差后的真实系统加速度 a_real (m/s²) */
  a_real: number
  /** 细绳真实张力 T (N) */
  tension: number
  /** 真实拉力相对近似值 mg 的百分比 T / (mg) * 100 (%) */
  tensionRatioPercent: number
  /** 木板等效倾角演示值（度） */
  inclineDeg: number
  /** 线性拟合斜率偏离程度或启动阈值力 */
  fThreshold: number
}

/**
 * 求解单组参数下系统的动力学状态（纯物理闭式解）
 */
export function computeNewtonSecondState(
  input: NewtonSecondInput = {},
): NewtonSecondResult {
  const mode = (Number(input.mode) === 1 ? 1 : 0) as NewtonSecondMode
  const M_cart = Math.max(0.1, Number.isFinite(Number(input.M_cart)) ? Number(input.M_cart) : NEWTON_SECOND_DEFAULTS.M_cart)
  const m_hook = Math.max(0, Number.isFinite(Number(input.m_hook)) ? Number(input.m_hook) : NEWTON_SECOND_DEFAULTS.m_hook)
  const rawBalance = Number(input.balanceMode ?? NEWTON_SECOND_DEFAULTS.balanceMode)
  const balanceMode = (rawBalance === 1 || rawBalance === 2 ? rawBalance : 0) as BalanceFrictionMode
  const freq = Math.max(10, Number.isFinite(Number(input.freq)) ? Number(input.freq) : NEWTON_SECOND_DEFAULTS.freq)

  const F_approx = m_hook * GRAVITY
  const a_ideal = F_approx / M_cart
  const massRatio = m_hook / M_cart
  const fThreshold = RESIDUAL_FRICTION_RATIO * M_cart * GRAVITY

  let netDrive = F_approx
  let inclineDeg = 2.3 // 恰好平衡阻力时的微倾角示意 (arcsin μ)

  if (balanceMode === 1) {
    // 未平衡摩擦力：木板水平，须克服静/动摩擦力 f0
    netDrive = Math.max(0, F_approx - fThreshold)
    inclineDeg = 0
  } else if (balanceMode === 2) {
    // 平衡过度：倾角过大，下滑分力超过阻力产生额外净驱动力
    netDrive = F_approx + fThreshold
    inclineDeg = 5.0
  }

  const totalMass = M_cart + m_hook
  const a_real = totalMass > 0 ? netDrive / totalMass : 0
  // 细绳真实张力由槽码牛顿第二定律给出：m*g - T = m * a_real => T = m*(g - a_real)
  const tension = m_hook > 0 ? Math.max(0, m_hook * (GRAVITY - a_real)) : 0
  const tensionRatioPercent = F_approx > 1e-9 ? (tension / F_approx) * 100 : 100

  return {
    mode,
    M_cart,
    m_hook,
    balanceMode,
    freq,
    massRatio,
    F_approx,
    a_ideal,
    a_real,
    tension,
    tensionRatioPercent,
    inclineDeg,
    fThreshold,
  }
}

export interface NewtonCurvePoint {
  x: number
  y: number
}

export interface NewtonSecondCurves {
  /** 实测曲线点集 (考虑 m 与 M 的质量比以及摩擦平衡状态) */
  measuredPoints: NewtonCurvePoint[]
  /** 理想理论比例直线点集（过原点线性关系 a = F/M 或 a = F*(1/M)） */
  idealPoints: NewtonCurvePoint[]
  xDomain: [number, number]
  yDomain: [number, number]
  cursorX: number
}

/**
 * 生成 a-F（mode=0）或 a-1/M（mode=1）图像拟合曲线与理论参考线
 */
export function buildNewtonSecondCurves(
  input: NewtonSecondInput = {},
): NewtonSecondCurves {
  const cur = computeNewtonSecondState(input)
  const samples = 24

  if (cur.mode === 0) {
    // 横轴为 F_approx = m * g，采样范围覆盖 0 ~ max(3.0 N, cur.F_approx * 1.15)
    const maxF = Math.max(3.0, cur.F_approx * 1.15)
    const measuredPoints: NewtonCurvePoint[] = []
    const idealPoints: NewtonCurvePoint[] = []

    for (let i = 0; i <= samples; i++) {
      const fVal = (i / samples) * maxF
      const mVal = fVal / GRAVITY
      const st = computeNewtonSecondState({
        mode: 0,
        M_cart: cur.M_cart,
        m_hook: mVal,
        balanceMode: cur.balanceMode,
      })
      measuredPoints.push({ x: fVal, y: st.a_real })
      idealPoints.push({ x: fVal, y: fVal / cur.M_cart })
    }

    const maxY = Math.max(
      1.0,
      ...measuredPoints.map((p) => p.y),
      ...idealPoints.map((p) => p.y),
    )

    return {
      measuredPoints,
      idealPoints,
      xDomain: [0, maxF],
      yDomain: [0, maxY * 1.1],
      cursorX: cur.F_approx,
    }
  }

  // mode === 1：探究 a 与 1/M 关系，横轴 invM ∈ [0, 5.0] kg⁻¹
  const maxInvM = Math.max(5.0, (1 / cur.M_cart) * 1.2)
  const measuredPoints: NewtonCurvePoint[] = []
  const idealPoints: NewtonCurvePoint[] = []

  for (let i = 0; i <= samples; i++) {
    const invM = (i / samples) * maxInvM
    if (invM < 1e-4) {
      // M → ∞ 时真实加速度趋近于 0（若平衡过度则仍保留残留加速度 (fThreshold/M)=0.04g）
      const residualA =
        cur.balanceMode === 2 ? RESIDUAL_FRICTION_RATIO * GRAVITY : 0
      measuredPoints.push({ x: 0, y: residualA })
      idealPoints.push({ x: 0, y: 0 })
      continue
    }
    const mCart = 1 / invM
    const st = computeNewtonSecondState({
      mode: 1,
      M_cart: mCart,
      m_hook: cur.m_hook,
      balanceMode: cur.balanceMode,
    })
    measuredPoints.push({ x: invM, y: st.a_real })
    idealPoints.push({ x: invM, y: cur.F_approx * invM })
  }

  const maxY = Math.max(
    1.0,
    ...measuredPoints.map((p) => p.y),
    ...idealPoints.map((p) => p.y),
  )

  return {
    measuredPoints,
    idealPoints,
    xDomain: [0, maxInvM],
    yDomain: [0, maxY * 1.1],
    cursorX: 1 / cur.M_cart,
  }
}

export interface NewtonTrackTapeResult {
  x: number
  v: number
  tEnd: number
  tActive: number
  reachedEnd: boolean
  tickerPeriodS: number
  countingPeriodS: number
  tapeDots: number[]
  aCalculated: number | null
}

/**
 * 求解实时小车轨道运动与纸带打点结果（直接复用 experimentMechanics 同源函数）
 */
export function computeNewtonSecondMotion(
  a_real: number,
  time: number,
  pxPerMeter: number,
  freq: number = NEWTON_SECOND_DEFAULTS.freq,
): NewtonTrackTapeResult {
  const motion = solveTrackMotion({
    v0: 0,
    a: a_real,
    time,
    xMax: NEWTON_TRACK_MAX_M,
  })
  const tapeDots = buildTapeCountingDots({
    v0: 0,
    a: a_real,
    time,
    freq,
    countInterval: COUNT_INTERVAL,
    pxPerMeter,
    xMax: NEWTON_TRACK_MAX_M,
  })
  const countingPeriodS = countingPeriod(freq, COUNT_INTERVAL)
  const aCalculated = calcDiffMethodAcceleration(tapeDots, pxPerMeter, countingPeriodS)

  return {
    ...motion,
    tickerPeriodS: tickerPeriod(freq),
    countingPeriodS,
    tapeDots,
    aCalculated: aCalculated === null ? null : parseFloat(aCalculated.toFixed(3)),
  }
}

/**
 * 探究加速度与力、质量的关系（anim-experiment-newton-second）临界时刻。
 */
export function getExperimentNewtonSecondCriticalTimes(
  params: Record<string, number>,
  maxTime = 30,
): CriticalTimePoint[] {
  const st = computeNewtonSecondState(params)
  if (!(st.a_real > 1e-9)) return []

  const tEnd = timeToReach(0, st.a_real, NEWTON_TRACK_MAX_M)
  const tDiffReady = (DIFF_METHOD_MIN_DOTS - 1) * countingPeriod(st.freq, COUNT_INTERVAL)
  const raw: Array<{
    rawTime: number
    align: 'before' | 'after'
    label: string
    variant: 'critical' | 'info'
    autoPause: boolean
  }> = []

  if (tDiffReady > 0 && tDiffReady < tEnd) {
    raw.push({
      rawTime: tDiffReady,
      align: 'after',
      label: '逐差法 7 点纸带采集完成',
      variant: 'info',
      autoPause: false,
    })
  }
  if (Number.isFinite(tEnd) && tEnd > 0) {
    raw.push({
      rawTime: tEnd,
      align: 'before',
      label: '⚡ 小车抵达轨道末端挡块',
      variant: 'critical',
      autoPause: true,
    })
  }
  return finalizeCriticalPoints(raw, maxTime)
}

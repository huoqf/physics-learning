import { GRAVITY } from './constants'
import { PX_PER_METER } from '@/utils/coordinate'
import { alignCriticalTime } from '@/utils/criticalTime'
import type { CriticalTimePoint } from '@/data/types'

/** 动量守恒碰撞动画场景几何基准（设计宽度 840，供组件与关键点计算共源） */
export const MC_SCENE_DEFAULTS = {
  designWidth: 840,
  ballBaseRadius: 16,
  massRadiusScale: 2,
  initAxRatio: 0.28,
  initBxRatio: 0.58,
  g: 9.8,
} as const

/**
 * src/physics/momentumConservation.ts
 * 动量守恒定律（Law of Conservation of Momentum）纯物理计算模块
 *
 * 所有函数均为纯函数，无副作用，无 React/DOM/window 依赖。
 * 单位制：SI（kg, m, m/s, N, s, J）
 */

// ─── 基础模式：两球碰撞 ──────────────────────────────────────────────────

/**
 * 计算完全非弹性碰撞后速度（两球碰后粘合）
 * v' = (m1·v1 + m2·v2) / (m1 + m2)
 *
 * @param m1 A球质量 (kg)
 * @param v1 A球碰前速度 (m/s)
 * @param m2 B球质量 (kg)
 * @param v2 B球碰前速度 (m/s)
 * @returns v_after 碰后共同速度 (m/s)
 */
export function perfectlyInelasticCollision(
  m1: number, v1: number, m2: number, v2: number
): number {
  return (m1 * v1 + m2 * v2) / (m1 + m2)
}

/**
 * 计算碰撞前系统总动量
 * p_total = m1·v1 + m2·v2
 *
 * @param m1 A球质量 (kg)
 * @param v1 A球速度 (m/s)
 * @param m2 B球质量 (kg)
 * @param v2 B球速度 (m/s)
 * @returns p_total 系统总动量 (kg·m/s)
 */
export function calculateSystemMomentum(
  m1: number, v1: number, m2: number, v2: number
): number {
  return m1 * v1 + m2 * v2
}

/**
 * 计算 1D 碰撞碰后速度（含恢复系数 e）
 * v₁' = ((m₁ - e·m₂)·v₁ + m₂·(1+e)·v₂) / (m₁+m₂)
 * v₂' = (m₁·(1+e)·v₁ + (m₂ - e·m₁)·v₂) / (m₁+m₂)
 *
 * e = 1 → 完全弹性碰撞
 * e = 0 → 完全非弹性碰撞（碰后同速）
 * 0 < e < 1 → 一般非弹性碰撞
 *
 * @param m1 物体1质量 (kg)
 * @param v1 物体1碰前速度 (m/s)
 * @param m2 物体2质量 (kg)
 * @param v2 物体2碰前速度 (m/s)
 * @param e 恢复系数 [0, 1]，默认 1
 * @returns { v1After, v2After } 碰后速度 (m/s)
 */
export function calculateCollisionVelocities(
  m1: number, v1: number, m2: number, v2: number, e: number = 1
): { v1After: number; v2After: number } {
  const totalMass = m1 + m2
  const v1After = ((m1 - e * m2) * v1 + m2 * (1 + e) * v2) / totalMass
  const v2After = (m1 * (1 + e) * v1 + (m2 - e * m1) * v2) / totalMass
  return { v1After, v2After }
}

// ─── 进阶模式：滑块-木板模型 ──────────────────────────────────────────────

/**
 * 计算滑块-木板系统的共同速度
 * v_共 = m·v0 / (m + M)
 *
 * @param m 滑块质量 (kg)
 * @param v0 滑块初速度 (m/s)
 * @param M 木板质量 (kg)
 * @returns v_common 共同速度 (m/s)
 */
export function calculateCommonVelocity(m: number, v0: number, M: number): number {
  return (m * v0) / (m + M)
}

/**
 * 计算达到共速的时间
 * t = M·v_共 / (μ·m·g)
 *
 * @param M 木板质量 (kg)
 * @param vCommon 共同速度 (m/s)
 * @param mu 动摩擦因数
 * @param m 滑块质量 (kg)
 * @param g 重力加速度 (m/s²)，默认 9.8
 * @returns t 共速时间 (s)
 */
export function calculateCommonVelocityTime(
  M: number, vCommon: number, mu: number, m: number, g: number = GRAVITY
): number {
  const frictionForce = mu * m * g
  if (frictionForce <= 0) return Infinity
  return (M * vCommon) / frictionForce
}

/**
 * 计算滑块位移；传入 m/M 时自动在共速后转为共同匀速
 * x1 = v0·t - 0.5·μ·g·t²
 *
 * @param v0 滑块初速度 (m/s)
 * @param mu 动摩擦因数
 * @param t 时间 (s)
 * @param g 重力加速度 (m/s²)，默认 9.8
 * @returns x1 滑块位移 (m)
 */
export function calculateSliderDisplacement(
  v0: number, mu: number, t: number, g: number = GRAVITY, m?: number, M?: number
): number {
  if (m === undefined || M === undefined || mu <= 0) {
    return v0 * t - 0.5 * mu * g * t * t
  }
  const vCommon = calculateCommonVelocity(m, v0, M)
  const tCommon = calculateCommonVelocityTime(M, vCommon, mu, m, g)
  if (t <= tCommon) return v0 * t - 0.5 * mu * g * t * t
  const xCommon = v0 * tCommon - 0.5 * mu * g * tCommon * tCommon
  return xCommon + vCommon * (t - tCommon)
}

/**
 * 计算木板位移；传入 v0 时自动在共速后转为共同匀速
 * x2 = 0.5·(μ·m·g/M)·t²
 *
 * @param mu 动摩擦因数
 * @param m 滑块质量 (kg)
 * @param M 木板质量 (kg)
 * @param t 时间 (s)
 * @param g 重力加速度 (m/s²)，默认 9.8
 * @returns x2 木板位移 (m)
 */
export function calculateBoardDisplacement(
  mu: number, m: number, M: number, t: number, g: number = GRAVITY, v0?: number
): number {
  const aBoard = (mu * m * g) / M
  if (v0 === undefined || mu <= 0) return 0.5 * aBoard * t * t
  const vCommon = calculateCommonVelocity(m, v0, M)
  const tCommon = calculateCommonVelocityTime(M, vCommon, mu, m, g)
  if (t <= tCommon) return 0.5 * aBoard * t * t
  const xCommon = 0.5 * aBoard * tCommon * tCommon
  return xCommon + vCommon * (t - tCommon)
}

/**
 * 计算滑块在时刻 t 的速度；传入 m/M 时共速后保持 v_共
 * v_slider = v0 - μ·g·t
 *
 * @param v0 滑块初速度 (m/s)
 * @param mu 动摩擦因数
 * @param t 时间 (s)
 * @param g 重力加速度 (m/s²)，默认 9.8
 * @returns v_slider 滑块速度 (m/s)
 */
export function calculateSliderVelocity(
  v0: number, mu: number, t: number, g: number = GRAVITY, m?: number, M?: number
): number {
  if (m === undefined || M === undefined || mu <= 0) {
    return Math.max(v0 - mu * g * t, 0)
  }
  const vCommon = calculateCommonVelocity(m, v0, M)
  const tCommon = calculateCommonVelocityTime(M, vCommon, mu, m, g)
  return t <= tCommon ? v0 - mu * g * t : vCommon
}

/**
 * 计算木板在时刻 t 的速度
 * v_board = (μ·m·g/M)·t
 * 达到共速后保持 v_共 不变
 *
 * @param mu 动摩擦因数
 * @param m 滑块质量 (kg)
 * @param M 木板质量 (kg)
 * @param t 时间 (s)
 * @param v0 滑块初速度 (m/s)
 * @param g 重力加速度 (m/s²)，默认 9.8
 * @returns v_board 木板速度 (m/s)
 */
export function calculateBoardVelocity(
  mu: number, m: number, M: number, t: number, v0: number, g: number = GRAVITY
): number {
  const aBoard = (mu * m * g) / M
  const vCommon = calculateCommonVelocity(m, v0, M)
  return Math.min(aBoard * t, vCommon)
}

/**
 * 计算相对位移（滑块相对木板的位移）
 * Δx = x1 - x2
 *
 * @param x1 滑块位移 (m)
 * @param x2 木板位移 (m)
 * @returns delta_x 相对位移 (m)
 */
export function calculateRelativeDisplacement(x1: number, x2: number): number {
  return x1 - x2
}

/**
 * 计算摩擦生热
 * Q = μ·m·g·Δx
 *
 * @param mu 动摩擦因数
 * @param m 滑块质量 (kg)
 * @param delta_x 相对位移 (m)
 * @param g 重力加速度 (m/s²)，默认 9.8
 * @returns Q 摩擦生热 (J)
 */
export function calculateFrictionHeat(
  mu: number, m: number, delta_x: number, g: number = GRAVITY
): number {
  return mu * m * g * delta_x
}

/**
 * 判断滑块是否会从木板右端掉落
 * Δx > L 时滑块掉落
 *
 * @param delta_x 相对位移 (m)
 * @param L 木板长度 (m)
 * @returns willFall 是否掉落
 */
export function willSliderFallOff(delta_x: number, L: number): boolean {
  return delta_x > L
}

export interface BasicCollisionTimingResult {
  R_A: number
  R_B: number
  initPosAx: number
  initPosBx: number
  initPhysX_A: number
  initPhysX_B: number
  collisionTime: number
  v1After: number
  v2After: number
}

/**
 * 计算两球碰撞时刻与碰后速度（SSOT）
 */
export function computeTwoBallCollisionTiming(params: {
  m1: number
  v1: number
  m2: number
  v2: number
  collisionType: number
  e_coefficient: number
  designWidth?: number
}): BasicCollisionTimingResult {
  const {
    m1, v1, m2, v2, collisionType, e_coefficient,
    designWidth = MC_SCENE_DEFAULTS.designWidth,
  } = params

  const R_A = MC_SCENE_DEFAULTS.ballBaseRadius + m1 * MC_SCENE_DEFAULTS.massRadiusScale
  const R_B = MC_SCENE_DEFAULTS.ballBaseRadius + m2 * MC_SCENE_DEFAULTS.massRadiusScale

  const initPosAx = designWidth * MC_SCENE_DEFAULTS.initAxRatio
  const initPosBx = designWidth * MC_SCENE_DEFAULTS.initBxRatio

  const rPhysA = R_A / PX_PER_METER
  const rPhysB = R_B / PX_PER_METER
  const initPhysX_A = 0
  const initPhysX_B = (initPosBx - initPosAx) / PX_PER_METER

  let eVal = 1.0
  if (collisionType === 1) eVal = 0.0
  else if (collisionType === 2) eVal = e_coefficient

  const approachSpeed = v1 - v2
  const gapPhys = initPhysX_B - rPhysB - (initPhysX_A + rPhysA)
  let collisionTime = Infinity
  let v1After = v1
  let v2After = v2

  if (approachSpeed > 0 && gapPhys > 0) {
    collisionTime = gapPhys / approachSpeed
    const res = calculateCollisionVelocities(m1, v1, m2, v2, eVal)
    v1After = res.v1After
    v2After = res.v2After
  }

  return {
    R_A, R_B, initPosAx, initPosBx,
    initPhysX_A, initPhysX_B,
    collisionTime, v1After, v2After,
  }
}

export interface SliderBoardTimingResult {
  vCommon: number
  tCommon: number
  isFallen: boolean
  tFall: number
  vSliderFall: number
  vBoardFall: number
  x1AtCommon: number
  x2AtCommon: number
  x1AtFall: number
  x2AtFall: number
}

/**
 * 计算滑块-木板模型共速 / 滑落临界时刻（SSOT）
 */
export function computeSliderBoardTiming(params: {
  m_slider: number
  M_board: number
  v0: number
  mu: number
  L: number
  g?: number
}): SliderBoardTimingResult {
  const { m_slider, M_board, v0, mu, L, g = MC_SCENE_DEFAULTS.g } = params

  const vCommon = calculateCommonVelocity(m_slider, v0, M_board)
  const a_rel = mu * g * (1 + m_slider / M_board)
  const tCommon = calculateCommonVelocityTime(M_board, vCommon, mu, m_slider, g)

  const x1AtCommon = v0 * tCommon - 0.5 * mu * g * tCommon * tCommon
  const x2AtCommon = 0.5 * ((mu * m_slider * g) / M_board) * tCommon * tCommon
  const deltaXAtCommon = x1AtCommon - x2AtCommon
  const isFallen = deltaXAtCommon > L

  let tFall = Infinity
  let vSliderFall = v0
  let vBoardFall = 0
  let x1AtFall = 0
  let x2AtFall = 0

  if (isFallen) {
    tFall = (v0 - Math.sqrt(Math.max(0, v0 * v0 - 2 * a_rel * L))) / a_rel
    vSliderFall = v0 - mu * g * tFall
    vBoardFall = ((mu * m_slider * g) / M_board) * tFall
    x1AtFall = v0 * tFall - 0.5 * mu * g * tFall * tFall
    x2AtFall = 0.5 * ((mu * m_slider * g) / M_board) * tFall * tFall
  }

  return {
    vCommon, tCommon, isFallen, tFall,
    vSliderFall, vBoardFall,
    x1AtCommon, x2AtCommon, x1AtFall, x2AtFall,
  }
}

export interface MomentumConservationCriticalParams {
  m1?: number
  v1?: number
  m2?: number
  v2?: number
  m_slider?: number
  M_board?: number
  v0?: number
  mu?: number
  L?: number
  advancedMode?: number
  collisionType?: number
  e_coefficient?: number
}

/**
 * 计算动量守恒定律页面关键时刻（SSOT）
 */
export function getMomentumConservationCriticalTimes(
  params: MomentumConservationCriticalParams = {},
  maxTime = 30,
): CriticalTimePoint[] {
  const advancedMode = params.advancedMode ?? 0

  if (advancedMode === 1) {
    const timing = computeSliderBoardTiming({
      m_slider: params.m_slider ?? 1,
      M_board: params.M_board ?? 3,
      v0: params.v0 ?? 6,
      mu: params.mu ?? 0.3,
      L: params.L ?? 2,
    })

    if (timing.isFallen) {
      const tFall = alignCriticalTime(timing.tFall, 'before')
      if (tFall > 0 && tFall <= maxTime) {
        return [{
          time: tFall,
          label: '滑块从木板右端滑落',
          variant: 'critical',
          autoPause: true,
        }]
      }
      return []
    }

    const tCommon = alignCriticalTime(timing.tCommon, 'after')
    if (tCommon > 0 && tCommon <= maxTime) {
      return [{
        time: tCommon,
        label: '滑块与木板达到共速',
        variant: 'critical',
        autoPause: true,
      }]
    }
    return []
  }

  const timing = computeTwoBallCollisionTiming({
    m1: params.m1 ?? 3,
    v1: params.v1 ?? 5,
    m2: params.m2 ?? 2,
    v2: params.v2 ?? 0,
    collisionType: params.collisionType ?? 0,
    e_coefficient: params.e_coefficient ?? 0.5,
  })

  if (!Number.isFinite(timing.collisionTime)) return []
  const tCol = alignCriticalTime(timing.collisionTime, 'after')
  if (!(tCol > 0 && tCol <= maxTime)) return []

  return [{
    time: tCol,
    label: 'A、B两球发生碰撞',
    variant: 'critical',
    autoPause: true,
  }]
}

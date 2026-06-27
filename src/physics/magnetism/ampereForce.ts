import { GRAVITY } from '../constants'

/** 基础模式（直交规律）场景参数 */
export const AMPERE_BASIC_SCENE = {
  xMin: -1.6,
  xMax: 1.6,
  mass: 0.5,
} as const

/** 进阶模式（斜面平衡）场景参数 */
export const AMPERE_ADVANCED_SCENE = {
  xMin: -1.1,
  xMax: 1.1,
  mass: 0.5,
} as const

export interface BasicAmperePhysicsResult {
  F: number
  FAbs: number
  a: number
  x: number
  isLimited: boolean
  currentDir: 'positive' | 'negative' | 'zero'
  magneticDir: 'intoPage' | 'outOfPage' | 'zero'
  forceDir: 'left' | 'right' | 'zero'
}

/**
 * 基础模式物理状态求解器
 * @param I 电流 (A)
 * @param B 磁感应强度 (T)
 * @param L 有效长度 (m)
 * @param m 导体棒质量 (kg)
 * @param t 当前时间 (s)
 * @param scene 场景参数（初始位置、边界）
 */
export function solveBasicAmpere(
  I: number,
  B: number,
  L: number = 4.0,
  m: number = AMPERE_BASIC_SCENE.mass,
  t: number = 0,
  scene: { xMin: number; xMax: number } = AMPERE_BASIC_SCENE
): BasicAmperePhysicsResult {
  const F = -B * I * L
  const FAbs = Math.abs(F)
  const a = m > 0 ? F / m : 0

  const { xMin, xMax } = scene
  const x0 = (xMin + xMax) / 2

  let x = x0
  let isLimited = false

  if (Math.abs(a) > 1e-6) {
    if (a > 0) {
      const tLimit = Math.sqrt((2 * (xMax - x0)) / a)
      if (t >= tLimit) {
        x = xMax
        isLimited = true
      } else {
        x = x0 + 0.5 * a * t * t
      }
    } else {
      const tLimit = Math.sqrt((2 * (x0 - xMin)) / Math.abs(a))
      if (t >= tLimit) {
        x = xMin
        isLimited = true
      } else {
        x = x0 + 0.5 * a * t * t
      }
    }
  }

  const currentDir = I > 0 ? 'positive' : I < 0 ? 'negative' : 'zero'
  const magneticDir = B > 0 ? 'intoPage' : B < 0 ? 'outOfPage' : 'zero'
  const forceDir = F > 1e-4 ? 'right' : F < -1e-4 ? 'left' : 'zero'

  return { F, FAbs, a, x, isLimited, currentDir, magneticDir, forceDir }
}

export interface AdvancedAmperePhysicsResult {
  F_ampere: number
  N: number
  f: number
  a: number
  x: number
  state: 'equilibrium' | 'sliding-up' | 'sliding-down'
  isLimited: boolean
  R_parallel: number
}

/**
 * 进阶模式物理状态求解器 (斜面受力平衡)
 */
export function solveAdvancedAmpere(
  I: number,
  B: number,
  theta: number,
  mu: number,
  L: number = 4.0,
  m: number = AMPERE_ADVANCED_SCENE.mass,
  t: number = 0,
  scene: { xMin: number; xMax: number } = AMPERE_ADVANCED_SCENE
): AdvancedAmperePhysicsResult {
  const g = GRAVITY
  const F_ampere = -B * I * L
  const rad = (theta * Math.PI) / 180

  let N = m * g * Math.cos(rad) + F_ampere * Math.sin(rad)
  if (N < 0) N = 0

  const R_parallel = F_ampere * Math.cos(rad) - m * g * Math.sin(rad)

  const fMax = mu * N
  let f = 0
  let a = 0
  let state: 'equilibrium' | 'sliding-up' | 'sliding-down' = 'equilibrium'

  if (Math.abs(R_parallel) <= fMax + 1e-5) {
    f = -R_parallel
    a = 0
    state = 'equilibrium'
  } else {
    if (R_parallel > 0) {
      f = -fMax
      a = (R_parallel + f) / m
      state = 'sliding-up'
    } else {
      f = fMax
      a = (R_parallel + f) / m
      state = 'sliding-down'
    }
  }

  const { xMin, xMax } = scene
  const x0 = (xMin + xMax) / 2

  let x = x0
  let isLimited = false

  if (Math.abs(a) > 1e-6) {
    if (a > 0) {
      const tLimit = Math.sqrt((2 * (xMax - x0)) / a)
      if (t >= tLimit) {
        x = xMax
        isLimited = true
      } else {
        x = x0 + 0.5 * a * t * t
      }
    } else {
      const tLimit = Math.sqrt((2 * (x0 - xMin)) / Math.abs(a))
      if (t >= tLimit) {
        x = xMin
        isLimited = true
      } else {
        x = x0 + 0.5 * a * t * t
      }
    }
  }

  return { F_ampere, N, f, a, x, state, isLimited, R_parallel }
}

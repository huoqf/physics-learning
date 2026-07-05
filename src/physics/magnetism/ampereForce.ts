/**
 * 安培力物理计算纯函数
 *
 * @agent-rule 零副作用，不依赖 React/DOM/window
 * @agent-rule 所有数据结构可序列化（IndexedDB 兼容）
 * @agent-rule 见 docs/agent-rules/core/ARCHITECTURE_RULES.md §4
 */
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
  B_perp: number
  B_para: number
}

/**
 * 基础模式物理状态求解器
 * @param I 电流 (A)
 * @param B 磁感应强度 (T)
 * @param thetaIB 磁场与电流夹角 (度)
 * @param L 有效长度 (m)
 * @param m 导体棒质量 (kg)
 * @param t 当前时间 (s)
 * @param scene 场景参数（初始位置、边界）
 */
export function solveBasicAmpere(
  I: number,
  B: number,
  thetaIB: number = 90,
  L: number = 4.0,
  m: number = AMPERE_BASIC_SCENE.mass,
  t: number = 0,
  scene: { xMin: number; xMax: number } = AMPERE_BASIC_SCENE
): BasicAmperePhysicsResult {
  const radIB = (thetaIB * Math.PI) / 180
  const B_perp = B * Math.sin(radIB)
  const B_para = B * Math.cos(radIB)

  // 安培力公式 F = B_perp * I * L，由于原向左为负，向右为正
  const F = -B_perp * I * L
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
  const magneticDir = B_perp > 1e-4 ? 'intoPage' : B_perp < -1e-4 ? 'outOfPage' : 'zero'
  const forceDir = F > 1e-4 ? 'right' : F < -1e-4 ? 'left' : 'zero'

  return { F, FAbs, a, x, isLimited, currentDir, magneticDir, forceDir, B_perp, B_para }
}

export interface AdvancedAmperePhysicsResult {
  F_ampere: number
  F_ampere_x: number
  F_ampere_y: number
  N: number
  f: number
  a: number
  x: number
  state: 'equilibrium' | 'sliding-up' | 'sliding-down'
  isLimited: boolean
  R_parallel: number
  I_min: number
  I_max: number
}

/**
 * 进阶模式物理状态求解器 (斜面受力平衡与极值区间)
 * @param I 电流 (A)
 * @param B 磁感应强度 (T)
 * @param theta 导轨倾角 (度)
 * @param mu 摩擦因数
 * @param bFieldDir 磁场方向 (0: 竖直, 1: 垂直斜面, 2: 水平)
 * @param L 有效长度 (m)
 * @param m 导体棒质量 (kg)
 * @param t 当前时间 (s)
 * @param scene 场景参数
 */
export function solveAdvancedAmpere(
  I: number,
  B: number,
  theta: number,
  mu: number,
  bFieldDir: number = 0,
  L: number = 4.0,
  m: number = AMPERE_ADVANCED_SCENE.mass,
  t: number = 0,
  scene: { xMin: number; xMax: number } = AMPERE_ADVANCED_SCENE
): AdvancedAmperePhysicsResult {
  const g = GRAVITY
  const rad = (theta * Math.PI) / 180

  // 1. 安培力在不同磁场方向下的正负符号及其在 2D 侧视坐标中的分量。
  // 进阶斜面模式的主视图把 I > 0 画成“电流流入纸面(⊗)”。
  // 由 I⃗ × B⃗ 可得：
  // - B 竖直向上时，F_安 水平向右；
  // - B 垂直斜面向外时，F_安 沿斜面向上；
  // - B 水平向右时，F_安 竖直向下。
  // 因此水平磁场的 F_安 标量与前两种相反号。F_ampere 的正方向随模式定义如下：
  // 竖直磁场：水平向右为正；垂直斜面磁场：沿斜面向上为正；水平磁场：竖直向上为正。
  const F_ampere_base = B * I * L

  let N = 0
  let R_parallel = 0
  let F_ampere = 0
  let F_ampere_x = 0
  let F_ampere_y = 0

  if (bFieldDir === 0) {
    // 竖直磁场：安培力水平向右为正
    F_ampere = F_ampere_base
    F_ampere_x = F_ampere
    F_ampere_y = 0
    N = m * g * Math.cos(rad) + F_ampere * Math.sin(rad)
    R_parallel = F_ampere * Math.cos(rad) - m * g * Math.sin(rad)
  } else if (bFieldDir === 1) {
    // 垂直斜面磁场：安培力沿斜面向上为正
    F_ampere = F_ampere_base
    F_ampere_x = F_ampere * Math.cos(rad)
    F_ampere_y = F_ampere * Math.sin(rad)
    N = m * g * Math.cos(rad)
    R_parallel = F_ampere - m * g * Math.sin(rad)
  } else {
    // 水平磁场：安培力竖直向上为正；I>0 且 B>0(水平向右) 时 F_安 向下，所以取反
    F_ampere = -F_ampere_base
    F_ampere_x = 0
    F_ampere_y = F_ampere
    N = (m * g - F_ampere) * Math.cos(rad)
    R_parallel = (F_ampere - m * g) * Math.sin(rad)
  }

  if (N < 0) N = 0

  // 2. 摩擦力与加速度求解
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

  // 3. 计算平衡电流区间 [I_min, I_max]
  // 设 F_ampere = k_I * I。注意水平磁场下 F_ampere 的正方向是“竖直向上”，
  // 与 I>0、B>0(水平向右) 对应的真实安培力方向相反，因此 k_I 需取 -B·L。
  const k_I = bFieldDir === 2 ? -B * L : B * L
  let N_0 = m * g * Math.cos(rad)
  let k_N = 0
  let R_0 = -m * g * Math.sin(rad)
  let k_R = 0

  if (bFieldDir === 0) {
    k_N = k_I * Math.sin(rad)
    k_R = k_I * Math.cos(rad)
  } else if (bFieldDir === 1) {
    k_N = 0
    k_R = k_I
  } else {
    k_N = -k_I * Math.cos(rad)
    k_R = k_I * Math.sin(rad)
  }

  // 解不等式：
  // (k_R - mu * k_N) * I <= mu * N_0 - R_0  => A1 * I <= B1
  // (k_R + mu * k_N) * I >= -mu * N_0 - R_0 => A2 * I >= B2
  const A1 = k_R - mu * k_N
  const B1 = mu * N_0 - R_0
  const A2 = k_R + mu * k_N
  const B2 = -mu * N_0 - R_0

  let limitMin = -Infinity
  let limitMax = Infinity

  // 处理不等式 1
  if (Math.abs(A1) > 1e-6) {
    if (A1 > 0) {
      limitMax = Math.min(limitMax, B1 / A1)
    } else {
      limitMin = Math.max(limitMin, B1 / A1)
    }
  } else if (B1 < -1e-5) {
    limitMin = 1 // 无解占位
    limitMax = -1
  }

  // 处理不等式 2
  if (Math.abs(A2) > 1e-6) {
    if (A2 > 0) {
      limitMin = Math.max(limitMin, B2 / A2)
    } else {
      limitMax = Math.min(limitMax, B2 / A2)
    }
  } else if (B2 > 1e-5) {
    limitMin = 1 // 无解占位
    limitMax = -1
  }

  // 处理 N >= 0 限制
  if (Math.abs(k_N) > 1e-6) {
    const bound = -N_0 / k_N
    if (k_N > 0) {
      limitMin = Math.max(limitMin, bound)
    } else {
      limitMax = Math.min(limitMax, bound)
    }
  } else if (N_0 < -1e-5) {
    limitMin = 1
    limitMax = -1
  }

  let I_min = limitMin
  let I_max = limitMax

  // 若无磁场，则 k_I=0 导致极值无意义或无穷
  if (Math.abs(B) < 1e-4) {
    I_min = 0
    I_max = 0
  }

  // 4. 运动学积分
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

  return { F_ampere, F_ampere_x, F_ampere_y, N, f, a, x, state, isLimited, R_parallel, I_min, I_max }
}

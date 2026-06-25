import { GRAVITY } from './constants'

/**
 * 磁场纯函数库。
 * 无副作用，不依赖 React/DOM/window。单位采用 SI。
 */

/** 安培力 F = BIL·sinθ（N），θ 为电流与磁场夹角 */
export function calculateAmpereForce(
  B: number,
  I: number,
  L: number,
  angleDeg: number
): { F: number } {
  const angleRad = (angleDeg * Math.PI) / 180
  return { F: B * I * L * Math.sin(angleRad) }
}

/** 洛伦兹力 F = qvB·sinθ（N），θ 为速度与磁场夹角 */
export function calculateLorentzForce(
  q: number,
  v: number,
  B: number,
  angleDeg: number
): { F: number } {
  const angleRad = (angleDeg * Math.PI) / 180
  return { F: q * v * B * Math.sin(angleRad) }
}

/**
 * 带电粒子在匀强磁场中圆周运动（垂直入射）。
 * r = mv/(qB)，T = 2πm/(qB)，ω = qB/m
 */
export function calculateChargeInMagField(
  q: number,
  m: number,
  v: number,
  B: number
): { r: number; T: number; omega: number } {
  const denom = q * B
  const r = denom === 0 ? 0 : Math.abs((m * v) / denom)
  const T = denom === 0 ? 0 : Math.abs((2 * Math.PI * m) / denom)
  const omega = m === 0 ? 0 : denom / m
  return { r, T, omega }
}

/**
 * 计算带电粒子在匀强磁场中的圆周运动轨迹点。
 * x = R sin(ωt), y = R(1 - cos(ωt))
 *
 * @param q 电荷 (C)
 * @param m 质量 (kg)
 * @param B 磁感应强度 (T)
 * @param v 速度 (m/s)
 * @param t 时间 (s)
 */
export function calculateLorentzTrajectory(
  q: number,
  m: number,
  B: number,
  v0: number,
  t: number
): { x: number; y: number; vx: number; vy: number } {
  const { omega } = calculateChargeInMagField(q, m, v0, B)
  
  if (Math.abs(omega) < 1e-9) {
    // 磁场为0，匀速直线运动
    return {
      x: v0 * t,
      y: 0,
      vx: v0,
      vy: 0
    }
  }

  // 自洽圆周运动轨迹：
  // x(t) = (v0 / omega) * sin(omega * t)
  // y(t) = (v0 / omega) * (cos(omega * t) - 1)
  const x = (v0 / omega) * Math.sin(omega * t)
  const y = (v0 / omega) * (Math.cos(omega * t) - 1)
  
  // 速度：
  // vx = dx/dt = v0 * cos(omega * t)
  // vy = dy/dt = -v0 * sin(omega * t)
  const vx = v0 * Math.cos(omega * t)
  const vy = -v0 * Math.sin(omega * t)
  
  return { x, y, vx, vy }
}

/**
 * @description 计算带电粒子在匀强磁场中的回旋半径
 * @param {number} m - 粒子质量 (kg)
 * @param {number} v - 速度大小 (m/s)
 * @param {number} q - 电荷量 (C)
 * @param {number} B - 磁感应强度 (T)
 * @returns {number} 物理半径 R (m)
 */
export const calcParticleRadius = (m: number, v: number, q: number, B: number): number => {
  if (Math.abs(q) < 1e-9 || Math.abs(B) < 1e-9) return Infinity
  return (m * v) / (Math.abs(q) * Math.abs(B))
}

/**
 * @description 计算粒子在磁场中的运动周期
 * @returns {number} 周期 T (s)
 */
export const calcParticlePeriod = (m: number, q: number, B: number): number => {
  if (Math.abs(q) < 1e-9 || Math.abs(B) < 1e-9) return Infinity
  return (2 * Math.PI * m) / (Math.abs(q) * Math.abs(B))
}

/**
 * @description 计算动态圆圆心物理坐标 (xc, yc)
 * @param {number} entryAngle - 射入夹角 (rad)
 * @param {number} R - 物理半径 (m)
 * @param {number} q - 电荷量
 * @param {number} B - 磁感应强度
 */
export const calcTrajectoryCenter = (entryAngle: number, R: number, q: number = 1, B: number = 1) => {
  // 假定入射点为原点 (0,0)
  // 右手螺旋定则下，当 q*B > 0 且垂直射入时，受力向右，即向速度方向右侧偏转（sign = -1）
  const sign = (q * B) >= 0 ? -1 : 1
  const cxAngle = entryAngle + sign * Math.PI / 2
  return {
    xc: R * Math.cos(cxAngle),
    yc: R * Math.sin(cxAngle)
  }
}

/**
 * @description 计算粒子运动的圆心角
 * @param entryAngle - 射入夹角 (rad)
 * @param q - 电荷量
 * @param B - 磁感应强度
 */
export const calcParticleArcAngle = (entryAngle: number, _q: number, _B: number): number => {
  // 对于 y=0 的直线边界，从原点射入 y>0 区域
  // 射出时的偏转角与入射角有关
  // 如果向左偏转（qB>0），圆心在入射速度左侧。
  return 2 * entryAngle // 简化模型，具体取决于几何关系，通常从直线边界射入再射出时，轨迹圆弧对应的圆心角为 2 * (pi - 夹角) 或者 2 * 夹角
}

// ═══════════════════════════════════════════════════════════════════════════════
// 安培力场景参数
// ═══════════════════════════════════════════════════════════════════════════════

/** 基础模式（直交规律）场景参数 */
export const AMPERE_BASIC_SCENE = {
  xMin: -1.6,    // 左边界 (m)
  xMax: 1.6,     // 右边界 (m)
  mass: 0.5,     // 导体棒质量 (kg)
} as const

/** 进阶模式（斜面平衡）场景参数 */
export const AMPERE_ADVANCED_SCENE = {
  xMin: -1.1,    // 左边界 (m)
  xMax: 1.1,     // 右边界 (m)
  mass: 0.5,     // 导体棒质量 (kg)
} as const

export interface BasicAmperePhysicsResult {
  /** 安培力大小 F (N)，有正负号，表示沿导轨水平方向的受力（+x 为右，-x 为左） */
  F: number
  /** 安培力绝对值 |F| */
  FAbs: number
  /** 加速度 a (m/s²) */
  a: number
  /** 导体棒的瞬时物理位移 x (m) */
  x: number
  /** 是否达到了轨道边缘限位 */
  isLimited: boolean
  /** 电流方向：'positive' | 'negative' | 'zero' */
  currentDir: 'positive' | 'negative' | 'zero'
  /** 磁场方向：'intoPage' | 'outOfPage' | 'zero' */
  magneticDir: 'intoPage' | 'outOfPage' | 'zero'
  /** 受力方向：'left' | 'right' | 'zero' */
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
  // 物理符号约定：
  // 磁场向里为负（B > 0，⊗），磁场向外为正（B < 0，⊙）
  // 电流向上为正（I > 0），电流向下为负（I < 0）
  // 根据左手定则，这里我们令 F = -B * I * L，这样：
  // B > 0, I > 0 -> F = - (1 * 2 * 4) = -8 N (向左)
  // B < 0, I > 0 -> F = - (-1 * 2 * 4) = +8 N (向右)
  const F = -B * I * L
  const FAbs = Math.abs(F)

  const a = m > 0 ? F / m : 0

  // 从场景参数读取位置边界，初始位置为轨道中点
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

  return {
    F,
    FAbs,
    a,
    x,
    isLimited,
    currentDir,
    magneticDir,
    forceDir,
  }
}

export interface AdvancedAmperePhysicsResult {
  /** 安培力大小 F (N) */
  F_ampere: number
  /** 支持力 N (N) */
  N: number
  /** 摩擦力 f (N)，沿斜面向下为负，向上为正 */
  f: number
  /** 加速度 a (m/s²)，沿斜面向下为负，向上为正 */
  a: number
  /** 导体棒沿斜面的物理位移 x (m) (初始 0.0m，范围 [-1.1, 1.1]) */
  x: number
  /** 状态：'equilibrium' (静止平衡) | 'sliding-up' (向上滑动) | 'sliding-down' (向下滑动) */
  state: 'equilibrium' | 'sliding-up' | 'sliding-down'
  /** 是否达到了斜面边界限制 */
  isLimited: boolean
  /** 待平衡合力分量 R_parallel (N) */
  R_parallel: number
}

/**
 * 进阶模式物理状态求解器 (斜面受力平衡)
 * @param I 电流 (A)
 * @param B 磁感应强度 (T)，磁场竖直向上 (B > 0) 或竖直向下 (B < 0)
 * @param theta 倾角 (度)
 * @param mu 摩擦因数
 * @param L 有效长度 (m)
 * @param m 质量 (kg)
 * @param t 当前时间 (s)
 * @param scene 场景参数（初始位置、边界）
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

  // 从场景参数读取位置边界，初始位置为轨道中点
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

  return {
    F_ampere,
    N,
    f,
    a,
    x,
    state,
    isLimited,
    R_parallel,
  }
}

/**
 * 粒子在速度选择器（正交电磁场）中的运动轨迹解析解状态描述。
 */
export interface VelocitySelectorPoint {
  t: number
  x: number  // 物理坐标 x (m)
  y: number  // 物理坐标 y (m)
  vx: number // 速度 x (m/s)
  vy: number // 速度 y (m/s)
  fx: number // 洛伦兹力 x 分量 (N)
  fy: number // 洛伦兹力 y 分量 (N)
  fEx: number // 电场力 x 分量 (N)
  fEy: number // 电场力 y 分量 (N)
}

/**
 * 求解在复合正交电磁场中 x(t) = L 的穿出时间 t_out (二分法)。
 */
function solveTOut(v0: number, vd: number, omega: number, L: number): number {
  let tMin = 0
  let tMax = Math.max(10.0, (10 * L) / Math.max(0.1, v0))
  for (let i = 0; i < 30; i++) {
    const tMid = (tMin + tMax) / 2
    const xMid = vd * tMid + ((v0 - vd) / omega) * Math.sin(omega * tMid)
    if (xMid < L) {
      tMin = tMid
    } else {
      tMax = tMid
    }
  }
  return (tMin + tMax) / 2
}

/**
 * 洛伦兹力与速度选择器模型粒子轨迹解析解计算。
 *
 * @param q       粒子电量 (C)，带符号
 * @param m       粒子质量 (kg)
 * @param v0      入射速度 (m/s)
 * @param E_val   电场强度大小 (V/m)，始终 >= 0
 * @param B_val   磁感应强度大小 (T)，始终 >= 0
 * @param L       平行板长度 (m)
 * @param d       平行板间距 (m)
 * @param t       运行时间 (s)
 */
export function calculateVelocitySelectorTrajectory(
  q: number,
  m: number,
  v0: number,
  E_y: number,
  B_z: number,
  L: number,
  d: number,
  t: number
): {
  point: VelocitySelectorPoint
  tHit: number | null
  tOut: number
  hitsPlate: boolean
  hitType: 'none' | 'top' | 'bottom'
} {
  const omega = m > 0 ? (q * B_z) / m : 0
  const vd = Math.abs(B_z) > 1e-6 ? E_y / B_z : 0
  
  let tHit: number | null = null
  let hitType: 'none' | 'top' | 'bottom' = 'none'
  let hitsPlate = false

  const halfD = d / 2

  if (Math.abs(B_z) < 1e-6) {
    // 纯电场类平抛运动
    if (Math.abs(E_y) > 1e-6 && Math.abs(q) > 1e-9 && m > 0) {
      const a_y = (q * E_y) / m
      if (Math.abs(a_y) > 1e-6) {
        tHit = Math.sqrt(halfD / (0.5 * Math.abs(a_y)))
        hitType = a_y > 0 ? 'top' : 'bottom'
        hitsPlate = true
      }
    }
  } else {
    // 匀强磁场或复合正交电磁场
    if (Math.abs(omega) > 1e-6) {
      const A = (v0 - vd) / omega
      if (Math.abs(A) > 1e-6) {
        if (A < 0) {
          // 向上偏，可能撞击上极板 y = +halfD
          const val = 1 + halfD / A
          if (val >= -1 && val <= 1) {
            tHit = Math.acos(val) / Math.abs(omega)
            hitType = 'top'
            hitsPlate = true
          }
        } else {
          // 向下偏，可能撞击下极板 y = -halfD
          const val = 1 - halfD / A
          if (val >= -1 && val <= 1) {
            tHit = Math.acos(val) / Math.abs(omega)
            hitType = 'bottom'
            hitsPlate = true
          }
        }
      }
    }
  }

  let tOut = L / Math.max(0.1, v0)
  if (Math.abs(B_z) >= 1e-6 && Math.abs(omega) > 1e-6) {
    tOut = solveTOut(v0, vd, omega, L)
  }

  if (hitsPlate && tHit !== null && tHit < tOut) {
    // 粒子撞板，不穿出
  } else {
    hitsPlate = false
    hitType = 'none'
    tHit = null
  }

  let px = 0
  let py = 0
  let vx = v0
  let vy = 0

  const tEffective = hitsPlate && tHit !== null ? Math.min(t, tHit) : t

  if (tEffective <= 0) {
    px = 0
    py = 0
    vx = v0
    vy = 0
  } else if (!hitsPlate && tEffective > tOut) {
    let px_out = 0
    let py_out = 0
    let vx_out = v0
    let vy_out = 0

    if (Math.abs(omega) < 1e-9) {
      px_out = v0 * tOut
      py_out = 0.5 * ((q * E_y) / m) * tOut * tOut
      vx_out = v0
      vy_out = ((q * E_y) / m) * tOut
    } else {
      px_out = vd * tOut + ((v0 - vd) / omega) * Math.sin(omega * tOut)
      py_out = ((v0 - vd) / omega) * (Math.cos(omega * tOut) - 1)
      vx_out = vd + (v0 - vd) * Math.cos(omega * tOut)
      vy_out = -(v0 - vd) * Math.sin(omega * tOut)
    }

    const tAfter = tEffective - tOut
    px = px_out + vx_out * tAfter
    py = py_out + vy_out * tAfter
    vx = vx_out
    vy = vy_out
  } else {
    if (Math.abs(omega) < 1e-9) {
      px = v0 * tEffective
      py = 0.5 * ((q * E_y) / m) * tEffective * tEffective
      vx = v0
      vy = ((q * E_y) / m) * tEffective
    } else {
      px = vd * tEffective + ((v0 - vd) / omega) * Math.sin(omega * tEffective)
      py = ((v0 - vd) / omega) * (Math.cos(omega * tEffective) - 1)
      vx = vd + (v0 - vd) * Math.cos(omega * tEffective)
      vy = -(v0 - vd) * Math.sin(omega * tEffective)
    }
  }

  const isInside = tEffective <= tOut
  // 洛伦兹力分量
  const fx = isInside && Math.abs(B_z) > 0 ? q * B_z * vy : 0
  const fy = isInside && Math.abs(B_z) > 0 ? -q * B_z * vx : 0
  
  const fEx = 0
  // 电场力分量
  const fEy = isInside && Math.abs(E_y) > 0 ? q * E_y : 0

  return {
    point: {
      t: tEffective,
      x: px,
      y: py,
      vx,
      vy,
      fx,
      fy,
      fEx,
      fEy
    },
    tHit,
    tOut,
    hitsPlate,
    hitType
  }
}

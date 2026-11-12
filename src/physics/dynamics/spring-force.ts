/**
 * 弹簧力与简谐振动纯物理计算
 *
 * 职责：
 *   - 胡克定律（水平弹簧振子）的运动学与力学状态
 *   - 绳与弹簧瞬时切断模型的位置、受力、加速度计算
 *
 * 约束：
 *   - 纯函数，无副作用
 *   - 无 DOM / React / window 依赖
 *   - 输入输出均可序列化
 */

import { GRAVITY } from '../constants'
import { alignCriticalTime } from '@/utils/criticalTime'
import type { CriticalTimePoint } from '@/data/types'

// ─── 通用常量 ───────────────────────────────────────────────────────────

/** 像素-米比例尺 [px/m] */
export const PIXELS_PER_METER = 240

/** 弹簧自然长度（设计像素） [px] */
export const SPRING_NATURAL_LENGTH = 85

/** 细绳自然长度（设计像素） [px] */
export const ROPE_NATURAL_LENGTH = 75

/** 小球半径（设计像素） [px] */
export const BALL_RADIUS = 18

/** 滑块尺寸（设计像素） [px] */
export const BOX_SIZE = 48

/**
 * 绳与弹簧切断场景的天花板 / 地面锚点（设计坐标，px）。
 *
 * 它们不只是画图用的：B 球的落地距离 = (groundY − R − yB_start) / PIXELS_PER_METER，
 * 直接决定落体时长与后续各球的加速度。所以锚点定义在物理层，中屏渲染与右屏看板
 * 引用同一份 —— 否则「画面里画的地面」和「算出来的落地时刻」会是两个地面。
 */
export const CUT_ROPE_ANCHORS = { ceilY: 39, groundY: 610 } as const

/**
 * 系统二（绳在上、弹簧在下）落地后，从"落地瞬间"收敛到"压缩静平衡"的过渡时长 [s]。
 *
 * 为什么需要它：D 球触地后平动必须停止，但弹簧此刻仍处于自由段的拉伸状态
 * （球心距 ≈ 88px，静平衡只需 61px）。若直接硬冻结，画面会停在一个既非平衡、
 * 又带着残余速度的"半收缩态"上，看着像画面卡死。
 *
 * 取值 0.15s 是视觉节奏，不是物理推导：地面对小球是塑性冲击、弹簧内部有微元阻尼，
 * 真实振动本就迅速衰减，因此用 smoothstep 收口在物理上讲得通。
 */
export const SYSTEM2_SETTLE_TIME = 0.15

/**
 * 系统二落地时刻的记忆表。
 * 键 = k|m|ceilY|groundY：tLand2 只依赖这四项，逐帧重解超越方程纯属浪费。
 */
const SYS2_LAND_CACHE = new Map<string, number>()

// ─── 胡克定律 / 水平简谐振动 ────────────────────────────────────────────

export interface HookeLawState {
  /** 角频率 [rad/s] */
  omega: number
  /** 相对平衡位置的位移 [m] */
  displacement: number
  /** 弹簧恢复力 [N] */
  springForce: number
  /** 弹性势能 [J] */
  potentialEnergy: number
  /** 滑块中心 X 坐标（设计坐标系） [px] */
  centerX: number
}

/**
 * 计算水平弹簧振子的简谐振动状态
 *
 * @param k 劲度系数 [N/m]
 * @param m 振子质量 [kg]
 * @param time 时间 [s]
 * @param amplitude 振幅 [m]，默认 0.5
 * @param equilibriumX 平衡位置设计坐标 [px]，调用方应传入 HOOKE_DESIGN.eqX
 * @returns 完整运动与力学状态
 */
export function calculateHookeLawState(
  k: number,
  m: number,
  time: number,
  amplitude = 0.5,
  equilibriumX: number,
): HookeLawState {
  const omega = Math.sqrt(k / m)
  const displacement = amplitude * Math.sin(omega * time)
  const springForce = -k * displacement
  const potentialEnergy = 0.5 * k * displacement * displacement
  const centerX = equilibriumX + displacement * PIXELS_PER_METER

  return { omega, displacement, springForce, potentialEnergy, centerX }
}

// ─── 绳与弹簧瞬时切断 ───────────────────────────────────────────────────

export interface CutRopePositions {
  /** A 球 Y 坐标（设计坐标系） [px] */
  yA: number
  /** B 球 Y 坐标（设计坐标系） [px] */
  yB: number
  /** C 球 Y 坐标（设计坐标系） [px] */
  yC: number
  /** D 球 Y 坐标（设计坐标系） [px] */
  yD: number
}

export interface CutRopeForces {
  /** A 球所受弹簧力 [N]（向上为正） */
  fA_spring: number
  /** A 球所受绳张力 [N]（向上为正），剪断后为 0 */
  fA_rope: number
  /** A 球所受重力 [N]，恒为 -mg */
  fA_grav: number
  /** A 球加速度 [m/s²]（向上为正） */
  a_A: number

  /** B 球所受绳张力 [N]（向上为正），剪断后为 0 */
  fB_rope: number
  /** B 球所受重力 [N]，恒为 -mg */
  fB_grav: number
  /** B 球加速度 [m/s²]（向上为正） */
  a_B: number

  /** C 球所受绳张力 [N]（向上为正），剪断后为 0 */
  fC_rope: number
  /** C 球所受弹簧力 [N]（向上为正） */
  fC_spring: number
  /** C 球所受重力 [N]，恒为 -mg */
  fC_grav: number
  /** C 球加速度 [m/s²]（向上为正） */
  a_C: number

  /** D 球所受弹簧力 [N]（向上为正） */
  fD_spring: number
  /** D 球所受重力 [N]，恒为 -mg */
  fD_grav: number
  /** D 球加速度 [m/s²]（向上为正） */
  a_D: number

  /** 弹簧 2 的弹力大小 [N] */
  fSpring2: number
}

export interface CutRopeState {
  positions: CutRopePositions
  forces: CutRopeForces
  /** 剪断后经过的时间 [s]，未剪断时为 0 */
  tCut: number
  /** B 球是否已落地（落地后位置固定、加速度归零） */
  isLanded: boolean
}

/**
 * 计算绳与弹簧瞬时切断模型的状态
 *
 * 系统一（左侧）：天花板 → 弹簧 → A球 → 细绳 → B球，剪断下方细绳
 * 系统二（右侧）：天花板 → 细绳 → C球 → 弹簧 → D球，剪断上方细绳
 *
 * @param k 劲度系数 [N/m]
 * @param m 单球质量 [kg]
 * @param time 当前动画时间 [s]
 * @param isCut 是否已剪断（1=已剪断，0=未剪断）
 * @param tCutStart 剪断起始时间戳 [s]，未剪断时传 null
 * @param ceilY 天花板 Y 设计坐标 [px]
 * @param groundY 地面 Y 设计坐标 [px]
 * @returns 四球位置、受力与加速度
 */
export function calculateCutRopeState(
  k: number,
  m: number,
  time: number,
  isCut: number,
  tCutStart: number | null,
  ceilY: number,
  groundY: number,
): CutRopeState {
  const g = GRAVITY
  const tCut = isCut === 1 && tCutStart !== null ? time - tCutStart : 0

  // ── 系统一：弹簧在上，绳在下 ──
  const xs1_eq = (2 * m * g) / k
  const xs1_eq_px = xs1_eq * PIXELS_PER_METER
  const Ls1_eq = SPRING_NATURAL_LENGTH + xs1_eq_px

  let yA = ceilY + Ls1_eq
  let yB = yA + ROPE_NATURAL_LENGTH

  // B 球落地判定：剪断后自由落体到 groundY - BALL_RADIUS
  let isLanded = false
  if (isCut === 1) {
    const yB_start = ceilY + Ls1_eq + ROPE_NATURAL_LENGTH
    const fallDistance = (groundY - BALL_RADIUS - yB_start) / PIXELS_PER_METER
    if (fallDistance > 0) {
      const fallTime = Math.sqrt((2 * fallDistance) / g)
      isLanded = tCut >= fallTime
    } else {
      // 初始位置已在地面或以下：立即视为落地
      isLanded = true
    }
  }

  if (isCut === 1) {
    const xs1_eq_new = (m * g) / k
    const xs1_eq_new_px = xs1_eq_new * PIXELS_PER_METER
    const yA_eq_new = ceilY + SPRING_NATURAL_LENGTH + xs1_eq_new_px
    const omegaVal = Math.sqrt(k / m)
    const ampA = xs1_eq_px - xs1_eq_new_px
    yA = yA_eq_new + ampA * Math.cos(omegaVal * tCut)

    // B 球：未落地时自由落体，落地后固定在地面
    if (isLanded) {
      yB = groundY - BALL_RADIUS
    } else {
      const yB_start = ceilY + Ls1_eq + ROPE_NATURAL_LENGTH
      const dyB = 0.5 * g * tCut * tCut * PIXELS_PER_METER
      yB = Math.min(groundY - BALL_RADIUS, yB_start + dyB)
    }
  }

  // ── 系统二：绳在上，弹簧在下 ──
  const xs2_eq = (m * g) / k
  const xs2_eq_px = xs2_eq * PIXELS_PER_METER
  const Ls2_eq = SPRING_NATURAL_LENGTH + xs2_eq_px

  let yC = ceilY + ROPE_NATURAL_LENGTH
  let yD = yC + Ls2_eq

  /** 落地收敛进度：null = 未落地；0 = 落地瞬间；1 = 已在压缩静平衡 */
  let sys2Settle: number | null = null

  if (isCut === 1) {
    const yC_start = ceilY + ROPE_NATURAL_LENGTH
    const yD_start = yC_start + Ls2_eq
    const ycm0 = (yC_start + yD_start) / 2
    const ycm = ycm0 + 0.5 * g * tCut * tCut * PIXELS_PER_METER
    const omega_rel = Math.sqrt((2 * k) / m)
    const amp_rel = xs2_eq_px / 2
    const rel_disp = amp_rel * Math.cos(omega_rel * tCut)
    yC = ycm - SPRING_NATURAL_LENGTH / 2 - rel_disp
    yD = ycm + SPRING_NATURAL_LENGTH / 2 + rel_disp

    // D 球触地：系统二的平动到此为止。
    //
    // 落地前质心一直在自由落体，不截断的话 C/D 会在 t≈0.55s 穿地、0.75s 整体飞出
    // 650px 画布（实测 t=1.0s 时 C 已在地面下 710px）。B 球早就有 isLanded，
    // 系统二当时漏了这一半。
    const tLand2 = calculateSystem2LandingTime(k, m, ceilY, groundY)
    if (tCut >= tLand2) {
      const yD_land = groundY - BALL_RADIUS
      // C 在落地瞬间的位置要用自由段公式**在 tLand2 处外推**，
      // 不能取当前 tCut —— 否则收敛起点会随播放进度漂移，每次渲染都不一样。
      const ycm_land = ycm0 + 0.5 * g * tLand2 * tLand2 * PIXELS_PER_METER
      const rel_land = amp_rel * Math.cos(omega_rel * tLand2)
      const yC_land = ycm_land - SPRING_NATURAL_LENGTH / 2 - rel_land
      // 静平衡：D 被地面托住（不参与运动），弹簧压缩 mg/k 托起 C。
      // 球心距取 SPRING_NATURAL_LENGTH − 压缩量，沿用本文件"球心距即 Ls"的既有口径。
      const yC_final = yD_land - (SPRING_NATURAL_LENGTH - xs2_eq_px)
      const progress = Math.min(1, (tCut - tLand2) / SYSTEM2_SETTLE_TIME)
      const ease = progress * progress * (3 - 2 * progress)

      yD = yD_land
      yC = yC_land + (yC_final - yC_land) * ease
      sys2Settle = ease
    }
  }

  // ── 受力与加速度 ──
  const fGravity = m * g
  const fSpring1_pre = 2 * m * g
  const fSpring2_pre = m * g
  const fRope1_pre = m * g
  const fRope2_pre = 2 * m * g

  const omegaVal = Math.sqrt(k / m)
  const omega_rel = Math.sqrt((2 * k) / m)

  const fA_spring = isCut === 1 ? m * g * (1 + Math.cos(omegaVal * tCut)) : fSpring1_pre
  const fA_rope = isCut === 1 ? 0 : -fRope1_pre
  const fA_grav = -fGravity
  const a_A = isCut === 1 ? g * Math.cos(omegaVal * tCut) : 0

  const fB_rope = isCut === 1 ? 0 : fRope1_pre
  const fB_grav = -fGravity
  // B 球：未落地时自由落体 a=-g；落地后静止 a=0（支持力平衡重力）
  const a_B = isCut === 1 ? (isLanded ? 0 : -g) : 0

  // 自由段（未落地）的弹簧力：mg·cos(ω_rel·t)。t=0 时为 +mg（弹簧被拉伸，拉 C 向下、D 向上）
  const fSpring2Free = isCut === 1 ? m * g * Math.cos(omega_rel * tCut) : fSpring2_pre
  // 落地后收敛到 −mg：弹簧转为**压缩**，对 C 向上推、对 D 向下压，符号与拉伸时相反。
  // （写 +mg 会把终态的弹簧力方向画反，图上会看到落地后弹簧还在"拉"D 向上。）
  const fSpring2 = sys2Settle === null ? fSpring2Free : fSpring2Free + (-m * g - fSpring2Free) * sys2Settle

  const fC_rope = isCut === 1 ? 0 : fRope2_pre
  const fC_spring = -fSpring2
  const fC_grav = -fGravity
  // 落地后 C 停在压缩弹簧上（弹力 mg 平衡重力），加速度收敛到 0
  const a_C_free = isCut === 1 ? -g * (1 + Math.cos(omega_rel * tCut)) : 0
  const a_C = sys2Settle === null ? a_C_free : a_C_free * (1 - sys2Settle)

  const fD_spring = fSpring2
  const fD_grav = -fGravity
  // D 触地后由地面支持力托住，加速度恒为 0（与系统一 B 球同一处理）
  const a_D = sys2Settle === null ? (isCut === 1 ? -g * (1 - Math.cos(omega_rel * tCut)) : 0) : 0

  return {
    positions: { yA, yB, yC, yD },
    forces: {
      fA_spring,
      fA_rope,
      fA_grav,
      a_A,
      fB_rope,
      fB_grav,
      a_B,
      fC_rope,
      fC_spring,
      fC_grav,
      a_C,
      fD_spring,
      fD_grav,
      a_D,
      fSpring2,
    },
    tCut,
    isLanded,
  }
}

/**
 * 计算 B 球落地时间（用于自动停止播放）
 *
 * @param m 单球质量 [kg]
 * @param k 劲度系数 [N/m]
 * @param ceilY 天花板 Y 设计坐标 [px]
 * @param groundY 地面 Y 设计坐标 [px]
 * @returns B 球从剪断到落地的时间 [s]，若不会落地返回 Infinity
 */
export function calculateBallBFallTime(
  m: number,
  k: number,
  ceilY: number,
  groundY: number,
): number {
  const g = GRAVITY
  const xs1_eq = (2 * m * g) / k
  const xs1_eq_px = xs1_eq * PIXELS_PER_METER
  const Ls1_eq = SPRING_NATURAL_LENGTH + xs1_eq_px
  const yB_start = ceilY + Ls1_eq + ROPE_NATURAL_LENGTH
  const fallDistance = (groundY - BALL_RADIUS - yB_start) / PIXELS_PER_METER

  if (fallDistance <= 0) return Infinity
  return Math.sqrt((2 * fallDistance) / g)
}

/**
 * 计算系统二 D 球触地时间（D 球最低，先于 C 落地）
 *
 * **没有闭式解**：D 球位置是"质心自由落体 + 弹簧相对简谐振动"的叠加
 *
 *   yD(t) = ycm0 + ½·g·t²·PPM + L_spring/2 + amp·cos(ω_rel·t)
 *
 * 自由落体项与 cos 项无法消去，只能数值求根。用二分法：自由落体项 ½gt²·PPM
 * 在 [0, 2] 内远大于 ±amp 的振荡幅度，函数单调，二分稳定收敛。
 *
 * @param m 单球质量 [kg]
 * @param k 劲度系数 [N/m]
 * @param ceilY 天花板 Y 设计坐标 [px]
 * @param groundY 地面 Y 设计坐标 [px]
 * @returns D 球触地时间 [s]；初始就已在地面以下返回 0；永不落地返回 Infinity
 */
export function calculateSystem2LandingTime(
  k: number,
  m: number,
  ceilY: number,
  groundY: number,
): number {
  const key = `${k}|${m}|${ceilY}|${groundY}`
  const cached = SYS2_LAND_CACHE.get(key)
  if (cached !== undefined) return cached

  const g = GRAVITY
  const yC_start = ceilY + ROPE_NATURAL_LENGTH
  const xs2_eq_px = ((m * g) / k) * PIXELS_PER_METER
  const ycm0 = yC_start + (SPRING_NATURAL_LENGTH + xs2_eq_px) / 2
  const amp = xs2_eq_px / 2
  const omega = Math.sqrt((2 * k) / m)
  const target = groundY - BALL_RADIUS

  const yDAt = (t: number) =>
    ycm0 +
    0.5 * g * t * t * PIXELS_PER_METER +
    SPRING_NATURAL_LENGTH / 2 +
    amp * Math.cos(omega * t)

  let result: number
  if (yDAt(0) >= target) {
    result = 0
  } else if (yDAt(2) < target) {
    result = Infinity
  } else {
    let lo = 0
    let hi = 2
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2
      if (yDAt(mid) < target) lo = mid
      else hi = mid
    }
    result = hi
  }

  SYS2_LAND_CACHE.set(key, result)
  return result
}

// ─── 轨迹预计算（用于拖拽扫查）──────────────────────────────────────────

export interface CutRopeTrajectoryPoint {
  t: number
  positions: CutRopePositions
  forces: CutRopeForces
  isLanded: boolean
}

/**
 * 预计算绳与弹簧瞬时切断模型的轨迹
 *
 * @param k 劲度系数 [N/m]
 * @param m 单球质量 [kg]
 * @param maxTime 最大模拟时间 [s]
 * @param dt 时间步长 [s]
 * @param ceilY 天花板 Y 设计坐标 [px]
 * @param groundY 地面 Y 设计坐标 [px]
 * @returns 按时间升序排列的轨迹点数组
 */
export function precomputeCutRopeTrajectory(
  k: number,
  m: number,
  maxTime: number,
  dt: number,
  ceilY: number,
  groundY: number,
): CutRopeTrajectoryPoint[] {
  const pts: CutRopeTrajectoryPoint[] = []
  for (let t = 0; t <= maxTime + dt * 0.5; t += dt) {
    const state = calculateCutRopeState(k, m, t, 1, 0, ceilY, groundY)
    pts.push({
      t: Math.min(t, maxTime),
      positions: state.positions,
      forces: state.forces,
      isLanded: state.isLanded,
    })
  }
  return pts
}

/**
 * 线性插值取得指定时刻的轨迹状态
 *
 * @param trajectory 预计算的轨迹点数组（按时间升序）
 * @param time 目标时间 [s]
 * @returns 该时刻的插值状态
 */
export function getCutRopeStateAtTime(
  trajectory: CutRopeTrajectoryPoint[],
  time: number,
): CutRopeTrajectoryPoint {
  if (trajectory.length === 0) {
    return {
      t: 0,
      positions: { yA: 0, yB: 0, yC: 0, yD: 0 },
      forces: {
        fA_spring: 0, fA_rope: 0, fA_grav: 0, a_A: 0,
        fB_rope: 0, fB_grav: 0, a_B: 0,
        fC_rope: 0, fC_spring: 0, fC_grav: 0, a_C: 0,
        fD_spring: 0, fD_grav: 0, a_D: 0,
        fSpring2: 0,
      },
      isLanded: false,
    }
  }
  if (time <= trajectory[0].t) return { ...trajectory[0] }
  if (time >= trajectory[trajectory.length - 1].t) {
    return { ...trajectory[trajectory.length - 1] }
  }

  let lo = 0
  let hi = trajectory.length - 1
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1
    if (trajectory[mid].t <= time) lo = mid
    else hi = mid
  }

  const p0 = trajectory[lo]
  const p1 = trajectory[hi]
  const ratio = (time - p0.t) / (p1.t - p0.t)

  return {
    t: time,
    positions: {
      yA: p0.positions.yA + (p1.positions.yA - p0.positions.yA) * ratio,
      yB: p0.positions.yB + (p1.positions.yB - p0.positions.yB) * ratio,
      yC: p0.positions.yC + (p1.positions.yC - p0.positions.yC) * ratio,
      yD: p0.positions.yD + (p1.positions.yD - p0.positions.yD) * ratio,
    },
    forces: {
      fA_spring: p0.forces.fA_spring + (p1.forces.fA_spring - p0.forces.fA_spring) * ratio,
      fA_rope: p0.forces.fA_rope + (p1.forces.fA_rope - p0.forces.fA_rope) * ratio,
      fA_grav: p0.forces.fA_grav + (p1.forces.fA_grav - p0.forces.fA_grav) * ratio,
      a_A: p0.forces.a_A + (p1.forces.a_A - p0.forces.a_A) * ratio,
      fB_rope: p0.forces.fB_rope + (p1.forces.fB_rope - p0.forces.fB_rope) * ratio,
      fB_grav: p0.forces.fB_grav + (p1.forces.fB_grav - p0.forces.fB_grav) * ratio,
      a_B: p0.forces.a_B + (p1.forces.a_B - p0.forces.a_B) * ratio,
      fC_rope: p0.forces.fC_rope + (p1.forces.fC_rope - p0.forces.fC_rope) * ratio,
      fC_spring: p0.forces.fC_spring + (p1.forces.fC_spring - p0.forces.fC_spring) * ratio,
      fC_grav: p0.forces.fC_grav + (p1.forces.fC_grav - p0.forces.fC_grav) * ratio,
      a_C: p0.forces.a_C + (p1.forces.a_C - p0.forces.a_C) * ratio,
      fD_spring: p0.forces.fD_spring + (p1.forces.fD_spring - p0.forces.fD_spring) * ratio,
      fD_grav: p0.forces.fD_grav + (p1.forces.fD_grav - p0.forces.fD_grav) * ratio,
      a_D: p0.forces.a_D + (p1.forces.a_D - p0.forces.a_D) * ratio,
      fSpring2: p0.forces.fSpring2 + (p1.forces.fSpring2 - p0.forces.fSpring2) * ratio,
    },
    isLanded: p0.isLanded,
  }
}

// ─── 支持力与微观弹性形变 ───────────────────────────────────────────

export interface ElasticNormalForceState {
  normalForce: number
  gravityForce: number
  displacement: number // 桌面微观压缩形变量 (m)
}

export function calculateElasticNormalForceState(
  m: number,
  kAtoms: number,
  g = GRAVITY
): ElasticNormalForceState {
  const gravityForce = m * g
  const normalForce = gravityForce // 平衡状态下支持力等于重力
  const displacement = normalForce / kAtoms
  return { normalForce, gravityForce, displacement }
}

// ─── 细绳拉力与微观弹性形变 ───────────────────────────────────────────

export interface ElasticTensionState {
  tensionForce: number
  gravityForce: number
  displacement: number // 绳子分子拉伸形变量 (m)
}

export function calculateElasticTensionState(
  m: number,
  kRope: number,
  g = GRAVITY
): ElasticTensionState {
  const gravityForce = m * g
  const tensionForce = gravityForce // 平衡状态下绳拉力等于重力
  const displacement = tensionForce / kRope
  return { tensionForce, gravityForce, displacement }
}

/**
 * 轻质物体突变模型（anim-light-weight-mutation）临界时刻列表。
 * t = 0.02s 为剪断后第一帧（绳断、弹簧弹力尚来不及突变），fallTime 为 B 球落地前。
 */
export function getLightWeightMutationCriticalTimes(
  params: Record<string, number> = {},
  maxTime = 3,
): CriticalTimePoint[] {
  const m = params.m ?? 1
  const k = params.k ?? 100
  const rawFallTime = calculateBallBFallTime(
    m,
    k,
    CUT_ROPE_ANCHORS.ceilY,
    CUT_ROPE_ANCHORS.groundY,
  )
  const fallTime = alignCriticalTime(rawFallTime, 'before')
  const events: CriticalTimePoint[] = [
    {
      time: 0.02,
      label: '⚡ 剪断瞬间·绳断簧不断',
      variant: 'critical',
      autoPause: true,
    },
  ]
  if (Number.isFinite(fallTime) && fallTime > 0.02 && fallTime <= maxTime) {
    events.push({
      time: fallTime,
      label: '🎯 B 球落地前瞬间',
      variant: 'info',
      autoPause: false,
    })
  }
  return events
}

/**
 * 弹力演示（anim-spring-force）临界时刻列表：仅胡克定律模式（mode === 0）为简谐振动。
 */
export function getSpringForceCriticalTimes(
  params: Record<string, number>,
  maxTime = 5,
): CriticalTimePoint[] {
  if ((params.mode ?? 0) !== 0) return []
  const k = params.k ?? 100
  const m = params.m ?? 1.5
  if (!(k > 0) || !(m > 0)) return []

  const T = 2 * Math.PI * Math.sqrt(m / k)
  const events: CriticalTimePoint[] = []

  const tPeak = alignCriticalTime(T / 4, 'nearest')
  if (tPeak > 0 && tPeak <= maxTime) {
    events.push({
      time: tPeak,
      label: '⚡ 最大拉伸极值 (F最大)',
      variant: 'critical',
      autoPause: false,
    })
  }
  const tEq = alignCriticalTime(T / 2, 'nearest')
  if (tEq > 0 && tEq <= maxTime) {
    events.push({
      time: tEq,
      label: '回到原长平衡点 (F = 0)',
      variant: 'info',
      autoPause: false,
    })
  }
  return events.sort((a, b) => a.time - b.time)
}

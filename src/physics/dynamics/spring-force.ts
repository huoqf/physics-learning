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
 * @param equilibriumX 平衡位置设计坐标 [px]，默认 350
 * @returns 完整运动与力学状态
 */
export function calculateHookeLawState(
  k: number,
  m: number,
  time: number,
  amplitude = 0.5,
  equilibriumX = 350,
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

  const fSpring2 = isCut === 1 ? m * g * Math.cos(omega_rel * tCut) : fSpring2_pre

  const fC_rope = isCut === 1 ? 0 : fRope2_pre
  const fC_spring = -fSpring2
  const fC_grav = -fGravity
  const a_C = isCut === 1 ? -g * (1 + Math.cos(omega_rel * tCut)) : 0

  const fD_spring = fSpring2
  const fD_grav = -fGravity
  const a_D = isCut === 1 ? -g * (1 - Math.cos(omega_rel * tCut)) : 0

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

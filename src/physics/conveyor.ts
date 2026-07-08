/**
 * 传送带模型分段动力学计算。
 *
 * 约定：沿传送带向右为 x 正方向；倾斜模式下，向右表示沿斜面向上。
 * 本文件无 React/DOM/window 依赖，返回值为可序列化普通对象。
 */

import { GRAVITY } from './constants'

export type ConveyorMode = 'horizontal' | 'inclined'

export interface ConveyorParam {
  /** 传送带速度，单位：m/s；正值向右，负值向左 */
  vBelt: number
  /** 物块初速度，单位：m/s；正值向右 */
  v0: number
  /** 动摩擦因数；教学模型中近似同时作为最大静摩擦因数 */
  mu: number
  /** 传送带有效长度，单位：m */
  L: number
  /** 传送带模式：水平 / 倾斜 */
  mode: ConveyorMode
  /** 倾角，单位：rad；水平模式自动视为 0 */
  thetaRad?: number
  /** 重力加速度，单位：m/s² */
  g?: number
}

export type ConveyorPhase =
  | 'sliding'
  | 'synchronous'
  | 'staticOnIncline'
  | 'exitLeft'
  | 'exitRight'

export interface ConveyorFrameState {
  /** 物块位置，单位：m，限制在 [0, L] */
  xObj: number
  /** 物块速度，单位：m/s */
  vObj: number
  /** 物块加速度，单位：m/s² */
  aObj: number
  /** 摩擦力，单位：N；正值沿 +x */
  friction: number
  /** 支持力，单位：N */
  normalForce: number
  /** 相对速度 vObj - vBelt，单位：m/s */
  relativeVelocity: number
  /** 累计相对位移绝对值，单位：m */
  relativeDistanceAbs: number
  /** 摩擦生热，单位：J */
  heat: number
  /** 当前阶段 */
  phase: ConveyorPhase
  /** 是否已经达到过共速点 */
  hasSynced: boolean
  /** 共速时刻，单位：s；未共速则为 null */
  tSync: number | null
  /** 离开传送带时刻，单位：s；未离开则为 null */
  tExit: number | null
}

const MASS_DEFAULT = 1
const THETA_DEFAULT = Math.PI / 12
const SIM_DT = 0.005
const EPS_RELATIVE_V = 1e-4
const EPS_TIME = 1e-9

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function signNonZero(value: number, fallback: 1 | -1): 1 | -1 {
  if (value > 0) return 1
  if (value < 0) return -1
  return fallback
}

/**
 * 判断倾斜传送带共速后能否由静摩擦维持同步。
 *
 * @param param 传送带参数
 * @returns true 表示可保持同步；水平模式恒为 true
 */
export function canConveyorKeepSynchronous(param: ConveyorParam): boolean {
  if (param.mode === 'horizontal') return true
  const theta = param.thetaRad ?? THETA_DEFAULT
  return param.mu >= Math.tan(theta)
}

/**
 * 计算传送带模型在给定时刻的状态。
 *
 * @param param 传送带参数，单位见 ConveyorParam
 * @param t 时间，单位：s
 * @param mass 物块质量，单位：kg，默认 1 kg
 * @returns 指定时刻的运动、摩擦、生热与阶段状态
 */
export function getConveyorFrame(
  param: ConveyorParam,
  t: number,
  mass = MASS_DEFAULT,
): ConveyorFrameState {
  const g = param.g ?? GRAVITY
  const theta = param.mode === 'horizontal' ? 0 : (param.thetaRad ?? THETA_DEFAULT)
  const normalForce = mass * g * Math.cos(theta)
  const kineticFrictionAbs = param.mu * normalForce
  const gravityTangential = -g * Math.sin(theta)
  const staticFrictionNeeded = mass * g * Math.sin(theta)
  const canStaticSync = canConveyorKeepSynchronous(param)

  let elapsed = 0
  let xObj = 0
  let vObj = param.v0
  let aObj = 0
  let friction = 0
  let phase: ConveyorPhase = 'sliding'
  let relativeDistanceAbs = 0
  let heat = 0
  let hasSynced = Math.abs(param.v0 - param.vBelt) < EPS_RELATIVE_V
  let tSync: number | null = hasSynced ? 0 : null
  let tExit: number | null = null

  if (hasSynced && canStaticSync) {
    phase = param.mode === 'horizontal' ? 'synchronous' : 'staticOnIncline'
    vObj = param.vBelt
    aObj = 0
    friction = param.mode === 'horizontal' ? 0 : staticFrictionNeeded
  }

  while (elapsed < t - EPS_TIME && tExit == null) {
    const dt = Math.min(SIM_DT, t - elapsed)

    if (phase === 'synchronous' || phase === 'staticOnIncline') {
      aObj = 0
      vObj = param.vBelt
      friction = phase === 'synchronous' ? 0 : staticFrictionNeeded
      xObj += vObj * dt
      elapsed += dt
    } else {
      const relBefore = vObj - param.vBelt
      const fallbackSign = gravityTangential <= 0 ? -1 : 1
      const relSign = Math.abs(relBefore) < EPS_RELATIVE_V
        ? fallbackSign
        : signNonZero(relBefore, fallbackSign)
      friction = -kineticFrictionAbs * relSign
      aObj = friction / mass + gravityTangential

      const vNext = vObj + aObj * dt
      const relNext = vNext - param.vBelt
      const crossesSync = relBefore !== 0 && relBefore * relNext <= 0

      if (crossesSync) {
        const dtSync = clamp(Math.abs(relBefore / aObj), 0, dt)
        xObj += vObj * dtSync + 0.5 * aObj * dtSync * dtSync
        relativeDistanceAbs += Math.abs(relBefore) * dtSync / 2
        heat += kineticFrictionAbs * Math.abs(relBefore) * dtSync / 2
        elapsed += dtSync
        vObj = param.vBelt
        hasSynced = true
        tSync = tSync ?? elapsed

        const remaining = dt - dtSync
        if (canStaticSync) {
          phase = param.mode === 'horizontal' ? 'synchronous' : 'staticOnIncline'
          aObj = 0
          friction = phase === 'synchronous' ? 0 : staticFrictionNeeded
          xObj += param.vBelt * remaining
          elapsed += remaining
        } else {
          phase = 'sliding'
        }
      } else {
        xObj += vObj * dt + 0.5 * aObj * dt * dt
        relativeDistanceAbs += (Math.abs(relBefore) + Math.abs(relNext)) * dt / 2
        heat += kineticFrictionAbs * (Math.abs(relBefore) + Math.abs(relNext)) * dt / 2
        vObj = vNext
        elapsed += dt
      }
    }

    if (xObj <= 0 && elapsed > EPS_TIME && vObj < 0) {
      xObj = 0
      phase = 'exitLeft'
      friction = 0
      aObj = 0
      tExit = elapsed
    } else if (xObj >= param.L) {
      xObj = param.L
      phase = 'exitRight'
      friction = 0
      aObj = 0
      tExit = elapsed
    }
  }

  return {
    xObj: clamp(xObj, 0, param.L),
    vObj,
    aObj,
    friction,
    normalForce,
    relativeVelocity: vObj - param.vBelt,
    relativeDistanceAbs,
    heat,
    phase,
    hasSynced,
    tSync,
    tExit,
  }
}

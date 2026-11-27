/**
 * 狭义相对论物理计算纯函数
 *
 * 涵盖：
 * 1. 洛伦兹因子 γ = 1 / sqrt(1 - β^2)
 * 2. 时间延缓（动钟变慢）Δt = γ * Δτ
 * 3. 长度收缩（动尺收缩）l = l0 / γ
 * 4. 质能方程与质速关系 m = γ * m0, E = m * c^2
 * 5. 相对论速度合成定理
 *
 * 所有函数均为纯函数，无 React/DOM 依赖。
 */

import { alignCriticalTime, finalizeCriticalPoints } from '@/utils/criticalTime'
import type { CriticalTimePoint, TimeStageSegment } from '@/data/types'

/** 光速常数 c (m/s) */
export const SPEED_OF_LIGHT = 299792458

/** 光钟在飞船固有参考系内的单程时间 (s) */
export const LIGHT_CLOCK_PROPER_HALF_PERIOD = 1.0

/** 光钟在飞船固有参考系内的完整往返周期 (s) */
export const LIGHT_CLOCK_PROPER_PERIOD = 2.0 * LIGHT_CLOCK_PROPER_HALF_PERIOD

/** 光钟双反光镜间距（归一化物理高度，单位：光秒 ls） */
export const LIGHT_CLOCK_HEIGHT_WORLD = 1.0

/**
 * 将相对论速度比 β = v/c 归一化到合法教学区间 [0, 0.95]。
 * @param beta 速度与光速之比 v/c（无量纲）
 * @returns 截断后的 β ∈ [0, 0.95]
 */
export function clampRelativityBeta(beta: number): number {
  if (!Number.isFinite(beta)) return 0
  return Math.min(Math.max(beta, 0), 0.95)
}

/**
 * 格式化速度比 β：常规 0.05 步进显示 2 位小数，非整百分位（如 0.866）显示 3 位小数，确保手算校验一致。
 * @param beta 速度与光速之比 v/c（无量纲）
 */
export function formatRelativityBeta(beta: number): string {
  const clamped = clampRelativityBeta(beta)
  return Math.abs(clamped * 100 - Math.round(clamped * 100)) > 1e-4
    ? clamped.toFixed(3)
    : clamped.toFixed(2)
}

/**
 * 计算完整光钟周期在地面参考系中的总持续时间 Δt = 2γ·τ_half (s)。
 * @param beta 速度与光速之比 v/c（无量纲）
 * @returns 地面参考系完整周期（秒，s）
 */
export function getRelativityCycleDuration(beta: number): number {
  const clampedBeta = clampRelativityBeta(beta)
  return LIGHT_CLOCK_PROPER_PERIOD * calcLorentzFactor(clampedBeta)
}

export type LightClockStage = 'emit' | 'rising' | 'top' | 'falling' | 'returned'

export interface LightClockState {
  /** 归一化后的速度比 v/c（无量纲） */
  beta: number
  /** 洛伦兹因子 γ（无量纲） */
  gamma: number
  /** 地面参考系完成 1 个光钟周期的总时间（s） */
  cycleDuration: number
  /** 地面参考系当前时刻 t ∈ [0, cycleDuration]（s） */
  groundTime: number
  /** 飞船参考系当前固有时 τ = t / γ ∈ [0, 2.0]（s） */
  properTime: number
  /** 归一化周期相位 phase = τ / 2.0 ∈ [0, 1]（无量纲） */
  phase: number
  /** 光子相对下底镜的归一化高度 ∈ [0, 1]（无量纲） */
  pulseHeightRatio: number
  /** 光钟物理高度（光秒 ls） */
  clockHeightWorld: number
  /** 半程飞船水平位移（光秒 ls） */
  halfHorizWorld: number
  /** 完整周期飞船水平位移（光秒 ls） */
  totalHorizWorld: number
  /** 半程地面系光子斜路径长度 c·Δt/2（光秒 ls） */
  halfHypotWorld: number
  /** 地面系中飞船当前水平坐标（光秒 ls） */
  shipXWorld: number
  /** 光子当前竖直高度（光秒 ls） */
  pulseYWorld: number
  /** 当前光钟事件阶段 */
  stage: LightClockStage
}

/**
 * 计算单完整周期内动钟演示的统一物理状态（地面系 t 与飞船固有时 τ 严格同步）。
 * 采用自然光速单位（c = 1 ls/s），保证地面系光子合速度 √(vx² + vy²) = 1 恒定。
 * @param beta 速度与光速比 v/c（无量纲）
 * @param time 当前地面参考系时刻（秒，s）
 */
export function calcLightClockState(beta: number, time: number): LightClockState {
  const clampedBeta = clampRelativityBeta(beta)
  const gamma = calcLorentzFactor(clampedBeta)
  const cycleDuration = LIGHT_CLOCK_PROPER_PERIOD * gamma
  const safeTime = Number.isFinite(time) ? time : 0
  const groundTime = Math.min(Math.max(safeTime, 0), cycleDuration)
  const properTime = groundTime / gamma
  const phase = properTime / LIGHT_CLOCK_PROPER_PERIOD
  const pulseHeightRatio = phase <= 0.5 ? phase * 2 : (1 - phase) * 2

  const clockHeightWorld = LIGHT_CLOCK_HEIGHT_WORLD
  const halfHorizWorld = clampedBeta * gamma * clockHeightWorld
  const totalHorizWorld = 2 * halfHorizWorld
  const halfHypotWorld = gamma * clockHeightWorld
  const shipXWorld = clampedBeta * groundTime
  const pulseYWorld = pulseHeightRatio * clockHeightWorld

  let stage: LightClockStage = 'returned'
  if (phase <= 0.01) stage = 'emit'
  else if (phase < 0.49) stage = 'rising'
  else if (phase <= 0.51) stage = 'top'
  else if (phase < 0.99) stage = 'falling'

  return {
    beta: clampedBeta,
    gamma,
    cycleDuration,
    groundTime,
    properTime,
    phase,
    pulseHeightRatio,
    clockHeightWorld,
    halfHorizWorld,
    totalHorizWorld,
    halfHypotWorld,
    shipXWorld,
    pulseYWorld,
    stage,
  }
}

export interface NewtonianLimitMetrics {
  /** 速度比 β = v/c（无量纲） */
  beta: number
  /** 洛伦兹因子 γ（无量纲） */
  gamma: number
  /** 相对牛顿力学的相对偏差 γ - 1（无量纲） */
  relativeDeviation: number
  /** 动力学适用区间：classical(宏观低速) / transitional(过渡区) / relativistic(高能相对论) */
  regime: 'classical' | 'transitional' | 'relativistic'
}

/**
 * 计算牛顿力学低速极限回归指标。
 * @param beta 速度与光速比 v/c（无量纲）
 */
export function calcNewtonianLimitMetrics(beta: number): NewtonianLimitMetrics {
  const clampedBeta = clampRelativityBeta(beta)
  const gamma = calcLorentzFactor(clampedBeta)
  const relativeDeviation = gamma - 1
  const regime =
    clampedBeta <= 0.1 ? 'classical' : clampedBeta < 0.5 ? 'transitional' : 'relativistic'
  return {
    beta: clampedBeta,
    gamma,
    relativeDeviation,
    regime,
  }
}

/** 恒力加速对照模式（mode 2 / mode 3）固定周期时长 (s) */
export const ACCEL_CYCLE_DURATION = 4.0

export type SimultaneityStage =
  | 'emit'
  | 'propagating'
  | 'hit-a'
  | 'after-a'
  | 'hit-b'
  | 'hit-both'

export interface SimultaneityState {
  /** 归一化后的速度比 v/c（无量纲） */
  beta: number
  /** 洛伦兹因子 γ（无量纲） */
  gamma: number
  /** 固有长度收缩比 L / L₀ = 1 / γ（无量纲） */
  lengthRatio: number
  /** 地面参考系完成同时性光传播的总时长（s） */
  duration: number
  /** 地面参考系当前时刻 t ∈ [0, duration]（s） */
  groundTime: number
  /** 飞船参考系固有时 τ = t / γ（s） */
  properTime: number
  /** S 系中左光到达后壁 A 的时刻（s） */
  tA: number
  /** S 系中右光到达前壁 B 的时刻（s） */
  tB: number
  /** S 系两壁到达时间差 Δt_AB = tB - tA（s） */
  deltaTab: number
  /** S 系中车厢左壁 A 当前坐标（光秒 ls） */
  wallAX: number
  /** S 系中车厢右壁 B 当前坐标（光秒 ls） */
  wallBX: number
  /** S 系中左光波前当前坐标（光秒 ls） */
  leftRayX: number
  /** S 系中右光波前当前坐标（光秒 ls） */
  rightRayX: number
  /** S 系左光是否已到达后壁 A */
  hitA: boolean
  /** S 系右光是否已到达前壁 B */
  hitB: boolean
  /** S' 系中左右光波前距中点传播距离 ∈ [0, 1]（光秒 ls） */
  primeRayDist: number
  /** S' 系中是否已同时到达两壁 */
  primeHitBoth: boolean
  /** 当前同时性阶段 */
  stage: SimultaneityStage
}

/**
 * 计算动尺收缩与同时的相对性（mode === 1）动态物理状态。
 * 车厢固有半长为 1.0 ls（总固有长 2.0 ls），自然单位 c = 1 ls/s。
 * @param beta 速度与光速比 v/c（无量纲）
 * @param time 当前地面参考系时刻（秒，s）
 */
export function calcSimultaneityState(beta: number, time: number): SimultaneityState {
  const clampedBeta = clampRelativityBeta(beta)
  const gamma = calcLorentzFactor(clampedBeta)
  const lengthRatio = 1 / gamma

  const tA = 1 / (gamma * (1 + clampedBeta))
  const tB = 1 / (gamma * (1 - clampedBeta))
  const duration = Math.max(1.0, tB)
  const safeTime = Number.isFinite(time) ? time : 0
  const groundTime = Math.min(Math.max(safeTime, 0), duration)
  const properTime = groundTime / gamma

  const wallAX = -lengthRatio + clampedBeta * groundTime
  const wallBX = lengthRatio + clampedBeta * groundTime
  const leftRayX = -Math.min(groundTime, tA)
  const rightRayX = Math.min(groundTime, tB)

  const hitA = groundTime >= tA - 1e-4
  const hitB = groundTime >= tB - 1e-4
  const primeRayDist = Math.min(properTime, 1.0)
  const primeHitBoth = properTime >= 1.0 - 1e-4

  let stage: SimultaneityStage = 'propagating'
  if (groundTime <= 1e-4) {
    stage = 'emit'
  } else if (clampedBeta < 0.02) {
    stage = hitB ? 'hit-both' : 'propagating'
  } else if (hitB) {
    stage = 'hit-b'
  } else if (Math.abs(groundTime - tA) <= 0.03) {
    stage = 'hit-a'
  } else if (hitA) {
    stage = 'after-a'
  }

  return {
    beta: clampedBeta,
    gamma,
    lengthRatio,
    duration,
    groundTime,
    properTime,
    tA,
    tB,
    deltaTab: Math.max(0, tB - tA),
    wallAX,
    wallBX,
    leftRayX,
    rightRayX,
    hitA,
    hitB,
    primeRayDist,
    primeHitBoth,
    stage,
  }
}

export interface ConstantForceAccelState {
  /** 设定的目标速度比 β₀（无量纲） */
  targetBeta: number
  /** 目标洛伦兹因子 γ₀（无量纲） */
  targetGamma: number
  /** 总加速过程时长（s） */
  duration: number
  /** 当前时刻 t ∈ [0, duration]（s） */
  groundTime: number
  /** 当前相对论实际速度比 β(t) < 1（无量纲） */
  currentBeta: number
  /** 当前牛顿经典预测速度比 β_cl(t) = (F/m₀c)t（无量纲，高速时可突破 1） */
  classicalBeta: number
  /** 当前相对论洛伦兹因子 γ(t)（无量纲） */
  currentGamma: number
  /** 当前 1D 恒力下相对论加速度与经典加速度之比 a_rel / a₀ = 1 / γ³（无量纲） */
  accelRatio: number
  /** 当前相对论能量数据（SI 单位） */
  currentEnergy: ReturnType<typeof calcRelativisticEnergy>
  /** 当前按实际速度计算的经典动能 ½m₀v²（J） */
  currentClassicalEk: number
  /** 终点目标相对论能量数据（SI 单位） */
  targetEnergy: ReturnType<typeof calcRelativisticEnergy>
  /** 终点目标经典动能（J） */
  targetClassicalEk: number
  /** 当前低速极限指标 */
  currentNewtonMetrics: NewtonianLimitMetrics
  /** 经典预测速度达到 c 的时刻（s），若未达到则为 null */
  tCrossC: number | null
  /** 离开经典低速区（β = 0.1）的时刻（s），若未达到则为 null */
  tLeaveClassical: number | null
}

/**
 * 计算一维恒力作用下相对论加速度与经典加速度之比 a_rel / a₀ = 1 / γ³。
 * @param beta 速度与光速之比 v/c（无量纲）
 * @returns 相对论加速度比（无量纲，区间 (0, 1]）
 */
export function calcRelativisticAccelRatio(beta: number): number {
  const gamma = calcLorentzFactor(clampRelativityBeta(beta))
  return 1 / (gamma * gamma * gamma)
}

/**
 * 计算恒力加速下（mode 2 / mode 3）相对论动力学与牛顿经典预测的演化状态。
 * @param betaTarget 目标航速比 v/c（无量纲）
 * @param m0 不变质量（千克，kg）
 * @param time 当前地面系时刻（秒，s）
 */
export function calcConstantForceAccelState(
  betaTarget: number,
  m0: number,
  time: number,
): ConstantForceAccelState {
  const targetBeta = clampRelativityBeta(betaTarget)
  const targetGamma = calcLorentzFactor(targetBeta)
  const targetMomentum = targetGamma * targetBeta
  const safeM0 = Number.isFinite(m0) && m0 > 0 ? m0 : 1.0

  const safeTime = Number.isFinite(time) ? time : 0
  const groundTime = Math.min(Math.max(safeTime, 0), ACCEL_CYCLE_DURATION)
  const q = targetMomentum * (groundTime / ACCEL_CYCLE_DURATION)
  const currentGamma = Math.sqrt(1 + q * q)
  const currentBeta = q / currentGamma
  const classicalBeta = q
  const accelRatio = 1 / (currentGamma * currentGamma * currentGamma)

  const currentEnergy = calcRelativisticEnergy(safeM0, currentBeta)
  const currentV = currentBeta * SPEED_OF_LIGHT
  const currentClassicalEk = 0.5 * safeM0 * currentV * currentV

  const targetEnergy = calcRelativisticEnergy(safeM0, targetBeta)
  const targetV = targetBeta * SPEED_OF_LIGHT
  const targetClassicalEk = 0.5 * safeM0 * targetV * targetV

  const currentNewtonMetrics = calcNewtonianLimitMetrics(currentBeta)
  const tCrossC = targetMomentum > 1.001 ? ACCEL_CYCLE_DURATION / targetMomentum : null
  const tLeaveClassical =
    targetMomentum > 0.105 ? (0.1 / targetMomentum) * ACCEL_CYCLE_DURATION : null

  return {
    targetBeta,
    targetGamma,
    duration: ACCEL_CYCLE_DURATION,
    groundTime,
    currentBeta,
    classicalBeta,
    currentGamma,
    accelRatio,
    currentEnergy,
    currentClassicalEk,
    targetEnergy,
    targetClassicalEk,
    currentNewtonMetrics,
    tCrossC,
    tLeaveClassical,
  }
}

export interface ChartCurvePoint {
  x: number
  y: number
}

/**
 * 采样恒力加速下的牛顿预测与相对论实际 v/c - t 演化曲线。
 * @param betaTarget 目标航速比 v/c（无量纲）
 * @param steps 采样分段数，默认 48
 * @returns 经典与相对论曲线点列及推荐 Y 轴上界 yMax（单位：c）
 */
export function sampleConstantForceCurves(
  betaTarget: number,
  steps = 48,
): { classical: ChartCurvePoint[]; relativistic: ChartCurvePoint[]; yMax: number } {
  const targetBeta = clampRelativityBeta(betaTarget)
  const targetGamma = calcLorentzFactor(targetBeta)
  const targetMomentum = targetGamma * targetBeta
  const safeSteps = Math.max(2, Math.round(steps))
  const classical: ChartCurvePoint[] = []
  const relativistic: ChartCurvePoint[] = []

  for (let i = 0; i <= safeSteps; i += 1) {
    const t = (i / safeSteps) * ACCEL_CYCLE_DURATION
    const q = targetMomentum * (t / ACCEL_CYCLE_DURATION)
    const g = Math.sqrt(1 + q * q)
    classical.push({ x: t, y: q })
    relativistic.push({ x: t, y: q / g })
  }

  const yMax = Math.max(1.25, Math.ceil(Math.max(1.15, targetMomentum * 1.1) * 5) / 5)
  return { classical, relativistic, yMax }
}

/**
 * 采样洛伦兹因子 γ(β) 曲线（β ∈ [0, maxBeta]）。
 * @param maxBeta 最大速度比（无量纲，默认 0.95）
 * @param steps 采样分段数，默认 48
 * @returns (β, γ) 曲线点列
 */
export function sampleLorentzCurve(maxBeta = 0.95, steps = 48): ChartCurvePoint[] {
  const clampedMax = clampRelativityBeta(maxBeta)
  const safeSteps = Math.max(2, Math.round(steps))
  const points: ChartCurvePoint[] = []
  for (let i = 0; i <= safeSteps; i += 1) {
    const b = (i / safeSteps) * clampedMax
    points.push({ x: b, y: calcLorentzFactor(b) })
  }
  return points
}

/**
 * 采样经典动能 ½m₀v² 与相对论动能 (γ − 1)m₀c² 随 β 变化的对比曲线（单位：×10¹⁶ J）。
 * @param m0 静止质量（kg）
 * @param maxBeta 最大速度比（无量纲，默认 0.95）
 * @param steps 采样分段数，默认 48
 * @returns 经典与相对论动能曲线点列及 Y 轴上界 yMax（单位：×10¹⁶ J）
 */
export function sampleKineticEnergyCurves(
  m0: number,
  maxBeta = 0.95,
  steps = 48,
): { classical: ChartCurvePoint[]; relativistic: ChartCurvePoint[]; yMax: number } {
  const safeM0 = Number.isFinite(m0) && m0 > 0 ? m0 : 1.0
  const clampedMax = clampRelativityBeta(maxBeta)
  const safeSteps = Math.max(2, Math.round(steps))
  const classical: ChartCurvePoint[] = []
  const relativistic: ChartCurvePoint[] = []

  for (let i = 0; i <= safeSteps; i += 1) {
    const b = (i / safeSteps) * clampedMax
    const energy = calcRelativisticEnergy(safeM0, b)
    const v = b * SPEED_OF_LIGHT
    const classicalEk = 0.5 * safeM0 * v * v
    classical.push({ x: b, y: classicalEk / 1e16 })
    relativistic.push({ x: b, y: energy.kineticEnergy / 1e16 })
  }

  const maxRelEk16 = relativistic[relativistic.length - 1]?.y ?? 1
  const yMax = Math.max(1, Math.ceil(maxRelEk16 * 1.08 * 2) / 2)
  return { classical, relativistic, yMax }
}

/**
 * 统一计算各模式动画总时长（s），供注册表 maxTime 与临界点复用。
 */
export function getRelativityMaxTime(params: Record<string, number>): number {
  const mode = params.mode ?? 0
  const beta = clampRelativityBeta(params.beta ?? 0.6)
  if (mode === 0) return Number(getRelativityCycleDuration(beta).toFixed(2))
  if (mode === 1) return Number(calcSimultaneityState(beta, 0).duration.toFixed(2))
  return ACCEL_CYCLE_DURATION
}

/**
 * 计算洛伦兹因子 γ (无量纲)
 * @param beta 速度与光速之比 v/c，必须满足 0 <= beta < 1
 * @returns 洛伦兹因子 γ >= 1
 */
export function calcLorentzFactor(beta: number): number {
  const b = Math.min(Math.max(beta, 0), 0.9999)
  return 1 / Math.sqrt(1 - b * b)
}

/**
 * 计算时间延缓（动钟变慢）
 * 静止在运动参考系中的时钟测得的固有时间为 tau0，
 * 地面参考系测得的经过时间为 t = γ * tau0
 * @param tau0 固有时间（秒，s）
 * @param beta 速度与光速比 v/c
 * @returns 地面参考系时间（秒，s）
 */
export function calcTimeDilation(tau0: number, beta: number): number {
  return tau0 * calcLorentzFactor(beta)
}

/**
 * 计算长度收缩（动尺变短）
 * 物体在自身静止系中的固有长度为 l0，
 * 地面参考系测得沿运动方向的长度为 l = l0 / γ = l0 * sqrt(1 - β^2)
 * @param l0 固有长度（米，m）
 * @param beta 速度与光速比 v/c
 * @returns 沿运动方向收缩后的长度（米，m）
 */
export function calcLengthContraction(l0: number, beta: number): number {
  return l0 / calcLorentzFactor(beta)
}

/**
 * 计算相对论质能关系
 * @param m0 静止质量（千克，kg）
 * @param beta 速度与光速比 v/c
 * @returns { relativisticMass, restEnergy, totalEnergy, kineticEnergy } 单位均为 SI 标准单位
 */
export function calcRelativisticEnergy(
  m0: number,
  beta: number,
  c: number = SPEED_OF_LIGHT,
): {
  gamma: number
  relativisticMass: number
  restEnergy: number
  totalEnergy: number
  kineticEnergy: number
} {
  const gamma = calcLorentzFactor(beta)
  const relativisticMass = gamma * m0
  const c2 = c * c
  const restEnergy = m0 * c2
  const totalEnergy = relativisticMass * c2
  const kineticEnergy = totalEnergy - restEnergy

  return {
    gamma,
    relativisticMass,
    restEnergy,
    totalEnergy,
    kineticEnergy,
  }
}

/**
 * 相对论一维速度合成公式
 * u = (v1 + v2) / (1 + v1 * v2 / c^2)
 * @param v1 速度1与光速比 (u'/c)
 * @param v2 速度2与光速比 (v/c)
 * @returns 合成后速度与光速比 (u/c)
 */
export function calcRelativisticVelocityAddition(v1: number, v2: number): number {
  const denom = 1 + v1 * v2
  if (Math.abs(denom) < 1e-12) return 1
  const result = (v1 + v2) / denom
  return Math.min(Math.max(result, -0.9999), 0.9999)
}

/**
 * 狭义相对论（anim-relativity）全模式临界时刻点配置。
 */
export function getRelativityCriticalTimes(
  params: Record<string, number>,
  maxTime?: number,
): CriticalTimePoint[] {
  const mode = params.mode ?? 0
  const beta = clampRelativityBeta(params.beta ?? 0.6)

  if (mode === 0) {
    const gamma = calcLorentzFactor(beta)
    const cycleDuration = LIGHT_CLOCK_PROPER_PERIOD * gamma
    const limit = maxTime ?? Math.max(30, cycleDuration)
    return finalizeCriticalPoints(
      [
        { rawTime: gamma, align: 'nearest', label: '达顶镜 (τ=1s)', variant: 'warning', autoPause: true },
        { rawTime: cycleDuration, align: 'before', label: '返回底镜 (τ=2s)', variant: 'critical', autoPause: true },
      ],
      limit,
    )
  }

  if (mode === 1) {
    const sim = calcSimultaneityState(beta, 0)
    const limit = maxTime ?? Math.max(30, sim.duration)
    if (beta < 0.02) {
      return finalizeCriticalPoints(
        [{ rawTime: sim.tB, align: 'before', label: '同时到A、B', variant: 'warning', autoPause: true }],
        limit,
      )
    }
    return finalizeCriticalPoints(
      [
        { rawTime: sim.tA, align: 'nearest', label: '先到后壁A', variant: 'warning', autoPause: true },
        { rawTime: sim.tB, align: 'before', label: '后到前壁B', variant: 'critical', autoPause: true },
      ],
      limit,
    )
  }

  const accel = calcConstantForceAccelState(beta, params.m0 ?? 1.0, 0)
  const limit = maxTime ?? ACCEL_CYCLE_DURATION
  const rawPoints = []
  if (accel.tLeaveClassical != null) {
    rawPoints.push({
      rawTime: accel.tLeaveClassical,
      align: 'nearest' as const,
      label: '离开低速区',
      variant: 'info' as const,
      autoPause: false,
    })
  }
  if (accel.tCrossC != null) {
    rawPoints.push({
      rawTime: accel.tCrossC,
      align: 'nearest' as const,
      label: '经典预测达c',
      variant: 'warning' as const,
      autoPause: true,
    })
  }
  rawPoints.push({
    rawTime: ACCEL_CYCLE_DURATION,
    align: 'before' as const,
    label: '达目标航速',
    variant: 'critical' as const,
    autoPause: false,
  })
  return finalizeCriticalPoints(rawPoints, limit)
}

/**
 * 狭义相对论全模式进度条阶段分段。
 */
export function getRelativityTimeStages(params: Record<string, number>): TimeStageSegment[] {
  const mode = params.mode ?? 0
  const beta = clampRelativityBeta(params.beta ?? 0.6)

  if (mode === 0) {
    const gamma = calcLorentzFactor(beta)
    const half = alignCriticalTime(gamma, 'nearest')
    const total = alignCriticalTime(LIGHT_CLOCK_PROPER_PERIOD * gamma, 'before')
    if (!(half > 0) || !(total > half)) return []
    return [
      { from: 0, to: half, label: '去程（底镜 → 顶镜）', variant: 'primary' },
      { from: half, to: total, label: '回程（顶镜 → 底镜）', variant: 'secondary' },
    ]
  }

  if (mode === 1) {
    const sim = calcSimultaneityState(beta, 0)
    const tAAligned = alignCriticalTime(sim.tA, 'nearest')
    const tBAligned = alignCriticalTime(sim.duration, 'before')
    if (beta < 0.02 || tBAligned <= tAAligned + 0.02) {
      return [{ from: 0, to: tBAligned, label: '光脉冲同步扩散至两壁', variant: 'primary' }]
    }
    return [
      { from: 0, to: tAAligned, label: '左光追及后壁 A', variant: 'primary' },
      { from: tAAligned, to: tBAligned, label: '右光追及退让前壁 B', variant: 'accent' },
    ]
  }

  const accel = calcConstantForceAccelState(beta, params.m0 ?? 1.0, 0)
  const split = accel.tLeaveClassical
    ? alignCriticalTime(accel.tLeaveClassical, 'nearest')
    : 1.0
  if (split <= 0.05 || split >= ACCEL_CYCLE_DURATION - 0.05) {
    return [{ from: 0, to: ACCEL_CYCLE_DURATION, label: '恒力加速演化段', variant: 'primary' }]
  }
  return [
    { from: 0, to: split, label: '低速近似重合段', variant: 'secondary' },
    { from: split, to: ACCEL_CYCLE_DURATION, label: '高速显著分叉段', variant: 'accent' },
  ]
}

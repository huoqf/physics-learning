import { useMemo } from 'react'

import { GRAVITY } from '@/physics/constants'
import {
  CONSECUTIVE_INTERVAL,
  COUNT_INTERVAL,
  FREEFALL_MAX_M,
  PHOTOGATE_A_X_M,
  PHOTOGATE_B_X_M,
  TRACK_MAX_M,
  buildTapeCountingDots,
  calcDiffMethodAcceleration,
  countingPeriod,
  isZeroInitialVelocityTape,
  readPhotogate,
  solveHooke,
  solveTrackMotion,
  tickerPeriod,
  verifyMechanicalEnergy,
  type EnergyVerificationPoint,
} from '@/physics/experimentMechanics'
import { getSceneProfile } from '../mechanicsExperimentLayout'

export interface UseMechanicsExperimentPhysicsParams {
  /** 实验模式: 0 - 打点计时器与纸带 | 1 - 光电门测速 | 2 - 胡克定律 | 3 - 验证机械能守恒 */
  mode: number
  /** 初速度 v0 (m/s) */
  v0?: number
  /** 加速度 a (m/s²) */
  a?: number
  /** 打点频率 freq (Hz, 默认 50Hz) */
  freq?: number
  /** 遮光条宽度 d (m, 默认 0.01m) */
  d?: number
  /** 弹簧劲度系数 k (N/m, 默认 100N/m) */
  k?: number
  /** 钩码质量 m (kg, 默认 0.2kg)；模式 3 作为重物质量 */
  m?: number
  /** 纸带阻力占重力加速度的百分比 (%)，仅模式 3 生效 */
  friction?: number
  /** 动画当前累计时间 time (s) */
  time: number
}

export interface MechanicsExperimentPhysicsResult {
  /** 当前小车位移 x (m)，已按轨道长度钳制 */
  x: number
  /** 当前小车速度 v (m/s)，到达末端挡块后为 0 */
  v: number
  /** 有效运动时长 (s) = min(动画时间, 到达挡块时刻) */
  tActive: number
  /** 到达末端挡块的时刻 (s) */
  tEnd: number
  /** 是否已到达末端挡块 */
  reachedEnd: boolean
  /** 打点周期 T₀ = 1/f (s) */
  tickerPeriodS: number
  /** 计数周期 T = interval × T₀ (s)：模式 0/1/2 为 5T₀，模式 3 为 T₀ */
  countingPeriodS: number
  /** 每几个打点取一个计数点（模式 3 为 1，其余为 5），看板文案据此分家 */
  countInterval: number
  /** 模式0: 纸带打点位置数组 (design-unit，原点为计时器出口) */
  tapeDots: number[]
  /** 模式0: 逐差法测得的加速度 (m/s²)；计数点不足 7 个时为 null */
  aCalculated: number | null
  /** 模式1: 光电门 A 遮光时间 Δt1 (ms)，未触发为 0 */
  dt1Ms: number
  /** 模式1: 光电门 B 遮光时间 Δt2 (ms)，未触发为 0 */
  dt2Ms: number
  /** 模式1: 光电门 A 测得速度 vA = d/Δt1 (m/s)，未触发为 0 */
  vA: number
  /** 模式1: 光电门 B 测得速度 vB = d/Δt2 (m/s)，未触发为 0 */
  vB: number
  /** 模式1: 光电门 A 是否处于遮光感应状态 */
  isBlocked1: boolean
  /** 模式1: 光电门 B 是否处于遮光感应状态 */
  isBlocked2: boolean
  /** 模式2: 弹簧伸长量 Δx (m) */
  deltaX: number
  /** 模式2: 弹簧受到的弹力/拉力 F (N) */
  F: number
  /** 模式3: 纸带实测有效加速度 a = g(1−k) (m/s²) */
  aEffective: number
  /** 模式3: 逐点对比重力势能减少量与动能增加量（首末点无速度，故不含） */
  energyPoints: EnergyVerificationPoint[]
  /** 模式3: 首两点间距 (m) */
  firstGapM: number
  /** 模式3: 首两点间距是否满足「初速为零」的选带条件（≈ 2 mm） */
  isZeroVelocityTape: boolean
}

/**
 * 高考力学实验基础 - 物理计算 Hook（薄封装层）
 *
 * 全部数值来自 `@/physics/experimentMechanics` 的单一可信源，
 * 右屏看板（data/quantities/mechanics/experiment-base.ts）消费同一批函数，
 * 从而保证"图上 / 数上 / 动画上"永远一致。
 */
export function useMechanicsExperimentPhysics({
  mode,
  v0 = 1.0,
  a = 1.5,
  freq = 50,
  d = 0.01,
  k = 100,
  m = 0.2,
  friction = 2,
  time,
}: UseMechanicsExperimentPhysicsParams): MechanicsExperimentPhysicsResult {
  return useMemo(() => {
    // ── 模式 3：竖直自由下落。实测加速度被纸带阻力折减为 g(1−k)，初速为零 ──
    const isFreeFall = mode === 3
    const frictionRatio = Math.max(0, Math.min(100, friction)) / 100
    const aEffective = isFreeFall ? GRAVITY * (1 - frictionRatio) : a
    const v0Effective = isFreeFall ? 0 : v0
    const xMax = isFreeFall ? FREEFALL_MAX_M : TRACK_MAX_M
    // 设计比例与画布 preset 同属一个 profile，纸带打点、能量换算、矢量归一化共用它
    const pxPerMeter = getSceneProfile(mode).pxPerMeter

    // ── 运动学（含末端挡块钳制）──
    const motion = solveTrackMotion({ v0: v0Effective, a: aEffective, time, xMax })

    // ── 模式 0 / 3：打点纸带计数点（模式 3 用竖直比例与竖直行程上限）──
    // 计数口径按实验分家：测加速度走 5T₀ = 0.1 s（逐差法公式的 T 就是这个），
    // 验证机械能守恒走连续打点 T₀ = 0.02 s（人教版选带判据 ½gT₀² ≈ 2 mm 只在 T₀ 下成立）。
    const countInterval = isFreeFall ? CONSECUTIVE_INTERVAL : COUNT_INTERVAL
    const tapeDots = buildTapeCountingDots({
      v0: v0Effective,
      a: aEffective,
      time,
      freq,
      countInterval,
      pxPerMeter,
      xMax,
    })
    const T = countingPeriod(freq, countInterval)
    const aCalculated = calcDiffMethodAcceleration(tapeDots, pxPerMeter, T)

    // ── 模式 3：逐点比对 mgh 与 ½mv² ──
    const energyPoints = isFreeFall
      ? verifyMechanicalEnergy({
          dotsPx: tapeDots,
          pxPerMeter,
          countingPeriodS: T,
          mass: m,
          gravity: GRAVITY,
        })
      : []
    const firstGapM = tapeDots.length >= 2 ? (tapeDots[0] - tapeDots[1]) / pxPerMeter : 0

    // ── 模式 1：双光电门遮光读数 ──
    const gateA = readPhotogate({ x: motion.x, v0: v0Effective, a: aEffective, d, gateX: PHOTOGATE_A_X_M })
    const gateB = readPhotogate({ x: motion.x, v0: v0Effective, a: aEffective, d, gateX: PHOTOGATE_B_X_M })

    // ── 模式 2：胡克定律 ──
    const hooke = solveHooke(m, k)

    return {
      x: motion.x,
      v: motion.v,
      tActive: motion.tActive,
      tEnd: motion.tEnd,
      reachedEnd: motion.reachedEnd,
      tickerPeriodS: tickerPeriod(freq),
      countingPeriodS: T,
      countInterval,
      tapeDots,
      aCalculated: aCalculated === null ? null : parseFloat(aCalculated.toFixed(3)),
      dt1Ms: parseFloat(gateA.dtMs.toFixed(2)),
      dt2Ms: parseFloat(gateB.dtMs.toFixed(2)),
      vA: parseFloat(gateA.velocity.toFixed(3)),
      vB: parseFloat(gateB.velocity.toFixed(3)),
      isBlocked1: gateA.isBlocked,
      isBlocked2: gateB.isBlocked,
      deltaX: hooke.extension,
      F: parseFloat(hooke.force.toFixed(2)),
      aEffective,
      energyPoints,
      firstGapM,
      isZeroVelocityTape: isFreeFall && isZeroInitialVelocityTape(firstGapM),
    }
  }, [mode, v0, a, freq, d, k, m, friction, time])
}

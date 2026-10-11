import { useMemo } from 'react'

import {
  PHOTOGATE_A_X_M,
  PHOTOGATE_B_X_M,
  TRACK_MAX_M,
  buildTapeCountingDots,
  calcDiffMethodAcceleration,
  countingPeriod,
  readPhotogate,
  solveHooke,
  solveTrackMotion,
  tickerPeriod,
} from '@/physics/experimentMechanics'
import { TRACK_PX_PER_M } from '../mechanicsExperimentLayout'

export interface UseMechanicsExperimentPhysicsParams {
  /** 实验模式: 0 - 打点计时器与纸带 | 1 - 光电门测速 | 2 - 胡克定律 */
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
  /** 钩码质量 m (kg, 默认 0.2kg) */
  m?: number
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
  /** 计数周期 T = 5T₀ (s)，逐差法公式中的 T */
  countingPeriodS: number
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
}

/**
 * 高考力学实验基础 - 物理计算 Hook（薄封装层）
 *
 * 全部数值来自 `@/physics/experimentMechanics` 的单一可信源，
 * 右屏看板（data/quantities/mechanics/experiment-base.ts）消费同一批函数，
 * 从而保证"图上 / 数上 / 动画上"永远一致。
 */
export function useMechanicsExperimentPhysics({
  mode: _mode,
  v0 = 1.0,
  a = 1.5,
  freq = 50,
  d = 0.01,
  k = 100,
  m = 0.2,
  time,
}: UseMechanicsExperimentPhysicsParams): MechanicsExperimentPhysicsResult {
  return useMemo(() => {
    // ── 运动学（含末端挡块钳制）──
    const motion = solveTrackMotion({ v0, a, time, xMax: TRACK_MAX_M })

    // ── 模式 0：打点纸带计数点与逐差法 ──
    const tapeDots = buildTapeCountingDots({
      v0,
      a,
      time,
      freq,
      pxPerMeter: TRACK_PX_PER_M,
      xMax: TRACK_MAX_M,
    })
    const T = countingPeriod(freq)
    const aCalculated = calcDiffMethodAcceleration(tapeDots, TRACK_PX_PER_M, T)

    // ── 模式 1：双光电门遮光读数 ──
    const gateA = readPhotogate({ x: motion.x, v0, a, d, gateX: PHOTOGATE_A_X_M })
    const gateB = readPhotogate({ x: motion.x, v0, a, d, gateX: PHOTOGATE_B_X_M })

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
    }
  }, [v0, a, freq, d, k, m, time])
}

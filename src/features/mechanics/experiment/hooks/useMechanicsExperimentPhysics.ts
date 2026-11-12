import { useMemo } from 'react'

import {
  COUNT_INTERVAL,
  PHOTOGATE_A_X_M,
  PHOTOGATE_B_X_M,
  TRACK_MAX_M,
  buildTapeCountingDots,
  calcDiffMethodAcceleration,
  countingPeriod,
  readPhotogate,
  solveTrackMotion,
  tickerPeriod,
} from '@/physics/experimentMechanics'
import { TRACK_PROFILE } from '../mechanicsExperimentLayout'

export interface UseMechanicsExperimentPhysicsParams {
  /** 实验模式: 0 - 打点计时器与纸带 | 1 - 光电门测速 */
  mode: number
  /** 初速度 v0 (m/s) */
  v0?: number
  /** 加速度 a (m/s²) */
  a?: number
  /** 打点频率 freq (Hz, 默认 50Hz) */
  freq?: number
  /** 遮光条宽度 d (m, 默认 0.01m) */
  d?: number
  /** 动画当前累计时间 time (s) */
  time: number
}

export interface MechanicsExperimentPhysicsResult {
  x: number
  v: number
  tActive: number
  tEnd: number
  reachedEnd: boolean
  tickerPeriodS: number
  countingPeriodS: number
  countInterval: number
  tapeDots: number[]
  aCalculated: number | null
  dt1Ms: number
  dt2Ms: number
  vA: number
  vB: number
  isBlocked1: boolean
  isBlocked2: boolean
}

/**
 * 力学实验基础：纸带与光电门 - 物理计算 Hook（薄封装层）
 */
export function useMechanicsExperimentPhysics({
  v0 = 1.0,
  a = 1.5,
  freq = 50,
  d = 0.01,
  time,
}: UseMechanicsExperimentPhysicsParams): MechanicsExperimentPhysicsResult {
  return useMemo(() => {
    const pxPerMeter = TRACK_PROFILE.pxPerMeter
    const motion = solveTrackMotion({ v0, a, time, xMax: TRACK_MAX_M })
    const tapeDots = buildTapeCountingDots({
      v0,
      a,
      time,
      freq,
      countInterval: COUNT_INTERVAL,
      pxPerMeter,
      xMax: TRACK_MAX_M,
    })
    const T = countingPeriod(freq, COUNT_INTERVAL)
    const aCalculated = calcDiffMethodAcceleration(tapeDots, pxPerMeter, T)

    const gateA = readPhotogate({ x: motion.x, v0, a, d, gateX: PHOTOGATE_A_X_M })
    const gateB = readPhotogate({ x: motion.x, v0, a, d, gateX: PHOTOGATE_B_X_M })

    return {
      x: motion.x,
      v: motion.v,
      tActive: motion.tActive,
      tEnd: motion.tEnd,
      reachedEnd: motion.reachedEnd,
      tickerPeriodS: tickerPeriod(freq),
      countingPeriodS: T,
      countInterval: COUNT_INTERVAL,
      tapeDots,
      aCalculated: aCalculated === null ? null : parseFloat(aCalculated.toFixed(3)),
      dt1Ms: parseFloat(gateA.dtMs.toFixed(2)),
      dt2Ms: parseFloat(gateB.dtMs.toFixed(2)),
      vA: parseFloat(gateA.velocity.toFixed(3)),
      vB: parseFloat(gateB.velocity.toFixed(3)),
      isBlocked1: gateA.isBlocked,
      isBlocked2: gateB.isBlocked,
    }
  }, [v0, a, freq, d, time])
}
